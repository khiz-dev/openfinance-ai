"""Unit tests for the platform tools layer."""

from __future__ import annotations

from app.services.tools import execute_tool, get_available_tools


def test_available_tools():
    tools = get_available_tools()
    names = [t["name"] for t in tools]
    assert "analyse_transactions" in names
    assert "create_payment_instruction" in names
    assert "transfer_between_accounts" in names
    assert "generate_alert" in names
    assert len(tools) >= 10


def test_analyse_transactions(db, seeded_user):
    result = execute_tool("analyse_transactions", db, seeded_user.id, {})
    assert result["success"]
    assert "transaction_count" in result["result"]


def test_analyse_affordability(db, seeded_user):
    result = execute_tool("analyse_affordability", db, seeded_user.id, {})
    assert result["success"]
    assert "total_balance" in result["result"]


def test_detect_subscriptions(db, seeded_user):
    result = execute_tool("detect_subscriptions", db, seeded_user.id, {})
    assert result["success"]
    assert result["result"]["count"] >= 1


def test_scan_emails(db, seeded_user):
    result = execute_tool("scan_emails", db, seeded_user.id, {})
    assert result["success"]
    assert result["result"]["email_count"] >= 1


def test_detect_invoices(db, seeded_user):
    result = execute_tool("detect_invoices", db, seeded_user.id, {})
    assert result["success"]
    assert result["result"]["count"] >= 1


def test_create_payment_instruction(db, seeded_user):
    from app.models.base import BankAccount, AccountType
    account = db.query(BankAccount).filter(
        BankAccount.user_id == seeded_user.id, BankAccount.account_type == AccountType.CURRENT
    ).first()

    result = execute_tool("create_payment_instruction", db, seeded_user.id, {
        "from_account_id": account.id,
        "payee_name": "Test Payee",
        "amount": 25.0,
        "reference": "test",
    })
    assert result["success"]
    assert result["result"]["status"] == "simulated"


def test_transfer_between_accounts(db, seeded_user):
    from app.models.base import BankAccount, AccountType
    current = db.query(BankAccount).filter(BankAccount.user_id == seeded_user.id, BankAccount.account_type == AccountType.CURRENT).first()
    savings = db.query(BankAccount).filter(BankAccount.user_id == seeded_user.id, BankAccount.account_type == AccountType.SAVINGS).first()

    result = execute_tool("transfer_between_accounts", db, seeded_user.id, {
        "from_account_id": current.id,
        "to_account_id": savings.id,
        "amount": 100.0,
    })
    assert result["success"]


def test_generate_alert(db, seeded_user):
    result = execute_tool("generate_alert", db, seeded_user.id, {
        "message": "Test alert",
        "severity": "warning",
    })
    assert result["success"]


def test_unknown_tool(db, seeded_user):
    result = execute_tool("nonexistent_tool", db, seeded_user.id, {})
    assert not result["success"]


def test_insufficient_balance_payment(db, seeded_user):
    from app.models.base import BankAccount, AccountType
    account = db.query(BankAccount).filter(
        BankAccount.user_id == seeded_user.id, BankAccount.account_type == AccountType.CURRENT
    ).first()

    result = execute_tool("create_payment_instruction", db, seeded_user.id, {
        "from_account_id": account.id,
        "payee_name": "Too Much",
        "amount": 999999.0,
    })
    assert not result["success"]
