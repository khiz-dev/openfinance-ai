from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, BankAccount
from app.schemas import BankAccountOut
from app.auth import get_current_user
from app.services.truelayer import get_mock_service, MOCK_PROVIDERS

router = APIRouter(prefix="/banks", tags=["banks"])


@router.get("/providers")
async def list_providers():
    return {"providers": MOCK_PROVIDERS}


@router.get("/connect")
async def connect_bank(state: str = Query(...), user: User = Depends(get_current_user)):
    return {"auth_url": f"/mock-bank-select?state={state}"}


@router.get("/bank-select")
async def bank_select(state: str = Query(...)):
    return {"providers": MOCK_PROVIDERS, "message": "Select a mock bank"}


@router.post("/bank-connect")
async def mock_bank_connect(
    provider_id: str,
    provider_name: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = get_mock_service(provider_id)
    accounts = service.get_accounts()

    added = []
    for acc in accounts:
        existing = await db.execute(
            select(BankAccount).where(
                BankAccount.user_id == user.id,
                BankAccount.account_id == acc["account_id"],
            )
        )
        if existing.scalar_one_or_none():
            continue
        account = BankAccount(
            user_id=user.id,
            provider_id=provider_id,
            provider_name=provider_name,
            account_id=acc["account_id"],
            account_name=acc.get("account_name"),
            account_type=acc.get("account_type"),
            sort_code=acc.get("sort_code"),
            account_number=acc.get("account_number"),
            access_token=f"mock_token_{provider_id}_{acc['account_id']}",
            status="active",
        )
        db.add(account)
        added.append(acc)

    await db.flush()
    return {"success": True, "accounts_added": len(added), "accounts": added}


@router.get("/accounts", response_model=list[BankAccountOut])
async def list_accounts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(BankAccount.user_id == user.id, BankAccount.status == "active")
    )
    return result.scalars().all()


@router.delete("/accounts/{account_id}")
async def remove_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.status = "disconnected"
    await db.flush()
    return {"success": True}


@router.get("/transactions")
async def get_transactions(
    account_id: int,
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    service = get_mock_service(account.provider_id)
    to_date = datetime.now(timezone.utc).date().isoformat()
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    transactions = service.get_transactions(account.account_id, from_date, to_date)
    return {"transactions": transactions, "account_id": account_id}


@router.get("/balances")
async def get_balances(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(BankAccount.user_id == user.id, BankAccount.status == "active")
    )
    accounts = result.scalars().all()

    balances = []
    for account in accounts:
        service = get_mock_service(account.provider_id)
        bal = service.get_balance(account.account_id)
        balances.append({
            "account_id": account.id,
            "provider_name": account.provider_name,
            "account_name": account.account_name,
            "balance": bal.get("available"),
            "currency": bal.get("currency", "GBP"),
        })

    total = sum(b["balance"] for b in balances)
    return {"accounts": balances, "total_balance": round(total, 2)}