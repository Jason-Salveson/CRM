# routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import services
import models, schemas
from database import get_db
from typing import List

# Initialize the router
router = APIRouter()

# ==========================================
# USER ROUTES
# ==========================================
@router.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Security Check: Does this email already exist?
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    # 2. Conversion: Turn the Pydantic schema into a SQLAlchemy model
    new_user = models.User(**user.model_dump())
    
    # 3. Execution: Save to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # Grabs the new auto-generated UUID and timestamps
    
    return new_user

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
    # 1. Security Check
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found.")
    
    # 2. Fetch all contacts for this agent
    contacts = db.query(models.Contact).filter(models.Contact.user_id == user_id).all()
    
    return contacts

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

# Add this inside the DEAL ROUTES section in routes.py
@router.get("/users/{user_id}/deals/", response_model=List[schemas.DealResponse])
def get_user_deals(user_id: UUID, db: Session = Depends(get_db)):
    # 1. Security Check
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found.")
    
    # 2. Fetch all deals for this agent
    deals = db.query(models.Deal).filter(models.Deal.user_id == user_id).all()
    
    return deals

# ==========================================
# TASK ROUTES (The Daily Dashboard)
# ==========================================
@router.get("/users/{user_id}/tasks/", response_model=List[schemas.TaskResponse])
def get_user_tasks(user_id: UUID, db: Session = Depends(get_db)):
    # 1. Security Check
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found.")
    
    # 2. Fetch ALL tasks for this agent (we removed the completion filter)
    tasks = db.query(models.Task).filter(
        models.Task.user_id == user_id
    ).order_by(models.Task.due_date.asc()).all()
    
    return tasks

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