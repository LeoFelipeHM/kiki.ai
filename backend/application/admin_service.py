from typing import Any, Literal

import psycopg

from application.bootstrap_defaults import bootstrap_user_defaults
from application.errors import (
    AdminDeleteSelfError,
    AdminEmailConflictError,
    AdminNoFieldsError,
    AdminSelfDeactivateError,
    AdminUserNotFoundError,
)
from infrastructure.persistence.postgres_user_repository import PostgresUserRepository
from infrastructure.security.password_hasher import PasswordHasher


class AdminService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        users: PostgresUserRepository,
        passwords: PasswordHasher,
    ) -> None:
        self._conn = conn
        self._users = users
        self._passwords = passwords

    def list_users(self) -> list[dict[str, Any]]:
        rows = self._users.admin_list()
        return [{**row, "id": str(row["id"])} for row in rows]

    def create_user(
        self,
        name: str,
        email: str,
        password: str,
        role: Literal["admin", "user"],
    ) -> dict[str, Any]:
        if self._users.admin_email_taken(email):
            raise AdminEmailConflictError("E-mail já cadastrado.")

        password_hash = self._passwords.hash(password)
        row = self._users.admin_insert(name, email, role, password_hash)
        bootstrap_user_defaults(self._conn, row["id"])
        self._conn.commit()
        return row

    def update_user(
        self,
        user_id: str,
        *,
        current_admin_id: str,
        name: str | None = None,
        email: str | None = None,
        password: str | None = None,
        role: Literal["admin", "user"] | None = None,
        is_active: bool | None = None,
    ) -> dict[str, Any]:
        updates: list[str] = []
        values: list[Any] = []

        if name is not None:
            updates.append("name = %s")
            values.append(name)
        if email is not None:
            updates.append("email = lower(%s)")
            values.append(email)
        if password is not None:
            updates.append("password_hash = %s")
            values.append(self._passwords.hash(password))
            updates.append("password_updated_at = NOW()")
        if role is not None:
            updates.append("role = %s::user_role")
            values.append(role)
        if is_active is not None:
            updates.append("is_active = %s")
            values.append(is_active)

        if not updates:
            raise AdminNoFieldsError()

        if email is not None and self._users.admin_email_taken_by_other(email, user_id):
            raise AdminEmailConflictError("E-mail já em uso.")

        row = self._users.admin_apply_update(user_id, updates, tuple(values))
        if not row:
            raise AdminUserNotFoundError()

        if str(row["id"]) == str(current_admin_id) and is_active is False:
            raise AdminSelfDeactivateError()

        self._conn.commit()
        return row

    def delete_user(self, user_id: str, *, current_admin_id: str) -> None:
        if str(user_id) == str(current_admin_id):
            raise AdminDeleteSelfError()

        if not self._users.admin_delete(user_id):
            raise AdminUserNotFoundError()

        self._conn.commit()
