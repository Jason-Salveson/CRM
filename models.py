# models.py
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Table, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# 1. The Many-to-Many Association Table (Contact <-> Tags)
# We define this as a standard Table rather than a Class because it only holds foreign keys.
contact_tags = Table(
    'contact_tags',
    Base.metadata,
    Column('contact_id', UUID(as_uuid=True), ForeignKey('contacts.contact_id', ondelete="CASCADE"), primary_key=True),
    Column('tag_id', UUID(as_uuid=True), ForeignKey('tags.tag_id', ondelete="CASCADE"), primary_key=True),
    Column('assigned_at', DateTime(timezone=True), server_default=func.now())
)

# 2. Users Table
class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deals = relationship("Deal", back_populates="owner", cascade="all, delete-orphan")

    # Relationships: If a user is deleted, their contacts and tags vanish too.
    contacts = relationship("Contact", back_populates="owner", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="owner", cascade="all, delete-orphan")

# 3. Contacts Table
class Contact(Base):
    __tablename__ = "contacts"

    contact_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"))
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50))
    email = Column(String(255))
    phone = Column(String(20))
    physical_address = Column(Text)
    
    # The MREA Constraint
    mrea_category = Column(String(20), CheckConstraint("mrea_category IN ('Met', 'Haven''t Met')"))

    lead_source = Column(String(100))
    notes = Column(Text)
    spouse_id = Column(UUID(as_uuid=True), ForeignKey("contacts.contact_id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="contacts")
    tags = relationship("Tag", secondary=contact_tags, back_populates="contacts")
    deals = relationship("Deal", back_populates="client", cascade="all, delete-orphan")
    
    # NEW: The relationship mapper (remote_side tells SQLAlchemy it points to itself)
    spouse = relationship("Contact", remote_side=[contact_id])

# 4. Tags Table
class Tag(Base):
    __tablename__ = "tags"
    # Prevents an agent from creating two tags with the exact same name
    __table_args__ = (UniqueConstraint('user_id', 'tag_name', name='_user_tag_uc'),)

    tag_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"))
    tag_name = Column(String(50), nullable=False)
    color_hex = Column(String(7), default="#CCCCCC")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="tags")
    contacts = relationship("Contact", secondary=contact_tags, back_populates="tags")



class Deal(Base):
    __tablename__ = "deals"

    deal_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"))
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.contact_id", ondelete="CASCADE"))
    
    deal_name = Column(String(100), nullable=False) # e.g., "Keller - 123 Main St Purchase"
    deal_type = Column(String(20), CheckConstraint("deal_type IN ('Buyer', 'Seller', 'Lease')"))
    
    # The MREA Pipeline Stages
    stage = Column(String(50), CheckConstraint("stage IN ('Lead', 'Contact', 'Appointment', 'Active', 'Under Contract', 'Closed')"), default='Lead')
    
    property_address = Column(Text)
    estimated_value = Column(String(50)) # Kept as string for now to handle inputs like "$500k" or "500000"
    commission_rate = Column(String(10)) # e.g., "3%"
    
    expected_close_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="deals")
    client = relationship("Contact", back_populates="deals")

class Task(Base):
    __tablename__ = "tasks"

    task_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"))
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.contact_id", ondelete="CASCADE"))
    
    # Optional: If the task is related to a specific transaction
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.deal_id", ondelete="CASCADE"), nullable=True)
    
    task_name = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(DateTime(timezone=True))
    is_completed = Column(String(5), default="False") # Keeping as string for SQLite/Postgres cross-compatibility during dev
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User")
    client = relationship("Contact")
    deal = relationship("Deal")

class Note(Base):
    __tablename__ = "notes"

    note_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.contact_id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Optional: Relationship back to contact
    contact = relationship("Contact")

# 8. Document Templates (The Master Checklists)
class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    template_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"))
    
    template_name = Column(String(100), nullable=False) # e.g., "Standard AZ Buyer"
    deal_type = Column(String(20), CheckConstraint("deal_type IN ('Buyer', 'Seller', 'Lease')"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User")
    items = relationship("TemplateItem", back_populates="template", cascade="all, delete-orphan")

# 9. Template Items (The Individual Required Documents)
class TemplateItem(Base):
    __tablename__ = "template_items"

    item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("document_templates.template_id", ondelete="CASCADE"))
    
    document_name = Column(String(255), nullable=False) # e.g., "Real Estate Agency Disclosure"
    is_required = Column(String(5), default="True") # Using string for DB cross-compatibility
    
    # Relationships
    template = relationship("DocumentTemplate", back_populates="items")

# 10. Deal Documents (The specific checklist for a specific transaction)
class DealDocument(Base):
    __tablename__ = "deal_documents"

    doc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.deal_id", ondelete="CASCADE"))
    
    document_name = Column(String(255), nullable=False)
    # Status tracks where the document is in the pipeline
    status = Column(String(50), CheckConstraint("status IN ('Missing', 'Uploaded', 'Approved', 'Rejected')", name="chk_document_status"), default="Missing")
    is_required = Column(String(5), default="True")
    reviewer_notes = Column(Text, nullable=True)
    
    # We will eventually add a file_url column here when you are ready to upload PDFs!
    
    # Relationship tying it back to the specific transaction
    deal = relationship("Deal", backref="documents")