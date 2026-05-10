from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    email: EmailStr

    @model_validator(mode="after")
    def name_nonempty(self) -> "ContactCreate":
        if not self.name.strip():
            raise ValueError("Informe o nome do contato.")
        return self


class ContactPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    email: EmailStr | None = None

    @model_validator(mode="after")
    def name_nonempty_when_set(self) -> "ContactPatch":
        if self.name is not None and not self.name.strip():
            raise ValueError("Informe o nome do contato.")
        return self


class ContactResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    created_at: datetime
    updated_at: datetime
