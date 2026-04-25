from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Agent, UserAgent, AgentMessage
from app.schemas import (
    AgentOut, UserAgentCreate, UserAgentOut,
    ChatMessage, ChatResponse, CreateAgentRequest
)
from app.auth import get_current_user
from app.services.agent import AgentService
from openai import AsyncOpenAI
from app.config import settings
import json

router = APIRouter(prefix="/agents", tags=["agents"])


AGENT_TEMPLATES = [
    {
        "name": "Affordability Agent",
        "description": "Analyze your spending, income, and debts to answer affordability questions with real data.",
        "system_prompt": "You are a financial affordability advisor. Analyze the user's bank account data to answer their questions about how much they can afford, debt ratios, savings capacity, and spending patterns. Be specific with numbers from their actual transactions.",
        "icon": "calculator",
        "category": "Finance",
    },
    {
        "name": "Payday Monitor",
        "description": "Watches for your salary deposit and alerts you the moment it arrives or if it's late.",
        "system_prompt": "You are a payday monitor. Watch for salary/wage deposits, alert when detected, alert when late based on user's pattern. Track month-to-month consistency and flag income fluctuations.",
        "icon": "calendar-clock",
        "category": "Finance",
    },
    {
        "name": "Spending Insights Agent",
        "description": "Deep-dive into your spending habits by category, merchant, and time period.",
        "system_prompt": "You are a spending insights analyst. Analyze transaction data to identify top spending categories, trends over time, recurring charges, unusual spending, and savings opportunities.",
        "icon": "pie-chart",
        "category": "Finance",
    },
    {
        "name": "Budget Guardian",
        "description": "Sets budget limits per category and warns you when you're approaching or exceeding them.",
        "system_prompt": "You are a budget guardian. Track spending against user-defined budgets per category. Alert when approaching limits (80%) and when exceeded. Suggest adjustments based on spending velocity.",
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

    return [{"id": a.id, "name": a.name, "description": a.description, "icon": a.icon, "category": a.category, "is_custom": a.is_custom} for a in agents]


@router.post("")
async def create_custom_agent(
    data: CreateAgentRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    system_prompt = f"""You are a custom AI agent created by the user.
Your goal: {data.goal}

Respond to the user in a helpful, clear manner. You have access to the user's bank account data. Use it to provide personalized answers."""

    agent = Agent(
        name=data.name,
        description=data.description,
        system_prompt=system_prompt,
        icon="sparkles",
        category="Custom",
        is_custom=True,
        created_by=user.id,
        trigger_config={"frequency": data.trigger_frequency, **data.trigger_config} if data.trigger_config else {"frequency": data.trigger_frequency},
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return agent


@router.post("/subscribe", response_model=UserAgentOut)
async def subscribe_agent(
    data: UserAgentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(select(Agent).where(Agent.id == data.agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    existing = await db.execute(
        select(UserAgent).where(UserAgent.user_id == user.id, UserAgent.agent_id == data.agent_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already subscribed to this agent")

    user_agent = UserAgent(
        user_id=user.id,
        agent_id=data.agent_id,
        config=data.config,
        is_active=True,
    )
    db.add(user_agent)
    await db.flush()
    await db.refresh(user_agent)
    return user_agent


@router.get("/my")
async def my_agents(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(UserAgent).where(UserAgent.user_id == user.id).options()
    )
    user_agents = result.scalars().all()
    return [{"id": ua.id, "agent_id": ua.agent_id, "agent": ua.agent, "is_active": ua.is_active, "created_at": ua.created_at} for ua in user_agents]


@router.delete("/{agent_id}/unsubscribe")
async def unsubscribe(agent_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(UserAgent).where(UserAgent.user_id == user.id, UserAgent.agent_id == agent_id)
    )
    ua = result.scalar_one_or_none()
    if not ua:
        raise HTTPException(status_code=404, detail="Subscription not found")
    await db.delete(ua)
    return {"success": True}


@router.post("/{agent_id}/chat")
async def chat(
    agent_id: int,
    data: ChatMessage,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserAgent).where(UserAgent.user_id == user.id, UserAgent.agent_id == agent_id)
    )
    user_agent = result.scalar_one_or_none()
    if not user_agent:
        raise HTTPException(status_code=404, detail="Not subscribed to this agent")

    service = AgentService(db, user)
    response = await service.chat(user_agent, data.message, data.model)
    return ChatResponse(response=response)


@router.post("/{agent_id}/chat/stream")
async def chat_stream(
    agent_id: int,
    data: ChatMessage,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserAgent).where(UserAgent.user_id == user.id, UserAgent.agent_id == agent_id)
    )
    user_agent = result.scalar_one_or_none()
    if not user_agent:
        raise HTTPException(status_code=404, detail="Not subscribed to this agent")

    async def stream_response():
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        service = AgentService(db, user)
        context = await service.build_context(user_agent)

        system_msg = user_agent.agent.system_prompt
        if user_agent.agent.name in ("Affordability Agent", "Payday Monitor"):
            system_msg = f"{user_agent.agent.system_prompt}\n\nCurrent bank data:\n{context}"

        history_result = await db.execute(
            select(AgentMessage)
            .where(AgentMessage.user_agent_id == user_agent.id)
            .order_by(AgentMessage.created_at)
            .limit(20)
        )
        history = history_result.scalars().all()

        messages = [{"role": "system", "content": system_msg}]
        for h in history:
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": data.message})

        stream = await client.chat.completions.create(
            model=data.model,
            messages=messages,
            stream=True,
        )

        full_response = ""
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                full_response += token
                yield f"data: {json.dumps({'token': token})}\n\n"

        msg = AgentMessage(user_agent_id=user_agent.id, role="user", content=data.message)
        db.add(msg)
        reply = AgentMessage(user_agent_id=user_agent.id, role="assistant", content=full_response)
        db.add(reply)
        await db.commit()

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )