from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.agents.registry import get_builtin_agent_specs
from app.database import Base, get_db
from app.main import app
from app.models.base import (
    AccountType,
    AgentDefinition,
    BankAccount,
    EmailConnection,
    EmailMessage,
    ExecutionMode,
    Subscription,
    Transaction,
    TriggerType,
    User,
)

TEST_DB_URL = "sqlite:///./test_openfinance.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(bind=engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    def _override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_user(db) -> User:
    user = User(email="test@test.com", name="Test User", hashed_password="test123")
    db.add(user)
    db.flush()

    current = BankAccount(user_id=user.id, name="Current", account_type=AccountType.CURRENT, balance=5000.0)
    savings = BankAccount(user_id=user.id, name="Savings", account_type=AccountType.SAVINGS, balance=10000.0)
    db.add_all([current, savings])
    db.flush()

    from datetime import datetime, timedelta
    now = datetime.utcnow()
    txns = [
        Transaction(user_id=user.id, account_id=current.id, amount=3500, description="Salary", category="salary", transaction_type="credit", date=now - timedelta(days=5)),
        Transaction(user_id=user.id, account_id=current.id, amount=1200, description="Rent", category="rent", transaction_type="debit", date=now - timedelta(days=3)),
        Transaction(user_id=user.id, account_id=current.id, amount=50, description="Tesco", category="groceries", transaction_type="debit", date=now - timedelta(days=1)),
    ]
    db.add_all(txns)

    sub = Subscription(user_id=user.id, name="Netflix", provider="Netflix", amount=15.99, frequency="monthly", category="entertainment", is_active=True)
    db.add(sub)

    email_conn = EmailConnection(user_id=user.id, email_address="test@test.com")
    db.add(email_conn)

    email = EmailMessage(
        user_id=user.id, sender="billing@example.com", subject="Invoice #123",
        body="Amount due: £100.00\nPayee: Example Corp\nDue: 30/04/2026",
        category="invoice",
    )
    db.add(email)

    for spec in get_builtin_agent_specs():
        agent = AgentDefinition(
            user_id=None, name=spec.name, description=spec.description, goal=spec.goal,
            is_builtin=True, is_enabled=True,
            trigger_type=TriggerType(spec.trigger_type),
            execution_mode=ExecutionMode(spec.execution_mode),
            requires_approval=spec.requires_approval,
            allowed_actions=json.dumps(spec.allowed_actions),
            system_prompt=spec.system_prompt,
        )
        db.add(agent)

    db.commit()
    return user
