from pydantic import BaseModel


class BankCallbackRequest(BaseModel):
    code: str
    state: str