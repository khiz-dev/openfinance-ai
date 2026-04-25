"""
Agent Planner — sends context + agent definition to LLM to produce a structured execution plan.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from app.llm.client import LLMResponse, get_llm_client
from app.services.tools import get_available_tools

logger = logging.getLogger(__name__)

PLANNER_SYSTEM_PROMPT = """You are an AI financial agent planner. You produce structured JSON plans for financial automation.

Given a user's financial context and an agent's goal, you must:
1. Analyse the relevant data
2. Reason about what actions to take
3. Output a structured JSON plan

Your output MUST be valid JSON with this exact schema:
{{
  "reasoning": "Your step-by-step reasoning about the situation",
  "insights": ["List of insights discovered"],
  "proposed_actions": [
    {{
      "tool": "tool_name",
      "params": {{"param1": "value1"}},
      "description": "What this action does",
      "requires_approval": true
    }}
  ],
  "summary": "A human-readable summary of the plan",
  "risk_flags": ["Any risks or warnings"]
}}

AVAILABLE TOOLS:
{tools}

RULES:
- Only propose actions using the listed tools
- Set requires_approval=true for any money movement over the agent's spending limit
- Set requires_approval=true if the agent definition says approval is required
- Provide clear reasoning for every proposed action
- If no actions are needed, return an empty proposed_actions list with insights only
- Always include risk_flags if you see potential issues
"""


@dataclass
class AgentPlan:
    reasoning: str = ""
    insights: list[str] = field(default_factory=list)
    proposed_actions: list[dict[str, Any]] = field(default_factory=list)
    summary: str = ""
    risk_flags: list[str] = field(default_factory=list)
    raw_response: str = ""
    llm_model: str = ""


class AgentPlanner:
    def __init__(self):
        self.llm = get_llm_client()

    def plan(
        self,
        agent_name: str,
        agent_goal: str,
        context: dict[str, Any],
        *,
        allowed_actions: list[str] | None = None,
        spending_limit: float | None = None,
        requires_approval: bool = True,
        execution_mode: str = "suggest_only",
    ) -> AgentPlan:
        tools = get_available_tools()
        if allowed_actions:
            tools = [t for t in tools if t["name"] in allowed_actions]

        tools_str = json.dumps(tools, indent=2)
        system_prompt = PLANNER_SYSTEM_PROMPT.format(tools=tools_str)

        user_prompt = self._build_user_prompt(
            agent_name, agent_goal, context, spending_limit, requires_approval, execution_mode
        )

        logger.info("Sending plan request to LLM for agent: %s", agent_name)
        response: LLMResponse = self.llm.generate(system_prompt, user_prompt)

        return self._parse_response(response)

    def _build_user_prompt(
        self,
        agent_name: str,
        agent_goal: str,
        context: dict[str, Any],
        spending_limit: float | None,
        requires_approval: bool,
        execution_mode: str,
    ) -> str:
        ctx_str = json.dumps(context, indent=2, default=str)
        lines = [
            f"AGENT: {agent_name}",
            f"GOAL: {agent_goal}",
            f"EXECUTION MODE: {execution_mode}",
            f"REQUIRES APPROVAL FOR ACTIONS: {requires_approval}",
        ]
        if spending_limit is not None:
            lines.append(f"SPENDING LIMIT: {spending_limit}")
        lines.append(f"\nUSER FINANCIAL CONTEXT:\n{ctx_str}")
        return "\n".join(lines)

    def _parse_response(self, response: LLMResponse) -> AgentPlan:
        plan = AgentPlan(raw_response=response.content, llm_model=response.model)

        data = response.parsed
        if not data:
            plan.reasoning = response.content
            plan.summary = "LLM returned non-JSON response"
            plan.risk_flags = ["Could not parse LLM response as JSON"]
            return plan

        plan.reasoning = data.get("reasoning", "")
        plan.insights = data.get("insights", [])
        plan.proposed_actions = data.get("proposed_actions", [])
        plan.summary = data.get("summary", "")
        plan.risk_flags = data.get("risk_flags", [])
        return plan
