from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from uuid import UUID
from typing import List

from app.models.trip import Trip
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.trip import TripCreate, TripUpdate


class TripService:

    @staticmethod
    def create(db: Session, payload: TripCreate) -> Trip:
        """
        Create a trip.
        - Validates vehicle exists and is not already in a trip.
        - Updates vehicle status to IN_TRIP.
        """
        vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle '{payload.vehicle_id}' not found."
            )
        if vehicle.status == VehicleStatus.IN_TRIP:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vehicle '{vehicle.registration_number}' is already on a trip."
            )
        if vehicle.status == VehicleStatus.MAINTENANCE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vehicle '{vehicle.registration_number}' is under maintenance."
            )

        trip = Trip(**payload.model_dump())
        db.add(trip)

        # Mark vehicle as in-trip
        vehicle.status = VehicleStatus.IN_TRIP

        db.commit()
        db.refresh(trip)
        return trip

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 50) -> List[Trip]:
        return db.query(Trip).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, trip_id: UUID) -> Trip:
        """Fetch trip with vehicle and expenses eagerly loaded."""
        trip = (
            db.query(Trip)
            .options(
                joinedload(Trip.vehicle),
                joinedload(Trip.expenses)
            )
            .filter(Trip.id == trip_id)
            .first()
        )
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip '{trip_id}' not found."
            )
        return trip

    @staticmethod
    def update(db: Session, trip_id: UUID, payload: TripUpdate) -> Trip:
        """
        Update trip fields.
        If status changes to COMPLETED or CANCELLED → set vehicle back to ACTIVE.
        """
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip '{trip_id}' not found."
            )

        update_data = payload.model_dump(exclude_unset=True)
        new_status = update_data.get("status")

        for field, value in update_data.items():
            setattr(trip, field, value)

        # Release vehicle when trip ends
        if new_status in ("completed", "cancelled"):
            vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
            if vehicle:
                vehicle.status = VehicleStatus.ACTIVE

        db.commit()
        db.refresh(trip)
        return trip
