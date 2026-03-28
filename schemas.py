# schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# ==========================================
# TAG SCHEMAS
# ==========================================
class TagBase(BaseModel):
    tag_name: str = Field(..., max_length=50)
    color_hex: Optional[str] = Field(default="#CCCCCC", max_length=7)

class TagCreate(TagBase):
    pass # Needs the same data as the Base, so we just inherit it

class TagResponse(TagBase):
    tag_id: UUID
    user_id: UUID
    created_at: datetime

    # This config tells Pydantic to read data directly from the SQLAlchemy ORM objects
    model_config = ConfigDict(from_attributes=True) 

# ==========================================
# CONTACT SCHEMAS
# ==========================================
class ContactBase(BaseModel):
    first_name: str = Field(..., max_length=50)
    last_name: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = None # Automatically validates it has an @ symbol
    phone: Optional[str] = Field(default=None, max_length=20)
    physical_address: Optional[str] = None
    mrea_category: str = Field(..., pattern="^(Met|Haven't Met)$") # Enforces MREA strictness
    lead_source: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None
    spouse_id: Optional[UUID] = None

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    contact_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse] = [] # Nests the tags inside the contact response

    model_config = ConfigDict(from_attributes=True)

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mrea_category: Optional[str] = None

# ==========================================
# USER SCHEMAS (The Agents)
# ==========================================
class UserBase(BaseModel):
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    # In a real production app, we would add 'password' here to be hashed later.
    pass

class UserResponse(UserBase):
    user_id: UUID
    created_at: datetime
    # We could include contacts here, but it's usually better to fetch them separately 
    # so we don't load 10,000 contacts every time we just want the user's name.

    model_config = ConfigDict(from_attributes=True)

# Add this to the bottom of schemas.py

# ==========================================
# DEAL SCHEMAS (The Pipeline)
# ==========================================
class DealBase(BaseModel):
    deal_name: str = Field(..., max_length=100)
    deal_type: str = Field(..., pattern="^(Buyer|Seller|Lease)$")
    stage: str = Field(default="Lead", pattern="^(Lead|Contact|Appointment|Active|Under Contract|Closed)$")
    property_address: Optional[str] = None
    estimated_value: Optional[str] = None
    commission_rate: Optional[str] = None
    expected_close_date: Optional[datetime] = None

class DealCreate(DealBase):
    pass

class DealResponse(DealBase):
    deal_id: UUID
    user_id: UUID
    contact_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DealUpdate(BaseModel):
    deal_name: Optional[str] = None
    deal_type: Optional[str] = Field(default=None, pattern="^(Buyer|Seller|Lease)$")
    stage: Optional[str] = Field(default=None, pattern="^(Lead|Contact|Appointment|Active|Under Contract|Closed)$")
    property_address: Optional[str] = None
    estimated_value: Optional[str] = None
    commission_rate: Optional[str] = None
    expected_close_date: Optional[datetime] = None
    
class DealStageUpdate(BaseModel):
    new_stage: str = Field(..., pattern="^(Lead|Contact|Appointment|Active|Under Contract|Closed)$")

# Add this to the bottom of schemas.py

# ==========================================
# TASK SCHEMAS (The Automation Outputs)
# ==========================================
class TaskBase(BaseModel):
    task_name: str = Field(..., max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[str] = Field(default="False", pattern="^(True|False)$")

class TaskCreate(TaskBase):
    # These are optional here because our engine in services.py will assign them automatically
    user_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None

class TaskResponse(TaskBase):
    task_id: UUID
    user_id: UUID
    contact_id: UUID
    deal_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NoteCreate(BaseModel):
    content: str

class NoteResponse(BaseModel):
    note_id: UUID
    contact_id: UUID
    content: str
    created_at: datetime

    class Config:
        from_attributes = True