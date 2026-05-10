from pydantic import BaseModel, Field


class VapidPublicKeyResponse(BaseModel):
    public_key: str


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=1)
    auth: str = Field(min_length=1)


class PushSubscribeRequest(BaseModel):
    endpoint: str = Field(min_length=1)
    keys: PushSubscriptionKeys
    user_agent: str | None = None


class PushUnsubscribeRequest(BaseModel):
    endpoint: str = Field(min_length=1)


class PushSubscribeResponse(BaseModel):
    endpoint: str
    registered: bool = True


class PushTestResponse(BaseModel):
    delivered: int
