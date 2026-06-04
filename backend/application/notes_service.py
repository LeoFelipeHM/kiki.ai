from typing import Any

import psycopg

from application.notifications_service import NotificationsService
from application.ports import NotesRepository
from infrastructure.persistence.postgres_friends_repository import PostgresFriendsRepository


class EmptyNoteError(ValueError):
    """Título e conteúdo não podem estar vazios ao mesmo tempo."""


class NoteVersionConflictError(ValueError):
    """A nota foi alterada por outra pessoa antes deste salvamento."""


class NotePermissionError(ValueError):
    """Usuário sem permissão para a operação."""


class NotesService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        notes_repo: NotesRepository,
        friends_repo: PostgresFriendsRepository | None = None,
        notifications: NotificationsService | None = None,
    ) -> None:
        self._conn = conn
        self._repo = notes_repo
        self._friends_repo = friends_repo
        self._notifications = notifications

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
        expected_updated_at: Any | None = None,
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
            expected_updated_at=expected_updated_at,
        )
        if row is None and expected_updated_at is not None and self._repo.get_note(user_id, note_id):
            raise NoteVersionConflictError("Esta nota foi alterada por outra pessoa. Recarregue antes de salvar.")
        self._conn.commit()
        return row

    def delete_note(self, user_id: str, note_id: str) -> bool:
        ok = self._repo.delete_note(user_id, note_id)
        self._conn.commit()
        return ok

    def share_note(
        self,
        owner_user_id: str,
        *,
        note_id: str,
        target_user_id: str,
        role: str,
        actor_name: str,
    ) -> dict[str, Any] | None:
        if role not in ("editor", "viewer"):
            raise ValueError("Permissão inválida para compartilhamento.")
        if self._friends_repo is None or not self._friends_repo.are_accepted_friends(owner_user_id, target_user_id):
            raise NotePermissionError("Compartilhamento permitido apenas entre amigos.")
        row = self._repo.share_note(owner_user_id, note_id, target_user_id, role)  # type: ignore[attr-defined]
        if not row:
            return None
        if self._notifications is not None:
            self._notifications.notify(
                user_id=target_user_id,
                actor_user_id=owner_user_id,
                kind="note_share",
                title="Convite para nota compartilhada",
                body=f"{actor_name} convidou você para colaborar em uma nota.",
                payload={"note_id": note_id, "role": role, "note_title": row.get("note_title") or ""},
                related_entity_type="note",
                related_entity_id=note_id,
            )
        self._conn.commit()
        return row

    def list_collaborators(self, owner_user_id: str, note_id: str) -> list[dict[str, Any]] | None:
        return self._repo.list_collaborators(owner_user_id, note_id)  # type: ignore[attr-defined]

    def update_collaborator_role(
        self,
        owner_user_id: str,
        note_id: str,
        target_user_id: str,
        role: str,
    ) -> dict[str, Any] | None:
        if role not in ("editor", "viewer"):
            raise ValueError("Permissão inválida.")
        row = self._repo.update_collaborator_role(owner_user_id, note_id, target_user_id, role)  # type: ignore[attr-defined]
        self._conn.commit()
        return row

    def remove_collaborator(self, owner_user_id: str, note_id: str, target_user_id: str) -> bool:
        ok = self._repo.remove_collaborator(owner_user_id, note_id, target_user_id)  # type: ignore[attr-defined]
        self._conn.commit()
        return ok
