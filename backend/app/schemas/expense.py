from pydantic import BaseModel, field_validator
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from app.models.expense import ExpenseType


class ExpenseCreate(BaseModel):
    expense_type: ExpenseType
    amount: Decimal
    description: Optional[str] = None
    date: date

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return round(v, 2)


class ExpenseResponse(BaseModel):
    id: UUID
    trip_id: UUID
    expense_type: ExpenseType
    amount: Decimal
    description: Optional[str]
    date: date
    created_at: datetime

    model_config = {"from_attributes": True}
