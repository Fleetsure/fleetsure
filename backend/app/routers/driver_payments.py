from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.driver_payment import DriverPayment, PaymentType
from app.models.driver import Driver
from app.schemas.driver_payment import DriverPaymentCreate, DriverPaymentResponse, DriverLedgerResponse

router = APIRouter(prefix="/driver-payments", tags=["Driver Payments"])


@router.post("/", response_model=DriverPaymentResponse, status_code=201)
def add_payment(payload: DriverPaymentCreate, db: Session = Depends(get_db)):
    payment = DriverPayment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/", response_model=List[DriverPaymentResponse])
def get_payments(driver_id: UUID = None, skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    q = db.query(DriverPayment).order_by(DriverPayment.date.desc())
    if driver_id:
        q = q.filter(DriverPayment.driver_id == driver_id)
    return q.offset(skip).limit(limit).all()


@router.delete("/{payment_id}", status_code=204)
def delete_payment(payment_id: UUID, db: Session = Depends(get_db)):
    p = db.query(DriverPayment).filter(DriverPayment.id == payment_id).first()
    if not p:
        raise HTTPException(404, "Payment not found")
    db.delete(p)
    db.commit()


@router.get("/ledger/{driver_id}", response_model=DriverLedgerResponse)
def driver_ledger(driver_id: UUID, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(404, "Driver not found")

    payments = (db.query(DriverPayment)
                .filter(DriverPayment.driver_id == driver_id)
                .order_by(DriverPayment.date.desc())
                .all())

    credit_types = {PaymentType.ADVANCE, PaymentType.SALARY, PaymentType.BONUS, PaymentType.SETTLEMENT}
    total_paid     = sum(float(p.amount) for p in payments if p.type in credit_types)
    total_deducted = sum(float(p.amount) for p in payments if p.type == PaymentType.DEDUCTION)
    net_balance    = total_deducted - total_paid   # positive = driver owes us

    return DriverLedgerResponse(
        driver_id=driver.id,
        driver_name=driver.name,
        driver_phone=driver.phone,
        total_paid=total_paid,
        total_deducted=total_deducted,
        net_balance=net_balance,
        payments=payments,
    )
