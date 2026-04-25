from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Agent, UserAgent, AgentMessage, BankAccount
from app.schemas import UserAgentCreate, ChatMessage, ChatResponse, CreateAgentRequest
from app.auth import get_current_user

router = APIRouter(prefix="/agents", tags=["agents"])

AGENT_TEMPLATES = [
    {
        "name": "Affordability Agent",
        "description": "Ask anything about what you can afford — backed by your real bank data.",
        "system_prompt": "You are an affordability advisor. Use get_summary and get_affordability_analysis to answer: 'Can I afford X?', debt capacity, savings goals. Be specific with numbers from actual transactions.",
        "icon": "calculator",
        "category": "Finance",
    },
    {
        "name": "Payday Monitor",
        "description": "Tracks your salary, alerts on arrival or delay, watches for income changes.",
        "system_prompt": "You are a payday monitor. Use get_payday_analysis and get_all_transactions to track salary. Alert on: late pay, early arrival, unusual amounts. Reference specific deposit transactions.",
        "icon": "calendar-clock",
        "category": "Finance",
    },
    {
        "name": "Spending Insights",
        "description": "Deep-dive into where your money goes — categories, merchants, trends.",
        "system_prompt": "You are a spending insights analyst. Use get_summary and get_all_transactions to answer: top categories, merchant analysis, spending trends, unusual charges. Provide actionable insights.",
        "icon": "pie-chart",
        "category": "Finance",
    },
    {
        "name": "Budget Guardian",
        "description": "Watches your spending against budgets and warns you before you overspend.",
        "system_prompt": "You are a budget guardian. Use get_summary and get_all_transactions to track spending. Alert when approaching limits. Suggest specific cutbacks based on real transaction data.",
        "icon": "shield",
        "category": "Finance",
    },
]


@router.get("")
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent))
    agents = result.scalars().all()
    if not agents:
        for t in AGENT_TEMPLATES:
            db.add(Agent(**t))
        await db.flush()
        result = await db.execute(select(Agent))
        agents = result.scalars().all()
    return [
        {"id": a.id, "name": a.name, "description": a.description, "icon": a.icon, "category": a.category, "is_custom": a.is_custom}
        for a in agents
    ]


@router.post("")
async def create_custom_agent(data: CreateAgentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from app.services.financial_tools import auto_generate_system_prompt
    system_prompt = auto_generate_system_prompt(data.name, data.goal, data.trigger_frequency or "on-demand")
    agent = Agent(
        name=data.name,
        description=data.description or data.goal[:100],
        system_prompt=system_prompt,
        icon="sparkles",
        category="Custom",
        is_custom=True,
        created_by=user.id,
        trigger_config={"frequency": data.trigger_frequency} if data.trigger_frequency else None,
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return agent


@router.get("/my")
async def my_agents(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(UserAgent).options(selectinload(UserAgent.agent)).where(UserAgent.user_id == user.id)
    )
    return [
        {
            "id": ua.id, "agent_id": ua.agent_id,
            "agent": {"id": ua.agent.id, "name": ua.agent.name, "description": ua.agent.description, "icon": ua.agent.icon, "category": ua.agent.category, "is_custom": ua.agent.is_custom},
            "is_active": ua.is_active, "created_at": ua.created_at.isoformat(),
        }
        for ua in result.scalars().all()
    ]


@router.post("/subscribe")
async def subscribe_agent(data: UserAgentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Agent).where(Agent.id == data.agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    existing = await db.execute(
        select(UserAgent).where(UserAgent.user_id == user.id, UserAgent.agent_id == data.agent_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already subscribed")
    user_agent = UserAgent(user_id=user.id, agent_id=data.agent_id, config=data.config, is_active=True)
    db.add(user_agent)
    await db.flush()
    await db.refresh(user_agent)
    return {
        "id": user_agent.id, "agent_id": user_agent.agent_id,
        "agent": {"id": agent.id, "name": agent.name, "description": agent.description, "icon": agent.icon, "category": agent.category, "is_custom": agent.is_custom},
        "is_active": user_agent.is_active, "created_at": user_agent.created_at.isoformat(),
    }


@router.delete("/{agent_id}/unsubscribe")
async def unsubscribe(agent_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(UserAgent).where(UserAgent.user_id == user.id, UserAgent.agent_id == agent_id))
    ua = result.scalar_one_or_none()
    if not ua:
        raise HTTPException(status_code=404, detail="Not subscribed")
    await db.delete(ua)
    return {"success": True}


@router.post("/{agent_id}/chat")
async def chat(agent_id: int, data: ChatMessage, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(UserAgent).options(selectinload(UserAgent.agent)).where(
            UserAgent.user_id == user.id, UserAgent.agent_id == agent_id
        )
    )
    user_agent = result.scalar_one_or_none()
    if not user_agent:
        raise HTTPException(status_code=404, detail="Not subscribed to this agent")

    result2 = await db.execute(
        select(BankAccount).where(BankAccount.user_id == user.id, BankAccount.status == "active")
    )
    bank_accounts = list(result2.scalars().all())
    if not bank_accounts:
        raise HTTPException(status_code=400, detail="Connect a bank account first to use this agent")

    from app.services.agent import run_agent_chat
    response_text = await run_agent_chat(
        db=db, user_id=user.id, user_agent_id=user_agent.id,
        agent_name=user_agent.agent.name,
        system_prompt=user_agent.agent.system_prompt,
        message=data.message, model=data.model,
        bank_accounts=bank_accounts,
    )
    return ChatResponse(response=response_text)


@router.get("/{agent_id}/data")
async def get_agent_data(agent_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(BankAccount).where(BankAccount.user_id == user.id, BankAccount.status == "active")
    )
    bank_accounts = list(result.scalars().all())
    if not bank_accounts:
        raise HTTPException(status_code=400, detail="No bank accounts connected")

    class UserLike:
        def __init__(self, accounts):
            self.bank_accounts = accounts

    from app.services.financial_tools import FinancialDataTools
    fdt = FinancialDataTools(UserLike(bank_accounts))
    if agent_id in [2]:
        return await fdt.get_payday_analysis()
    return await fdt.get_summary()