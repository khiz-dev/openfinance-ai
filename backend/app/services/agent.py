from typing import Optional, Literal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, UserAgent, AgentMessage
from app.services.truelayer import TrueLayerService


AFFORDABILITY_PROMPT = """You are a financial affordability advisor. Analyze the user's bank account data to answer their questions about:
- How much they can afford to spend on discretionary items
- Debt-to-income ratio analysis
- Savings capacity and recommendations
- Spending patterns and warnings
- Emergency fund adequacy

Be specific with numbers from their actual transactions. Format your response with clear sections and actionable advice."""

PAYDAY_MONITOR_PROMPT = """You are a payday monitor agent. Your job is to:
1. Watch for salary/wage deposits in the user's transactions
2. Alert when salary is detected (amount, date, employer if identifiable)
3. Alert when salary is LATE (based on user's expected payday pattern)
4. Track month-to-month income consistency
5. Alert on unusual fluctuations in income

Always reference specific transaction details when available. Maintain a running summary of the user's payday patterns."""


class AgentService:
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user

    async def build_context(self, user_agent: UserAgent) -> str:
        accounts = self.user.bank_accounts
        if not accounts:
            return "No bank accounts connected. Please connect a bank account first."

        context_parts = []
        for account in accounts:
            tl = TrueLayerService(account.access_token)
            try:
                accts = await tl.get_accounts()
                balance_data = await tl.get_balance(account.account_id)
                context_parts.append(f"Account: {account.account_name or account.account_id} ({account.provider_name})")
                context_parts.append(f"Balance: {balance_data.get('results', [{}])[0].get('available', 'N/A')}")

                transactions = await tl.get_transactions(account.account_id)
                context_parts.append(f"Recent Transactions ({len(transactions)}):")
                for tx in transactions[:20]:
                    context_parts.append(f"  - {tx.get('date', 'N/A')}: {tx.get('description', 'N/A')} | £{tx.get('amount', 'N/A')}")
            except Exception as e:
                context_parts.append(f"Account {account.account_id}: Error fetching data - {str(e)}")

        return "\n".join(context_parts)

    async def chat(self, user_agent: UserAgent, message: str, model: str = "gpt-4o") -> str:
        from openai import AsyncOpenAI
        from app.config import settings

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        msg = AgentMessage(user_agent_id=user_agent.id, role="user", content=message)
        self.db.add(msg)
        await self.db.commit()

        context = await self.build_context(user_agent)

        system_msg = user_agent.agent.system_prompt
        if user_agent.agent.name in ("Affordability Agent", "Payday Monitor"):
            system_msg = f"{user_agent.agent.system_prompt}\n\nCurrent bank data:\n{context}"

        history_result = await self.db.execute(
            select(AgentMessage)
            .where(AgentMessage.user_agent_id == user_agent.id)
            .order_by(AgentMessage.created_at)
            .limit(20)
        )
        history = history_result.scalars().all()

        messages = [{"role": "system", "content": system_msg}]
        for h in history:
            messages.append({"role": h.role, "content": h.content})

        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=1000,
        )
        answer = response.choices[0].message.content or ""

        reply = AgentMessage(user_agent_id=user_agent.id, role="assistant", content=answer)
        self.db.add(reply)
        await self.db.commit()

        return answer