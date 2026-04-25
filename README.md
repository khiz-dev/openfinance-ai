# Capital OS

AI-powered personal finance platform for the UK. Connect your bank accounts and use AI agents to manage your finances.

## Stack

- **Backend**: Python 3.11 / FastAPI / SQLAlchemy / SQLite (aiosqlite)
- **Frontend**: React 18 / Vite / TypeScript / Tailwind
- **AI**: OpenAI GPT-4o with function calling / LangChain tools
- **Banking**: Mock TrueLayer (demo) — 6 UK banks with fake transactions

## Quick Start

```bash
# 1. Start backend (Docker)
docker compose up --build -d

# 2. Start frontend (separate terminal)
cd frontend && npm install && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## What's Working

### Backend API
- `POST /auth/register` — Register
- `POST /auth/login` — Login (JWT)
- `GET /banks/providers` — List mock UK banks
- `POST /banks/bank-connect` — Connect a mock bank (Monzo, Barclays, HSBC, etc.)
- `GET /banks/balances` — Get all balances
- `GET /banks/transactions` — Get transactions
- `GET /agents` — List marketplace agents
- `POST /agents` — Create custom agent (auto-generates system prompt + tools)
- `POST /agents/{id}/subscribe` — Subscribe to agent
- `POST /agents/{id}/chat` — Chat with agent (AI-powered with tool calling)
- `GET /agents/{id}/data` — Get agent data directly

### AI Agents

**Pre-built agents:**
1. **Affordability Agent** — Ask anything about what you can afford. Uses `get_summary` + `get_affordability_analysis`.
2. **Payday Monitor** — Tracks salary deposits, alerts on delay. Uses `get_payday_analysis` + `get_all_transactions`.
3. **Spending Insights** — Deep-dive into spending by category, merchant, trend. Uses all tools.
4. **Budget Guardian** — Watches spending vs budgets, warns before overspend.

**Custom agents:** Users describe a goal and frequency → system auto-generates system prompt and selects the right tools.

### Agent Tools (available to all agents)
- `get_summary` — Full financial overview: balances, income, spending, categories, recurring
- `get_all_transactions` — Browse ALL transactions (up to 500) across all accounts
- `get_payday_analysis` — Salary deposit status and patterns
- `get_affordability_analysis` — Check if a purchase amount is affordable

## Enable Real AI Responses

Add to `backend/.env`:
```env
OPENAI_API_KEY=sk-...
```

Without `OPENAI_API_KEY`, agents return a placeholder message. With it, agents use GPT-4o with function calling to browse transactions and provide AI-powered answers.

## Connect Real Open Banking

The mock service can be replaced with TrueLayer by updating `app/services/truelayer.py`. Set environment variables:
```env
TRUELAYER_CLIENT_ID=...
TRUELAYER_CLIENT_SECRET=...
```

## Remaining Work

### High Priority
- [ ] **Frontend UI** — Currently minimal. Needs full UI for: dashboard, bank connection flow, agent marketplace, agent chat, custom agent builder
- [ ] **Agent history** — Save chat history, show in chat UI
- [ ] **Real transaction categorization** — Mock uses static categories; real TrueLayer returns categorized transactions
- [ ] **Payday alerts** — Background scheduler (APScheduler) to check for late salary daily and send alerts
- [ ] **Agent persistence** — Custom agents saved to DB, can be resubscribed

### Medium Priority
- [ ] **Streaming chat** — SSE streaming for real-time AI responses
- [ ] **Agent triggers** — Cron-based agents (hourly/daily/weekly) that run in background and push alerts
- [ ] **Budget limits per category** — User sets limits, Budget Guardian monitors
- [ ] **Multiple users / workspaces**

### Nice to Have
- [ ] **Agent sharing** — Publish custom agents to marketplace
- [ ] **Agent templates** — Pre-built templates for common workflows (tax prep, holiday budgeting, etc.)
- [ ] **RAG on transaction history** — Vector store for semantic search over transactions
- [ ] **Transaction search** — Natural language search: "how much did I spend on groceries last month?"

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app
    config.py            # Settings from env
    database.py          # SQLite async setup
    models.py            # SQLAlchemy models
    schemas.py           # Pydantic schemas
    auth.py              # JWT auth
    routers/
      auth.py            # /auth endpoints
      banks.py           # /banks endpoints
      agents.py          # /agents endpoints
    services/
      truelayer.py       # Mock bank service
      financial_tools.py # AI tools (get_summary, etc.)
      agent.py           # Agent execution with OpenAI
  requirements.txt
  Dockerfile
  test_agent.py          # API test script

frontend/               # React/Vite app (needs work)
  src/
    pages/               # Landing, Login, Register, Dashboard, Agents, Chat, CreateAgent
    lib/api.ts           # API client
    contexts/            # Auth context

docker-compose.yml
README.md
```

## Database

SQLite file: `backend/capitalos.db` (created on first run). To reset:
```bash
rm backend/capitalos.db && docker compose restart
```

## Test Script

```bash
cd backend && python3 test_agent.py
```