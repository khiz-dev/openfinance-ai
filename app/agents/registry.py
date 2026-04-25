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
        name="Invoice Manager",
        description="Finds invoices from emails, shows previews with payment details, and initiates payments from configured accounts.",
        goal=(
            "Scan connected email messages for business invoices. For each invoice found:\n"
            "1. Extract: supplier name, invoice number, amount, due date, payment details (sort code, account number or reference)\n"
            "2. Show a brief preview of each invoice with key details\n"
            "3. Match against the approved supplier list\n"
            "4. For approved suppliers: create a payment instruction from their configured payment account\n"
            "5. For unknown suppliers: flag for manual review\n"
            "6. Summarise: total invoices found, total amount due, how many auto-paid vs pending approval\n"
            "Note: Payments are currently simulated. In the future, Open Banking payment initiation will be integrated."
        ),
        system_prompt=(
            "You are a B2B invoice management specialist. Your job is to find invoices, "
            "present clear previews with payment details, and initiate payments. "
            "For each invoice, show: supplier, invoice #, amount, due date, and status. "
            "Format invoice previews as a structured list. "
            "Be concise — use bullet points. Keep the summary under 3 sentences."
        ),
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
