from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.llm.client import get_llm_client
from app.models.base import User, ApprovedSupplier
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.financial_context import build_financial_context

router = APIRouter(tags=["Chat"])


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

    ctx_str = json.dumps(context, indent=2, default=str)

    system_prompt = (
        f"You are an AI financial assistant for a business called {user.name}. "
        "You have access to all their financial data and can answer any questions about "
        "their accounts, transactions, cash flow, invoices, suppliers, and more.\n\n"
        "Be concise, direct, and use numbers. Use bullet points when listing items. "
        "Keep responses short unless the user asks for detail.\n\n"
        f"BUSINESS FINANCIAL DATA:\n{ctx_str}"
    )

    messages = list(body.conversation_history)
    messages.append({"role": "user", "content": body.message})

    user_prompt = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)

    llm = get_llm_client()
    response = llm.generate(system_prompt, user_prompt, json_mode=False)

    return ChatResponse(
        reply=response.content,
        data_referenced=list(context.keys()),
    )
