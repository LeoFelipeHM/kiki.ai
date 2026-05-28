import json
import os
import re
import shutil
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import UploadFile


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _frontend_root() -> Path:
    repo_root = _backend_root().parent
    frontend_root = repo_root / "frontend"
    if frontend_root.exists():
        return frontend_root
    return _backend_root()


def _posts_file_path() -> Path:
    configured = os.getenv("BLOG_POSTS_FILE", "").strip()
    if configured:
        path = Path(configured)
        if path.is_absolute():
            return path
        return _frontend_root() / "data" / path.name
    return _frontend_root() / "data" / "blog-posts.json"


def _upload_dir() -> Path:
    configured = os.getenv("BLOG_IMAGES_DIR", "").strip()
    if configured:
        path = Path(configured)
        if path.is_absolute():
            return path
    return _frontend_root() / "public" / "blog-images"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    without_marks = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "-", without_marks.lower().strip())
    return slug.strip("-")


def parse_tags(tags: list[str] | str | None) -> list[str]:
    if tags is None:
        return []
    if isinstance(tags, list):
        return [tag.strip() for tag in tags if tag.strip()]
    return [tag.strip() for tag in tags.split(",") if tag.strip()]


def _sort_posts(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def key(post: dict[str, Any]) -> str:
        return str(post.get("publishedAt") or post.get("createdAt") or "")

    return sorted(posts, key=key, reverse=True)


def _unique_slug(base_slug: str, posts: list[dict[str, Any]]) -> str:
    fallback = base_slug or "post"
    used = {str(post.get("slug")) for post in posts}
    if fallback not in used:
        return fallback
    index = 2
    while f"{fallback}-{index}" in used:
        index += 1
    return f"{fallback}-{index}"


def _normalize_published_at(value: str | None) -> str:
    if not value:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return f"{value}T00:00:00"
    return value


class BlogService:
    def __init__(self) -> None:
        self._posts_file = _posts_file_path()
        self._upload_dir = _upload_dir()

    def _ensure_posts_file(self) -> None:
        self._posts_file.parent.mkdir(parents=True, exist_ok=True)
        if not self._posts_file.exists():
            self._posts_file.write_text("[]\n", encoding="utf-8")

    def list_posts(self) -> list[dict[str, Any]]:
        self._ensure_posts_file()
        raw = self._posts_file.read_text(encoding="utf-8")
        posts = json.loads(raw or "[]")
        if not isinstance(posts, list):
            return []
        return _sort_posts(posts)

    def _write_posts(self, posts: list[dict[str, Any]]) -> None:
        self._ensure_posts_file()
        self._posts_file.write_text(
            json.dumps(_sort_posts(posts), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def create_post(self, payload: dict[str, Any]) -> dict[str, Any]:
        posts = self.list_posts()
        now = datetime.utcnow().isoformat(timespec="milliseconds") + "Z"
        post = {
            "id": str(uuid4()),
            "title": str(payload["title"]).strip(),
            "slug": _unique_slug(slugify(str(payload.get("slug") or payload["title"])), posts),
            "summary": str(payload["summary"]).strip(),
            "content": str(payload["content"]).strip(),
            "category": str(payload.get("category") or "Kiki").strip(),
            "tags": parse_tags(payload.get("tags")),
            "coverImage": str(payload.get("coverImage") or "").strip(),
            "status": payload["status"],
            "author": str(payload.get("author") or "Time Kiki").strip(),
            "publishedAt": _normalize_published_at(payload.get("publishedAt")) or now,
            "createdAt": now,
            "updatedAt": now,
        }
        self._write_posts([post, *posts])
        return post

    def update_post(self, post_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        posts = self.list_posts()
        current = next((post for post in posts if post.get("id") == post_id), None)
        if current is None:
            return None

        now = datetime.utcnow().isoformat(timespec="milliseconds") + "Z"
        other_posts = [post for post in posts if post.get("id") != post_id]
        updated = {
            **current,
            "title": str(payload["title"]).strip(),
            "slug": _unique_slug(slugify(str(payload.get("slug") or payload["title"])), other_posts),
            "summary": str(payload["summary"]).strip(),
            "content": str(payload["content"]).strip(),
            "category": str(payload.get("category") or "Kiki").strip(),
            "tags": parse_tags(payload.get("tags")),
            "coverImage": str(payload.get("coverImage") or "").strip(),
            "status": payload["status"],
            "author": str(payload.get("author") or current.get("author") or "Time Kiki").strip(),
            "publishedAt": _normalize_published_at(payload.get("publishedAt")) or current.get("publishedAt"),
            "updatedAt": now,
        }
        self._write_posts([updated if post.get("id") == post_id else post for post in posts])
        return updated

    def delete_post(self, post_id: str) -> bool:
        posts = self.list_posts()
        next_posts = [post for post in posts if post.get("id") != post_id]
        if len(next_posts) == len(posts):
            return False
        self._write_posts(next_posts)
        return True

    def save_cover_image(self, upload: UploadFile) -> str:
        extension = Path(upload.filename or "").suffix.lower()
        if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            extension = ".jpg"
        safe_name = slugify(Path(upload.filename or "imagem-blog").stem) or "imagem-blog"
        file_name = f"{safe_name}-{uuid4().hex[:10]}{extension}"
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        target = self._upload_dir / file_name
        with target.open("wb") as destination:
            shutil.copyfileobj(upload.file, destination)
        return f"/blog-images/{file_name}"
