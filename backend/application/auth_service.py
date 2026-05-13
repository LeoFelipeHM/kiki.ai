import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

import psycopg

from application.bootstrap_defaults import bootstrap_user_defaults
from application.errors import (
    AccountLockedError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    UserInactiveError,
)
from infrastructure.config import Settings
from infrastructure.persistence.postgres_refresh_token_repository import PostgresRefreshTokenRepository
from infrastructure.persistence.postgres_usage_repository import PostgresUsageRepository
from infrastructure.persistence.postgres_user_repository import PostgresUserRepository
from infrastructure.security.jwt_tokens import JwtTokens
from infrastructure.security.password_hasher import PasswordHasher


_BRASILIA = ZoneInfo("America/Sao_Paulo")


def _truncate_user_agent(user_agent: str | None, max_len: int = 512) -> str | None:
    if not user_agent:
        return None
    u = user_agent.strip()
    if len(u) <= max_len:
        return u
    return u[: max_len - 3] + "..."


def _access_event_metadata(ip_address: str | None, user_agent: str | None) -> dict[str, Any]:
    """Metadados de acesso com instante explícito no fuso de Brasília (auditoria / exibição)."""
    return {
        "ip": ip_address,
        "user_agent": _truncate_user_agent(user_agent),
        "timezone": "America/Sao_Paulo",
        "local_time": datetime.now(_BRASILIA).isoformat(timespec="seconds"),
    }


class AuthService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        settings: Settings,
        users: PostgresUserRepository,
        refresh_tokens: PostgresRefreshTokenRepository,
        passwords: PasswordHasher,
        jwt: JwtTokens,
        usage: PostgresUsageRepository,
    ) -> None:
        self._conn = conn
        self._settings = settings
        self._users = users
        self._refresh_tokens = refresh_tokens
        self._passwords = passwords
        self._jwt = jwt
        self._usage = usage

    def register(self, name: str, email: str, password: str) -> dict[str, Any]:
        if self._users.email_exists(email):
            raise EmailAlreadyRegisteredError()
        password_hash = self._passwords.hash(password)
        user = self._users.insert_registered_user(name, email, password_hash)
        bootstrap_user_defaults(self._conn, str(user["id"]))
        self._conn.commit()
        return user

    def _issue_token_pair(
        self,
        user: dict[str, Any],
        user_agent: str | None,
        ip_address: str | None,
    ) -> dict[str, Any]:
        access_token = self._jwt.encode_access(str(user["id"]), user["email"], str(user["role"]))
        refresh_token, refresh_expires_at, refresh_jti = self._jwt.encode_refresh(str(user["id"]))
        self._refresh_tokens.insert(
            user["id"],
            refresh_jti,
            self._jwt.hash_refresh_token(refresh_token),
            refresh_expires_at,
            user_agent,
            ip_address,
        )
        self._conn.commit()
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self._settings.access_token_expire_minutes * 60,
        }

    def login(
        self,
        email: str,
        password: str,
        user_agent: str | None,
        ip_address: str | None,
    ) -> dict[str, Any]:
        user = self._users.find_for_login(email)
        if not user:
            raise InvalidCredentialsError()

        if not user["is_active"]:
            raise UserInactiveError()

        now = datetime.now(timezone.utc)
        if user["locked_until"] and user["locked_until"] > now:
            raise AccountLockedError()

        if not self._passwords.verify(password, user["password_hash"]):
            failed_attempts = int(user["failed_login_attempts"]) + 1
            locked_until = None
            if failed_attempts >= self._settings.max_failed_login_attempts:
                locked_until = now + timedelta(minutes=self._settings.lockout_minutes)
                failed_attempts = 0

            self._users.update_failed_login(user["id"], failed_attempts, locked_until)
            self._conn.commit()
            raise InvalidCredentialsError()

        authenticated_user = self._users.clear_lockout_and_mark_login(user["id"])
        tokens = self._issue_token_pair(authenticated_user, user_agent, ip_address)
        self._usage.insert_event(
            str(authenticated_user["id"]),
            "login",
            _access_event_metadata(ip_address, user_agent),
        )
        self._conn.commit()
        return tokens

    def refresh_session(
        self,
        refresh_token_plain: str,
        user_agent: str | None,
        ip_address: str | None,
    ) -> dict[str, Any]:
        refresh_payload = self._jwt.decode_refresh(refresh_token_plain)

        token_jti = refresh_payload.get("jti")
        user_id = refresh_payload.get("sub")
        if not token_jti or not user_id:
            raise InvalidRefreshTokenError("Refresh token malformado.")

        token_hash = self._jwt.hash_refresh_token(refresh_token_plain)
        now = datetime.now(timezone.utc)

        stored_token = self._refresh_tokens.find_by_jti_and_hash(token_jti, token_hash)
        if not stored_token:
            raise InvalidRefreshTokenError("Refresh token não reconhecido.")
        if stored_token["revoked_at"] is not None:
            raise InvalidRefreshTokenError("Refresh token revogado.")
        if stored_token["expires_at"] <= now:
            raise InvalidRefreshTokenError("Refresh token expirado.")

        user = self._users.get_public_profile(str(user_id))
        if not user or not user["is_active"]:
            raise InvalidRefreshTokenError("Usuário inválido.")

        new_refresh_jti = str(uuid.uuid4())
        self._refresh_tokens.revoke_with_successor(stored_token["id"], new_refresh_jti)

        access_token = self._jwt.encode_access(user["id"], user["email"], user["role"])
        refresh_token_value, refresh_expires_at, _ = self._jwt.encode_refresh(user["id"], jti=new_refresh_jti)

        self._refresh_tokens.insert(
            user["id"],
            new_refresh_jti,
            self._jwt.hash_refresh_token(refresh_token_value),
            refresh_expires_at,
            user_agent,
            ip_address,
        )
        self._usage.insert_event(
            str(user["id"]),
            "token_refresh",
            _access_event_metadata(ip_address, user_agent),
        )
        self._conn.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token_value,
            "token_type": "bearer",
            "expires_in": self._settings.access_token_expire_minutes * 60,
        }

    def logout(self, refresh_token_plain: str) -> None:
        refresh_payload = self._jwt.decode_refresh(refresh_token_plain)
        token_jti = refresh_payload.get("jti")
        if not token_jti:
            raise InvalidRefreshTokenError("Refresh token malformado.")
        token_hash = self._jwt.hash_refresh_token(refresh_token_plain)
        self._refresh_tokens.revoke_by_jti_hash(token_jti, token_hash)
        self._conn.commit()

    def change_password(self, user_id: str, current_password: str, new_password: str) -> None:
        user = self._users.find_credentials_by_id(user_id)
        if not user:
            raise InvalidCredentialsError("Não foi possível validar a conta.")
        if not user["is_active"]:
            raise UserInactiveError()

        now = datetime.now(timezone.utc)
        if user["locked_until"] and user["locked_until"] > now:
            raise AccountLockedError()

        if not self._passwords.verify(current_password, user["password_hash"]):
            raise InvalidCredentialsError("Senha atual incorreta.")

        if self._passwords.verify(new_password, user["password_hash"]):
            raise ValueError("Informe uma senha diferente da atual.")

        new_hash = self._passwords.hash(new_password)
        self._users.update_password_hash(user_id, new_hash)
        self._refresh_tokens.revoke_all_for_user(user_id)
        self._conn.commit()