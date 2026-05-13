"""Pós-processamento que remove markdown e converte horários técnicos para linguagem natural."""

from __future__ import annotations

import re

_TIME_RANGE_RE = re.compile(
    r"(\d{1,2}):(\d{2})\s*[–\-—]+\s*(\d{1,2}):(\d{2})"
)

_SINGLE_TIME_RE = re.compile(r"(?<!\d)(\d{1,2}):(\d{2})(?!\d)")

_BOLD_RE = re.compile(r"\*{1,3}(.+?)\*{1,3}")
_HEADER_RE = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_BULLET_RE = re.compile(r"^\s*[-•]\s+", re.MULTILINE)
_NUMBERED_RE = re.compile(r"^\s*\d+\.\s+", re.MULTILINE)
_BACKTICK_RE = re.compile(r"`{1,3}(.+?)`{1,3}", re.DOTALL)
_BLOCKQUOTE_RE = re.compile(r"^>\s?", re.MULTILINE)
_UNDERLINE_RE = re.compile(r"__(.+?)__")
_HORIZONTAL_RULE_RE = re.compile(r"^[-*_]{3,}\s*$", re.MULTILINE)
_EM_DASH_RE = re.compile(r"\s*[—–]\s*")


def _fmt_time(h: str, m: str) -> str:
    hour = int(h)
    minute = int(m)
    if minute == 0:
        return f"{hour}h"
    return f"{hour}h{minute:02d}"


def _replace_time_range(match: re.Match[str]) -> str:
    start = _fmt_time(match.group(1), match.group(2))
    end = _fmt_time(match.group(3), match.group(4))
    return f"das {start} às {end}"


def _replace_single_time(match: re.Match[str]) -> str:
    return _fmt_time(match.group(1), match.group(2))


def sanitize_reply(text: str) -> str:
    """Limpa markdown e converte horários HH:MM para formato natural (ex: 8h30, 17h)."""
    text = _TIME_RANGE_RE.sub(_replace_time_range, text)
    text = _SINGLE_TIME_RE.sub(_replace_single_time, text)

    text = _BOLD_RE.sub(r"\1", text)
    text = _UNDERLINE_RE.sub(r"\1", text)
    text = _BACKTICK_RE.sub(r"\1", text)
    text = _HEADER_RE.sub("", text)
    text = _BLOCKQUOTE_RE.sub("", text)
    text = _HORIZONTAL_RULE_RE.sub("", text)

    text = _BULLET_RE.sub("\n", text)
    text = _NUMBERED_RE.sub("\n", text)

    text = _EM_DASH_RE.sub("\n", text)

    lines = text.splitlines()
    cleaned: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped:
            cleaned.append(stripped)
        elif cleaned and cleaned[-1] != "":
            cleaned.append("")
    text = "\n".join(cleaned).strip()

    return text
