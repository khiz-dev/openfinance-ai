"""
Policy engine — validates an AgentPlan before execution.

Ensures:
- Only approved tools are called
- Spending limits are respected
- Approval requirements are enforced
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.planner.planner import AgentPlan

logger = logging.getLogger(__name__)

ALLOWED_TOOL_NAMES = {
    "analyse_transactions",
    "analyse_affordability",
    "detect_subscriptions",
    "scan_emails",
    "detect_invoices",
    "create_payment_instruction",
    "transfer_between_accounts",
    "create_direct_debit",
    "generate_alert",
    "request_user_approval",
}

MONEY_MOVEMENT_TOOLS = {
    "create_payment_instruction",
    "transfer_between_accounts",
    "create_direct_debit",
}


@dataclass
class PolicyResult:
    approved_actions: list[dict[str, Any]] = field(default_factory=list)
    blocked_actions: list[dict[str, Any]] = field(default_factory=list)
    approval_required: list[dict[str, Any]] = field(default_factory=list)
    violations: list[str] = field(default_factory=list)
    is_valid: bool = True


def validate_plan(
    plan: AgentPlan,
    *,
    allowed_actions: list[str] | None = None,
    spending_limit: float | None = None,
    requires_approval: bool = True,
    execution_mode: str = "suggest_only",
) -> PolicyResult:
    result = PolicyResult()
    permitted_tools = set(allowed_actions) if allowed_actions else ALLOWED_TOOL_NAMES

    for action in plan.proposed_actions:
        tool_name = action.get("tool", "")
        params = action.get("params", {})
        amount = params.get("amount", 0)

        if tool_name not in ALLOWED_TOOL_NAMES:
            result.blocked_actions.append(action)
            result.violations.append(f"Tool '{tool_name}' is not a valid platform tool")
            continue

        if tool_name not in permitted_tools:
            result.blocked_actions.append(action)
            result.violations.append(f"Tool '{tool_name}' is not allowed for this agent")
            continue

        if tool_name in MONEY_MOVEMENT_TOOLS:
            if spending_limit is not None and amount > spending_limit:
                action["requires_approval"] = True
                result.approval_required.append(action)
                result.violations.append(
                    f"Amount {amount} exceeds spending limit {spending_limit} for {tool_name}"
                )
                continue

            if requires_approval or execution_mode == "suggest_only":
                action["requires_approval"] = True
                result.approval_required.append(action)
                continue

        result.approved_actions.append(action)

    if result.violations:
        result.is_valid = len(result.blocked_actions) == 0

    return result
