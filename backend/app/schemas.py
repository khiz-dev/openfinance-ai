from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BankAccountCreate(BaseModel):
    provider_id: str
    provider_name: str
    account_id: str
    account_name: str | None = None
    account_type: str | None = None


class BankAccountOut(BaseModel):
    id: int
    provider_id: str
    provider_name: str
    account_id: str
    account_name: str | None
    account_type: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AgentOut(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    category: str
    is_custom: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserAgentCreate(BaseModel):
    agent_id: int
    config: dict | None = None


class UserAgentOut(BaseModel):
    id: int
    agent_id: int
    agent: AgentOut
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    message: str
    model: str = "gpt-4o"


class ChatResponse(BaseModel):
    response: str


class CreateAgentRequest(BaseModel):
    name: str
    description: str
    goal: str
    trigger_frequency: str | None = None
    trigger_config: dict | None = None