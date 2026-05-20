from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from app.db import supabase
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])

MAX_SIZE = 8 * 1024 * 1024


class DocumentCreate(BaseModel):
    name: str
    doc_type: Optional[str] = "other"
    vehicle_id: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    content_b64: Optional[str] = None
    notes: Optional[str] = None


def _resp(doc: dict, vehicles: dict) -> dict:
    return {**doc, "reg_number": vehicles.get(str(doc.get("vehicle_id"))) if doc.get("vehicle_id") else None, "has_file": bool(doc.get("content_b64"))}


@router.post("/", status_code=201)
def upload_document(payload: DocumentCreate, current_user: dict = Depends(get_current_user)):
    if payload.content_b64 and len(payload.content_b64) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 6MB)")
    data = {**payload.model_dump(), "owner_id": current_user["id"]}
    res = supabase.table("documents").insert(data).execute()
    vehicles = {v["id"]: v["registration_number"] for v in supabase.table("vehicles").select("id,registration_number").eq("owner_id", current_user["id"]).execute().data}
    return _resp(res.data[0], vehicles)


@router.get("/")
def list_documents(vehicle_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    q = supabase.table("documents").select("*").eq("owner_id", current_user["id"]).order("created_at", desc=True)
    if vehicle_id:
        q = q.eq("vehicle_id", vehicle_id)
    docs = q.execute().data
    vehicles = {v["id"]: v["registration_number"] for v in supabase.table("vehicles").select("id,registration_number").eq("owner_id", current_user["id"]).execute().data}
    return [_resp(d, vehicles) for d in docs]


@router.get("/{doc_id}/download")
def download_document(doc_id: UUID, current_user: dict = Depends(get_current_user)):
    doc = supabase.table("documents").select("*").eq("id", str(doc_id)).eq("owner_id", current_user["id"]).single().execute().data
    if not doc:
        raise HTTPException(404, "Document not found")
    return {"content_b64": doc.get("content_b64"), "mime_type": doc.get("mime_type"), "file_name": doc.get("file_name")}


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: UUID, current_user: dict = Depends(get_current_user)):
    res = supabase.table("documents").delete().eq("id", str(doc_id)).eq("owner_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(404, "Document not found")
