import httpx
from typing import Optional
from app.config import settings


class TrueLayerService:
    BASE_URL = "https://api.truelayer.com" if settings.TRUELAYER_ENV != "sandbox" else "https://api-sandbox.truelayer.com"

    def __init__(self, access_token: str):
        self.access_token = access_token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access_token}"}

    async def get_accounts(self) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.BASE_URL}/data/v1/accounts", headers=self._headers())
            resp.raise_for_status()
            return resp.json().get("results", [])

    async def get_transactions(self, account_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> list[dict]:
        params = {}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.BASE_URL}/data/v1/accounts/{account_id}/transactions",
                headers=self._headers(),
                params=params
            )
            resp.raise_for_status()
            return resp.json().get("results", [])

    async def get_balance(self, account_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.BASE_URL}/data/v1/accounts/{account_id}/balance", headers=self._headers())
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    def get_auth_url(state: str) -> str:
        client_id = settings.TRUELAYER_CLIENT_ID
        redirect_uri = settings.TRUELAYER_REDIRECT_URI
        return (
            f"https://auth.truelayer.com/?response_type=code"
            f"&client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope=accounts%20transactions%20balance%20offline_access"
            f"&state={state}"
        )

    @staticmethod
    async def exchange_code(code: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://auth.truelayer.com/connect/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.TRUELAYER_CLIENT_ID,
                    "client_secret": settings.TRUELAYER_CLIENT_SECRET,
                    "redirect_uri": settings.TRUELAYER_REDIRECT_URI,
                    "code": code,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    async def get_providers() -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://api.truelayer.com/data/v1/providers")
            resp.raise_for_status()
            return resp.json().get("results", [])