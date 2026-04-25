from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from uuid import UUID
from typing import List, Optional

from app.models.driver import Driver
from app.schemas.driver import DriverCreate, DriverUpdate


class DriverService:

    @staticmethod
    def create(db: Session, payload: DriverCreate, owner_id: Optional[UUID] = None) -> Driver:
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
    def get_all(db: Session, owner_id: Optional[UUID] = None, skip: int = 0, limit: int = 50) -> List[Driver]:
        q = db.query(Driver)
        if owner_id is not None:
            q = q.filter(Driver.owner_id == owner_id)
        return q.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, driver_id: UUID, owner_id: Optional[UUID] = None) -> Driver:
        q = db.query(Driver).filter(Driver.id == driver_id)
        if owner_id is not None:
            q = q.filter(Driver.owner_id == owner_id)
        driver = q.first()
        if not driver:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Driver '{driver_id}' not found.")
        return driver

    @staticmethod
    def update(db: Session, driver_id: UUID, payload: DriverUpdate, owner_id: Optional[UUID] = None) -> Driver:
        driver = DriverService.get_by_id(db, driver_id, owner_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(driver, field, value)
        db.commit()
        db.refresh(driver)
        return driver
