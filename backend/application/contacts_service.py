from typing import Any

import psycopg
from psycopg import errors as pg_errors

from application.ports import ContactsRepository


class DuplicateContactEmailError(ValueError):
    """Já existe um contato com este e-mail."""


def _normalize_email(raw: str) -> str:
    return raw.strip().lower()


class ContactsService:
    def __init__(self, conn: psycopg.Connection[Any], repo: ContactsRepository) -> None:
        self._conn = conn
        self._repo = repo

    def list_contacts(self, user_id: str) -> list[dict[str, Any]]:
        return self._repo.list_contacts(user_id)

    def create_contact(self, user_id: str, *, name: str, email: str) -> dict[str, Any]:
        n = name.strip()
        em = _normalize_email(email)
        if not n:
            raise ValueError("Informe o nome do contato.")
        try:
            row = self._repo.create_contact(user_id, n, em)
        except pg_errors.UniqueViolation as exc:
            raise DuplicateContactEmailError("Já existe um contato com este e-mail.") from exc
        self._conn.commit()
        return row

    def get_contact(self, user_id: str, contact_id: str) -> dict[str, Any] | None:
        return self._repo.get_contact(user_id, contact_id)

    def update_contact(
        self,
        user_id: str,
        contact_id: str,
        *,
        name: str | None = None,
        email: str | None = None,
    ) -> dict[str, Any] | None:
        n = name.strip() if name is not None else None
        em = _normalize_email(email) if email is not None else None
        if n is not None and not n:
            raise ValueError("Informe o nome do contato.")
        try:
            row = self._repo.update_contact(user_id, contact_id, name=n, email=em)
        except pg_errors.UniqueViolation as exc:
            raise DuplicateContactEmailError("Já existe um contato com este e-mail.") from exc
        self._conn.commit()
        return row

    def delete_contact(self, user_id: str, contact_id: str) -> bool:
        ok = self._repo.delete_contact(user_id, contact_id)
        self._conn.commit()
        return ok
