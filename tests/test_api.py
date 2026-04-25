"""API integration tests — exercises all major endpoints without requiring LLM keys."""

from __future__ import annotations


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["service"] == "OpenFinance AI"


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200


def test_create_user(client):
    r = client.post("/users", json={"email": "new@test.com", "name": "New", "password": "pass"})
    assert r.status_code == 201
    assert r.json()["email"] == "new@test.com"


def test_list_users(client, seeded_user):
    r = client.get("/users")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_get_user(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Test User"


def test_list_accounts(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}/accounts")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_list_transactions(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}/transactions")
    assert r.status_code == 200
    assert len(r.json()) >= 3


def test_financial_summary(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}/summary")
    assert r.status_code == 200
    data = r.json()
    assert "total_balance" in data
    assert "financial_health_score" in data
    assert "spending_by_category" in data


def test_insights(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}/insights")
    assert r.status_code == 200
    assert "insights" in r.json()


def test_subscriptions(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}/subscriptions")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_list_agents(client, seeded_user):
    r = client.get("/agents")
    assert r.status_code == 200
    assert len(r.json()) >= 6


def test_list_builtin_agents(client, seeded_user):
    r = client.get("/agents/builtin")
    assert r.status_code == 200
    names = [a["name"] for a in r.json()]
    assert "Affordability AI" in names
    assert "Payday Monitor" in names


def test_create_custom_agent(client, seeded_user):
    r = client.post(f"/users/{seeded_user.id}/agents", json={
        "name": "My Budget Agent",
        "goal": "Track my monthly budget and alert if overspending",
        "trigger_type": "manual",
        "execution_mode": "suggest_only",
        "allowed_data_sources": ["transactions", "balances"],
        "allowed_actions": ["analyse_transactions", "generate_alert"],
    })
    assert r.status_code == 201
    assert r.json()["name"] == "My Budget Agent"


def test_enable_disable_agent(client, seeded_user):
    agents = client.get("/agents").json()
    agent_id = agents[0]["id"]

    r = client.post(f"/users/{seeded_user.id}/agents/{agent_id}/disable")
    assert r.status_code == 200

    r = client.post(f"/users/{seeded_user.id}/agents/{agent_id}/enable")
    assert r.status_code == 200


def test_create_payment(client, seeded_user):
    accounts = client.get(f"/users/{seeded_user.id}/accounts").json()
    current_id = [a for a in accounts if a["account_type"] == "current"][0]["id"]

    r = client.post(f"/users/{seeded_user.id}/payments", json={
        "from_account_id": current_id,
        "payee_name": "Test Payee",
        "amount": 50.0,
        "reference": "test-payment",
    })
    assert r.status_code == 201
    assert r.json()["status"] == "simulated"


def test_create_transfer(client, seeded_user):
    accounts = client.get(f"/users/{seeded_user.id}/accounts").json()
    current_id = [a for a in accounts if a["account_type"] == "current"][0]["id"]
    savings_id = [a for a in accounts if a["account_type"] == "savings"][0]["id"]

    r = client.post(f"/users/{seeded_user.id}/transfers", json={
        "from_account_id": current_id,
        "to_account_id": savings_id,
        "amount": 100.0,
        "reference": "savings-transfer",
    })
    assert r.status_code == 201


def test_create_direct_debit(client, seeded_user):
    accounts = client.get(f"/users/{seeded_user.id}/accounts").json()
    current_id = [a for a in accounts if a["account_type"] == "current"][0]["id"]

    r = client.post(f"/users/{seeded_user.id}/direct-debits", json={
        "account_id": current_id,
        "payee_name": "Gym Membership",
        "amount": 29.99,
        "frequency": "monthly",
    })
    assert r.status_code == 201


def test_insufficient_balance_payment(client, seeded_user):
    accounts = client.get(f"/users/{seeded_user.id}/accounts").json()
    current_id = [a for a in accounts if a["account_type"] == "current"][0]["id"]

    r = client.post(f"/users/{seeded_user.id}/payments", json={
        "from_account_id": current_id,
        "payee_name": "Big Payment",
        "amount": 999999.0,
    })
    assert r.status_code == 400


def test_connect_email(client, seeded_user):
    r = client.post(f"/users/{seeded_user.id}/email/connect", json={
        "email_address": "work@test.com",
        "provider": "fake-imap",
    })
    assert r.status_code == 201


def test_list_emails(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}/emails")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_simulate_transaction(client, seeded_user):
    accounts = client.get(f"/users/{seeded_user.id}/accounts").json()
    current_id = [a for a in accounts if a["account_type"] == "current"][0]["id"]

    r = client.post("/simulator/transactions", json={
        "user_id": seeded_user.id,
        "account_id": current_id,
        "amount": 100.0,
        "description": "Test purchase",
        "category": "shopping",
        "transaction_type": "debit",
    })
    assert r.status_code == 200
    assert "transaction_id" in r.json()
    assert "new_balance" in r.json()


def test_audit_logs(client, seeded_user):
    accounts = client.get(f"/users/{seeded_user.id}/accounts").json()
    current_id = [a for a in accounts if a["account_type"] == "current"][0]["id"]
    client.post(f"/users/{seeded_user.id}/payments", json={
        "from_account_id": current_id,
        "payee_name": "Audit Test",
        "amount": 10.0,
    })

    r = client.get(f"/users/{seeded_user.id}/audit-logs")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_agent_runs_empty(client, seeded_user):
    r = client.get(f"/users/{seeded_user.id}/agent-runs")
    assert r.status_code == 200
    assert r.json() == []
