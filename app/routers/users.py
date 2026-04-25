from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.base import (
    ApprovedSupplier,
    BankAccount,
    Subscription,
    Transaction,
    User,
)
from app.schemas.schemas import (
    ApprovedSupplierCreate,
    ApprovedSupplierOut,
    BankAccountOut,
    BankAccountPurposeUpdate,
    FinancialSummary,
    SubscriptionOut,
    TransactionOut,
    UserCreate,
    UserOut,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(email=payload.email, name=payload.name, hashed_password=payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/{user_id}/accounts", response_model=list[BankAccountOut])
def list_accounts(user_id: int, db: Session = Depends(get_db)):
    return db.query(BankAccount).filter(BankAccount.user_id == user_id).all()


@router.get("/{user_id}/transactions", response_model=list[TransactionOut])
def list_transactions(user_id: int, limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .limit(limit)
        .all()
    )


@router.get("/{user_id}/subscriptions", response_model=list[SubscriptionOut])
def list_subscriptions(user_id: int, db: Session = Depends(get_db)):
    return db.query(Subscription).filter(Subscription.user_id == user_id).all()


@router.get("/{user_id}/summary", response_model=FinancialSummary)
def get_financial_summary(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    accounts = db.query(BankAccount).filter(BankAccount.user_id == user_id).all()
    total_balance = sum(a.balance for a in accounts)

    cutoff = datetime.utcnow() - timedelta(days=30)
    txns = db.query(Transaction).filter(
        Transaction.user_id == user_id, Transaction.date >= cutoff
    ).all()

    monthly_income = sum(t.amount for t in txns if t.transaction_type == "credit")
    monthly_spending = sum(abs(t.amount) for t in txns if t.transaction_type == "debit")

    cat_spend: dict[str, float] = {}
    for t in txns:
        if t.transaction_type == "debit" and t.category:
            cat_spend[t.category] = cat_spend.get(t.category, 0) + abs(t.amount)

    subs = db.query(Subscription).filter(Subscription.user_id == user_id, Subscription.is_active == True).all()
    sub_total = sum(s.amount for s in subs)

    net = monthly_income - monthly_spending
    if monthly_income > 0:
        ratio = net / monthly_income
    else:
        ratio = 0
    health_score = max(0, min(100, 50 + ratio * 50))

    risk_flags = []
    if total_balance < 500:
        risk_flags.append("Low total balance")
    if monthly_spending > monthly_income * 1.1:
        risk_flags.append("Spending exceeds income")
    if sub_total > monthly_income * 0.3:
        risk_flags.append("Subscriptions exceed 30% of income")

    if net > 0:
        cashflow = f"Positive cashflow of £{net:.2f}/month"
    elif net < 0:
        cashflow = f"Negative cashflow of £{abs(net):.2f}/month — spending exceeds income"
    else:
        cashflow = "Neutral cashflow"

    return FinancialSummary(
        total_balance=round(total_balance, 2),
        balances_by_account=[
            {"name": a.name, "type": a.account_type.value, "balance": a.balance} for a in accounts
        ],
        monthly_income=round(monthly_income, 2),
        monthly_spending=round(monthly_spending, 2),
        spending_by_category=cat_spend,
        subscription_count=len(subs),
        subscription_monthly_total=round(sub_total, 2),
        financial_health_score=round(health_score, 1),
        cashflow_insight=cashflow,
        risk_flags=risk_flags,
    )


@router.get("/{user_id}/insights")
def get_insights(user_id: int, db: Session = Depends(get_db)):
    """Returns computed financial insights (non-LLM). For AI insights, run an agent."""
    from app.services.financial_context import build_financial_context

    ctx = build_financial_context(db, user_id)
    income = ctx["monthly_income"]
    spending = ctx["monthly_spending"]
    subs = ctx["subscriptions"]
    accounts = ctx["accounts"]

    insights = []
    if spending > income:
        insights.append({"type": "warning", "message": f"You're spending £{spending - income:.2f} more than you earn this period."})
    savings_accts = [a for a in accounts if a["type"] == "savings"]
    if savings_accts and any(a["balance"] < 1000 for a in savings_accts):
        insights.append({"type": "info", "message": "Your savings are below £1,000. Consider setting up automatic savings."})
    if subs:
        total_subs = sum(s["amount"] for s in subs if s.get("is_active"))
        insights.append({"type": "info", "message": f"You have {len(subs)} subscriptions totalling £{total_subs:.2f}/month."})
    if income > 0:
        savings_rate = (income - spending) / income * 100
        insights.append({"type": "metric", "message": f"Your savings rate is {savings_rate:.1f}%."})

    return {"user_id": user_id, "insights": insights}


@router.put("/{user_id}/accounts/{account_id}/purpose")
def update_account_purpose(user_id: int, account_id: int, body: BankAccountPurposeUpdate, db: Session = Depends(get_db)):
    account = db.query(BankAccount).filter(BankAccount.id == account_id, BankAccount.user_id == user_id).first()
    if not account:
        raise HTTPException(404, "Account not found")
    account.purpose = body.purpose
    db.commit()
    return {"status": "updated", "purpose": body.purpose}


@router.get("/{user_id}/suppliers", response_model=list[ApprovedSupplierOut])
def list_suppliers(user_id: int, db: Session = Depends(get_db)):
    return db.query(ApprovedSupplier).filter(ApprovedSupplier.user_id == user_id).all()


@router.post("/{user_id}/suppliers", response_model=ApprovedSupplierOut, status_code=201)
def create_supplier(user_id: int, body: ApprovedSupplierCreate, db: Session = Depends(get_db)):
    supplier = ApprovedSupplier(
        user_id=user_id,
        name=body.name,
        email=body.email,
        payment_account_id=body.payment_account_id,
        max_auto_pay=body.max_auto_pay,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{user_id}/suppliers/{supplier_id}")
def delete_supplier(user_id: int, supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(ApprovedSupplier).filter(
        ApprovedSupplier.id == supplier_id, ApprovedSupplier.user_id == user_id
    ).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    db.delete(supplier)
    db.commit()
    return {"status": "deleted"}
