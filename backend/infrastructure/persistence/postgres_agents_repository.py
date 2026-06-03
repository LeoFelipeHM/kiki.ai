from __future__ import annotations

from typing import Any

import psycopg


def _str_ids(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    for key in ("id", "user_id", "agent_id"):
        if key in out and out[key] is not None:
            out[key] = str(out[key])
    return out


class PostgresAgentsRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def _steps_for_agents(self, agent_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        if not agent_ids:
            return {}
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, agent_id, position, description, status, details, created_at, updated_at
                FROM agent_steps
                WHERE agent_id = ANY(%s::uuid[])
                ORDER BY agent_id, position
                """,
                (agent_ids,),
            )
            rows = [_str_ids(dict(r)) for r in cur.fetchall()]
        grouped: dict[str, list[dict[str, Any]]] = {aid: [] for aid in agent_ids}
        for row in rows:
            grouped.setdefault(str(row["agent_id"]), []).append(row)
        return grouped

    def _attach_steps(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ids = [str(r["id"]) for r in rows]
        grouped = self._steps_for_agents(ids)
        out: list[dict[str, Any]] = []
        for row in rows:
            norm = _str_ids(row)
            norm["steps"] = grouped.get(str(norm["id"]), [])
            out.append(norm)
        return out

    def _get_agent_by_id(self, agent_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.user_id, a.name, a.type, a.task, a.status, a.effort, a.progress, a.color,
                       a.current_action, a.results, a.error_message, a.sort_order, a.queued_at,
                       a.started_at, a.completed_at, a.created_at, a.updated_at,
                       u.timezone AS user_timezone
                FROM agents a
                JOIN users u ON u.id = a.user_id
                WHERE a.id = %s::uuid
                """,
                (agent_id,),
            )
            row = cur.fetchone()
        if not row:
            return None
        return self._attach_steps([dict(row)])[0]

    def list_agents(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, name, type, task, status, effort, progress, color,
                       current_action, results, error_message, sort_order, queued_at,
                       started_at, completed_at, created_at, updated_at
                FROM agents
                WHERE user_id = %s
                ORDER BY sort_order ASC, created_at DESC
                """,
                (user_id,),
            )
            rows = [dict(r) for r in cur.fetchall()]
        return self._attach_steps(rows)

    def create_agent(
        self,
        user_id: str,
        *,
        name: str,
        agent_type: str,
        task: str,
        effort: str,
        color: str,
        sort_order: int,
        steps: list[str],
    ) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO agents (user_id, name, type, task, effort, color, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (user_id, name, agent_type, task, effort, color, sort_order),
            )
            row = cur.fetchone()
            assert row is not None
            agent_id = str(row["id"])
            for position, description in enumerate(steps):
                cur.execute(
                    """
                    INSERT INTO agent_steps (agent_id, position, description)
                    VALUES (%s::uuid, %s, %s)
                    """,
                    (agent_id, position, description),
                )
        got = self.get_agent(user_id, agent_id)
        assert got is not None
        return got

    def get_agent(self, user_id: str, agent_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, name, type, task, status, effort, progress, color,
                       current_action, results, error_message, sort_order, queued_at,
                       started_at, completed_at, created_at, updated_at
                FROM agents
                WHERE user_id = %s AND id = %s::uuid
                """,
                (user_id, agent_id),
            )
            row = cur.fetchone()
        if not row:
            return None
        return self._attach_steps([dict(row)])[0]

    def update_agent_effort(
        self,
        user_id: str,
        agent_id: str,
        effort: str,
        steps: list[str] | None,
    ) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agents
                SET effort = %s
                WHERE user_id = %s AND id = %s::uuid
                RETURNING id
                """,
                (effort, user_id, agent_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            if steps is not None:
                cur.execute("DELETE FROM agent_steps WHERE agent_id = %s::uuid", (agent_id,))
                for position, description in enumerate(steps):
                    cur.execute(
                        """
                        INSERT INTO agent_steps (agent_id, position, description)
                        VALUES (%s::uuid, %s, %s)
                        """,
                        (agent_id, position, description),
                    )
        return self.get_agent(user_id, agent_id)

    def set_agent_status(
        self,
        user_id: str,
        agent_id: str,
        status: str,
        *,
        current_action: str | None = None,
    ) -> dict[str, Any] | None:
        queued_sql = ", queued_at = CASE WHEN %s = 'queued' THEN NOW() ELSE queued_at END"
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agents
                SET status = %s,
                    current_action = %s,
                    error_message = CASE WHEN %s = 'queued' THEN NULL ELSE error_message END
                    {queued_sql}
                WHERE user_id = %s AND id = %s::uuid
                RETURNING id
                """.format(queued_sql=queued_sql),
                (status, current_action, status, status, user_id, agent_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            if status == "queued":
                cur.execute(
                    """
                    UPDATE agent_steps
                    SET status = 'pending', details = NULL
                    WHERE agent_id = %s::uuid AND status IN ('working', 'error')
                    """,
                    (agent_id,),
                )
                self._refresh_agent_progress(cur, agent_id)
        return self.get_agent(user_id, agent_id)

    def delete_agent(self, user_id: str, agent_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                "DELETE FROM agents WHERE user_id = %s AND id = %s::uuid",
                (user_id, agent_id),
            )
            return cur.rowcount > 0

    def reorder_agents(self, user_id: str, agent_ids: list[str]) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            for position, agent_id in enumerate(agent_ids):
                cur.execute(
                    """
                    UPDATE agents
                    SET sort_order = %s
                    WHERE user_id = %s AND id = %s::uuid
                    """,
                    (position, user_id, agent_id),
                )
        return self.list_agents(user_id)

    def list_messages(self, user_id: str, agent_id: str) -> list[dict[str, Any]] | None:
        if self.get_agent(user_id, agent_id) is None:
            return None
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, agent_id, user_id, role, content, created_at
                FROM agent_messages
                WHERE user_id = %s AND agent_id = %s::uuid
                ORDER BY created_at ASC
                """,
                (user_id, agent_id),
            )
            rows = cur.fetchall()
        return [_str_ids(dict(r)) for r in rows]

    def create_message(self, user_id: str, agent_id: str, role: str, content: str) -> dict[str, Any] | None:
        if self.get_agent(user_id, agent_id) is None:
            return None
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO agent_messages (agent_id, user_id, role, content)
                VALUES (%s::uuid, %s, %s, %s)
                RETURNING id, agent_id, user_id, role, content, created_at
                """,
                (agent_id, user_id, role, content),
            )
            row = cur.fetchone()
        assert row is not None
        return _str_ids(dict(row))

    def claim_next_queued(self) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                WITH next_agent AS (
                  SELECT id
                  FROM agents
                  WHERE status = 'queued'
                  ORDER BY queued_at ASC NULLS FIRST, created_at ASC
                  FOR UPDATE SKIP LOCKED
                  LIMIT 1
                )
                UPDATE agents a
                SET status = 'working',
                    started_at = COALESCE(started_at, NOW()),
                    current_action = 'Iniciando execução',
                    error_message = NULL
                FROM next_agent
                WHERE a.id = next_agent.id
                RETURNING a.id
                """
            )
            row = cur.fetchone()
        if not row:
            return None
        return self._get_agent_by_id(str(row["id"]))

    def requeue_stale_working(self, stale_seconds: float) -> int:
        seconds = max(60.0, stale_seconds)
        with self._conn.cursor() as cur:
            cur.execute(
                """
                WITH stale AS (
                  SELECT id
                  FROM agents
                  WHERE status = 'working'
                    AND updated_at < NOW() - make_interval(secs => %s)
                  ORDER BY updated_at ASC
                  FOR UPDATE SKIP LOCKED
                  LIMIT 10
                )
                UPDATE agents a
                SET status = 'queued',
                    queued_at = NOW(),
                    current_action = 'Retomando execução',
                    error_message = NULL
                FROM stale
                WHERE a.id = stale.id
                RETURNING a.id
                """,
                (seconds,),
            )
            rows = cur.fetchall()
            for row in rows:
                agent_id = str(row["id"])
                cur.execute(
                    """
                    UPDATE agent_steps
                    SET status = 'pending', details = NULL
                    WHERE agent_id = %s::uuid AND status IN ('working', 'error')
                    """,
                    (agent_id,),
                )
                self._refresh_agent_progress(cur, agent_id)
        return len(rows)

    def mark_step_working(self, agent_id: str, step_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agent_steps
                SET status = 'working'
                WHERE agent_id = %s::uuid AND id = %s::uuid
                RETURNING id
                """,
                (agent_id, step_id),
            )
            if not cur.fetchone():
                return None
            cur.execute(
                """
                UPDATE agents
                SET current_action = (
                  SELECT description FROM agent_steps WHERE id = %s::uuid
                )
                WHERE id = %s::uuid
                """,
                (step_id, agent_id),
            )
        return self._get_agent_by_id(agent_id)

    def complete_step(self, agent_id: str, step_id: str, details: str | None) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agent_steps
                SET status = 'completed', details = %s
                WHERE agent_id = %s::uuid AND id = %s::uuid
                RETURNING id
                """,
                (details, agent_id, step_id),
            )
            if not cur.fetchone():
                return None
            self._refresh_agent_progress(cur, agent_id)
        return self._get_agent_by_id(agent_id)

    def _refresh_agent_progress(self, cur: Any, agent_id: str) -> None:
        cur.execute(
            """
            WITH counts AS (
              SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
              FROM agent_steps
              WHERE agent_id = %s::uuid
            )
            UPDATE agents
            SET progress = CASE
              WHEN counts.total = 0 THEN 0
              ELSE LEAST(90, ROUND((counts.completed::numeric / counts.total::numeric) * 90)::int)
            END
            FROM counts
            WHERE agents.id = %s::uuid
            """,
            (agent_id, agent_id),
        )

    def mark_agent_finalizing(self, agent_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agents
                SET current_action = 'Gerando resposta final',
                    progress = CASE WHEN progress >= 95 THEN progress ELSE 95 END
                WHERE id = %s::uuid AND status = 'working'
                RETURNING id
                """,
                (agent_id,),
            )
            row = cur.fetchone()
        return self._get_agent_by_id(str(row["id"])) if row else None

    def complete_agent(self, agent_id: str, results: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agents
                SET status = 'completed',
                    progress = 100,
                    current_action = 'Resposta final gerada',
                    results = %s,
                    completed_at = NOW()
                WHERE id = %s::uuid AND status = 'working'
                RETURNING id
                """,
                (results, agent_id),
            )
            row = cur.fetchone()
        return self._get_agent_by_id(str(row["id"])) if row else None

    def fail_agent(self, agent_id: str, message: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agents
                SET status = 'error',
                    current_action = 'Erro na execução',
                    error_message = %s,
                    completed_at = NOW()
                WHERE id = %s::uuid
                RETURNING id
                """,
                (message, agent_id),
            )
            row = cur.fetchone()
        return self._get_agent_by_id(str(row["id"])) if row else None

    def get_agent_status(self, agent_id: str) -> str | None:
        with self._conn.cursor() as cur:
            cur.execute("SELECT status FROM agents WHERE id = %s::uuid", (agent_id,))
            row = cur.fetchone()
        return str(row["status"]) if row else None
