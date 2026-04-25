"""
Seed the database with realistic B2B demo data for a business finance platform.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.agents.registry import get_builtin_agent_specs
from app.database import SessionLocal, init_db
from app.models.base import (
    AccountType,
    AgentDefinition,
    ApprovedSupplier,
    BankAccount,
    EmailConnection,
    EmailMessage,
    ExecutionMode,
    Subscription,
    Transaction,
    TriggerType,
    User,
)

logger = logging.getLogger(__name__)


def seed_database() -> None:
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(User).first()
        if existing and existing.name == "Acme Corp":
            logger.info("Database already seeded with B2B data — skipping")
            return
        from app.database import Base, engine
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db.close()
        db = SessionLocal()
        _seed(db)
        logger.info("Database seeded successfully with B2B data")
    finally:
        db.close()


def _seed(db: Session) -> None:
    user = User(
        email="admin@acmecorp.io",
        name="Acme Corp",
        hashed_password="demo123",
    )
    db.add(user)
    db.flush()

    # ── Accounts ──────────────────────────────────────────────────────

    hsbc_current = BankAccount(user_id=user.id, name="HSBC Business Current", account_type=AccountType.CURRENT, balance=45_230.00, currency="GBP", provider="HSBC", purpose="operations")
    barclays_revenue = BankAccount(user_id=user.id, name="Barclays Revenue Account", account_type=AccountType.CURRENT, balance=128_450.75, currency="GBP", provider="Barclays", purpose="revenue")
    monzo_expenses = BankAccount(user_id=user.id, name="Monzo Business Expenses", account_type=AccountType.CURRENT, balance=5_840.20, currency="GBP", provider="Monzo", purpose="expenses")
    revolut_tax = BankAccount(user_id=user.id, name="Revolut Tax Reserve", account_type=AccountType.SAVINGS, balance=32_000.00, currency="GBP", provider="Revolut", purpose="tax_reserve")
    hsbc_savings = BankAccount(user_id=user.id, name="HSBC Business Savings", account_type=AccountType.SAVINGS, balance=85_000.00, currency="GBP", provider="HSBC", purpose="savings")
    amex_card = BankAccount(user_id=user.id, name="Amex Business Card", account_type=AccountType.CREDIT, balance=-4_580.30, currency="GBP", provider="American Express", purpose="corporate_card")

    db.add_all([hsbc_current, barclays_revenue, monzo_expenses, revolut_tax, hsbc_savings, amex_card])
    db.flush()

    # ── Transactions ──────────────────────────────────────────────────

    now = datetime.utcnow()
    txns = []

    # Client payments (revenue)
    clients = [
        ("Globex Industries", 18_500.00),
        ("Wayne Enterprises", 12_750.00),
        ("Initech Solutions", 8_400.00),
        ("Sterling Cooper", 6_200.00),
        ("Umbrella Corp", 15_300.00),
    ]
    for i, (client, amount) in enumerate(clients):
        for m in range(3):
            txns.append(Transaction(
                user_id=user.id, account_id=barclays_revenue.id, amount=amount,
                description=f"CLIENT PAYMENT — {client}", category="client_revenue", merchant=client,
                transaction_type="credit", date=now - timedelta(days=30 * m + i + 1),
            ))

    # Payroll
    for m in range(3):
        txns.append(Transaction(
            user_id=user.id, account_id=hsbc_current.id, amount=28_500.00,
            description="PAYROLL — Staff Salaries", category="payroll", merchant="Payroll",
            transaction_type="debit", date=now - timedelta(days=30 * m + 25),
        ))
        txns.append(Transaction(
            user_id=user.id, account_id=hsbc_current.id, amount=4_200.00,
            description="PAYROLL — Employer NI + Pension", category="payroll", merchant="HMRC/Pension",
            transaction_type="debit", date=now - timedelta(days=30 * m + 25),
        ))

    # Office rent
    for m in range(3):
        txns.append(Transaction(
            user_id=user.id, account_id=hsbc_current.id, amount=3_500.00,
            description="RENT — WeWork Shoreditch", category="office_rent", merchant="WeWork",
            transaction_type="debit", date=now - timedelta(days=30 * m + 1),
        ))

    # Supplier payments
    supplier_payments = [
        ("CloudTech Solutions", "IT services", 2_800.00),
        ("PrintMax Ltd", "printing & stationery", 450.00),
        ("SecureNet Systems", "cybersecurity", 1_200.00),
        ("CleanPro Services", "office cleaning", 680.00),
        ("DataFlow Analytics", "data platform", 3_500.00),
    ]
    for vendor, cat, amount in supplier_payments:
        for m in range(2):
            txns.append(Transaction(
                user_id=user.id, account_id=hsbc_current.id, amount=amount,
                description=f"SUPPLIER PAYMENT — {vendor}", category=cat, merchant=vendor,
                transaction_type="debit", date=now - timedelta(days=30 * m + 8),
            ))

    # Software / SaaS subscriptions (on expenses card)
    saas_txns = [
        ("AWS", "cloud_infrastructure", 2_340.00),
        ("Slack Business+", "communication", 125.00),
        ("GitHub Enterprise", "development", 210.00),
        ("HubSpot Pro", "marketing", 890.00),
        ("Xero Premium", "accounting", 65.00),
        ("Notion Team", "productivity", 80.00),
        ("Zoom Business", "communication", 149.99),
        ("Figma Organisation", "design", 450.00),
        ("1Password Business", "security", 95.00),
        ("Linear", "project_management", 80.00),
    ]
    for name, cat, amount in saas_txns:
        for m in range(3):
            txns.append(Transaction(
                user_id=user.id, account_id=monzo_expenses.id, amount=amount,
                description=f"SaaS — {name}", category=cat, merchant=name,
                transaction_type="debit", date=now - timedelta(days=30 * m + 5),
            ))

    # Corporate card expenses
    corp_expenses = [
        ("British Airways", "business_travel", 486.00),
        ("Hilton Hotels", "business_travel", 312.00),
        ("Uber Business", "transport", 67.50),
        ("Deliveroo for Business", "meals", 124.80),
        ("Staples", "office_supplies", 189.00),
        ("Amazon Business", "office_supplies", 342.60),
    ]
    for merchant, cat, amount in corp_expenses:
        txns.append(Transaction(
            user_id=user.id, account_id=amex_card.id, amount=amount,
            description=f"CARD — {merchant}", category=cat, merchant=merchant,
            transaction_type="debit", date=now - timedelta(days=int(3 + hash(merchant) % 25)),
        ))

    # Tax payments
    txns.append(Transaction(
        user_id=user.id, account_id=revolut_tax.id, amount=12_000.00,
        description="HMRC — Corporation Tax Q1", category="tax", merchant="HMRC",
        transaction_type="debit", date=now - timedelta(days=45),
    ))
    txns.append(Transaction(
        user_id=user.id, account_id=revolut_tax.id, amount=8_500.00,
        description="HMRC — VAT Return Q1", category="tax", merchant="HMRC",
        transaction_type="debit", date=now - timedelta(days=30),
    ))

    # Internal transfers
    txns.append(Transaction(
        user_id=user.id, account_id=barclays_revenue.id, amount=15_000.00,
        description="Transfer to Operations — HSBC", category="transfer", merchant="Internal",
        transaction_type="debit", date=now - timedelta(days=10),
    ))
    txns.append(Transaction(
        user_id=user.id, account_id=hsbc_current.id, amount=15_000.00,
        description="Transfer from Revenue — Barclays", category="transfer", merchant="Internal",
        transaction_type="credit", date=now - timedelta(days=10),
    ))
    txns.append(Transaction(
        user_id=user.id, account_id=barclays_revenue.id, amount=10_000.00,
        description="Transfer to Tax Reserve — Revolut", category="transfer", merchant="Internal",
        transaction_type="debit", date=now - timedelta(days=5),
    ))
    txns.append(Transaction(
        user_id=user.id, account_id=revolut_tax.id, amount=10_000.00,
        description="Transfer from Revenue — Barclays", category="transfer", merchant="Internal",
        transaction_type="credit", date=now - timedelta(days=5),
    ))

    db.add_all(txns)

    # ── Subscriptions ─────────────────────────────────────────────────

    subs = [
        Subscription(user_id=user.id, name="AWS", provider="Amazon Web Services", amount=2_340.00, frequency="monthly", category="cloud_infrastructure", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="Slack Business+", provider="Slack", amount=125.00, frequency="monthly", category="communication", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="GitHub Enterprise", provider="GitHub", amount=210.00, frequency="monthly", category="development", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="HubSpot Pro", provider="HubSpot", amount=890.00, frequency="monthly", category="marketing", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="Xero Premium", provider="Xero", amount=65.00, frequency="monthly", category="accounting", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="Notion Team", provider="Notion", amount=80.00, frequency="monthly", category="productivity", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="Zoom Business", provider="Zoom", amount=149.99, frequency="monthly", category="communication", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="Figma Organisation", provider="Figma", amount=450.00, frequency="monthly", category="design", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="1Password Business", provider="1Password", amount=95.00, frequency="monthly", category="security", is_active=True, last_charged=now - timedelta(days=5)),
        Subscription(user_id=user.id, name="Linear", provider="Linear", amount=80.00, frequency="monthly", category="project_management", is_active=True, last_charged=now - timedelta(days=5)),
    ]
    db.add_all(subs)

    # ── Email connection + messages ───────────────────────────────────

    email_conn = EmailConnection(user_id=user.id, email_address="accounts@acmecorp.io", provider="fake-imap")
    db.add(email_conn)

    emails = [
        EmailMessage(
            user_id=user.id, sender="billing@cloudtechsolutions.com",
            subject="Invoice #CT-2026-0089 — IT Support Services",
            body="Dear Acme Corp,\n\nPlease find attached invoice for IT support services.\n\nInvoice: #CT-2026-0089\nAmount: £2,800.00\nDue date: 30/04/2026\nPayee: CloudTech Solutions Ltd\nBank: 40-20-15 / 87654321\nReference: CT-0089\n\nPayment terms: Net 30\n\nRegards,\nCloudTech Solutions",
            category="invoice", received_at=now - timedelta(days=2),
        ),
        EmailMessage(
            user_id=user.id, sender="accounts@securenet.co.uk",
            subject="Invoice #SN-4521 — Managed Security Services (April)",
            body="Dear Acme Corp,\n\nMonthly invoice for managed cybersecurity services.\n\nInvoice: #SN-4521\nAmount: £1,200.00\nDue date: 28/04/2026\nPayee: SecureNet Systems Ltd\nSort code: 20-45-60\nAccount: 55667788\nReference: SN-4521\n\nThank you for your continued partnership.\n\nSecureNet Systems",
            category="invoice", received_at=now - timedelta(days=1),
        ),
        EmailMessage(
            user_id=user.id, sender="invoices@dataflowanalytics.io",
            subject="Invoice #DF-2026-112 — Data Platform License",
            body="Hi,\n\nPlease find your monthly data platform invoice attached.\n\nInvoice: #DF-2026-112\nAmount: £3,500.00\nDue: 05/05/2026\nPayee: DataFlow Analytics Ltd\nBank: 30-15-80 / 11223344\nRef: DF-112\n\nPayment terms: Net 14\n\nDataFlow Analytics",
            category="invoice", received_at=now - timedelta(hours=12),
        ),
        EmailMessage(
            user_id=user.id, sender="noreply@aws.amazon.com",
            subject="Your AWS bill for April 2026 — £2,340.00",
            body="Hello,\n\nYour AWS usage charges for April 2026 total £2,340.00.\n\nThis amount will be charged to your default payment method on file.\n\nView your detailed billing in the AWS Console.\n\nAmazon Web Services",
            category="invoice", received_at=now - timedelta(days=3),
        ),
        EmailMessage(
            user_id=user.id, sender="no-reply@xero.com",
            subject="Monthly Reconciliation Reminder",
            body="Hi Acme Corp,\n\nFriendly reminder to complete your monthly bank reconciliation in Xero.\n\nYou have 12 unreconciled transactions this month.\n\nLog in to Xero to review.\n\nXero Team",
            category="reminder", received_at=now - timedelta(days=4),
        ),
        EmailMessage(
            user_id=user.id, sender="billing@unknownvendor.com",
            subject="Invoice #UV-001 — Consulting Services",
            body="Dear Sir/Madam,\n\nPlease find attached our invoice for consulting services rendered.\n\nInvoice: #UV-001\nAmount: £4,750.00\nDue: 25/04/2026\nPayee: Unknown Vendor Ltd\nBank: 12-34-56 / 99887766\nRef: UV-001\n\nImmediate payment required.\n\nUnknown Vendor Ltd",
            category="invoice", received_at=now - timedelta(hours=3),
        ),
    ]
    db.add_all(emails)

    # ── Approved Suppliers ────────────────────────────────────────────

    suppliers = [
        ApprovedSupplier(user_id=user.id, name="CloudTech Solutions", email="billing@cloudtechsolutions.com", payment_account_id=hsbc_current.id, max_auto_pay=5_000.00),
        ApprovedSupplier(user_id=user.id, name="SecureNet Systems", email="accounts@securenet.co.uk", payment_account_id=hsbc_current.id, max_auto_pay=2_000.00),
        ApprovedSupplier(user_id=user.id, name="DataFlow Analytics", email="invoices@dataflowanalytics.io", payment_account_id=hsbc_current.id, max_auto_pay=5_000.00),
        ApprovedSupplier(user_id=user.id, name="CleanPro Services", email="invoices@cleanpro.co.uk", payment_account_id=monzo_expenses.id, max_auto_pay=1_000.00),
        ApprovedSupplier(user_id=user.id, name="PrintMax Ltd", email="accounts@printmax.co.uk", payment_account_id=monzo_expenses.id, max_auto_pay=750.00),
    ]
    db.add_all(suppliers)

    # ── Built-in Agents ───────────────────────────────────────────────

    for spec in get_builtin_agent_specs():
        agent = AgentDefinition(
            user_id=None,
            name=spec.name,
            description=spec.description,
            goal=spec.goal,
            is_builtin=True,
            is_enabled=True,
            trigger_type=TriggerType(spec.trigger_type),
            execution_mode=ExecutionMode(spec.execution_mode),
            requires_approval=spec.requires_approval,
            allowed_actions=json.dumps(spec.allowed_actions),
            system_prompt=spec.system_prompt,
        )
        db.add(agent)

    # Rename any lingering "Invoice Tracker" to "Invoice Manager"
    old_tracker = db.query(AgentDefinition).filter(AgentDefinition.name == "Invoice Tracker").first()
    if old_tracker:
        old_tracker.name = "Invoice Manager"
        old_tracker.description = "Finds invoices from emails, shows previews with payment details, and initiates payments from configured accounts."
        db.commit()

    db.commit()
    logger.info("Seeded business '%s' with accounts, transactions, emails, subscriptions, suppliers, and agents", user.name)


if __name__ == "__main__":
    seed_database()
