from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from uuid import UUID
from decimal import Decimal
from typing import List

from app.models.expense import Expense
from app.models.trip import Trip
from app.schemas.expense import ExpenseCreate
from app.schemas.profit import ProfitResponse


class ExpenseService:

    @staticmethod
    def add_to_trip(db: Session, trip_id: UUID, payload: ExpenseCreate) -> Expense:
        """Add an expense to a trip. Validates trip exists."""
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip '{trip_id}' not found."
            )
        if trip.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add expenses to a cancelled trip."
            )

        expense = Expense(trip_id=trip_id, **payload.model_dump())
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return expense

    @staticmethod
    def get_by_trip(db: Session, trip_id: UUID) -> List[Expense]:
        return db.query(Expense).filter(Expense.trip_id == trip_id).all()

    @staticmethod
    def calculate_profit(db: Session, trip_id: UUID) -> ProfitResponse:
        """
        Core business logic: Profit = Freight Amount - Total Expenses

        Also returns:
        - Per-category expense breakdown
        - Profit margin %
        - Boolean is_profitable flag
        """
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip '{trip_id}' not found."
            )

        expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()

        # Build per-category breakdown
        breakdown: dict[str, Decimal] = {}
        total_expenses = Decimal("0.00")

        for expense in expenses:
            category = str(expense.expense_type)
            amount = Decimal(str(expense.amount))
            breakdown[category] = breakdown.get(category, Decimal("0.00")) + amount
            total_expenses += amount

        freight = Decimal(str(trip.freight_amount))
        profit = freight - total_expenses

        # Avoid division by zero
        if freight > 0:
            margin = round((profit / freight) * 100, 2)
        else:
            margin = Decimal("0.00")

        return ProfitResponse(
            trip_id=trip.id,
            origin=trip.origin,
            destination=trip.destination,
            freight_amount=freight,
            total_expenses=total_expenses,
            profit=profit,
            margin_percent=margin,
            expense_breakdown=breakdown,
            is_profitable=profit > 0,
        )
