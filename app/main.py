from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import agents, audit, chat, emails, invoices, payments, simulator, users
from app.seed import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="OpenFinance AI",
    description="AI-powered B2B financial automation platform — Zapier + AI + Banking Automation",
    version="0.1.0",
)

_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(agents.router)
app.include_router(chat.router)
app.include_router(payments.router)
app.include_router(invoices.router)
app.include_router(emails.router)
app.include_router(simulator.router)
app.include_router(audit.router)


@app.on_event("startup")
def on_startup():
    init_db()
    seed_database()


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "OpenFinance AI",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
