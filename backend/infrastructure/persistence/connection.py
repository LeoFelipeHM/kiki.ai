from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row


class MissingDatabaseUrlError(RuntimeError):
    pass


@contextmanager
def db_connection(database_url: str) -> Iterator[psycopg.Connection[Any]]:
    if not database_url:
        raise MissingDatabaseUrlError("DATABASE_URL não configurada.")
    conn = psycopg.connect(database_url, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()
