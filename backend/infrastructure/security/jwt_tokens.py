import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from application.errors import InvalidAccessTokenError, InvalidRefreshTokenError
from infrastructure.config import Settings


class JwtTokens:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def hash_refresh_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def encode_access(self, user_id: str, email: str, role: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": "access",
            "jti": str(uuid.uuid4()),
            "iat": now,
            "exp": now + timedelta(minutes=self._settings.access_token_expire_minutes),
        }
        return jwt.encode(payload, self._settings.jwt_access_secret, algorithm=self._settings.jwt_algorithm)

    def encode_refresh(self, user_id: str, jti: str | None = None) -> tuple[str, datetime, str]:
        now = datetime.now(timezone.utc)
        rid = jti or str(uuid.uuid4())
        expires_at = now + timedelta(days=self._settings.refresh_token_expire_days)
        payload = {
            "sub": user_id,
            "type": "refresh",
            "jti": rid,
            "iat": now,
            "exp": expires_at,
        }
        token = jwt.encode(payload, self._settings.jwt_refresh_secret, algorithm=self._settings.jwt_algorithm)
        return token, expires_at, rid

    def decode_access(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(token, self._settings.jwt_access_secret, algorithms=[self._settings.jwt_algorithm])
        except jwt.ExpiredSignatureError as exc:
            raise InvalidAccessTokenError("Token expirado.") from exc
        except jwt.InvalidTokenError as exc:
            raise InvalidAccessTokenError("Token inválido.") from exc
        if payload.get("type") != "access":
            raise InvalidAccessTokenError("Token de acesso inválido.")
        return payload

    def decode_refresh(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(token, self._settings.jwt_refresh_secret, algorithms=[self._settings.jwt_algorithm])
        except jwt.ExpiredSignatureError as exc:
            raise InvalidRefreshTokenError("Refresh token expirado.") from exc
        except jwt.InvalidTokenError as exc:
            raise InvalidRefreshTokenError("Refresh token inválido.") from exc
        if payload.get("type") != "refresh":
            raise InvalidRefreshTokenError("Refresh token inválido.")
        return payload
