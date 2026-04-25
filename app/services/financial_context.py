"""Builds a structured financial context for a user, consumed by AI agents."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.base import (
    BankAccount,
    EmailMessage,
    Subscription,
    Transaction,
    User,
)


def build_financial_context(db: Session, user_id: int, *, days: int = 90) -> dict[str, Any]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")

    cutoff = datetime.utcnow() - timedelta(days=days)

    accounts = db.query(BankAccount).filter(BankAccount.user_id == user_id).all()
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.date >= cutoff)
        .order_by(Transaction.date.desc())
        .all()
    )
    subscriptions = db.query(Subscription).filter(Subscription.user_id == user_id).all()
    emails = (
        db.query(EmailMessage)
        .filter(EmailMessage.user_id == user_id)
        .order_by(EmailMessage.received_at.desc())
        .limit(50)
        .all()
    )

    accounts_data = [
        {
            "id": a.id,
            "name": a.name,
            "type": a.account_type.value if hasattr(a.account_type, "value") else str(a.account_type),
            "balance": a.balance,
            "currency": a.currency,
        }
        for a in accounts
    ]

    txn_data = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "amount": t.amount,
            "description": t.description,
            "category": t.category,
            "merchant": t.merchant,
            "type": t.transaction_type,
            "date": t.date.isoformat() if t.date else None,
        }
        for t in transactions
    ]

    income = sum(t.amount for t in transactions if t.transaction_type == "credit")
    spending = sum(abs(t.amount) for t in transactions if t.transaction_type == "debit")

    category_spend: dict[str, float] = {}
    for t in transactions:
        if t.transaction_type == "debit" and t.category:
            category_spend[t.category] = category_spend.get(t.category, 0) + abs(t.amount)

    subs_data = [
        {
            "id": s.id,
            "name": s.name,
            "amount": s.amount,
            "frequency": s.frequency,
            "category": s.category,
            "is_active": s.is_active,
        }
        for s in subscriptions
    ]

    email_data = [
        {
            "id": e.id,
            "sender": e.sender,
            "subject": e.subject,
            "body": e.body[:500],
            "category": e.category,
            "received_at": e.received_at.isoformat() if e.received_at else None,
        }
        for e in emails
    ]

    total_balance = sum(a.balance for a in accounts)

    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "accounts": accounts_data,
        "total_balance": total_balance,
        "monthly_income": round(income, 2),
        "monthly_spending": round(spending, 2),
        "spending_by_category": category_spend,
        "transactions": txn_data,
        "subscriptions": subs_data,
        "emails": email_data,
    }
