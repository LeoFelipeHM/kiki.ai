from typing import Any

import psycopg


def _normalize_note(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["id"] = str(out["id"])
    out["user_id"] = str(out["user_id"])
    tags = out.get("tags")
    if tags is None:
        out["tags"] = []
    elif hasattr(tags, "tolist"):
        out["tags"] = list(tags)
    else:
        out["tags"] = list(tags)
    return out


class PostgresNotesRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    @staticmethod
    def _ensure_tag_id(cur: psycopg.Cursor[Any], user_id: str, name: str) -> str:
        cur.execute(
            "SELECT id FROM note_tags WHERE user_id = %s AND name = %s",
            (user_id, name),
        )
        row = cur.fetchone()
        if row:
            return str(row["id"])
        cur.execute(
            "INSERT INTO note_tags (user_id, name) VALUES (%s, %s) RETURNING id",
            (user_id, name),
        )
        ins = cur.fetchone()
        assert ins is not None
        return str(ins["id"])

    def _set_note_tags(self, cur: psycopg.Cursor[Any], user_id: str, note_id: str, tag_names: list[str]) -> None:
        cur.execute("DELETE FROM note_tag_map WHERE note_id = %s::uuid", (note_id,))
        for raw in tag_names:
            name = raw.strip().lower().lstrip("#")
            if not name:
                continue
            tid = self._ensure_tag_id(cur, user_id, name)
            cur.execute(
                """
                INSERT INTO note_tag_map (note_id, tag_id)
                VALUES (%s::uuid, %s::uuid)
                ON CONFLICT DO NOTHING
                """,
                (note_id, tid),
            )

    def list_notes(self, user_id: str, search: str | None) -> list[dict[str, Any]]:
        params: list[Any] = [user_id]
        search_clause = ""
        if search:
            term = f"%{search}%"
            params.extend([term, term, term])
            search_clause = """
              AND (
                n.title ILIKE %s OR n.content ILIKE %s OR EXISTS (
                  SELECT 1 FROM note_tag_map x
                  JOIN note_tags t ON t.id = x.tag_id
                  WHERE x.note_id = n.id AND t.name ILIKE %s
                )
              )
            """

        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT n.id, n.user_id, n.title, n.content, n.is_pinned, n.is_locked,
                       n.created_at, n.updated_at,
                       COALESCE(
                         array_agg(t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL),
                         ARRAY[]::text[]
                       ) AS tags
                FROM notes n
                LEFT JOIN note_tag_map ntm ON ntm.note_id = n.id
                LEFT JOIN note_tags t ON t.id = ntm.tag_id
                WHERE n.user_id = %s
                {search_clause}
                GROUP BY n.id
                ORDER BY n.is_pinned DESC, n.updated_at DESC
                """,
                tuple(params),
            )
            rows = cur.fetchall()
        return [_normalize_note(dict(r)) for r in rows]

    def create_note(
        self,
        user_id: str,
        title: str,
        content: str,
        is_pinned: bool,
        is_locked: bool,
        tags: list[str],
    ) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO notes (user_id, title, content, is_pinned, is_locked)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, title, content, is_pinned, is_locked, created_at, updated_at
                """,
                (user_id, title, content, is_pinned, is_locked),
            )
            row = cur.fetchone()
            assert row is not None
            note_id = str(row["id"])
            self._set_note_tags(cur, user_id, note_id, tags)

        got = self.get_note(user_id, note_id)
        assert got is not None
        return got

    def get_note(self, user_id: str, note_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, title, content, is_pinned, is_locked, created_at, updated_at
                FROM notes
                WHERE user_id = %s AND id = %s::uuid
                """,
                (user_id, note_id),
            )
            row = cur.fetchone()
        if not row:
            return None
        base = _normalize_note(dict(row))
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT t.name
                FROM note_tag_map ntm
                JOIN note_tags t ON t.id = ntm.tag_id
                WHERE ntm.note_id = %s::uuid
                ORDER BY t.name
                """,
                (note_id,),
            )
            tag_rows = cur.fetchall()
        base["tags"] = [str(r["name"]) for r in tag_rows]
        return base

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
        fields: list[str] = []
        values: list[Any] = []

        if title is not None:
            fields.append("title = %s")
            values.append(title)
        if content is not None:
            fields.append("content = %s")
            values.append(content)
        if is_pinned is not None:
            fields.append("is_pinned = %s")
            values.append(is_pinned)
        if is_locked is not None:
            fields.append("is_locked = %s")
            values.append(is_locked)

        if not fields and not tags_replace:
            return self.get_note(user_id, note_id)

        with self._conn.cursor() as cur:
            if fields:
                fields.append("updated_at = NOW()")
                set_clause = ", ".join(fields)
                values.extend([user_id, note_id])
                cur.execute(
                    f"""
                    UPDATE notes
                    SET {set_clause}
                    WHERE user_id = %s AND id = %s::uuid
                    RETURNING id, user_id, title, content, is_pinned, is_locked, created_at, updated_at
                    """,
                    tuple(values),
                )
                row = cur.fetchone()
                if not row:
                    return None
            else:
                cur.execute(
                    "SELECT id FROM notes WHERE user_id = %s AND id = %s::uuid",
                    (user_id, note_id),
                )
                if not cur.fetchone():
                    return None

            if tags_replace and tags is not None:
                self._set_note_tags(cur, user_id, note_id, tags)

        return self.get_note(user_id, note_id)

    def delete_note(self, user_id: str, note_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM notes
                WHERE user_id = %s AND id = %s::uuid
                RETURNING id
                """,
                (user_id, note_id),
            )
            deleted = cur.fetchone()
        return deleted is not None
