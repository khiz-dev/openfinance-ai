"""Unit tests for the policy engine."""

from __future__ import annotations

from app.planner.planner import AgentPlan
from app.planner.policy import validate_plan


def test_valid_analysis_plan():
    plan = AgentPlan(
        proposed_actions=[
            {"tool": "analyse_transactions", "params": {}, "requires_approval": False},
            {"tool": "generate_alert", "params": {"message": "test"}, "requires_approval": False},
        ]
    )
    result = validate_plan(plan, requires_approval=False, execution_mode="auto_execute")
    assert len(result.approved_actions) == 2
    assert len(result.blocked_actions) == 0


def test_blocks_unknown_tool():
    plan = AgentPlan(
        proposed_actions=[
            {"tool": "hack_the_bank", "params": {}},
        ]
    )
    result = validate_plan(plan)
    assert len(result.blocked_actions) == 1
    assert "not a valid platform tool" in result.violations[0]


def test_money_movement_requires_approval():
    plan = AgentPlan(
        proposed_actions=[
            {"tool": "create_payment_instruction", "params": {"amount": 100}, "requires_approval": False},
        ]
    )
    result = validate_plan(plan, requires_approval=True, execution_mode="suggest_only")
    assert len(result.approval_required) == 1
    assert len(result.approved_actions) == 0


def test_spending_limit_exceeded():
    plan = AgentPlan(
        proposed_actions=[
            {"tool": "transfer_between_accounts", "params": {"amount": 5000}},
        ]
    )
    result = validate_plan(plan, spending_limit=1000, requires_approval=False, execution_mode="auto_execute")
    assert len(result.approval_required) == 1


def test_auto_execute_no_approval():
    plan = AgentPlan(
        proposed_actions=[
            {"tool": "transfer_between_accounts", "params": {"amount": 100}},
        ]
    )
    result = validate_plan(plan, requires_approval=False, execution_mode="auto_execute", spending_limit=500)
    assert len(result.approved_actions) == 1


def test_restricted_allowed_actions():
    plan = AgentPlan(
        proposed_actions=[
            {"tool": "analyse_transactions", "params": {}},
            {"tool": "create_payment_instruction", "params": {"amount": 50}},
        ]
    )
    result = validate_plan(
        plan,
        allowed_actions=["analyse_transactions", "generate_alert"],
        requires_approval=False,
        execution_mode="auto_execute",
    )
    assert len(result.approved_actions) == 1
    assert len(result.blocked_actions) == 1
