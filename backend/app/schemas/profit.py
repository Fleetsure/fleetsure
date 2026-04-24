from pydantic import BaseModel
from typing import Dict
from uuid import UUID
from decimal import Decimal


class ProfitResponse(BaseModel):
    trip_id: UUID
    origin: str
    destination: str
    freight_amount: Decimal          # Revenue
    total_expenses: Decimal          # Sum of all expenses
    profit: Decimal                  # freight_amount - total_expenses
    margin_percent: Decimal          # (profit / freight_amount) * 100
    expense_breakdown: Dict[str, Decimal]  # Per category breakdown
    is_profitable: bool

    model_config = {"from_attributes": True}
