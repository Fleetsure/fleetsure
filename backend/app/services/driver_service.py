from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from uuid import UUID
from typing import List

from app.models.driver import Driver
from app.schemas.driver import DriverCreate, DriverUpdate


class DriverService:

    @staticmethod
    def create(db: Session, payload: DriverCreate, owner_id: UUID) -> Driver:
        driver = Driver(**payload.model_dump(), owner_id=owner_id)
        db.add(driver)
        try:
            db.commit()
            db.refresh(driver)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Driver with phone '{payload.phone}' already exists."
            )
        return driver

    @staticmethod
    def get_all(db: Session, owner_id: UUID, skip: int = 0, limit: int = 50) -> List[Driver]:
        return (
            db.query(Driver)
            .filter(Driver.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, driver_id: UUID, owner_id: UUID) -> Driver:
        driver = db.query(Driver).filter(Driver.id == driver_id, Driver.owner_id == owner_id).first()
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Driver '{driver_id}' not found."
            )
        return driver

    @staticmethod
    def update(db: Session, driver_id: UUID, payload: DriverUpdate, owner_id: UUID) -> Driver:
        driver = DriverService.get_by_id(db, driver_id, owner_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(driver, field, value)
        db.commit()
        db.refresh(driver)
        return driver
