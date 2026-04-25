from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.base import Invoice, InvoiceStatus, User
from app.schemas.schemas import InvoiceOut, InvoiceStatusUpdate

router = APIRouter(prefix="/users/{user_id}/invoices", tags=["Invoices"])


def _require_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("", response_model=list[InvoiceOut])
def list_invoices(user_id: int, status: str | None = None, db: Session = Depends(get_db)):
    _require_user(db, user_id)
    q = db.query(Invoice).filter(Invoice.user_id == user_id)
    if status:
        q = q.filter(Invoice.status == status)
    return q.order_by(Invoice.created_at.desc()).all()


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(user_id: int, invoice_id: int, db: Session = Depends(get_db)):
    _require_user(db, user_id)
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return inv


@router.put("/{invoice_id}/status", response_model=InvoiceOut)
def update_invoice_status(user_id: int, invoice_id: int, body: InvoiceStatusUpdate, db: Session = Depends(get_db)):
    _require_user(db, user_id)
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    inv.status = InvoiceStatus(body.status)
    if body.status == "paid":
        inv.paid_at = datetime.utcnow()
        if body.paid_from_account_id:
            inv.paid_from_account_id = body.paid_from_account_id
        if body.payment_reference:
            inv.payment_reference = body.payment_reference

    db.commit()
    db.refresh(inv)
    return inv


@router.get("/stats/summary")
def invoice_stats(user_id: int, db: Session = Depends(get_db)):
    _require_user(db, user_id)
    invoices = db.query(Invoice).filter(Invoice.user_id == user_id).all()
    total = len(invoices)
    paid = [i for i in invoices if i.status == InvoiceStatus.PAID]
    pending = [i for i in invoices if i.status == InvoiceStatus.PENDING]
    overdue = [i for i in invoices if i.status == InvoiceStatus.OVERDUE]

    return {
        "total": total,
        "paid_count": len(paid),
        "paid_amount": sum(i.amount for i in paid),
        "pending_count": len(pending),
        "pending_amount": sum(i.amount for i in pending),
        "overdue_count": len(overdue),
        "overdue_amount": sum(i.amount for i in overdue),
    }
