from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator


class NoteCreate(BaseModel):
    title: str = Field(default="", max_length=2000)
    content: str = Field(default="", max_length=100_000)
    is_pinned: bool = False
    is_locked: bool = False
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, v: list[str]) -> list[str]:
        if not v:
            return []
        out: list[str] = []
        seen: set[str] = set()
        for raw in v:
            name = raw.strip().lower().lstrip("#") if isinstance(raw, str) else ""
            if not name or name in seen:
                continue
            seen.add(name)
            out.append(name)
        return out

    @model_validator(mode="after")
    def nonempty(self) -> "NoteCreate":
        if not self.title.strip() and not self.content.strip():
            raise ValueError("Informe um título ou conteúdo para a nota.")
        return self


class NotePatch(BaseModel):
    title: str | None = Field(default=None, max_length=2000)
    content: str | None = Field(default=None, max_length=100_000)
    is_pinned: bool | None = None
    is_locked: bool | None = None
    tags: list[str] | None = None

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        out: list[str] = []
        seen: set[str] = set()
        for raw in v:
            name = raw.strip().lower().lstrip("#") if isinstance(raw, str) else ""
            if not name or name in seen:
                continue
            seen.add(name)
            out.append(name)
        return out

    @model_validator(mode="after")
    def nonempty_when_both_set(self) -> "NotePatch":
        if self.title is not None and self.content is not None:
            if not self.title.strip() and not self.content.strip():
                raise ValueError("Informe um título ou conteúdo para a nota.")
        return self


class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    is_pinned: bool
    is_locked: bool
    tags: list[str]
    created_at: datetime
    updated_at: datetime
