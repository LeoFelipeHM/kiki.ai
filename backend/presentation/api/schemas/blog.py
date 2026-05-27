from typing import Literal

from pydantic import BaseModel, Field


BlogPostStatus = Literal["draft", "published"]


class BlogPostRequest(BaseModel):
    title: str = Field(min_length=1)
    slug: str | None = None
    summary: str = Field(min_length=1)
    content: str = Field(min_length=1)
    category: str = Field(min_length=1)
    tags: list[str] | str | None = None
    coverImage: str | None = None
    status: BlogPostStatus
    author: str | None = None
    publishedAt: str | None = None


class BlogPostResponse(BaseModel):
    id: str
    title: str
    slug: str
    summary: str
    content: str
    category: str
    tags: list[str]
    coverImage: str | None = None
    status: BlogPostStatus
    author: str
    publishedAt: str
    createdAt: str
    updatedAt: str


class BlogUploadResponse(BaseModel):
    url: str
