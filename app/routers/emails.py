from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.base import EmailConnection, EmailMessage, User
from app.schemas.schemas import EmailConnectRequest, EmailConnectionOut, EmailMessageOut

router = APIRouter(tags=["Email"])


@router.post("/users/{user_id}/email/connect", response_model=EmailConnectionOut, status_code=201)
def connect_email(user_id: int, payload: EmailConnectRequest, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(404, "User not found")

    conn = EmailConnection(
        user_id=user_id,
        email_address=payload.email_address,
        provider=payload.provider,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.get("/users/{user_id}/emails", response_model=list[EmailMessageOut])
def list_emails(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(EmailMessage)
        .filter(EmailMessage.user_id == user_id)
        .order_by(EmailMessage.received_at.desc())
        .all()
    )


@router.get("/users/{user_id}/email/connections", response_model=list[EmailConnectionOut])
def list_email_connections(user_id: int, db: Session = Depends(get_db)):
    return db.query(EmailConnection).filter(EmailConnection.user_id == user_id).all()
