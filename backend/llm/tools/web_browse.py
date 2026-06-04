from __future__ import annotations

import html
import ipaddress
import re
import socket
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

MAX_DOWNLOAD_BYTES = 1_000_000
MAX_TEXT_CHARS = 12_000
MAX_LINKS = 30
TIMEOUT_SECONDS = 12

CONTACT_PATTERNS = {
    "phones": re.compile(r"(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}"),
    "emails": re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE),
}
APPOINTMENT_WORDS = (
    "agendar",
    "agenda",
    "consulta",
    "marcar",
    "horário",
    "horarios",
    "horários",
    "disponibilidade",
    "convênio",
    "convenio",
    "oftalmologista",
    "whatsapp",
    "telefone",
    "contato",
)


@dataclass
class _Link:
    text: str
    href: str


@dataclass
class _ParsedPage:
    title: str = ""
    text_parts: list[str] = field(default_factory=list)
    links: list[_Link] = field(default_factory=list)
    forms: list[str] = field(default_factory=list)
    _current_link_href: str | None = None
    _current_link_text: list[str] = field(default_factory=list)
    _current_form_bits: list[str] | None = None


class _ReadableHtmlParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.page = _ParsedPage()
        self._skip_depth = 0
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {k.lower(): v or "" for k, v in attrs}
        if tag in ("script", "style", "noscript", "svg"):
            self._skip_depth += 1
            return
        if tag == "title":
            self._in_title = True
            return
        if tag == "a":
            href = attr.get("href", "").strip()
            if href:
                self.page._current_link_href = urljoin(self.base_url, href)
                self.page._current_link_text = []
        if tag == "form":
            action = attr.get("action", "").strip()
            method = attr.get("method", "get").strip().upper() or "GET"
            target = urljoin(self.base_url, action) if action else self.base_url
            self.page._current_form_bits = [f"{method} {target}"]
        if tag in ("input", "button", "select", "textarea") and self.page._current_form_bits is not None:
            label = attr.get("aria-label") or attr.get("placeholder") or attr.get("name") or attr.get("type") or tag
            if label:
                self.page._current_form_bits.append(label.strip())

    def handle_endtag(self, tag: str) -> None:
        if self._skip_depth:
            if tag in ("script", "style", "noscript", "svg"):
                self._skip_depth -= 1
            return
        if tag == "title":
            self._in_title = False
            return
        if tag == "a" and self.page._current_link_href:
            text = _normalize_text(" ".join(self.page._current_link_text))
            self.page.links.append(_Link(text=text[:120], href=self.page._current_link_href))
            self.page._current_link_href = None
            self.page._current_link_text = []
        if tag == "form" and self.page._current_form_bits is not None:
            summary = _normalize_text(" | ".join(self.page._current_form_bits))
            if summary:
                self.page.forms.append(summary[:500])
            self.page._current_form_bits = None

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = _normalize_text(data)
        if not text:
            return
        if self._in_title:
            self.page.title = _normalize_text(f"{self.page.title} {text}")
        if self.page._current_link_href:
            self.page._current_link_text.append(text)
        if self.page._current_form_bits is not None and len(text) <= 120:
            self.page._current_form_bits.append(text)
        self.page.text_parts.append(text)


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def _safe_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("URL inválida. Use uma URL pública http ou https.")
    host = parsed.hostname or ""
    if host in ("localhost", "0.0.0.0") or host.endswith(".local"):
        raise ValueError("URL local não é permitida.")
    try:
        addresses = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise ValueError("Não consegui resolver o domínio informado.") from exc
    for item in addresses:
        ip = ipaddress.ip_address(item[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError("URL aponta para rede privada ou local e não é permitida.")
    return parsed.geturl()


def _interesting_links(links: list[_Link]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for link in links:
        haystack = f"{link.text} {link.href}".lower()
        if not any(word in haystack for word in APPOINTMENT_WORDS):
            continue
        if link.href in seen:
            continue
        seen.add(link.href)
        out.append({"text": link.text or link.href, "url": link.href})
        if len(out) >= MAX_LINKS:
            break
    return out


def _contacts_from_text(text: str, links: list[_Link]) -> dict[str, list[str]]:
    phones = sorted({m.group(0).strip() for m in CONTACT_PATTERNS["phones"].finditer(text)})
    emails = sorted({m.group(0).strip() for m in CONTACT_PATTERNS["emails"].finditer(text)})
    whatsapp = {
            link.href
            for link in links
            if "wa.me/" in link.href.lower()
            or "api.whatsapp.com" in link.href.lower()
            or "whatsapp" in link.text.lower()
        }
    for match in CONTACT_PATTERNS["phones"].finditer(text):
        start = max(0, match.start() - 80)
        end = min(len(text), match.end() + 80)
        if "whatsapp" not in text[start:end].lower():
            continue
        digits = re.sub(r"\D+", "", match.group(0))
        if len(digits) in (10, 11):
            digits = f"55{digits}"
        if len(digits) >= 12:
            whatsapp.add(f"https://wa.me/{digits}")
    return {
        "phones": phones[:10],
        "emails": emails[:10],
        "whatsapp_links": sorted(whatsapp)[:10],
    }


def _relevant_snippets(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    snippets: list[str] = []
    seen: set[str] = set()
    for sentence in sentences:
        clean = _normalize_text(sentence)
        if len(clean) < 20:
            continue
        if not any(word in clean.lower() for word in APPOINTMENT_WORDS):
            continue
        if clean in seen:
            continue
        seen.add(clean)
        snippets.append(clean[:500])
        if len(snippets) >= 12:
            break
    return snippets


def browse_public_page(url: str) -> dict[str, Any]:
    safe = _safe_url(url)
    request = Request(
        safe,
        headers={
            "User-Agent": "KikiBot/1.0 (+https://heykiki.com.br)",
            "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        },
    )
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        content_type = response.headers.get("content-type", "")
        raw = response.read(MAX_DOWNLOAD_BYTES + 1)
        final_url = response.geturl()
    if len(raw) > MAX_DOWNLOAD_BYTES:
        raw = raw[:MAX_DOWNLOAD_BYTES]
    if "text/html" not in content_type and "text/plain" not in content_type and "application/xhtml" not in content_type:
        return {
            "url": final_url,
            "content_type": content_type,
            "status": "unsupported_content_type",
            "message": "O conteúdo não parece ser HTML/texto navegável.",
        }

    encoding = "utf-8"
    match = re.search(r"charset=([\w.-]+)", content_type, re.IGNORECASE)
    if match:
        encoding = match.group(1)
    body = raw.decode(encoding, errors="replace")
    parser = _ReadableHtmlParser(final_url)
    parser.feed(body)
    text = _normalize_text(" ".join(parser.page.text_parts))[:MAX_TEXT_CHARS]
    return {
        "url": final_url,
        "title": parser.page.title[:200],
        "content_type": content_type,
        "status": "ok",
        "contacts": _contacts_from_text(text, parser.page.links),
        "appointment_or_contact_links": _interesting_links(parser.page.links),
        "forms": parser.page.forms[:8],
        "relevant_snippets": _relevant_snippets(text),
        "text_excerpt": text[:2500],
        "limitations": "Não executa JavaScript nem preenche formulários. Use links retornados para abrir páginas de contato/agendamento específicas.",
    }
