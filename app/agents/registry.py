"""
Registry of built-in AI agents.

Each agent defines its identity, goal prompt, allowed tools, and trigger configuration.
All agents use real LLM reasoning — no mock or rule-based fallbacks.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class BuiltinAgentSpec:
    name: str
    description: str
    goal: str
    system_prompt: str
    allowed_actions: list[str] = field(default_factory=list)
    trigger_type: str = "manual"
    execution_mode: str = "suggest_only"
    requires_approval: bool = True


BUILTIN_AGENTS: list[BuiltinAgentSpec] = [
    BuiltinAgentSpec(
        name="Invoice Tracker",
        description="Scans emails for invoices, matches against approved suppliers, and tracks payment status.",
        goal="Scan connected email messages for business invoices. Match each invoice against the approved supplier list. For approved suppliers, extract payee, amount, due date and create payment instructions from the configured payment account. Flag invoices from unknown suppliers for review. Track which invoices are paid, pending, or overdue.",
        system_prompt="You are a B2B invoice processing specialist. Extract invoice details from emails, verify against approved supplier list, and create payment instructions. Always flag invoices from non-approved suppliers. Be concise — use bullet points, not paragraphs. Keep the summary under 3 sentences.",
        allowed_actions=["scan_emails", "detect_invoices", "create_payment_instruction", "generate_alert", "request_user_approval"],
        trigger_type="on_invoice_detected",
        execution_mode="auto_execute",
        requires_approval=True,
    ),
    BuiltinAgentSpec(
        name="Cash Flow Forecaster",
        description="Analyses business income and expenditure patterns to forecast cash flow and flag potential shortfalls.",
        goal="Analyse all business accounts, recent transactions, and recurring payments. Forecast cash position for the next 30/60/90 days. Flag any potential cash shortfalls or opportunities. Identify seasonal patterns.",
        system_prompt="You are a B2B cash flow analyst. Focus on business revenue vs expenses, payment timing, and cash runway. Be concise — bullet points, not paragraphs. Keep summary under 3 sentences.",
        allowed_actions=["analyse_transactions", "generate_alert"],
        trigger_type="manual",
        execution_mode="suggest_only",
    ),
    BuiltinAgentSpec(
        name="Expense Analyser",
        description="Categorises and analyses business expenses, identifies cost-saving opportunities and spending anomalies.",
        goal="Review all business expenses across accounts. Categorise spending, identify trends, detect anomalies or duplicate charges, and suggest cost-saving opportunities. Compare month-over-month changes.",
        system_prompt="You are a business expense analyst. Focus on operational costs, vendor spending, and cost optimisation. Be concise — use bullet points, not paragraphs. Keep the summary under 3 sentences.",
        allowed_actions=["analyse_transactions", "detect_subscriptions", "generate_alert"],
        trigger_type="manual",
        execution_mode="suggest_only",
    ),
    BuiltinAgentSpec(
        name="Subscription Manager",
        description="Tracks business SaaS subscriptions and software licenses, identifies unused or redundant services.",
        goal="Review all recurring charges and subscriptions. Calculate total SaaS spend, identify redundant or underused services, flag upcoming renewals, and suggest consolidation opportunities.",
        system_prompt="You are a SaaS and subscription management specialist for businesses. Focus on software licenses, recurring vendor charges, and optimisation. Be concise — bullet points only. Keep summary under 3 sentences.",
        allowed_actions=["detect_subscriptions", "analyse_transactions", "scan_emails", "generate_alert"],
        trigger_type="scheduled_monthly",
        execution_mode="suggest_only",
    ),
    BuiltinAgentSpec(
        name="Financial Health Monitor",
        description="Provides a comprehensive overview of business financial health with key metrics and risk indicators.",
        goal="Generate a concise financial health report. Cover: total balances across accounts, income vs expenses ratio, outstanding payments, cash runway, and key risk indicators. Flag any red or amber alerts.",
        system_prompt="You are a business financial health analyst. Provide concise, actionable metrics. Use traffic-light indicators (green/amber/red) for each metric. Keep the summary under 3 sentences. Use bullet points for insights.",
        allowed_actions=[
            "analyse_transactions", "analyse_affordability", "detect_subscriptions",
            "scan_emails", "generate_alert",
        ],
        trigger_type="manual",
        execution_mode="suggest_only",
    ),
]


def get_builtin_agent_specs() -> list[BuiltinAgentSpec]:
    return BUILTIN_AGENTS
