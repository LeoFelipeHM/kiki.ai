from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

AgentType = Literal["research", "shopping", "travel", "custom"]
AgentStatus = Literal["planned", "queued", "working", "paused", "completed", "error"]
AgentEffort = Literal["low", "medium", "high"]
AgentStepStatus = Literal["pending", "working", "completed", "error"]
AgentMessageRole = Literal["user", "agent"]


class AgentCreate(BaseModel):
    task: str = Field(..., min_length=1, max_length=20_000)
    type: AgentType = "custom"
    effort: AgentEffort = "medium"
    name: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def task_nonempty(self) -> "AgentCreate":
        if not self.task.strip():
            raise ValueError("Descreva a tarefa do agente.")
        return self


class AgentPatch(BaseModel):
    effort: AgentEffort


class AgentReorder(BaseModel):
    agent_ids: list[str] = Field(default_factory=list)


class AgentMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=20_000)

    @model_validator(mode="after")
    def content_nonempty(self) -> "AgentMessageCreate":
        if not self.content.strip():
            raise ValueError("Digite uma mensagem para o agente.")
        return self


class AgentStepResponse(BaseModel):
    id: str
    agent_id: str
    position: int
    description: str
    status: AgentStepStatus
    details: str | None = None
    created_at: datetime
    updated_at: datetime


class AgentResponse(BaseModel):
    id: str
    user_id: str
    name: str
    type: AgentType
    task: str
    status: AgentStatus
    effort: AgentEffort
    progress: int
    color: str
    current_action: str | None = None
    results: str | None = None
    error_message: str | None = None
    sort_order: int
    queued_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    steps: list[AgentStepResponse]


class AgentMessageResponse(BaseModel):
    id: str
    agent_id: str
    user_id: str
    role: AgentMessageRole
    content: str
    created_at: datetime
