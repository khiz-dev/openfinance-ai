from datetime import datetime, timezone, timedelta
import random
import uuid

MERCHANTS = [
    ("Tesco", -45, -150, "groceries"),
    ("Shell", -35, -80, "transport"),
    ("Netflix", -9.99, -15.99, "entertainment"),
    ("Spotify", -9.99, -15.99, "entertainment"),
    ("Pret A Manger", -6, -15, "food"),
    ("Amazon UK", -15, -80, "shopping"),
    ("O2", -25, -45, "utilities"),
    ("National Rail", -20, -100, "transport"),
    ("Nando's", -12, -30, "food"),
    ("Currys", -50, -300, "shopping"),
    ("Boots", -8, -40, "health"),
    ("ASDA", -30, -120, "groceries"),
    ("IKEA", -25, -200, "shopping"),
    ("EE", -30, -50, "utilities"),
    ("Deliveroo", -15, -45, "food"),
    ("Uber Eats", -12, -40, "food"),
    ("Morrisons", -25, -100, "groceries"),
    ("Cafe Nero", -4, -8, "food"),
    ("Halfords", -20, -150, "shopping"),
    ("McDonald's", -5, -20, "food"),
]

INCOME_STREAMS = [
    ("SALARY - TechCorp Ltd", 2800, 3200),
    ("SALARY - NHS Trust", 2400, 2800),
    ("HMRC - TAX REFUND", 100, 500),
    ("TRANSFER FROM SAVINGS", 50, 200),
    ("AMAZON MARKETPLACE", 200, 800),
]


def generate_transactions(days: int = 90) -> list[dict]:
    txns = []
    today = datetime.now(timezone.utc).date()
    month_starts = []

    for i in range(days):
        d = today - timedelta(days=i)
        if d.day <= 5 and d not in month_starts:
            month_starts.append(d)
        if d.weekday() < 5:
            num_spend = random.randint(1, 4)
            for _ in range(num_spend):
                name, min_amt, max_amt, cat = random.choice(MERCHANTS)
                amount = round(random.uniform(abs(min_amt), abs(max_amt)), 2)
                txns.append({
                    "transaction_id": str(uuid.uuid4()),
                    "date": d.isoformat(),
                    "description": name,
                    "amount": -amount,
                    "currency": "GBP",
                    "category": cat,
                    "merchant_name": name,
                })

    for month_start in month_starts[:3]:
        name, min_sal, max_sal = random.choice(INCOME_STREAMS)
        amount = round(random.uniform(min_sal, max_sal), 2)
        txns.append({
            "transaction_id": str(uuid.uuid4()),
            "date": month_start.isoformat(),
            "description": f"SALARY DEPOSIT - {name}",
            "amount": amount,
            "currency": "GBP",
            "category": "income",
            "merchant_name": name.split(" - ")[1] if " - " in name else name,
        })

    txns.sort(key=lambda x: x["date"], reverse=True)
    return txns


MOCK_PROVIDERS = [
    {"provider_id": "mock-barclays", "provider_name": "Barclays", "logo": "B", "country": "GB"},
    {"provider_id": "mock-lloyds", "provider_name": "Lloyds Bank", "logo": "L", "country": "GB"},
    {"provider_id": "mock-hsbc", "provider_name": "HSBC UK", "logo": "H", "country": "GB"},
    {"provider_id": "mock-monzo", "provider_name": "Monzo", "logo": "M", "country": "GB"},
    {"provider_id": "mock-starling", "provider_name": "Starling Bank", "logo": "S", "country": "GB"},
    {"provider_id": "mock-revolut", "provider_name": "Revolut", "logo": "R", "country": "GB"},
]

MOCK_ACCOUNTS = {
    "mock-barclays": [
        {"account_id": "acc_barc_001", "account_name": "Current Account", "account_type": "CURRENT_ACCOUNT", "sort_code": "20-32-41", "account_number": "12345678", "currency": "GBP", "balance": 2847.32},
    ],
    "mock-lloyds": [
        {"account_id": "acc_loyd_001", "account_name": "Classic Account", "account_type": "CURRENT_ACCOUNT", "sort_code": "30-92-67", "account_number": "87654321", "currency": "GBP", "balance": 1240.55},
    ],
    "mock-monzo": [
        {"account_id": "acc_monz_001", "account_name": "Monzo Current", "account_type": "CURRENT_ACCOUNT", "currency": "GBP", "balance": 892.10},
        {"account_id": "acc_monz_002", "account_name": "Monzo Savings", "account_type": "SAVINGS_ACCOUNT", "currency": "GBP", "balance": 5400.00},
    ],
    "mock-hsbc": [
        {"account_id": "acc_hsbc_001", "account_name": "Advance Account", "account_type": "CURRENT_ACCOUNT", "sort_code": "40-47-23", "account_number": "44556677", "currency": "GBP", "balance": 4102.18},
    ],
    "mock-starling": [
        {"account_id": "acc_star_001", "account_name": "Personal Account", "account_type": "CURRENT_ACCOUNT", "currency": "GBP", "balance": 1890.44},
    ],
}


class MockTrueLayerService:
    def __init__(self, provider_id: str = ""):
        self.provider_id = provider_id

    def get_accounts(self) -> list[dict]:
        all_accts = []
        for provider, accts in MOCK_ACCOUNTS.items():
            for a in accts:
                all_accts.append({**a, "provider": provider})
        return all_accts

    def get_transactions(self, account_id: str, from_date: str = None, to_date: str = None) -> list[dict]:
        txns = generate_transactions(90)
        if from_date:
            txns = [t for t in txns if t["date"] >= from_date]
        if to_date:
            txns = [t for t in txns if t["date"] <= to_date]
        return txns

    def get_balance(self, account_id: str) -> dict:
        for accts in MOCK_ACCOUNTS.values():
            for a in accts:
                if a["account_id"] == account_id:
                    return {"available": a["balance"], "current": a["balance"], "currency": a["currency"]}
        return {"available": 0, "current": 0, "currency": "GBP"}


def get_mock_service(provider_id: str) -> MockTrueLayerService:
    return MockTrueLayerService(provider_id)