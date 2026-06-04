from __future__ import annotations

from typing import Any

from llm.tools import web_browse


class _Response:
    headers = {"content-type": "text/html; charset=utf-8"}

    def __init__(self, body: bytes) -> None:
        self._body = body

    def __enter__(self) -> "_Response":
        return self

    def __exit__(self, *_: Any) -> None:
        return None

    def read(self, _size: int) -> bytes:
        return self._body

    def geturl(self) -> str:
        return "https://clinic.example"


def test_browse_public_page_extracts_contacts_and_booking_links(monkeypatch: Any) -> None:
    html = b"""
    <html>
      <head><title>Clinica Olhos</title></head>
      <body>
        <p>Agendar consulta com oftalmologista pelo WhatsApp (11) 99999-0000.</p>
        <a href="/agendamento">Agendar consulta</a>
        <a href="https://wa.me/5511999990000">WhatsApp</a>
        <form action="/contato" method="post">
          <input name="nome" />
          <input name="telefone" />
          <button>Enviar</button>
        </form>
      </body>
    </html>
    """

    monkeypatch.setattr(web_browse.socket, "getaddrinfo", lambda *_: [(None, None, None, None, ("93.184.216.34", 0))])
    monkeypatch.setattr(web_browse, "urlopen", lambda *_args, **_kwargs: _Response(html))

    result = web_browse.browse_public_page("https://clinic.example")

    assert result["status"] == "ok"
    assert result["title"] == "Clinica Olhos"
    assert result["contacts"]["phones"] == ["(11) 99999-0000"]
    assert result["contacts"]["whatsapp_links"] == ["https://wa.me/5511999990000"]
    assert result["appointment_or_contact_links"][0]["url"] == "https://clinic.example/agendamento"
    assert "POST https://clinic.example/contato" in result["forms"][0]
