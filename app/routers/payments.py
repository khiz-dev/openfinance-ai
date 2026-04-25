from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.base import (
    AccountTransferInstruction,
    AuditLog,
    BankAccount,
    DirectDebitInstruction,
    InstructionStatus,
    PaymentInstruction,
    User,
)
from app.schemas.schemas import (
    DirectDebitRequest,
    InstructionOut,
    PaymentRequest,
    TransferRequest,
)

router = APIRouter(tags=["Payments & Transfers"])


@router.get("/users/{user_id}/payment-intents")
def list_payment_intents(user_id: int, db: Session = Depends(get_db)):
    """List all payment instructions for a user, including agent-created ones."""
    _require_user(db, user_id)
    instructions = (
        db.query(PaymentInstruction)
        .filter(PaymentInstruction.user_id == user_id)
        .order_by(PaymentInstruction.created_at.desc())
        .all()
    )
    result = []
    for pi in instructions:
        account = db.query(BankAccount).filter(BankAccount.id == pi.from_account_id).first()
        result.append({
            "id": pi.id,
            "payee_name": pi.payee_name,
            "amount": pi.amount,
            "reference": pi.reference,
            "status": pi.status.value if hasattr(pi.status, 'value') else str(pi.status),
            "from_account": account.name if account else f"Account #{pi.from_account_id}",
            "agent_run_id": pi.agent_run_id,
            "created_at": pi.created_at.isoformat() if pi.created_at else None,
        })
    return result


@router.put("/users/{user_id}/payment-intents/{intent_id}/execute")
def execute_payment_intent(user_id: int, intent_id: int, db: Session = Depends(get_db)):
    """Execute a pending payment intent (simulated)."""
    _require_user(db, user_id)
    pi = db.query(PaymentInstruction).filter(
        PaymentInstruction.id == intent_id, PaymentInstruction.user_id == user_id
    ).first()
    if not pi:
        raise HTTPException(404, "Payment intent not found")

    account = db.query(BankAccount).filter(BankAccount.id == pi.from_account_id).first()
    if account and account.balance >= pi.amount:
        account.balance -= pi.amount

    pi.status = InstructionStatus.SIMULATED
    db.commit()
    return {"status": "executed", "id": pi.id, "amount": pi.amount, "payee_name": pi.payee_name}


@router.post("/users/{user_id}/payments", response_model=InstructionOut, status_code=201)
def create_payment(user_id: int, payload: PaymentRequest, db: Session = Depends(get_db)):
    _require_user(db, user_id)
    account = db.query(BankAccount).filter(
        BankAccount.id == payload.from_account_id, BankAccount.user_id == user_id
    ).first()
    if not account:
        raise HTTPException(404, "Account not found")
    if account.balance < payload.amount:
        raise HTTPException(400, "Insufficient balance")

    account.balance -= payload.amount
    instruction = PaymentInstruction(
        user_id=user_id,
        from_account_id=payload.from_account_id,
        payee_name=payload.payee_name,
        amount=payload.amount,
        reference=payload.reference,
        status=InstructionStatus.SIMULATED,
    )
    db.add(instruction)
    _audit(db, user_id, "payment_created", "payment", instruction)
    db.commit()
    db.refresh(instruction)
    return instruction


@router.post("/users/{user_id}/transfers", response_model=InstructionOut, status_code=201)
def create_transfer(user_id: int, payload: TransferRequest, db: Session = Depends(get_db)):
    _require_user(db, user_id)
    from_acc = db.query(BankAccount).filter(
        BankAccount.id == payload.from_account_id, BankAccount.user_id == user_id
    ).first()
    to_acc = db.query(BankAccount).filter(
        BankAccount.id == payload.to_account_id, BankAccount.user_id == user_id
    ).first()
    if not from_acc or not to_acc:
        raise HTTPException(404, "Account not found")
    if from_acc.balance < payload.amount:
        raise HTTPException(400, "Insufficient balance")

    from_acc.balance -= payload.amount
    to_acc.balance += payload.amount
    instruction = AccountTransferInstruction(
        user_id=user_id,
        from_account_id=payload.from_account_id,
        to_account_id=payload.to_account_id,
        amount=payload.amount,
        reference=payload.reference,
        status=InstructionStatus.SIMULATED,
    )
    db.add(instruction)
    _audit(db, user_id, "transfer_created", "transfer", instruction)
    db.commit()
    db.refresh(instruction)
    return instruction


@router.post("/users/{user_id}/direct-debits", response_model=InstructionOut, status_code=201)
def create_direct_debit(user_id: int, payload: DirectDebitRequest, db: Session = Depends(get_db)):
    _require_user(db, user_id)
    account = db.query(BankAccount).filter(
        BankAccount.id == payload.account_id, BankAccount.user_id == user_id
    ).first()
    if not account:
        raise HTTPException(404, "Account not found")

    dd = DirectDebitInstruction(
        user_id=user_id,
        account_id=payload.account_id,
        payee_name=payload.payee_name,
        amount=payload.amount,
        frequency=payload.frequency,
        reference=payload.reference,
        status=InstructionStatus.SIMULATED,
    )
    db.add(dd)
    _audit(db, user_id, "direct_debit_created", "direct_debit", dd)
    db.commit()
    db.refresh(dd)
    return dd


def _require_user(db: Session, user_id: int):
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(404, "User not found")


def _audit(db: Session, user_id: int, action: str, entity_type: str, entity):
    import json
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        details=json.dumps({"amount": entity.amount}),
    ))
