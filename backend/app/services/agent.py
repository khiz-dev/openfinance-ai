import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.financial_tools import FinancialDataTools, get_tools_for_agent
from app.services.truelayer import get_mock_service
from app.config import settings
from app.models import AgentMessage, BankAccount


async def run_agent_chat(
    db: AsyncSession,
    user_id: int,
    user_agent_id: int,
    agent_name: str,
    system_prompt: str,
    message: str,
    model: str = "gpt-4o-mini",
    bank_accounts: list = None,
) -> str:
    if bank_accounts is None:
        result = await db.execute(
            select(BankAccount).where(BankAccount.user_id == user_id, BankAccount.status == "active")
        )
        bank_accounts = list(result.scalars().all())

    db.add(AgentMessage(user_agent_id=user_agent_id, role="user", content=message))
    await db.flush()

    class UserLike:
        def __init__(self, accounts):
            self.bank_accounts = accounts
    fdt = FinancialDataTools(UserLike(bank_accounts))

    if not settings.OPENAI_API_KEY:
        responses = {
            "Affordability Agent": (
                "AI is powered off (no OPENAI_API_KEY). But I can tell you about your financial data right now:\n\n"
                "Use the /agents/{id}/data endpoint to get your financial summary, "
                "or add your OPENAI_API_KEY to .env to enable full AI-powered analysis."
            ),
            "Payday Monitor": "I can see your financial data. Add OPENAI_API_KEY to .env for AI-powered payday analysis.",
            "Spending Insights Agent": "I can analyze your spending. Add OPENAI_API_KEY to .env for AI-powered insights.",
            "Budget Guardian": "I'm tracking your budgets. Add OPENAI_API_KEY to .env for AI-powered alerts.",
        }
        reply = responses.get(agent_name, "Add OPENAI_API_KEY to .env to enable AI agent responses.")
        db.add(AgentMessage(user_agent_id=user_agent_id, role="assistant", content=reply))
        await db.commit()
        return reply

    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    tools = get_tools_for_agent(agent_name)
    agent_system = system_prompt or get_tools_for_agent.__doc__ or "You are a financial AI assistant."

    result = await db.execute(
        select(AgentMessage)
        .where(AgentMessage.user_agent_id == user_agent_id)
        .order_by(AgentMessage.created_at)
        .limit(20)
    )
    history = list(result.scalars().all())

    messages = [{"role": "system", "content": agent_system}]
    for h in history:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        max_tokens=1500,
    )

    choice = response.choices[0]
    reply_content = choice.message.content or ""

    if choice.message.tool_calls:
        for tc in choice.message.tool_calls:
            tool_name = tc.function.name
            args_str = tc.function.arguments
            args = {}
            try:
                args = json.loads(args_str) if args_str else {}
            except json.JSONDecodeError:
                pass

            if tool_name == "get_summary":
                result_data = await fdt.get_summary()
            elif tool_name == "get_all_transactions":
                result_data = await fdt.get_all_transactions(
                    days=args.get("days", 90),
                    limit=args.get("limit", 500),
                )
            elif tool_name == "get_payday_analysis":
                result_data = await fdt.get_payday_analysis()
            elif tool_name == "get_affordability_analysis":
                result_data = await fdt.get_affordability_analysis(args.get("purchase_amount", 0))
            else:
                result_data = {"error": f"Unknown tool: {tool_name}"}

            reply_content += f"\n\n[Tool: {tool_name}]\n{json.dumps(result_data, indent=2)}"
            messages.append({"role": "assistant", "content": reply_content})
            messages.append({"role": "tool", "content": json.dumps(result_data), "tool_call_id": tc.function.name})

        follow_up = await client.chat.completions.create(model=model, messages=messages, max_tokens=1500)
        reply_content = follow_up.choices[0].message.content or reply_content

    db.add(AgentMessage(user_agent_id=user_agent_id, role="assistant", content=reply_content))
    await db.commit()
    return reply_content