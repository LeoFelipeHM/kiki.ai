from typing import Any

import psycopg

from application.ports import NotesRepository


class EmptyNoteError(ValueError):
    """Título e conteúdo não podem estar vazios ao mesmo tempo."""


class NotesService:
    def __init__(self, conn: psycopg.Connection[Any], notes_repo: NotesRepository) -> None:
        self._conn = conn
        self._repo = notes_repo

    def list_notes(self, user_id: str, search: str | None) -> list[dict[str, Any]]:
        q = search.strip() if search else None
        if q == "":
            q = None
        return self._repo.list_notes(user_id, q)

    def create_note(
        self,
        user_id: str,
        *,
        title: str,
        content: str,
        is_pinned: bool,
        is_locked: bool,
        tags: list[str],
    ) -> dict[str, Any]:
        if not title.strip() and not content.strip():
            raise EmptyNoteError("Informe um título ou conteúdo para a nota.")
        row = self._repo.create_note(user_id, title, content, is_pinned, is_locked, tags)
        self._conn.commit()
        return row

    def get_note(self, user_id: str, note_id: str) -> dict[str, Any] | None:
        return self._repo.get_note(user_id, note_id)

    def update_note(
        self,
        user_id: str,
        note_id: str,
        *,
        title: str | None = None,
        content: str | None = None,
        is_pinned: bool | None = None,
        is_locked: bool | None = None,
        tags_replace: bool = False,
        tags: list[str] | None = None,
    ) -> dict[str, Any] | None:
        if title is not None and content is not None:
            if not title.strip() and not content.strip():
                raise EmptyNoteError("Informe um título ou conteúdo para a nota.")
        row = self._repo.update_note(
            user_id,
            note_id,
            title=title,
            content=content,
            is_pinned=is_pinned,
            is_locked=is_locked,
            tags_replace=tags_replace,
            tags=tags,
        )
        self._conn.commit()
        return row

    def delete_note(self, user_id: str, note_id: str) -> bool:
        ok = self._repo.delete_note(user_id, note_id)
        self._conn.commit()
        return ok
