"""
Simulation engine — adds transactions, updates balances, and triggers relevant agents.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.base import (
    AgentDefinition,
    BankAccount,
    Transaction,
    TriggerType,
    User,
)
from app.schemas.schemas import SimulateTransactionRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulator", tags=["Simulator"])


@router.post("/transactions")
def simulate_transaction(payload: SimulateTransactionRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    account = db.query(BankAccount).filter(
        BankAccount.id == payload.account_id, BankAccount.user_id == payload.user_id
    ).first()
    if not account:
        raise HTTPException(404, "Account not found")

    txn = Transaction(
        user_id=payload.user_id,
        account_id=payload.account_id,
        amount=payload.amount,
        description=payload.description,
        category=payload.category,
        merchant=payload.merchant,
        transaction_type=payload.transaction_type,
    )
    db.add(txn)

    if payload.transaction_type == "credit":
        account.balance += payload.amount
    else:
        account.balance -= abs(payload.amount)

    db.commit()
    db.refresh(txn)
    db.refresh(account)

    triggered_agents = _check_agent_triggers(db, payload, txn)

    return {
        "transaction_id": txn.id,
        "new_balance": account.balance,
        "triggered_agents": triggered_agents,
    }


def _check_agent_triggers(
    db: Session, payload: SimulateTransactionRequest, txn: Transaction
) -> list[dict]:
    triggered = []

    is_salary = (
        payload.transaction_type == "credit"
        and payload.amount >= 1000
        and any(kw in (payload.description or "").lower() for kw in ["salary", "wages", "payroll", "pay"])
    )

    is_invoice_related = payload.category == "invoice" or "invoice" in (payload.description or "").lower()

    agents = db.query(AgentDefinition).filter(AgentDefinition.is_enabled == True).all()

    for agent in agents:
        should_trigger = False
        trigger = agent.trigger_type

        if trigger == TriggerType.ON_TRANSACTION:
            should_trigger = True
        elif trigger == TriggerType.ON_SALARY_DETECTED and is_salary:
            should_trigger = True
        elif trigger == TriggerType.ON_INVOICE_DETECTED and is_invoice_related:
            should_trigger = True
        elif trigger == TriggerType.ON_LOW_BALANCE:
            account = db.query(BankAccount).filter(BankAccount.id == payload.account_id).first()
            if account and account.balance < 500:
                should_trigger = True

        if should_trigger:
            try:
                from app.agents.runner import AgentRunner
                runner = AgentRunner()
                result = runner.run(db, payload.user_id, agent.id)
                triggered.append({
                    "agent_id": agent.id,
                    "agent_name": agent.name,
                    "run_id": result.agent_run_id,
                    "status": result.status,
                    "summary": result.summary,
                })
            except Exception as e:
                logger.exception("Failed to trigger agent %s", agent.name)
                triggered.append({
                    "agent_id": agent.id,
                    "agent_name": agent.name,
                    "error": str(e),
                })

    return triggered
