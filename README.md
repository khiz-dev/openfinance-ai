# Capital OS

AI-powered personal finance platform for the UK. Connect your bank via Open Banking and use or create AI agents to manage your finances.

## Stack

- **Backend**: Python 3.11+ / FastAPI / SQLAlchemy / PostgreSQL
- **Frontend**: React 18 / Vite / TypeScript / Tailwind
- **Open Banking**: TrueLayer (AIS — 98% UK bank coverage)
- **AI**: LangChain / OpenAI / Claude

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
# Fill in .env with your API keys
pip install -r requirements.txt
python -m app.main
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Features

1. **Bank Connection** — Connect UK bank accounts via TrueLayer Open Banking OAuth
2. **Agent Marketplace** — Browse and subscribe to pre-built AI agents
3. **Pre-built Agents**:
   - Affordability Agent — Answer affordability questions with real bank data
   - Payday Monitor — Watch for salary deposits, alert on delay/arrival
   - Spending Insights Agent — Deep-dive into spending habits
   - Budget Guardian — Budget limits per category with alerts
4. **Custom Agent Builder** — Create your own agent by describing its goal and trigger frequency
5. **Streaming Chat** — Real-time streaming responses from agents

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register |
| POST | /auth/login | Login |
| GET | /banks/providers | List TrueLayer providers |
| GET | /banks/connect | Get TrueLayer OAuth URL |
| GET | /banks/callback | OAuth callback |
| POST | /banks/accounts | Add connected account |
| GET | /banks/accounts | List connected accounts |
| GET | /banks/transactions | Get transactions |
| GET | /agents | List marketplace agents |
| POST | /agents | Create custom agent |
| POST | /agents/subscribe | Subscribe to agent |
| POST | /agents/{id}/chat | Chat with agent |
| POST | /agents/{id}/chat/stream | Streaming chat |

## Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/capitalos
SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-...
TRUELAYER_CLIENT_ID=...
TRUELAYER_CLIENT_SECRET=...
TRUELAYER_REDIRECT_URI=http://localhost:8000/banks/callback
FRONTEND_URL=http://localhost:5173
```