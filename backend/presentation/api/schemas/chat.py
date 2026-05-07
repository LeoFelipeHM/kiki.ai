from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=32000)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Mensagem vazia.")
        return stripped


class ChatRequest(BaseModel):
    messages: list[ChatMessage]

    @model_validator(mode="after")
    def non_empty_last_from_user(self) -> ChatRequest:
        if not self.messages:
            raise ValueError("Envie pelo menos uma mensagem.")
        if self.messages[-1].role != "user":
            raise ValueError("A última mensagem deve ser do usuário.")
        return self


class ChatResponse(BaseModel):
    reply: str
