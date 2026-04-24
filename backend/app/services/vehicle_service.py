from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from uuid import UUID
from typing import List

from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


class VehicleService:

    @staticmethod
    def create(db: Session, payload: VehicleCreate) -> Vehicle:
        """Create a new vehicle. Raises 409 if registration number already exists."""
        vehicle = Vehicle(**payload.model_dump())
        db.add(vehicle)
        try:
            db.commit()
            db.refresh(vehicle)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vehicle with registration '{payload.registration_number}' already exists."
            )
        return vehicle

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 50) -> List[Vehicle]:
        """Return paginated list of vehicles."""
        return db.query(Vehicle).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, vehicle_id: UUID) -> Vehicle:
        """Fetch a single vehicle or raise 404."""
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle '{vehicle_id}' not found."
            )
        return vehicle

    @staticmethod
    def update(db: Session, vehicle_id: UUID, payload: VehicleUpdate) -> Vehicle:
        """Partial update — only changes fields that are provided."""
        vehicle = VehicleService.get_by_id(db, vehicle_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(vehicle, field, value)
        db.commit()
        db.refresh(vehicle)
        return vehicle
