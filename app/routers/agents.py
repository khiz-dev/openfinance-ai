from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents.runner import AgentRunner
from app.database import get_db
from app.models.base import AgentDefinition, AgentRun, TriggerType, ExecutionMode, User
from app.schemas.schemas import AgentDefinitionCreate, AgentDefinitionOut, AgentRunOut


class AgentRunRequest(BaseModel):
    extra_context: Optional[dict[str, Any]] = None

router = APIRouter(tags=["Agents"])


@router.get("/agents", response_model=list[AgentDefinitionOut])
def list_all_agents(db: Session = Depends(get_db)):
    return db.query(AgentDefinition).all()


@router.get("/agents/builtin", response_model=list[AgentDefinitionOut])
def list_builtin_agents(db: Session = Depends(get_db)):
    return db.query(AgentDefinition).filter(AgentDefinition.is_builtin == True).all()


@router.get("/users/{user_id}/agents", response_model=list[AgentDefinitionOut])
def list_user_agents(user_id: int, db: Session = Depends(get_db)):
    """List all agents available to a user (built-in + custom)."""
    builtin = db.query(AgentDefinition).filter(AgentDefinition.is_builtin == True).all()
    custom = db.query(AgentDefinition).filter(
        AgentDefinition.user_id == user_id, AgentDefinition.is_builtin == False
    ).all()
    return builtin + custom


@router.post("/users/{user_id}/agents", response_model=AgentDefinitionOut, status_code=201)
def create_custom_agent(user_id: int, payload: AgentDefinitionCreate, db: Session = Depends(get_db)):
    """Create a custom agent for a user."""
    _require_user(db, user_id)
    agent = AgentDefinition(
        user_id=user_id,
        name=payload.name,
        description=payload.description,
        goal=payload.goal,
        is_builtin=False,
        trigger_type=TriggerType(payload.trigger_type),
        execution_mode=ExecutionMode(payload.execution_mode),
        spending_limit=payload.spending_limit,
        requires_approval=payload.requires_approval,
        allowed_data_sources=json.dumps(payload.allowed_data_sources),
        allowed_actions=json.dumps(payload.allowed_actions),
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/users/{user_id}/agents/{agent_id}/enable")
def enable_agent(user_id: int, agent_id: int, db: Session = Depends(get_db)):
    agent = _get_agent(db, agent_id)
    agent.is_enabled = True
    db.commit()
    return {"status": "enabled", "agent_id": agent_id}


@router.post("/users/{user_id}/agents/{agent_id}/disable")
def disable_agent(user_id: int, agent_id: int, db: Session = Depends(get_db)):
    agent = _get_agent(db, agent_id)
    agent.is_enabled = False
    db.commit()
    return {"status": "disabled", "agent_id": agent_id}


@router.post("/users/{user_id}/agents/{agent_id}/run")
def run_agent(
    user_id: int,
    agent_id: int,
    body: AgentRunRequest | None = Body(default=None),
    db: Session = Depends(get_db),
):
    """Execute an agent. Uses real LLM reasoning — requires API key."""
    _require_user(db, user_id)
    agent = _get_agent(db, agent_id)
    if not agent.is_enabled:
        raise HTTPException(400, "Agent is disabled")

    extra_context = body.extra_context if body else None

    runner = AgentRunner()
    result = runner.run(db, user_id, agent_id, extra_context=extra_context)
    return {
        "agent_run_id": result.agent_run_id,
        "agent_name": agent.name,
        "status": result.status,
        "summary": result.summary,
        "insights": result.insights,
        "reasoning": result.reasoning,
        "executed_actions": result.executed_actions,
        "approval_required_actions": result.approval_required_actions,
        "risk_flags": result.risk_flags,
        "errors": result.errors,
    }


@router.get("/users/{user_id}/agent-runs")
def list_agent_runs(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    runs = (
        db.query(AgentRun)
        .filter(AgentRun.user_id == user_id)
        .order_by(AgentRun.started_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for run in runs:
        agent_def = db.query(AgentDefinition).filter(AgentDefinition.id == run.agent_definition_id).first()
        run_dict = {
            "id": run.id,
            "user_id": run.user_id,
            "agent_definition_id": run.agent_definition_id,
            "agent_name": agent_def.name if agent_def else f"Agent #{run.agent_definition_id}",
            "status": run.status.value if hasattr(run.status, 'value') else run.status,
            "prompt": run.prompt,
            "reasoning_summary": run.reasoning_summary,
            "data_used": run.data_used,
            "proposed_actions": run.proposed_actions,
            "executed_actions": run.executed_actions,
            "approval_required_actions": run.approval_required_actions,
            "result_json": run.result_json,
            "error": run.error,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        }
        result.append(run_dict)
    return result


@router.get("/users/{user_id}/agent-runs/{run_id}", response_model=AgentRunOut)
def get_agent_run(user_id: int, run_id: int, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == user_id).first()
    if not run:
        raise HTTPException(404, "Agent run not found")
    return run


def _require_user(db: Session, user_id: int):
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(404, "User not found")


def _get_agent(db: Session, agent_id: int) -> AgentDefinition:
    agent = db.query(AgentDefinition).filter(AgentDefinition.id == agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent
