import uuid
from sqlalchemy import Column, String, Text, DateTime, func, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Document(Base):
    __tablename__ = "documents"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(300), nullable=False)
    doc_type    = Column(String(100), nullable=True)   # RC, insurance, PUC, permit, other
    vehicle_id  = Column(UUID(as_uuid=True), nullable=True, index=True)
    file_name   = Column(String(300), nullable=True)
    file_size   = Column(Integer, nullable=True)        # bytes
    mime_type   = Column(String(100), nullable=True)
    content_b64 = Column(Text, nullable=True)           # base64 encoded file content
    notes       = Column(Text, nullable=True)
    owner_id    = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
