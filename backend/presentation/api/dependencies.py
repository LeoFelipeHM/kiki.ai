from collections.abc import Generator
from typing import Annotated, Any

import psycopg
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg.rows import dict_row

from application.admin_service import AdminService
from application.agents_service import AgentsService
from application.auth_service import AuthService
from application.calendar_service import CalendarService
from application.contacts_service import ContactsService
from application.notes_service import NotesService
from application.push_service import PushService
from application.settings_service import SettingsService
from application.errors import InvalidAccessTokenError
from infrastructure.config import Settings, load_settings
from infrastructure.persistence.postgres_calendar_repository import PostgresCalendarRepository
from infrastructure.persistence.postgres_agents_repository import PostgresAgentsRepository
from infrastructure.persistence.postgres_contacts_repository import PostgresContactsRepository
from infrastructure.persistence.postgres_notes_repository import PostgresNotesRepository
from infrastructure.persistence.postgres_push_repository import PostgresPushRepository
from infrastructure.persistence.postgres_settings_repository import PostgresSettingsRepository
from infrastructure.persistence.postgres_refresh_token_repository import PostgresRefreshTokenRepository
from infrastructure.persistence.postgres_usage_repository import PostgresUsageRepository
from infrastructure.persistence.postgres_user_repository import PostgresUserRepository
from infrastructure.security.jwt_tokens import JwtTokens
from infrastructure.security.password_hasher import PasswordHasher

settings = load_settings()
password_hasher = PasswordHasher()
jwt_tokens = JwtTokens(settings)
bearer_scheme = HTTPBearer(auto_error=False)


def get_settings() -> Settings:
    return settings


SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_db_connection() -> Generator[psycopg.Connection[Any], None, None]:
    if not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DATABASE_URL não configurada.",
        )
    conn = psycopg.connect(settings.database_url, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


DbConnDep = Annotated[psycopg.Connection[Any], Depends(get_db_connection)]


def get_auth_service(conn: DbConnDep) -> AuthService:
    return AuthService(
        conn,
        settings,
        PostgresUserRepository(conn),
        PostgresRefreshTokenRepository(conn),
        password_hasher,
        jwt_tokens,
        PostgresUsageRepository(conn),
    )


def get_admin_service(conn: DbConnDep) -> AdminService:
    return AdminService(conn, PostgresUserRepository(conn), password_hasher)


def get_calendar_service(conn: DbConnDep) -> CalendarService:
    return CalendarService(conn, PostgresCalendarRepository(conn))


def get_notes_service(conn: DbConnDep) -> NotesService:
    return NotesService(conn, PostgresNotesRepository(conn))


def get_contacts_service(conn: DbConnDep) -> ContactsService:
    return ContactsService(conn, PostgresContactsRepository(conn))


def get_agents_service(conn: DbConnDep) -> AgentsService:
    return AgentsService(conn, PostgresAgentsRepository(conn))


def get_settings_service(conn: DbConnDep) -> SettingsService:
    return SettingsService(conn, PostgresSettingsRepository(conn))


def get_push_service(conn: DbConnDep) -> PushService:
    return PushService(conn, settings, PostgresPushRepository(conn))


def get_current_user(
    conn: DbConnDep,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    try:
        payload = jwt_tokens.decode_access(credentials.credentials)
    except InvalidAccessTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.detail) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sem usuário.")

    users = PostgresUserRepository(conn)
    user = users.get_public_profile(str(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado.")
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo.")

    return user


CurrentUserDep = Annotated[dict[str, Any], Depends(get_current_user)]


def require_admin(current_user: CurrentUserDep) -> dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    return current_user


AdminUserDep = Annotated[dict[str, Any], Depends(require_admin)]
