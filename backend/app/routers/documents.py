from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from app.database import get_db
from app.models.document import Document
from app.models.vehicle import Vehicle

router = APIRouter(prefix="/documents", tags=["Documents"])

MAX_SIZE = 8 * 1024 * 1024  # 8MB base64 string limit

class DocumentCreate(BaseModel):
    name: str
    doc_type: Optional[str] = "other"
    vehicle_id: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    content_b64: Optional[str] = None
    notes: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    name: str
    doc_type: Optional[str]
    vehicle_id: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    notes: Optional[str]
    created_at: str
    reg_number: Optional[str] = None
    has_file: bool

@router.post("/", status_code=201)
def upload_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    if payload.content_b64 and len(payload.content_b64) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 6MB)")
    doc = Document(
        name=payload.name,
        doc_type=payload.doc_type,
        vehicle_id=payload.vehicle_id,
        file_name=payload.file_name,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
        content_b64=payload.content_b64,
        notes=payload.notes,
    )
    db.add(doc); db.commit(); db.refresh(doc)
    vehicles = {str(v.id): v.reg_number for v in db.query(Vehicle).all()}
    return _resp(doc, vehicles)

@router.get("/")
def list_documents(vehicle_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Document).order_by(Document.created_at.desc())
    if vehicle_id:
        q = q.filter(Document.vehicle_id == vehicle_id)
    docs = q.all()
    vehicles = {str(v.id): v.reg_number for v in db.query(Vehicle).all()}
    return [_resp(d, vehicles) for d in docs]

@router.get("/{doc_id}/download")
def download_document(doc_id: UUID, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    return {"content_b64": doc.content_b64, "mime_type": doc.mime_type, "file_name": doc.file_name}

@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: UUID, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    db.delete(doc); db.commit()

def _resp(doc: Document, vehicles: dict) -> dict:
    return {
        "id": str(doc.id),
        "name": doc.name,
        "doc_type": doc.doc_type,
        "vehicle_id": str(doc.vehicle_id) if doc.vehicle_id else None,
        "file_name": doc.file_name,
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "notes": doc.notes,
        "created_at": str(doc.created_at),
        "reg_number": vehicles.get(str(doc.vehicle_id)) if doc.vehicle_id else None,
        "has_file": bool(doc.content_b64),
    }
