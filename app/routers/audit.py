from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.base import AuditLog
from app.schemas.schemas import AuditLogOut

router = APIRouter(tags=["Audit"])


@router.get("/users/{user_id}/audit-logs", response_model=list[AuditLogOut])
def list_audit_logs(user_id: int, limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
