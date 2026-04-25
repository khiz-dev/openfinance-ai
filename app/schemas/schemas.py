from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── User ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    name: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Bank Account ──────────────────────────────────────────────────────

class BankAccountOut(BaseModel):
    id: int
    user_id: int
    name: str
    account_type: str
    balance: float
    currency: str
    provider: str
    purpose: str | None
    model_config = {"from_attributes": True}


class BankAccountPurposeUpdate(BaseModel):
    purpose: str


class ApprovedSupplierCreate(BaseModel):
    name: str
    email: str | None = None
    payment_account_id: int | None = None
    max_auto_pay: float | None = None


class ApprovedSupplierOut(BaseModel):
    id: int
    user_id: int
    name: str
    email: str | None
    payment_account_id: int | None
    max_auto_pay: float | None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Transaction ───────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    account_id: int
    amount: float
    description: str
    category: str | None = None
    merchant: str | None = None
    transaction_type: str = "debit"
    date: datetime | None = None


class TransactionOut(BaseModel):
    id: int
    user_id: int
    account_id: int
    amount: float
    description: str
    category: str | None
    merchant: str | None
    transaction_type: str
    date: datetime
    model_config = {"from_attributes": True}


# ── Email ─────────────────────────────────────────────────────────────

class EmailConnectRequest(BaseModel):
    email_address: str
    provider: str = "fake-imap"


class EmailConnectionOut(BaseModel):
    id: int
    email_address: str
    provider: str
    connected_at: datetime
    is_active: bool
    model_config = {"from_attributes": True}


class EmailMessageOut(BaseModel):
    id: int
    sender: str
    subject: str
    body: str
    received_at: datetime
    is_read: bool
    category: str | None
    model_config = {"from_attributes": True}


# ── Agent Definition ─────────────────────────────────────────────────

class AgentDefinitionCreate(BaseModel):
    name: str
    description: str | None = None
    goal: str
    trigger_type: str = "manual"
    execution_mode: str = "suggest_only"
    spending_limit: float | None = None
    requires_approval: bool = True
    allowed_data_sources: list[str] = Field(default_factory=lambda: ["transactions", "balances"])
    allowed_actions: list[str] = Field(default_factory=lambda: ["generate_insights"])


class AgentDefinitionOut(BaseModel):
    id: int
    user_id: int | None
    name: str
    description: str | None
    goal: str | None
    is_builtin: bool
    is_enabled: bool
    trigger_type: str
    execution_mode: str
    spending_limit: float | None
    requires_approval: bool
    allowed_data_sources: str | None
    allowed_actions: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Agent Run ─────────────────────────────────────────────────────────

class AgentRunOut(BaseModel):
    id: int
    user_id: int
    agent_definition_id: int
    status: str
    prompt: str | None
    reasoning_summary: str | None
    data_used: str | None
    proposed_actions: str | None
    executed_actions: str | None
    approval_required_actions: str | None
    result_json: str | None
    error: str | None
    started_at: datetime
    completed_at: datetime | None
    model_config = {"from_attributes": True}


# ── Payments / Transfers ──────────────────────────────────────────────

class PaymentRequest(BaseModel):
    from_account_id: int
    payee_name: str
    amount: float
    reference: str | None = None


class TransferRequest(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: float
    reference: str | None = None


class DirectDebitRequest(BaseModel):
    account_id: int
    payee_name: str
    amount: float
    frequency: str = "monthly"
    reference: str | None = None


class InstructionOut(BaseModel):
    id: int
    status: str
    amount: float
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Subscription ──────────────────────────────────────────────────────

class SubscriptionOut(BaseModel):
    id: int
    name: str
    provider: str | None
    amount: float
    frequency: str
    category: str | None
    is_active: bool
    last_charged: datetime | None
    model_config = {"from_attributes": True}


# ── Insights / Summary ───────────────────────────────────────────────

class FinancialSummary(BaseModel):
    total_balance: float
    balances_by_account: list[dict[str, Any]]
    monthly_income: float
    monthly_spending: float
    spending_by_category: dict[str, float]
    subscription_count: int
    subscription_monthly_total: float
    financial_health_score: float
    cashflow_insight: str
    risk_flags: list[str]


# ── Simulator ─────────────────────────────────────────────────────────

class SimulateTransactionRequest(BaseModel):
    user_id: int
    account_id: int
    amount: float
    description: str
    category: str | None = None
    merchant: str | None = None
    transaction_type: str = "debit"


# ── Audit Log ─────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    action: str
    entity_type: str | None
    entity_id: int | None
    details: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Chat ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_history: list[dict[str, str]] = []


class SuggestedAgent(BaseModel):
    id: int
    name: str
    description: str | None = None


class ChatResponse(BaseModel):
    reply: str
    data_referenced: list[str] = []
    suggested_agent: SuggestedAgent | dict[str, Any] | None = None
