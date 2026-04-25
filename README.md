# OpenFinance AI

AI-powered personal finance automation platform — **Zapier + AI + Banking Automation**.

## Features

- **Bank Account Aggregation** — simulated multi-account banking (current, savings, investment, credit)
- **Real LLM-Powered Agents** — AI agents using OpenAI/Anthropic for financial reasoning
- **Built-in Agents** — Affordability AI, Spending Behavior, Subscription Tracker, Payday Monitor, Finance Manager, Invoice Executor
- **Custom Agent Builder** — users create their own agents with natural language goals
- **Payment Simulation** — payments, transfers, direct debits (simulated)
- **Email Integration** — fake email scanning for invoices and subscription detection
- **Transaction Simulator** — inject transactions that trigger agent automation
- **Policy Engine** — validates all AI plans before execution
- **Full Audit Trail** — every action logged and explainable

## Quick Start

```bash
# 1. Install dependencies (requires Python 3.12+)
poetry install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start the server (auto-seeds fake data)
poetry run uvicorn app.main:app --reload

# 4. Open Swagger docs
open http://localhost:8000/docs
```

## Demo Flow

1. Start app → fake data seeded automatically
2. `GET /users/1/summary` → view financial overview
3. `GET /agents/builtin` → see available AI agents
4. `POST /users/1/agents/1/run` → run Affordability AI
5. `POST /users/1/agents/4/enable` → enable Payday Monitor
6. Simulate salary: `POST /simulator/transactions` with salary data → Payday Monitor triggers
7. `GET /users/1/emails` → see fake invoices
8. `POST /users/1/agents/6/run` → run Invoice Executor
9. `GET /users/1/agent-runs` → view all agent execution logs

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/users` | GET/POST | User management |
| `/users/{id}/summary` | GET | Financial summary with health score |
| `/users/{id}/transactions` | GET | Transaction history |
| `/users/{id}/insights` | GET | Computed financial insights |
| `/users/{id}/subscriptions` | GET | Detected subscriptions |
| `/agents` | GET | All agent definitions |
| `/agents/builtin` | GET | Built-in AI agents |
| `/users/{id}/agents` | GET/POST | User agents (built-in + custom) |
| `/users/{id}/agents/{id}/run` | POST | Execute an agent (LLM-powered) |
| `/users/{id}/agents/{id}/enable` | POST | Enable agent |
| `/users/{id}/agents/{id}/disable` | POST | Disable agent |
| `/users/{id}/agent-runs` | GET | Agent execution logs |
| `/users/{id}/payments` | POST | Create payment instruction |
| `/users/{id}/transfers` | POST | Transfer between accounts |
| `/users/{id}/direct-debits` | POST | Set up direct debit |
| `/users/{id}/email/connect` | POST | Connect email (fake) |
| `/users/{id}/emails` | GET | List email messages |
| `/simulator/transactions` | POST | Simulate a transaction |
| `/users/{id}/audit-logs` | GET | Audit trail |

## Architecture

```
app/
  main.py              # FastAPI app + startup
  config.py            # Settings (env-based)
  database.py          # SQLAlchemy setup
  seed.py              # Fake data seeder
  models/              # SQLAlchemy ORM models
  schemas/             # Pydantic request/response schemas
  routers/             # API route handlers
  llm/                 # LLM abstraction (OpenAI, Anthropic)
  agents/              # Agent registry + runner
  planner/             # LLM-powered planning + policy engine
  executor/            # Safe action execution
  services/            # Financial context builder + tools
  simulator/           # Transaction simulation
```

## Agent Execution Flow

```
User Request → Build Financial Context → LLM Planner → Structured Plan (JSON)
  → Policy Engine Validation → Tool Executor → Audit Log → Result
```

## Running Tests

```bash
poetry run pytest tests/ -v
```

## Docker

```bash
docker compose up --build
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `LLM_PROVIDER` | LLM provider (openai/anthropic) | openai |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `ANTHROPIC_API_KEY` | Anthropic API key | — |
| `LLM_MODEL` | Model name | gpt-4.1-mini |
| `DATABASE_URL` | SQLite database path | sqlite:///./openfinance.db |
