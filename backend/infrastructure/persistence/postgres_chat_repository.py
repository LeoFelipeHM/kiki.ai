from typing import Any, Literal

import psycopg

ChatRole = Literal["user", "assistant"]


def _normalize_conversation(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["id"] = str(out["id"])
    if "user_id" in out:
        out["user_id"] = str(out["user_id"])
    out["title"] = str(out.get("title") or "Nova conversa")
    if out.get("message_count") is not None:
        out["message_count"] = int(out["message_count"])
    return out


def _normalize_message(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["id"] = str(out["id"])
    out["role"] = "assistant" if out.pop("sender") == "assistant" else "user"
    return out


class PostgresChatRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def list_conversations(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  c.id,
                  c.title,
                  c.summary,
                  c.created_at,
                  c.updated_at,
                  COUNT(m.id)::int AS message_count,
                  (
                    SELECT lm.content
                    FROM messages lm
                    WHERE lm.conversation_id = c.id
                    ORDER BY lm.created_at DESC
                    LIMIT 1
                  ) AS latest_message_preview
                FROM conversations c
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.user_id = %s::uuid AND c.channel = 'text'
                GROUP BY c.id
                ORDER BY c.updated_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        return [_normalize_conversation(dict(row)) for row in rows]

    def get_conversation(self, user_id: str, conversation_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  c.id,
                  c.user_id,
                  c.title,
                  c.summary,
                  c.created_at,
                  c.updated_at,
                  COUNT(m.id)::int AS message_count,
                  (
                    SELECT lm.content
                    FROM messages lm
                    WHERE lm.conversation_id = c.id
                    ORDER BY lm.created_at DESC
                    LIMIT 1
                  ) AS latest_message_preview
                FROM conversations c
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.user_id = %s::uuid AND c.id = %s::uuid AND c.channel = 'text'
                GROUP BY c.id
                """,
                (user_id, conversation_id),
            )
            row = cur.fetchone()
        return _normalize_conversation(dict(row)) if row else None

    def create_conversation(self, user_id: str, title: str, summary: str | None) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversations (user_id, channel, title, summary)
                VALUES (%s::uuid, 'text', %s, %s)
                RETURNING id, user_id, title, summary, created_at, updated_at
                """,
                (user_id, title, summary),
            )
            row = cur.fetchone()
        assert row is not None
        out = _normalize_conversation(dict(row))
        out["message_count"] = 0
        out["latest_message_preview"] = None
        return out

    def list_messages(self, user_id: str, conversation_id: str) -> list[dict[str, Any]] | None:
        if self.get_conversation(user_id, conversation_id) is None:
            return None
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, sender, content, created_at
                FROM messages
                WHERE conversation_id = %s::uuid
                  AND sender IN ('user', 'assistant')
                  AND message_type = 'text'
                ORDER BY created_at ASC
                """,
                (conversation_id,),
            )
            rows = cur.fetchall()
        return [_normalize_message(dict(row)) for row in rows]

    def append_message(self, user_id: str, conversation_id: str, role: ChatRole, content: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO messages (conversation_id, sender, content, message_type)
                SELECT c.id, %s, %s, 'text'
                FROM conversations c
                WHERE c.id = %s::uuid AND c.user_id = %s::uuid
                RETURNING id, sender, content, created_at
                """,
                (role, content, conversation_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            cur.execute(
                "UPDATE conversations SET updated_at = NOW() WHERE id = %s::uuid AND user_id = %s::uuid",
                (conversation_id, user_id),
            )
        return _normalize_message(dict(row))

    def update_metadata(self, user_id: str, conversation_id: str, title: str, summary: str | None) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE conversations
                SET title = %s, summary = %s, updated_at = NOW()
                WHERE user_id = %s::uuid AND id = %s::uuid
                RETURNING id, user_id, title, summary, created_at, updated_at
                """,
                (title, summary, user_id, conversation_id),
            )
            row = cur.fetchone()
        return _normalize_conversation(dict(row)) if row else None
