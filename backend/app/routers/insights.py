from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.models.insight import OperationalInsight
from app.models.user import User
from app.schemas.insight import InsightResponse, InsightsSummary, RefreshResult
from app.services.auth_service import get_current_user
from app.services.insights_service import refresh_insights

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/", response_model=InsightsSummary)
def get_insights(
    include_dismissed: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all operational insights for the current user's fleet."""
    q = db.query(OperationalInsight).filter(
        OperationalInsight.owner_id == current_user.id
    )
    if not include_dismissed:
        q = q.filter(OperationalInsight.is_dismissed == False)  # noqa: E712

    insights = q.order_by(OperationalInsight.created_at.desc()).all()
    unread = sum(1 for i in insights if not i.is_read)

    return InsightsSummary(total=len(insights), unread=unread, insights=insights)


@router.post("/refresh", response_model=RefreshResult)
def trigger_refresh(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-run all insight detectors for the current user. Call on login or on demand."""
    result = refresh_insights(db, current_user.id)
    return result


@router.patch("/{insight_id}/read", response_model=InsightResponse)
def mark_read(
    insight_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single insight as read."""
    ins = db.query(OperationalInsight).filter(
        OperationalInsight.id == insight_id,
        OperationalInsight.owner_id == current_user.id,
    ).first()
    if not ins:
        raise HTTPException(404, "Insight not found")
    ins.is_read = True
    db.commit()
    db.refresh(ins)
    return ins


@router.patch("/read-all", response_model=dict)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all insights as read."""
    db.query(OperationalInsight).filter(
        OperationalInsight.owner_id == current_user.id,
        OperationalInsight.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.patch("/{insight_id}/dismiss", response_model=InsightResponse)
def dismiss_insight(
    insight_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dismiss an insight so it doesn't reappear."""
    ins = db.query(OperationalInsight).filter(
        OperationalInsight.id == insight_id,
        OperationalInsight.owner_id == current_user.id,
    ).first()
    if not ins:
        raise HTTPException(404, "Insight not found")
    ins.is_dismissed = True
    ins.is_read = True
    db.commit()
    db.refresh(ins)
    return ins
