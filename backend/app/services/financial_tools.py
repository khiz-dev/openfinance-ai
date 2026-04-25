from datetime import datetime, timezone, timedelta
from typing import Literal

from sqlalchemy import select
from app.services.truelayer import get_mock_service


TOOL_DEFINITIONS = {
    "get_summary": {
        "description": "Get a complete financial overview: all balances, monthly income/spending, top spending categories, recurring payments, and recent transactions.",
        "parameters": {"type": "object", "properties": {}},
    },
    "get_all_transactions": {
        "description": "Browse ALL transactions across all connected bank accounts. Most recent first. Use to answer specific questions about spending, merchants, or history.",
        "parameters": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Days to look back (default 90)", "default": 90},
                "limit": {"type": "integer", "description": "Max transactions to return (default 500)", "default": 500},
            },
        },
    },
    "get_payday_analysis": {
        "description": "Analyze salary deposits and payday patterns. Use for questions about income frequency, late salary, payday status.",
        "parameters": {"type": "object", "properties": {}},
    },
    "get_affordability_analysis": {
        "description": "Check if a purchase is affordable given current finances.",
        "parameters": {
            "type": "object",
            "properties": {"purchase_amount": {"type": "number", "description": "Purchase amount in GBP"}},
            "required": ["purchase_amount"],
        },
    },
}

BASE_CUSTOM_AGENT_PROMPT = """You are {name}, a personal financial AI assistant.

Your role: {goal}

You have access to the user's real UK bank account data. Use the available tools to answer questions with actual numbers from their transactions.

Be specific, helpful, and actionable. Reference actual transactions and amounts in your answers."""


def auto_generate_tools(goal: str) -> list[dict]:
    goal_lower = goal.lower()
    tools = []

    if any(kw in goal_lower for kw in ["spending", "expense", "where", "category", "merchant", "food", "shopping", "transport"]):
        tools.append(("get_all_transactions", TOOL_DEFINITIONS["get_all_transactions"]))
        tools.append(("get_summary", TOOL_DEFINITIONS["get_summary"]))

    if any(kw in goal_lower for kw in ["salary", "pay", "income", "payday", "deposit", "wage"]):
        tools.append(("get_payday_analysis", TOOL_DEFINITIONS["get_payday_analysis"]))
        tools.append(("get_all_transactions", TOOL_DEFINITIONS["get_all_transactions"]))

    if any(kw in goal_lower for kw in ["afford", "affordability", "budget", "can i", "can i afford", "debt", "loan"]):
        tools.append(("get_affordability_analysis", TOOL_DEFINITIONS["get_affordability_analysis"]))
        tools.append(("get_summary", TOOL_DEFINITIONS["get_summary"]))

    if any(kw in goal_lower for kw in ["balance", "total", "net worth", "savings", "account"]):
        tools.append(("get_summary", TOOL_DEFINITIONS["get_summary"]))

    if not tools:
        tools = [
            ("get_summary", TOOL_DEFINITIONS["get_summary"]),
            ("get_all_transactions", TOOL_DEFINITIONS["get_all_transactions"]),
        ]

    seen = set()
    unique = []
    for name, defn in tools:
        if name not in seen:
            seen.add(name)
            unique.append((name, defn))
    return unique


def auto_generate_system_prompt(name: str, goal: str, frequency: str) -> str:
    tools = auto_generate_tools(goal)
    tool_list = "\n".join(f"- {t[0]}: {t[1]['description']}" for t in tools)

    freq_note = ""
    if frequency and frequency != "on-demand":
        freq_note = f"\nYou run {frequency}. When triggered, proactively check the data and report relevant findings."

    return f"""You are {name}.

Your purpose: {goal}

Available tools:
{tool_list}
{freq_note}

Instructions:
- Always use tools to get real data before answering
- Be specific with numbers and transaction references
- If the user hasn't connected a bank account, ask them to do so first
- If data is missing, say so clearly"""


class FinancialDataTools:
    def __init__(self, user):
        self.user = user

    async def get_all_transactions(self, days: int = 90, limit: int = 500) -> dict:
        all_txns = []
        for account in self.user.bank_accounts:
            svc = get_mock_service(account.provider_id)
            txns = svc.get_transactions(account.account_id)
            for t in txns:
                t["provider"] = account.provider_name
                t["account_name"] = account.account_name
            all_txns.extend(txns)
        all_txns.sort(key=lambda x: x["date"], reverse=True)
        total = len(all_txns)
        shown = all_txns[:limit]
        return {
            "total_transactions": total,
            "showing": len(shown),
            "has_more": total > limit,
            "transactions": shown,
        }

    async def get_summary(self) -> dict:
        accounts = self.user.bank_accounts
        if not accounts:
            return {"error": "No bank accounts connected"}

        all_txns = []
        for account in accounts:
            svc = get_mock_service(account.provider_id)
            txns = svc.get_transactions(account.account_id)
            for t in txns:
                t["provider"] = account.provider_name
                t["account_name"] = account.account_name
            all_txns.extend(txns)

        if not all_txns:
            return {"error": "No transactions found"}

        credits = [t for t in all_txns if t.get("amount", 0) > 0]
        debits = [t for t in all_txns if t.get("amount", 0) < 0]

        monthly_txns = [
            t for t in all_txns
            if (datetime.now(timezone.utc).date() - datetime.fromisoformat(t["date"]).date()).days <= 30
        ]
        monthly_income = sum(t["amount"] for t in monthly_txns if t["amount"] > 0)
        monthly_spending = abs(sum(t["amount"] for t in monthly_txns if t["amount"] < 0))

        categories = {}
        for t in debits:
            cat = t.get("category", "other")
            categories[cat] = categories.get(cat, 0) + abs(t["amount"])

        recurring = self._find_recurring(debits)

        balances = []
        for account in accounts:
            svc = get_mock_service(account.provider_id)
            bal = svc.get_balance(account.account_id)
            balances.append({
                "provider": account.provider_name,
                "account": account.account_name,
                "balance": bal.get("available", 0),
                "currency": bal.get("currency", "GBP"),
            })

        total_balance = sum(b["balance"] for b in balances)

        return {
            "total_balance_gbp": round(total_balance, 2),
            "balances": balances,
            "monthly_income_gbp": round(monthly_income, 2),
            "monthly_spending_gbp": round(monthly_spending, 2),
            "monthly_net_gbp": round(monthly_income - monthly_spending, 2),
            "transaction_count_90d": len(all_txns),
            "top_categories": dict(sorted(categories.items(), key=lambda x: x[1], reverse=True)[:6]),
            "recurring_payments": recurring[:8],
            "recent_transactions": sorted(all_txns, key=lambda x: x["date"], reverse=True)[:15],
        }

    def _find_recurring(self, debits: list[dict]) -> list[dict]:
        desc_map: dict[str, list[float]] = {}
        for t in debits:
            desc = t.get("description", "").lower()
            if len(desc) > 3:
                desc_map.setdefault(desc, []).append(abs(t["amount"]))

        recurring = []
        for desc, amounts in desc_map.items():
            if len(amounts) >= 2:
                avg = sum(amounts) / len(amounts)
                variance = sum((x - avg) ** 2 for x in amounts) / len(amounts)
                if variance < avg * 0.5:
                    recurring.append({"description": desc.title(), "avg_monthly_gbp": round(avg, 2), "occurrences": len(amounts)})
        recurring.sort(key=lambda x: x["avg_monthly_gbp"], reverse=True)
        return recurring

    async def get_affordability_analysis(self, purchase_amount: float) -> dict:
        summary = await self.get_summary()
        if "error" in summary:
            return summary

        monthly_net = summary["monthly_net_gbp"]
        total_balance = summary["total_balance_gbp"]
        discretionary = max(monthly_net * 0.3, 0)
        safe = min(discretionary, total_balance * 0.1)

        if purchase_amount > safe * 3:
            verdict = "HIGH_RISK"
        elif purchase_amount > safe:
            verdict = "CAUTION"
        else:
            verdict = "AFFORDABLE"

        return {
            "verdict": verdict,
            "purchase_amount_gbp": purchase_amount,
            "your_safe_discretionary_gbp": round(safe, 2),
            "monthly_net_gbp": monthly_net,
            "total_balance_gbp": total_balance,
        }

    async def get_payday_analysis(self) -> dict:
        all_txns = []
        for account in self.user.bank_accounts:
            svc = get_mock_service(account.provider_id)
            all_txns.extend(svc.get_transactions(account.account_id))

        if not all_txns:
            return {"error": "No transactions found"}

        credits = sorted(
            [t for t in all_txns if t["amount"] > 100],
            key=lambda x: x["date"],
            reverse=True
        )
        salary_txns = [
            t for t in credits
            if any(kw in t.get("description", "").upper() for kw in ["SALARY", "DEPOSIT", "TAX REFUND", "MARKETPLACE"])
        ]

        today = datetime.now(timezone.utc).date()
        last_payday = datetime.fromisoformat(salary_txns[0]["date"]).date() if salary_txns else None
        days_since = (today - last_payday).days if last_payday else None

        avg_interval = 30
        if len(salary_txns) >= 2:
            dates = sorted(datetime.fromisoformat(t["date"]).date() for t in salary_txns)
            intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_interval = sum(intervals) / len(intervals)

        expected_next = (last_payday + timedelta(days=int(avg_interval))) if last_payday else None

        if days_since and days_since > avg_interval:
            status = "LATE"
        elif days_since and days_since > avg_interval * 0.8:
            status = "DUE_SOON"
        else:
            status = "ON_TRACK"

        return {
            "status": status,
            "last_payday": last_payday.isoformat() if last_payday else None,
            "days_since_last": days_since,
            "expected_next_payday": expected_next.isoformat() if expected_next else None,
            "avg_interval_days": round(avg_interval, 1),
            "deposits_detected": len(salary_txns),
            "average_salary_gbp": round(sum(t["amount"] for t in salary_txns) / max(len(salary_txns), 1), 2),
            "recent_deposits": [{"date": t["date"], "description": t["description"], "amount_gbp": round(t["amount"], 2)} for t in salary_txns[:5]],
        }