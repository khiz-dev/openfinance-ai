# OpenFinance AI — Task Runner
# Run `just` to see all available recipes

set dotenv-load

default:
    @just --list

# ── Setup ─────────────────────────────────────────────────────────────

# Install all dependencies (backend + frontend)
install:
    poetry install
    cd frontend && npm install

# Install backend only
install-backend:
    poetry install

# Install frontend only
install-frontend:
    cd frontend && npm install

# Install production dependencies only
install-prod:
    poetry install --only main
    cd frontend && npm ci

# Update backend deps to latest compatible versions
update:
    poetry update

# Add a backend dependency (usage: just add httpx)
add package:
    poetry add {{package}}

# Add a backend dev dependency (usage: just add-dev ruff)
add-dev package:
    poetry add --group dev {{package}}

# Add a frontend dependency (usage: just add-front axios)
add-front package:
    cd frontend && npm install {{package}}

# Copy .env.example to .env if it doesn't exist
env:
    @[ -f .env ] && echo ".env already exists" || (cp .env.example .env && echo "Created .env from .env.example — edit it to add your API keys")

# Full first-time setup (backend + frontend + env)
setup: env install
    @echo ""
    @echo "✔ Setup complete."
    @echo "  1. Edit .env and add your OPENAI_API_KEY"
    @echo "  2. Run: just dev"

# ── Development ───────────────────────────────────────────────────────

# Start both backend and frontend (backend :8000, frontend :5173)
dev:
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    poetry run uvicorn app.main:app --reload --port 8000 &
    cd frontend && npm run dev &
    wait

# Start backend only with auto-reload
dev-api:
    poetry run uvicorn app.main:app --reload --port 8000

# Start frontend only (Vite dev server with API proxy)
dev-ui:
    cd frontend && npm run dev

# Start backend on a custom port (usage: just dev-port 8080)
dev-port port:
    poetry run uvicorn app.main:app --reload --port {{port}}

# Open frontend in browser
open:
    open http://localhost:5173

# Open Swagger API docs in browser
docs:
    open http://localhost:8000/docs

# Seed the database manually
seed:
    poetry run python -c "from app.seed import seed_database; seed_database()"

# Reset database (delete + re-seed on next start)
reset-db:
    rm -f openfinance.db test_openfinance.db
    @echo "Database deleted. It will re-seed on next server start."

# ── Frontend Build ────────────────────────────────────────────────────

# Build frontend for production
build-ui:
    cd frontend && npm run build

# Preview production frontend build
preview-ui:
    cd frontend && npm run preview

# Type-check frontend
check-ui:
    cd frontend && npx tsc --noEmit

# ── Testing ───────────────────────────────────────────────────────────

# Run all backend tests
test:
    poetry run pytest tests/ -v

# Run tests with short traceback
test-short:
    poetry run pytest tests/ -v --tb=short

# Run a specific test file (usage: just test-file tests/test_api.py)
test-file file:
    poetry run pytest {{file}} -v

# Run tests matching a keyword (usage: just test-k "payment")
test-k keyword:
    poetry run pytest tests/ -v -k "{{keyword}}"

# ── Docker ────────────────────────────────────────────────────────────

# Build and start all containers (API + UI on :3000)
docker-up:
    docker compose up --build -d
    @echo ""
    @echo "✔ Running at http://localhost:3000"
    @echo "  API:  http://localhost:3000/api/"
    @echo "  Logs: just docker-logs"

# Stop all containers
docker-down:
    docker compose down

# Rebuild and restart all containers
docker-restart:
    docker compose down && docker compose up --build -d

# View all Docker logs (follow mode)
docker-logs:
    docker compose logs -f

# View backend logs only
docker-logs-api:
    docker compose logs -f api

# View frontend logs only
docker-logs-web:
    docker compose logs -f web

# Open the Docker app in browser
docker-open:
    open http://localhost:3000

# Remove containers, volumes, and images
docker-nuke:
    docker compose down -v --rmi local
    @echo "Docker resources removed."

# ── Demo Flow ─────────────────────────────────────────────────────────

# Run the full demo flow against a running server (curl-based)
demo:
    #!/usr/bin/env bash
    set -euo pipefail
    BASE="http://localhost:8000"
    echo "═══ OpenFinance AI — Demo Flow ═══"
    echo ""
    echo "1. Financial Summary"
    curl -s "$BASE/users/1/summary" | python3 -m json.tool
    echo ""
    echo "2. Built-in Agents"
    curl -s "$BASE/agents/builtin" | python3 -m json.tool
    echo ""
    echo "3. User Subscriptions"
    curl -s "$BASE/users/1/subscriptions" | python3 -m json.tool
    echo ""
    echo "4. User Insights"
    curl -s "$BASE/users/1/insights" | python3 -m json.tool
    echo ""
    echo "5. Simulating salary transaction..."
    curl -s -X POST "$BASE/simulator/transactions" \
      -H "Content-Type: application/json" \
      -d '{"user_id":1,"account_id":1,"amount":3850,"description":"SALARY — Acme Corp Ltd","category":"salary","merchant":"Acme Corp","transaction_type":"credit"}' \
      | python3 -m json.tool
    echo ""
    echo "6. Agent Runs"
    curl -s "$BASE/users/1/agent-runs" | python3 -m json.tool
    echo ""
    echo "═══ Demo complete ═══"

# ── Utilities ─────────────────────────────────────────────────────────

# Show project structure
tree:
    @echo "── Backend ──"
    @find app tests -type f -name "*.py" | sort
    @echo ""
    @echo "── Frontend ──"
    @find frontend/src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | sort

# Check Python and Poetry versions
versions:
    @echo "Python:  $(poetry run python --version)"
    @echo "Poetry:  $(poetry --version)"
    @echo "Node:    $(node --version)"
    @echo "npm:     $(npm --version)"

# Clean generated files
clean:
    rm -f openfinance.db test_openfinance.db
    rm -rf frontend/dist
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
    @echo "Cleaned."

# Nuke everything (node_modules, venvs, dbs) and start fresh
nuke: clean
    rm -rf frontend/node_modules
    @echo "Nuked. Run 'just setup' to start fresh."
