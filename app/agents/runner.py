"""
Agent runner — orchestrates the full agent lifecycle:
  context → planner → policy → executor → result
"""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.orm import Session

from app.executor.executor import AgentExecutor, AgentRunResult
from app.models.base import AgentDefinition
from app.planner.planner import AgentPlanner
from app.planner.policy import validate_plan
from app.services.financial_context import build_financial_context

logger = logging.getLogger(__name__)


class AgentRunner:
    def __init__(self):
        self.planner = AgentPlanner()
        self.executor = AgentExecutor()

    def run(
        self,
        db: Session,
        user_id: int,
        agent_definition_id: int,
        *,
        extra_context: dict[str, Any] | None = None,
    ) -> AgentRunResult:
        agent_def = db.query(AgentDefinition).filter(AgentDefinition.id == agent_definition_id).first()
        if not agent_def:
            raise ValueError(f"Agent definition {agent_definition_id} not found")

        context = build_financial_context(db, user_id)
        if extra_context:
            context["user_request"] = extra_context

        allowed_actions = _parse_json_list(agent_def.allowed_actions)

        goal = agent_def.goal or agent_def.description or ""
        if extra_context:
            goal += f"\n\nThe user has a specific request: {json.dumps(extra_context)}"

        plan = self.planner.plan(
            agent_name=agent_def.name,
            agent_goal=goal,
            context=context,
            allowed_actions=allowed_actions or None,
            spending_limit=agent_def.spending_limit,
            requires_approval=agent_def.requires_approval,
            execution_mode=agent_def.execution_mode.value if hasattr(agent_def.execution_mode, "value") else str(agent_def.execution_mode),
        )

        exec_mode = agent_def.execution_mode.value if hasattr(agent_def.execution_mode, "value") else str(agent_def.execution_mode)
        policy_result = validate_plan(
            plan,
            allowed_actions=allowed_actions or None,
            spending_limit=agent_def.spending_limit,
            requires_approval=agent_def.requires_approval,
            execution_mode=exec_mode,
        )

        result = self.executor.execute(
            db=db,
            user_id=user_id,
            agent_definition_id=agent_definition_id,
            plan=plan,
            policy_result=policy_result,
            prompt_used=plan.raw_response,
            context_used={"summary_keys": list(context.keys())},
        )

        return result


def _parse_json_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    return []
