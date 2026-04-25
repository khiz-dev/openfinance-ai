from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.llm.client import get_llm_client
from app.models.base import User, ApprovedSupplier, AgentDefinition
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.financial_context import build_financial_context

router = APIRouter(tags=["Chat"])

SUGGEST_MARKER = re.compile(r"\[SUGGEST_AGENT:(.+?)\]")


@router.post("/users/{user_id}/chat", response_model=ChatResponse)
def chat(user_id: int, body: ChatRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    context = build_financial_context(db, user_id)

    suppliers = db.query(ApprovedSupplier).filter(ApprovedSupplier.user_id == user_id).all()
    context["approved_suppliers"] = [
        {"name": s.name, "email": s.email, "max_auto_pay": s.max_auto_pay}
        for s in suppliers
    ]

    agents = (
        db.query(AgentDefinition)
        .filter(
            (AgentDefinition.is_builtin == True)
            | (AgentDefinition.user_id == user_id)
        )
        .filter(AgentDefinition.is_enabled == True)
        .all()
    )

    agent_descriptions = "\n".join(
        f"- {a.name} (ID:{a.id}): {a.description}"
        for a in agents
    )

    ctx_str = json.dumps(context, indent=2, default=str)

    system_prompt = (
        f"You are an AI financial assistant for a business called {user.name}. "
        "You have access to all their financial data and can answer any questions about "
        "their accounts, transactions, cash flow, invoices, suppliers, and more.\n\n"
        "Be concise, direct, and use numbers. Use bullet points when listing items. "
        "Keep responses short unless the user asks for detail.\n\n"
        f"BUSINESS FINANCIAL DATA:\n{ctx_str}\n\n"
        "AVAILABLE AI AGENTS:\n"
        f"{agent_descriptions}\n\n"
        "IMPORTANT: If the user's question would be better served by running one of the "
        "AI agents listed above (e.g. they ask about invoices, expenses, subscriptions, "
        "cash flow forecasting, financial health, etc.), include EXACTLY this marker on "
        "a new line at the very end of your response:\n"
        "[SUGGEST_AGENT:ExactAgentName]\n\n"
        "Only suggest an agent when it's genuinely useful. Answer the question yourself "
        "first, then suggest the agent for a deeper analysis. If no agent is relevant, "
        "do NOT include the marker."
    )

    messages = list(body.conversation_history)
    messages.append({"role": "user", "content": body.message})

    user_prompt = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)

    llm = get_llm_client()
    response = llm.generate(system_prompt, user_prompt, json_mode=False)

    reply_text = response.content
    suggested_agent = None

    match = SUGGEST_MARKER.search(reply_text)
    if match:
        suggested_name = match.group(1).strip()
        reply_text = SUGGEST_MARKER.sub("", reply_text).rstrip()

        agent = next((a for a in agents if a.name == suggested_name), None)
        if agent:
            suggested_agent = {
                "id": agent.id,
                "name": agent.name,
                "description": agent.description,
            }

    return ChatResponse(
        reply=reply_text,
        data_referenced=list(context.keys()),
        suggested_agent=suggested_agent,
    )
