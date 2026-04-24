from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from uuid import UUID
from typing import List

from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


class VehicleService:

    @staticmethod
    def create(db: Session, payload: VehicleCreate, owner_id: UUID) -> Vehicle:
        """Create a new vehicle scoped to the logged-in owner."""
        vehicle = Vehicle(**payload.model_dump(), owner_id=owner_id)
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
    def get_all(db: Session, owner_id: UUID, skip: int = 0, limit: int = 50) -> List[Vehicle]:
        """Return paginated list of vehicles for this owner only."""
        return (
            db.query(Vehicle)
            .filter(Vehicle.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, vehicle_id: UUID, owner_id: UUID) -> Vehicle:
        """Fetch a single vehicle, ensuring it belongs to the owner."""
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.owner_id == owner_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle '{vehicle_id}' not found."
            )
        return vehicle

    @staticmethod
    def update(db: Session, vehicle_id: UUID, payload: VehicleUpdate, owner_id: UUID) -> Vehicle:
        """Partial update — only changes fields that are provided."""
        vehicle = VehicleService.get_by_id(db, vehicle_id, owner_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(vehicle, field, value)
        db.commit()
        db.refresh(vehicle)
        return vehicle
