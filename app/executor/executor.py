"""
Agent Executor — takes a validated plan and executes approved actions via the tool layer.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.base import AgentRun, AgentRunStatus
from app.planner.planner import AgentPlan
from app.planner.policy import PolicyResult
from app.services.tools import execute_tool

logger = logging.getLogger(__name__)


@dataclass
class AgentRunResult:
    agent_run_id: int = 0
    status: str = "completed"
    reasoning: str = ""
    insights: list[str] = field(default_factory=list)
    summary: str = ""
    executed_actions: list[dict[str, Any]] = field(default_factory=list)
    approval_required_actions: list[dict[str, Any]] = field(default_factory=list)
    blocked_actions: list[dict[str, Any]] = field(default_factory=list)
    risk_flags: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class AgentExecutor:
    def execute(
        self,
        db: Session,
        user_id: int,
        agent_definition_id: int,
        plan: AgentPlan,
        policy_result: PolicyResult,
        *,
        prompt_used: str = "",
        context_used: dict[str, Any] | None = None,
    ) -> AgentRunResult:
        run = AgentRun(
            user_id=user_id,
            agent_definition_id=agent_definition_id,
            status=AgentRunStatus.RUNNING,
            prompt=prompt_used,
            reasoning_summary=plan.reasoning,
            data_used=json.dumps(context_used, default=str) if context_used else None,
            proposed_actions=json.dumps(plan.proposed_actions, default=str),
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        result = AgentRunResult(
            agent_run_id=run.id,
            reasoning=plan.reasoning,
            insights=plan.insights,
            summary=plan.summary,
            risk_flags=plan.risk_flags,
            approval_required_actions=policy_result.approval_required,
            blocked_actions=policy_result.blocked_actions,
        )

        for action in policy_result.approved_actions:
            tool_name = action.get("tool", "")
            params = action.get("params", {})
            try:
                tool_result = execute_tool(tool_name, db, user_id, params)
                result.executed_actions.append({
                    "tool": tool_name,
                    "params": params,
                    "result": tool_result,
                })
            except Exception as e:
                logger.exception("Error executing tool %s", tool_name)
                result.errors.append(f"Tool {tool_name} failed: {str(e)}")

        if result.errors:
            run.status = AgentRunStatus.FAILED
            run.error = json.dumps(result.errors)
            result.status = "failed"
        elif policy_result.approval_required:
            run.status = AgentRunStatus.AWAITING_APPROVAL
            result.status = "awaiting_approval"
        else:
            run.status = AgentRunStatus.COMPLETED
            result.status = "completed"

        run.executed_actions = json.dumps(result.executed_actions, default=str)
        run.approval_required_actions = json.dumps(result.approval_required_actions, default=str)
        run.result_json = json.dumps({
            "insights": result.insights,
            "summary": result.summary,
            "risk_flags": result.risk_flags,
        })
        run.completed_at = datetime.utcnow()
        db.commit()

        return result
