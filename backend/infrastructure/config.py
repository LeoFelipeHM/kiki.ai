import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_access_secret: str
    jwt_refresh_secret: str
    jwt_algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    max_failed_login_attempts: int
    lockout_minutes: int


def load_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", ""),
        jwt_access_secret=os.getenv("JWT_ACCESS_SECRET", "change-me-access-secret"),
        jwt_refresh_secret=os.getenv("JWT_REFRESH_SECRET", "change-me-refresh-secret"),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")),
        refresh_token_expire_days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")),
        max_failed_login_attempts=int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5")),
        lockout_minutes=int(os.getenv("LOCKOUT_MINUTES", "15")),
    )
