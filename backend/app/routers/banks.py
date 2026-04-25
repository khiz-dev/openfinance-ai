from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, BankAccount
from app.schemas import BankAccountOut
from app.auth import get_current_user
from app.services.truelayer import TrueLayerService
from app.config import settings

router = APIRouter(prefix="/banks", tags=["banks"])


@router.get("/providers")
async def list_providers():
    try:
        providers = await TrueLayerService.get_providers()
        return {"providers": providers}
    except Exception as e:
        return {"providers": [], "error": str(e)}


@router.get("/connect")
async def connect_bank(state: str = Query(...), user: User = Depends(get_current_user)):
    url = TrueLayerService.get_auth_url(state)
    return {"auth_url": url}


@router.get("/callback")
async def bank_callback(code: str = Query(...), state: str = Query(...), db: AsyncSession = Depends(get_db)):
    try:
        tokens = await TrueLayerService.exchange_code(code)
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")

        tl = TrueLayerService(access_token)
        accounts = await tl.get_accounts()

        return {
            "success": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "accounts": accounts,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bank connection failed: {str(e)}")


@router.post("/accounts")
async def add_account(
    provider_id: str,
    provider_name: str,
    account_id: str,
    account_name: str | None,
    account_type: str | None,
    access_token: str,
    refresh_token: str | None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    existing = await db.execute(
        select(BankAccount).where(
            BankAccount.user_id == user.id,
            BankAccount.account_id == account_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Account already connected")

    account = BankAccount(
        user_id=user.id,
        provider_id=provider_id,
        provider_name=provider_name,
        account_id=account_id,
        account_name=account_name,
        account_type=account_type,
        access_token=access_token,
        refresh_token=refresh_token,
        status="active",
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


@router.get("/accounts", response_model=list[BankAccountOut])
async def list_accounts(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(BankAccount).where(BankAccount.user_id == user.id, BankAccount.status == "active")
    )
    return result.scalars().all()


@router.delete("/accounts/{account_id}")
async def remove_account(account_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
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
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    tl = TrueLayerService(account.access_token)
    from datetime import timedelta

    to_date = datetime.now(timezone.utc).date().isoformat()
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()

    transactions = await tl.get_transactions(account.account_id, from_date, to_date)
    return {"transactions": transactions, "account_id": account_id}