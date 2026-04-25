from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ── Enums ──────────────────────────────────────────────────────────────

class AccountType(str, enum.Enum):
    CURRENT = "current"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    CREDIT = "credit"


class TriggerType(str, enum.Enum):
    MANUAL = "manual"
    ON_TRANSACTION = "on_transaction"
    ON_SALARY_DETECTED = "on_salary_detected"
    ON_LOW_BALANCE = "on_low_balance"
    ON_INVOICE_DETECTED = "on_invoice_detected"
    SCHEDULED_DAILY = "scheduled_daily"
    SCHEDULED_WEEKLY = "scheduled_weekly"
    SCHEDULED_MONTHLY = "scheduled_monthly"


class ExecutionMode(str, enum.Enum):
    SUGGEST_ONLY = "suggest_only"
    AUTO_EXECUTE = "auto_execute"


class InstructionStatus(str, enum.Enum):
    PENDING = "pending"
    EXECUTED = "executed"
    SIMULATED = "simulated"
    FAILED = "failed"


class AgentRunStatus(str, enum.Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    AWAITING_APPROVAL = "awaiting_approval"


# ── User ───────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bank_accounts = relationship("BankAccount", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    email_connections = relationship("EmailConnection", back_populates="user", cascade="all, delete-orphan")
    email_messages = relationship("EmailMessage", back_populates="user", cascade="all, delete-orphan")
    agent_definitions = relationship("AgentDefinition", back_populates="user", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    approved_suppliers = relationship("ApprovedSupplier", back_populates="user", cascade="all, delete-orphan")


# ── Bank Account ───────────────────────────────────────────────────────

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    balance = Column(Float, default=0.0)
    currency = Column(String, default="GBP")
    provider = Column(String, default="SimBank")
    purpose = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="bank_accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


# ── Approved Supplier ─────────────────────────────────────────────────

class ApprovedSupplier(Base):
    __tablename__ = "approved_suppliers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    payment_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)
    max_auto_pay = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="approved_suppliers")


# ── Transaction ────────────────────────────────────────────────────────

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)
    merchant = Column(String, nullable=True)
    transaction_type = Column(String, nullable=False)  # credit / debit
    date = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(Text, nullable=True)

    user = relationship("User", back_populates="transactions")
    account = relationship("BankAccount", back_populates="transactions")


# ── Email ──────────────────────────────────────────────────────────────

class EmailConnection(Base):
    __tablename__ = "email_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email_address = Column(String, nullable=False)
    provider = Column(String, default="fake-imap")
    connected_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="email_connections")


class EmailMessage(Base):
    __tablename__ = "email_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    category = Column(String, nullable=True)  # invoice, subscription, reminder

    user = relationship("User", back_populates="email_messages")


# ── Agent Definition ───────────────────────────────────────────────────

class AgentDefinition(Base):
    __tablename__ = "agent_definitions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = built-in
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    is_builtin = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)

    trigger_type = Column(Enum(TriggerType), default=TriggerType.MANUAL)
    execution_mode = Column(Enum(ExecutionMode), default=ExecutionMode.SUGGEST_ONLY)
    spending_limit = Column(Float, nullable=True)
    requires_approval = Column(Boolean, default=True)

    allowed_data_sources = Column(Text, nullable=True)   # JSON list
    allowed_actions = Column(Text, nullable=True)         # JSON list
    system_prompt = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="agent_definitions")
    runs = relationship("AgentRun", back_populates="agent_definition", cascade="all, delete-orphan")


# ── Agent Run ──────────────────────────────────────────────────────────

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_definition_id = Column(Integer, ForeignKey("agent_definitions.id"), nullable=False)
    status = Column(Enum(AgentRunStatus), default=AgentRunStatus.RUNNING)

    prompt = Column(Text, nullable=True)
    reasoning_summary = Column(Text, nullable=True)
    data_used = Column(Text, nullable=True)            # JSON
    proposed_actions = Column(Text, nullable=True)     # JSON
    executed_actions = Column(Text, nullable=True)     # JSON
    approval_required_actions = Column(Text, nullable=True)  # JSON
    result_json = Column(Text, nullable=True)
    error = Column(Text, nullable=True)

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="agent_runs")
    agent_definition = relationship("AgentDefinition", back_populates="runs")


# ── Payment / Transfer / Direct Debit ─────────────────────────────────

class PaymentInstruction(Base):
    __tablename__ = "payment_instructions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    from_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    payee_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    reference = Column(String, nullable=True)
    status = Column(Enum(InstructionStatus), default=InstructionStatus.SIMULATED)
    created_at = Column(DateTime, default=datetime.utcnow)
    agent_run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=True)


class AccountTransferInstruction(Base):
    __tablename__ = "account_transfer_instructions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    from_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    to_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    reference = Column(String, nullable=True)
    status = Column(Enum(InstructionStatus), default=InstructionStatus.SIMULATED)
    created_at = Column(DateTime, default=datetime.utcnow)
    agent_run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=True)


class DirectDebitInstruction(Base):
    __tablename__ = "direct_debit_instructions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    payee_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    frequency = Column(String, default="monthly")
    reference = Column(String, nullable=True)
    status = Column(Enum(InstructionStatus), default=InstructionStatus.SIMULATED)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    agent_run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=True)


# ── Subscription ──────────────────────────────────────────────────────

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    frequency = Column(String, default="monthly")
    category = Column(String, nullable=True)
    detected_from = Column(String, default="transactions")  # transactions / email
    is_active = Column(Boolean, default=True)
    last_charged = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="subscriptions")


# ── Audit Log ──────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
