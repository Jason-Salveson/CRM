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

# ==========================================
# TAG ROUTES
# ==========================================
@router.post("/users/{user_id}/tags/", response_model=schemas.TagResponse)
def create_tag(user_id: UUID, tag: schemas.TagCreate, db: Session = Depends(get_db)):
    # 1. Security Check: Ensure the user exists
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Agent not found.")
    
    # 2. Security Check: Prevent duplicate tags for the same agent
    existing_tag = db.query(models.Tag).filter(
        models.Tag.user_id == user_id, 
        models.Tag.tag_name == tag.tag_name
    ).first()
    if existing_tag:
        raise HTTPException(status_code=400, detail="You already have a tag with this name.")

    # 3. Save the new tag
    new_tag = models.Tag(**tag.model_dump(), user_id=user_id)
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return new_tag

# ==========================================
# ASSIGN TAG TO CONTACT
# ==========================================
@router.post("/contacts/{contact_id}/tags/{tag_id}")
def assign_tag_to_contact(contact_id: UUID, tag_id: UUID, db: Session = Depends(get_db)):
    # 1. Fetch both the contact and the tag from the database
    contact = db.query(models.Contact).filter(models.Contact.contact_id == contact_id).first()
    tag = db.query(models.Tag).filter(models.Tag.tag_id == tag_id).first()

    if not contact or not tag:
        raise HTTPException(status_code=404, detail="Contact or Tag not found.")

    # 2. Check if the tag is already attached to this contact
    if tag in contact.tags:
        raise HTTPException(status_code=400, detail="This tag is already assigned to this contact.")

    # 3. The SQLAlchemy Magic: Append the tag to the contact's list
    # SQLAlchemy automatically handles writing to the 'contact_tags' join table!
    contact.tags.append(tag)
    db.commit()

    return {"status": "success", "message": f"Tag '{tag.tag_name}' successfully added to {contact.first_name}."}

# Add this to the bottom of routes.py

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