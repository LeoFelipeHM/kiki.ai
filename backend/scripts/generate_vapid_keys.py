"""Gera um par de chaves VAPID (P-256) para Web Push em formato base64url.

Uso:
    python scripts/generate_vapid_keys.py

Copie o conteúdo impresso para o `.env` do backend e use o `VAPID_PUBLIC_KEY`
no frontend (entregue pelo endpoint /push/vapid-public-key).
"""

from __future__ import annotations

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_value = private_key.private_numbers().private_value.to_bytes(32, "big")
    public_point = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    print("# Adicione ao backend/.env:")
    print(f"VAPID_PUBLIC_KEY={_b64u(public_point)}")
    print(f"VAPID_PRIVATE_KEY={_b64u(private_value)}")
    print("VAPID_SUBJECT=mailto:contato@heykiki.com.br")


if __name__ == "__main__":
    main()
