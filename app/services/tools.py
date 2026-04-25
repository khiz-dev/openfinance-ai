"""
Platform tools available to AI agents.

Each tool is a safe, auditable function that performs a specific financial action.
The LLM never calls these directly — the executor invokes them after policy validation.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.base import (
    AccountTransferInstruction,
    AuditLog,
    BankAccount,
    DirectDebitInstruction,
    InstructionStatus,
    PaymentInstruction,
    Subscription,
    Transaction,
)

logger = logging.getLogger(__name__)

TOOL_REGISTRY: dict[str, dict[str, Any]] = {}


def register_tool(name: str, description: str):
    def decorator(fn):
        TOOL_REGISTRY[name] = {"fn": fn, "description": description, "name": name}
        return fn
    return decorator


def get_available_tools() -> list[dict[str, str]]:
    return [{"name": t["name"], "description": t["description"]} for t in TOOL_REGISTRY.values()]


def execute_tool(name: str, db: Session, user_id: int, params: dict[str, Any]) -> dict[str, Any]:
    if name not in TOOL_REGISTRY:
        return {"success": False, "error": f"Unknown tool: {name}"}
    try:
        clean_params = {k: v for k, v in params.items() if k not in ("user_id", "db")}
        result = TOOL_REGISTRY[name]["fn"](db=db, user_id=user_id, **clean_params)
        _audit(db, user_id, f"tool:{name}", params, result)
        return {"success": True, "result": result}
    except Exception as e:
        logger.exception("Tool %s failed", name)
        return {"success": False, "error": str(e)}


def _audit(db: Session, user_id: int, action: str, params: Any, result: Any):
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        details=json.dumps({"params": _safe_serialize(params), "result": _safe_serialize(result)}),
    ))
    db.commit()


def _safe_serialize(obj: Any) -> Any:
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return str(obj)


# ── Analysis Tools ────────────────────────────────────────────────────

@register_tool("analyse_transactions", "Analyse transaction patterns and spending habits")
def analyse_transactions(db: Session, user_id: int, **kwargs) -> dict[str, Any]:
    txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    categories: dict[str, float] = {}
    total_in = 0.0
    total_out = 0.0
    for t in txns:
        if t.transaction_type == "credit":
            total_in += t.amount
        else:
            total_out += abs(t.amount)
        if t.category:
            categories[t.category] = categories.get(t.category, 0) + abs(t.amount)
    return {
        "transaction_count": len(txns),
        "total_income": round(total_in, 2),
        "total_spending": round(total_out, 2),
        "spending_by_category": categories,
        "top_categories": sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5],
    }


@register_tool("analyse_affordability", "Calculate affordability based on income, spending, and commitments")
def analyse_affordability(db: Session, user_id: int, **kwargs) -> dict[str, Any]:
    accounts = db.query(BankAccount).filter(BankAccount.user_id == user_id).all()
    total_balance = sum(a.balance for a in accounts)
    txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    monthly_income = sum(t.amount for t in txns if t.transaction_type == "credit") / max(1, len(set(t.date.strftime("%Y-%m") for t in txns if t.date)))
    monthly_spending = sum(abs(t.amount) for t in txns if t.transaction_type == "debit") / max(1, len(set(t.date.strftime("%Y-%m") for t in txns if t.date)))
    subs = db.query(Subscription).filter(Subscription.user_id == user_id, Subscription.is_active == True).all()
    monthly_subs = sum(s.amount for s in subs)
    return {
        "total_balance": round(total_balance, 2),
        "avg_monthly_income": round(monthly_income, 2),
        "avg_monthly_spending": round(monthly_spending, 2),
        "monthly_subscriptions": round(monthly_subs, 2),
        "disposable_income": round(monthly_income - monthly_spending, 2),
        "affordability_ratio": round((monthly_income - monthly_spending) / max(monthly_income, 1), 2),
    }


@register_tool("detect_subscriptions", "Detect recurring subscriptions from transaction history")
def detect_subscriptions(db: Session, user_id: int, **kwargs) -> dict[str, Any]:
    subs = db.query(Subscription).filter(Subscription.user_id == user_id).all()
    return {
        "subscriptions": [
            {"name": s.name, "amount": s.amount, "frequency": s.frequency, "active": s.is_active}
            for s in subs
        ],
        "total_monthly": round(sum(s.amount for s in subs if s.is_active), 2),
        "count": len(subs),
    }


@register_tool("scan_emails", "Scan connected email messages for financial content")
def scan_emails(db: Session, user_id: int, **kwargs):
    from app.models.base import EmailMessage
    emails = db.query(EmailMessage).filter(EmailMessage.user_id == user_id).all()
    return {
        "email_count": len(emails),
        "invoices": [
            {"sender": e.sender, "subject": e.subject, "body": e.body[:200]}
            for e in emails if e.category == "invoice"
        ],
        "subscription_emails": [
            {"sender": e.sender, "subject": e.subject}
            for e in emails if e.category == "subscription"
        ],
    }


@register_tool("detect_invoices", "Detect unpaid invoices from emails")
def detect_invoices(db: Session, user_id: int, **kwargs):
    from app.models.base import EmailMessage
    invoices = db.query(EmailMessage).filter(
        EmailMessage.user_id == user_id, EmailMessage.category == "invoice"
    ).all()
    return {
        "invoices": [
            {"id": e.id, "sender": e.sender, "subject": e.subject, "body": e.body[:300]}
            for e in invoices
        ],
        "count": len(invoices),
    }


# ── Action Tools ──────────────────────────────────────────────────────

@register_tool("create_payment_instruction", "Create a payment instruction to pay a payee")
def create_payment_instruction(
    db: Session, user_id: int, *, from_account_id: int, payee_name: str, amount: float, reference: str = "", **kwargs
) -> dict[str, Any]:
    account = db.query(BankAccount).filter(BankAccount.id == from_account_id, BankAccount.user_id == user_id).first()
    if not account:
        raise ValueError(f"Account {from_account_id} not found")
    if account.balance < amount:
        raise ValueError("Insufficient balance")
    instruction = PaymentInstruction(
        user_id=user_id,
        from_account_id=from_account_id,
        payee_name=payee_name,
        amount=amount,
        reference=reference,
        status=InstructionStatus.SIMULATED,
    )
    db.add(instruction)
    account.balance -= amount
    db.commit()
    db.refresh(instruction)
    return {"instruction_id": instruction.id, "status": instruction.status.value, "amount": amount}


@register_tool("transfer_between_accounts", "Transfer money between user's own accounts")
def transfer_between_accounts(
    db: Session, user_id: int, *, from_account_id: int, to_account_id: int, amount: float, reference: str = "", **kwargs
) -> dict[str, Any]:
    from_acc = db.query(BankAccount).filter(BankAccount.id == from_account_id, BankAccount.user_id == user_id).first()
    to_acc = db.query(BankAccount).filter(BankAccount.id == to_account_id, BankAccount.user_id == user_id).first()
    if not from_acc or not to_acc:
        raise ValueError("Account not found")
    if from_acc.balance < amount:
        raise ValueError("Insufficient balance")
    from_acc.balance -= amount
    to_acc.balance += amount
    instruction = AccountTransferInstruction(
        user_id=user_id,
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        amount=amount,
        reference=reference,
        status=InstructionStatus.SIMULATED,
    )
    db.add(instruction)
    db.commit()
    db.refresh(instruction)
    return {"instruction_id": instruction.id, "status": "simulated", "amount": amount}


@register_tool("create_direct_debit", "Set up a direct debit instruction")
def create_direct_debit(
    db: Session, user_id: int, *, account_id: int, payee_name: str, amount: float, frequency: str = "monthly", reference: str = "", **kwargs
) -> dict[str, Any]:
    account = db.query(BankAccount).filter(BankAccount.id == account_id, BankAccount.user_id == user_id).first()
    if not account:
        raise ValueError("Account not found")
    dd = DirectDebitInstruction(
        user_id=user_id,
        account_id=account_id,
        payee_name=payee_name,
        amount=amount,
        frequency=frequency,
        reference=reference,
        status=InstructionStatus.SIMULATED,
    )
    db.add(dd)
    db.commit()
    db.refresh(dd)
    return {"instruction_id": dd.id, "status": "simulated", "amount": amount}


@register_tool("generate_alert", "Generate a financial alert for the user")
def generate_alert(db: Session, user_id: int, *, message: str, severity: str = "info", **kwargs) -> dict[str, Any]:
    db.add(AuditLog(
        user_id=user_id,
        action="alert",
        entity_type="alert",
        details=json.dumps({"message": message, "severity": severity}),
    ))
    db.commit()
    return {"alert": message, "severity": severity}


@register_tool("request_user_approval", "Flag an action that needs explicit user approval")
def request_user_approval(db: Session, user_id: int, *, action_description: str, **kwargs) -> dict[str, Any]:
    db.add(AuditLog(
        user_id=user_id,
        action="approval_requested",
        details=json.dumps({"description": action_description}),
    ))
    db.commit()
    return {"approval_requested": True, "description": action_description}
