import os
from pathlib import Path

import psycopg
from passlib.context import CryptContext

from application.bootstrap_defaults import bootstrap_user_defaults

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL não configurada.")
    return database_url


def run_migrations(conn: psycopg.Connection) -> None:
    migrations_dir = Path(__file__).resolve().parents[1] / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print("Nenhuma migration encontrada.")
        return

    with conn.cursor() as cur:
        for migration_file in migration_files:
            sql = migration_file.read_text(encoding="utf-8")
            print(f"Aplicando migration: {migration_file.name}")
            cur.execute(sql)
    conn.commit()


def upsert_admin_user(conn: psycopg.Connection) -> None:
    admin_email = "leo@gmail.com"
    admin_password = "123"
    password_hash = pwd_context.hash(admin_password)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (
                name,
                email,
                role,
                password_hash,
                is_active,
                email_verified_at,
                password_updated_at
            )
            VALUES (%s, %s, 'admin', %s, TRUE, NOW(), NOW())
            ON CONFLICT (email)
            DO UPDATE SET
                name = EXCLUDED.name,
                role = 'admin',
                password_hash = EXCLUDED.password_hash,
                is_active = TRUE,
                email_verified_at = COALESCE(users.email_verified_at, NOW()),
                password_updated_at = NOW(),
                updated_at = NOW()
            RETURNING id
            """,
            ("Leo", admin_email, password_hash),
        )
        admin = cur.fetchone()
        admin_id = admin[0] if admin else None

    if admin_id:
        bootstrap_user_defaults(conn, str(admin_id))

    conn.commit()
    print("Usuário admin pronto: leo@gmail.com")


def main() -> None:
    database_url = get_database_url()
    with psycopg.connect(database_url) as conn:
        run_migrations(conn)
        upsert_admin_user(conn)
    print("Bootstrap concluído com sucesso.")


if __name__ == "__main__":
    main()
