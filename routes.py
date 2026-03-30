# routes.py
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from uuid import UUID
import services
import models, schemas
from database import get_db
from typing import List
import shutil
import os
import auth
from fastapi.security import OAuth2PasswordRequestForm
import string
import random

# Initialize the router
router = APIRouter()

# ==========================================
# AUTHENTICATION & USER ROUTES
# ==========================================
@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    hashed_pwd = auth.get_password_hash(user.password)
    user_data = user.model_dump(exclude={'password', 'invite_code'}) 
    
    new_user = models.User(**user_data, hashed_password=hashed_pwd)
    
    if user.role == "Broker":
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            existing_code = db.query(models.User).filter(models.User.invite_code == code).first()
            if not existing_code:
                break 
                
        new_user.invite_code = code
        db.add(new_user)
        db.flush() # Stage the user in the database without finalizing the save
        
        new_user.brokerage_id = new_user.user_id 
        
    elif user.role == "Agent":
        if not user.invite_code:
            raise HTTPException(status_code=400, detail="Agents must provide a Brokerage Invite Code.")
            
        broker = db.query(models.User).filter(models.User.invite_code == user.invite_code, models.User.role == "Broker").first()
        if not broker:
            raise HTTPException(status_code=404, detail="Invalid Brokerage Invite Code.")
            
        new_user.brokerage_id = broker.user_id
        db.add(new_user)
        db.flush() # Stage the new agent
        
        # ==========================================
        # AUTOMATIC BROKER DATABANK INJECTION
        # ==========================================
        # 1. Create a Contact record owned by the Broker
        agent_contact = models.Contact(
            user_id=broker.user_id,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            email=new_user.email,
            mrea_category="Met", # They definitely met!
            lead_source="System Registration"
        )
        
        # 2. Find or create the "Brokerage Agent" tag for the Broker
        tag_name = "Brokerage Agent"
        broker_tag = db.query(models.Tag).filter(
            models.Tag.tag_name.ilike(tag_name), 
            models.Tag.user_id == broker.user_id
        ).first()
        
        if not broker_tag:
            broker_tag = models.Tag(
                user_id=broker.user_id, 
                tag_name=tag_name,
                color_hex="#8b5cf6" # Give it a sleek purple badge
            )
            db.add(broker_tag)
            
        # 3. Link the tag to the new contact and stage it
        agent_contact.tags.append(broker_tag)
        db.add(agent_contact)

    # Finalize the entire transaction at once
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user_profile(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user

@router.patch("/users/{user_id}", response_model=schemas.UserResponse)
def update_user_profile(user_id: UUID, user_update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Apply only the fields the user actually changed
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Find the user by email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. Verify existence and password
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # 3. Generate the digital ID badge (JWT) - NOW WITH INVITE CODE
    token_data = {
        "sub": str(user.user_id), 
        "role": user.role,
        "invite_code": user.invite_code or "" # Inject the code here!
    }
    access_token = auth.create_access_token(data=token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/{user_id}/roster/", response_model=List[schemas.UserResponse])
def get_team_roster(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Unlocked: Both Brokers and Agents can now see the people in their specific brokerage
    roster = db.query(models.User).filter(
        models.User.brokerage_id == user.brokerage_id,
        models.User.user_id != user.user_id
    ).all()
    
    return roster

# ==========================================
# CONTACT ROUTES
# ==========================================
@router.post("/users/{user_id}/contacts/", response_model=schemas.ContactResponse)
def create_contact(user_id: UUID, contact: schemas.ContactCreate, db: Session = Depends(get_db)):
    # 1. Security Check: Ensure the agent (User) actually exists first
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Agent not found.")

    # 2. Conversion: Attach the contact to this specific agent
    new_contact = models.Contact(**contact.model_dump(), user_id=user_id)
    
    # 3. Execution: Save to the database
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    
    return new_contact

@router.get("/users/{user_id}/contacts/", response_model=List[schemas.ContactResponse])
def get_user_contacts(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Reverted to strict 1-to-1 ownership: You only see contacts you manually created.
    return db.query(models.Contact).filter(models.Contact.user_id == user_id).all()

@router.get("/contacts/{contact_id}")
def get_contact_details(contact_id: UUID, db: Session = Depends(get_db)):
    contact = db.query(models.Contact).filter(models.Contact.contact_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    
    deals = db.query(models.Deal).filter(models.Deal.contact_id == contact_id).all()
    
    # NEW: Fetch notes ordered by newest first
    notes = db.query(models.Note).filter(
        models.Note.contact_id == contact_id
    ).order_by(models.Note.created_at.desc()).all()
    
    return {
        "contact": contact,
        "deals": deals,
        "notes": notes # Add notes to the payload
    }

@router.post("/contacts/{contact_id}/notes/", response_model=schemas.NoteResponse)
def create_note(contact_id: UUID, note: schemas.NoteCreate, db: Session = Depends(get_db)):
    # Verify contact exists
    contact = db.query(models.Contact).filter(models.Contact.contact_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    
    new_note = models.Note(
        contact_id=contact_id,
        content=note.content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.patch("/contacts/{contact_id}", response_model=schemas.ContactResponse)
def update_contact(contact_id: UUID, contact_update: schemas.ContactUpdate, db: Session = Depends(get_db)):
    # 1. Find the specific contact
    contact = db.query(models.Contact).filter(models.Contact.contact_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    
    # 2. Extract only the fields the user actually changed
    update_data = contact_update.dict(exclude_unset=True)
    
    # 3. Apply the changes to the database model
    for key, value in update_data.items():
        setattr(contact, key, value)
        
    db.commit()
    db.refresh(contact)
    return contact



# ==========================================
# TAG ROUTES
# ==========================================
# 1. Fetch all unique tags for the agent (for the React dropdown)
@router.get("/users/{user_id}/tags/", response_model=list[schemas.TagResponse])
def get_user_tags(user_id: UUID, db: Session = Depends(get_db)):
    return db.query(models.Tag).filter(models.Tag.user_id == user_id).all()

# 2. The "Find or Create" Tag Engine
@router.post("/contacts/{contact_id}/tags/", response_model=schemas.TagResponse)
def add_tag_to_contact(contact_id: UUID, tag_req: schemas.TagCreate, db: Session = Depends(get_db)):
    contact = db.query(models.Contact).filter(models.Contact.contact_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    
    # Check if the tag already exists for this agent (case-insensitive)
    tag = db.query(models.Tag).filter(
        models.Tag.tag_name.ilike(tag_req.tag_name), 
        models.Tag.user_id == contact.user_id
    ).first()
    
    # If it doesn't exist, create it
    if not tag:
        tag = models.Tag(
            user_id=contact.user_id, 
            tag_name=tag_req.tag_name,
            color_hex=tag_req.color_hex 
        )
        db.add(tag)
        db.commit()
        db.refresh(tag)
        
    # Link it to the contact (if it isn't already)
    if tag not in contact.tags:
        contact.tags.append(tag)
        db.commit()
        
    return tag

# 3. Remove a tag from a contact
@router.delete("/contacts/{contact_id}/tags/{tag_id}")
def remove_tag_from_contact(contact_id: UUID, tag_id: UUID, db: Session = Depends(get_db)):
    contact = db.query(models.Contact).filter(models.Contact.contact_id == contact_id).first()
    tag = db.query(models.Tag).filter(models.Tag.tag_id == tag_id).first()
    
    if contact and tag and tag in contact.tags:
        contact.tags.remove(tag)
        db.commit()
    return {"status": "success"}

# ==========================================
# DEAL ROUTES
# ==========================================
@router.post("/contacts/{contact_id}/deals/", response_model=schemas.DealResponse)
def create_deal(contact_id: UUID, deal: schemas.DealCreate, db: Session = Depends(get_db)):
    # 1. Verify the contact exists
    contact = db.query(models.Contact).filter(models.Contact.contact_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    
    # 2. Create the deal and assign it to both the contact and the agent who owns the contact
    new_deal = models.Deal(**deal.model_dump(), contact_id=contact.contact_id, user_id=contact.user_id)
    
    db.add(new_deal)
    db.commit()
    db.refresh(new_deal)
    
    return new_deal

@router.patch("/deals/{deal_id}/stage")
def update_deal_stage(deal_id: UUID, stage_update: schemas.DealStageUpdate, db: Session = Depends(get_db)):
    # 1. Find the specific deal
    deal = db.query(models.Deal).filter(models.Deal.deal_id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")
    
    # 2. Update the pipeline stage
    deal.stage = stage_update.new_stage
    db.commit()
    
    # 3. FIRE THE AUTOMATION ENGINE
    services.trigger_stage_automations(db, deal)
    
    return {"status": "success", "message": f"Deal moved to {deal.stage}. Automated tasks generated."}

@router.get("/users/{user_id}/deals/", response_model=List[schemas.DealResponse])
def get_user_deals(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.role == "Broker":
        team_agents = db.query(models.User.user_id).filter(models.User.brokerage_id == user.brokerage_id).all()
        team_ids = [agent.user_id for agent in team_agents]
        return db.query(models.Deal).filter(models.Deal.user_id.in_(team_ids)).all()
    else:
        return db.query(models.Deal).filter(models.Deal.user_id == user_id).all()

@router.get("/deals/{deal_id}")
def get_deal_details(deal_id: UUID, user_id: UUID, db: Session = Depends(get_db)):
    # 1. Fetch the deal
    deal = db.query(models.Deal).filter(models.Deal.deal_id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    # 2. SECURITY CHECK (The IDOR Patch)
    requesting_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not requesting_user:
        raise HTTPException(status_code=401, detail="Unauthorized request.")

    # A user can only view this deal if they meet one of three criteria:
    is_owner = deal.user_id == user_id
    is_partner = any(partner.user_id == user_id for partner in deal.partners)
    is_broker = requesting_user.role == "Broker" and requesting_user.user_id == deal.owner.brokerage_id

    if not (is_owner or is_partner or is_broker):
        raise HTTPException(status_code=403, detail="Security Exception: You do not have permission to view this transaction.")

    # 3. Fetch the associated client
    contact = db.query(models.Contact).filter(models.Contact.contact_id == deal.contact_id).first()
    
    # 4. Fetch all compliance tasks
    tasks = db.query(models.Task).filter(
        models.Task.deal_id == deal_id
    ).order_by(models.Task.due_date.asc()).all()
    
    # 5. Package the ecosystem
    return {
        "deal": deal,
        "contact": contact,
        "tasks": tasks,
        "partners": deal.partners
    }

@router.post("/deals/{deal_id}/apply-template/{template_id}", response_model=List[schemas.DealDocumentResponse])
def apply_template_to_deal(deal_id: UUID, template_id: UUID, db: Session = Depends(get_db)):
    # 1. Verify the Deal exists
    deal = db.query(models.Deal).filter(models.Deal.deal_id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")
        
    # 2. Verify the Master Template exists
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
        
    # 3. The Cloning Engine
    for item in template.items:
        # Safety check: Don't duplicate documents if the agent clicks the button twice
        existing_doc = db.query(models.DealDocument).filter(
            models.DealDocument.deal_id == deal_id,
            models.DealDocument.document_name == item.document_name
        ).first()
        
        if not existing_doc:
            new_doc = models.DealDocument(
                deal_id=deal_id,
                document_name=item.document_name,
                is_required=item.is_required,
                status="Missing"
            )
            db.add(new_doc)
            
    db.commit()
    
    # 4. Return the newly minted checklist
    return db.query(models.DealDocument).filter(models.DealDocument.deal_id == deal_id).all()

@router.get("/deals/{deal_id}/documents/", response_model=List[schemas.DealDocumentResponse])
def get_deal_documents(deal_id: UUID, db: Session = Depends(get_db)):
    return db.query(models.DealDocument).filter(models.DealDocument.deal_id == deal_id).all()

@router.patch("/deal-documents/{doc_id}/status")
def update_document_status(doc_id: UUID, status_update: schemas.DealDocumentStatusUpdate, db: Session = Depends(get_db)):
    doc = db.query(models.DealDocument).filter(models.DealDocument.doc_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    doc.status = status_update.new_status
    
    # NEW: If the React frontend sent a rejection note, save it to the database
    if status_update.reviewer_notes is not None:
        doc.reviewer_notes = status_update.reviewer_notes
        
    db.commit()
    
    return {"status": "success", "message": f"Document marked as {doc.status}"}

@router.patch("/deals/{deal_id}", response_model=schemas.DealResponse)
def update_deal(deal_id: UUID, deal_update: schemas.DealUpdate, db: Session = Depends(get_db)):
    # 1. Find the deal
    deal = db.query(models.Deal).filter(models.Deal.deal_id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")
    
    # 2. Extract only the fields the user changed
    update_data = deal_update.dict(exclude_unset=True)
    
    # 3. Apply changes and save
    for key, value in update_data.items():
        setattr(deal, key, value)
        
    db.commit()
    db.refresh(deal)
    return deal

@router.post("/deal-documents/{doc_id}/upload", response_model=schemas.DealDocumentResponse)
def upload_document_file(doc_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    doc = db.query(models.DealDocument).filter(models.DealDocument.doc_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    # Optional Security: Ensure it's a PDF (you can remove this if you want to allow images)
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # Create a safe, unique filename so documents don't overwrite each other
    file_extension = file.filename.split(".")[-1]
    safe_filename = f"{doc_id}.{file_extension}"
    file_path = f"uploads/{safe_filename}"
    
    # Save the physical file to your hard drive
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update the database
    doc.file_url = f"http://127.0.0.1:8080/uploads/{safe_filename}"
    doc.status = "Uploaded" # Auto-progress the pipeline!
    
    # If it was rejected previously, clear the old notes since they provided a new file
    doc.reviewer_notes = None 
    
    db.commit()
    db.refresh(doc)
    
    return doc

@router.post("/deals/{deal_id}/partners/{partner_id}")
def add_deal_partner(deal_id: UUID, partner_id: UUID, db: Session = Depends(get_db)):
    deal = db.query(models.Deal).filter(models.Deal.deal_id == deal_id).first()
    partner = db.query(models.User).filter(models.User.user_id == partner_id).first()
    
    if not deal or not partner:
        raise HTTPException(status_code=404, detail="Deal or User not found.")
        
    # Prevent adding the same agent twice
    if partner in deal.partners:
        raise HTTPException(status_code=400, detail="Agent is already a partner on this deal.")
        
    deal.partners.append(partner)
    db.commit()
    
    return {"status": "success", "message": f"{partner.first_name} added as a co-pilot."}

# ==========================================
# TASK ROUTES (The Daily Dashboard)
# ==========================================
@router.get("/users/{user_id}/tasks/", response_model=List[schemas.TaskResponse])
def get_user_tasks(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.role == "Broker":
        team_agents = db.query(models.User.user_id).filter(models.User.brokerage_id == user.brokerage_id).all()
        team_ids = [agent.user_id for agent in team_agents]
        return db.query(models.Task).filter(models.Task.user_id.in_(team_ids)).order_by(models.Task.due_date.asc()).all()
    else:
        return db.query(models.Task).filter(models.Task.user_id == user_id).order_by(models.Task.due_date.asc()).all()

@router.patch("/tasks/{task_id}/status")
def update_task_status(task_id: UUID, is_completed: str, db: Session = Depends(get_db)):
    # 1. Find the specific task
    task = db.query(models.Task).filter(models.Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    
    # 2. Update to whatever status the frontend sent ("True" or "False")
    task.is_completed = is_completed
    db.commit()
    
    return {"status": "success", "message": f"Task marked as {is_completed}."}

# ==========================================
# COMPLIANCE TEMPLATE ROUTES
# ==========================================
@router.get("/users/{user_id}/broker-inbox/")
def get_broker_inbox(user_id: UUID, db: Session = Depends(get_db)):
    # 1. Verify this is actually a Managing Broker
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user or user.role != "Broker":
        raise HTTPException(status_code=403, detail="Only Managing Brokers can access the compliance inbox.")

    # 2. Find every agent attached to this broker's company
    team_agents = db.query(models.User.user_id).filter(models.User.brokerage_id == user.user_id).all()
    team_ids = [agent.user_id for agent in team_agents]

    # 3. Find every deal owned by those agents
    team_deals = db.query(models.Deal).filter(models.Deal.user_id.in_(team_ids)).all()
    deal_ids = [deal.deal_id for deal in team_deals]

    # 4. Find all documents strictly waiting for review ("Uploaded")
    pending_docs = db.query(models.DealDocument).filter(
        models.DealDocument.deal_id.in_(deal_ids),
        models.DealDocument.status == "Uploaded"
    ).all()

    # 5. Package the data so the React frontend has full context
    inbox = []
    for doc in pending_docs:
        deal = next((d for d in team_deals if d.deal_id == doc.deal_id), None)
        agent = db.query(models.User).filter(models.User.user_id == deal.user_id).first() if deal else None
        
        inbox.append({
            "doc": doc,
            "deal_name": deal.deal_name if deal else "Unknown Deal",
            "agent_name": f"{agent.first_name} {agent.last_name}" if agent else "Unknown Agent"
        })

    return inbox

@router.post(
    "/users/{user_id}/templates/", 
    response_model=schemas.DocumentTemplateResponse, 
    dependencies=[Depends(auth.get_current_broker)] # <-- THE BOUNCER MOVES HERE
)
def create_template(user_id: UUID, template: schemas.DocumentTemplateCreate, db: Session = Depends(get_db)):
    # Verify agent exists
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found.")
    
    new_template = models.DocumentTemplate(**template.model_dump(), user_id=user_id)
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

@router.get("/users/{user_id}/templates/", response_model=List[schemas.DocumentTemplateResponse])
def get_user_templates(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # THE CASCADE: If they are an Agent, pull from their Broker's library. 
    # If they are a Broker, pull from their own library.
    target_id = user.brokerage_id if user.role == "Agent" else user.user_id
    
    # Fetches all templates and automatically includes their nested items
    return db.query(models.DocumentTemplate).filter(models.DocumentTemplate.user_id == target_id).all()

@router.post(
    "/templates/{template_id}/items/", 
    response_model=schemas.TemplateItemResponse,
    dependencies=[Depends(auth.get_current_broker)] # <-- AND HERE
)
def add_template_item(template_id: UUID, item: schemas.TemplateItemCreate, db: Session = Depends(get_db)):
    # Verify template exists
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    
    new_item = models.TemplateItem(**item.model_dump(), template_id=template_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item