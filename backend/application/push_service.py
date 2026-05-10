"""Envio de notificações Web Push (VAPID) e gestão das subscriptions."""

from __future__ import annotations

import json
import logging
from typing import Any, Iterable

import psycopg
from pywebpush import WebPushException, webpush

from infrastructure.config import Settings
from infrastructure.persistence.postgres_push_repository import PostgresPushRepository

log = logging.getLogger(__name__)


class PushNotConfiguredError(RuntimeError):
    """As chaves VAPID não estão configuradas no backend."""


class PushService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        settings: Settings,
        repo: PostgresPushRepository,
    ) -> None:
        self._conn = conn
        self._settings = settings
        self._repo = repo

    @property
    def public_key(self) -> str:
        return self._settings.vapid_public_key

    def is_configured(self) -> bool:
        return bool(self._settings.vapid_public_key and self._settings.vapid_private_key)

    def _ensure_configured(self) -> None:
        if not self.is_configured():
            raise PushNotConfiguredError(
                "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes no backend.",
            )

    def register_subscription(
        self,
        user_id: str,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: str | None,
    ) -> dict[str, Any]:
        if not endpoint or not p256dh or not auth:
            raise ValueError("Subscription incompleta.")
        row = self._repo.upsert_subscription(user_id, endpoint, p256dh, auth, user_agent)
        self._conn.commit()
        return row

    def unregister_subscription(self, user_id: str, endpoint: str) -> bool:
        ok = self._repo.delete_subscription(user_id, endpoint)
        self._conn.commit()
        return ok

    def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return self._repo.list_for_user(user_id)

    def send_to_user(
        self,
        user_id: str,
        payload: dict[str, Any],
        *,
        ttl: int = 60 * 60 * 24,
    ) -> int:
        """Envia o payload para todas as subscriptions do usuário.

        Subscriptions inválidas (404/410) são removidas. Retorna o número de envios bem
        sucedidos.
        """

        self._ensure_configured()
        subs = self._repo.list_for_user(user_id)
        if not subs:
            return 0

        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        vapid_claims = {"sub": self._settings.vapid_subject}
        delivered = 0
        invalid_endpoints: list[str] = []

        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                    },
                    data=body,
                    vapid_private_key=self._settings.vapid_private_key,
                    vapid_claims=dict(vapid_claims),
                    ttl=ttl,
                )
                delivered += 1
                self._repo.touch_subscription(sub["endpoint"])
            except WebPushException as exc:
                status_code = getattr(exc.response, "status_code", None) if exc.response else None
                if status_code in (404, 410):
                    invalid_endpoints.append(sub["endpoint"])
                else:
                    log.warning(
                        "webpush failed user=%s endpoint=%s status=%s detail=%s",
                        user_id,
                        sub["endpoint"][:80],
                        status_code,
                        getattr(exc, "message", str(exc)),
                    )
            except Exception:
                log.exception("erro inesperado enviando webpush user=%s", user_id)

        for endpoint in invalid_endpoints:
            self._repo.delete_subscription_by_endpoint(endpoint)
        if invalid_endpoints:
            self._conn.commit()

        return delivered

    # ---- Helpers de "uma vez por chave" para uso pelo dispatcher ---------------------

    def deliver_once(
        self,
        user_id: str,
        kind: str,
        dedup_key: str,
        payload: dict[str, Any],
        *,
        ttl: int = 60 * 60 * 24,
    ) -> bool:
        """Envia apenas se `dedup_key` ainda não foi entregue para o usuário.

        Retorna `True` quando a notificação foi efetivamente enviada nesta chamada.
        """

        if self._repo.was_delivered(user_id, dedup_key):
            return False
        sent = self.send_to_user(user_id, payload, ttl=ttl)
        if sent <= 0:
            return False
        self._repo.mark_delivered(user_id, kind, dedup_key)
        self._conn.commit()
        return True

    def deliver_test(self, user_id: str) -> int:
        """Envia uma notificação de teste imediata, sem dedup."""

        return self.send_to_user(
            user_id,
            payload={
                "kind": "test",
                "title": "Kiki: notificação de teste",
                "body": "Tudo certo! Você verá lembretes assim quando chegar a hora.",
                "tag": "kiki:test",
                "url": "/",
            },
            ttl=300,
        )


def iter_chunks(seq: list[Any], n: int) -> Iterable[list[Any]]:
    for i in range(0, len(seq), n):
        yield seq[i : i + n]
