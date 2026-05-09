"""Correções para Azure Speech TTS + LiveKit Agents.

Documentação LiveKit (Azure Speech TTS): ``/agents/models/tts/azure/`` — autenticação típica:
``AZURE_SPEECH_KEY``, ``AZURE_SPEECH_REGION``; o guia também menciona ``AZURE_SPEECH_HOST`` para
endpoint customizado. O plugin Python usa ``speech_endpoint`` / ``AZURE_SPEECH_ENDPOINT``; aqui
aceitamos **HOST ou ENDPOINT** no ambiente e normalizamos URLs do portal ``*.api.cognitive.microsoft.com``
para o REST de síntese ``*.tts.speech.microsoft.com/cognitiveservices/v1``.

Outros ajustes:

- Cabeçalho ``Ocp-Apim-Subscription-Region`` quando há chave + região (multi-region / Foundry).
- SSML com ``xml:lang`` na tag ``<voice>`` e texto escapado para XML.
- Leitura do corpo com ``await resp.read()`` (evita fluxo vazio com ``iter_chunks``).
"""
from __future__ import annotations

import asyncio
import os
import logging
import xml.sax.saxutils as saxutils
from urllib.parse import urlparse

import aiohttp

from livekit.agents import APIConnectionError, APIStatusError, APITimeoutError, tts, utils
from livekit.agents.types import (
    APIConnectOptions,
    DEFAULT_API_CONNECT_OPTIONS,
    NOT_GIVEN,
    NotGivenOr,
)
from livekit.agents.utils import is_given
from livekit.plugins.azure.tts import ChunkedStream as AzureChunkedStream
from livekit.plugins.azure.tts import ProsodyConfig, StyleConfig
from livekit.plugins.azure.tts import TTS as AzureTTSBase

_CHUNK = 8192
_LOG = logging.getLogger("kiki.azure_tts")

_TTS_PATH_SUFFIX = "/cognitiveservices/v1"


def speech_endpoint_from_env() -> str | None:
    """Endpoint opcional: ``AZURE_SPEECH_ENDPOINT`` (plugin) ou ``AZURE_SPEECH_HOST`` (doc LiveKit)."""
    for key in ("AZURE_SPEECH_ENDPOINT", "AZURE_SPEECH_HOST"):
        v = (os.environ.get(key) or "").strip()
        if v:
            return v
    return None


def _infer_region_from_cognitive_api_host(endpoint: str) -> str | None:
    """Extrai região do host ``{regiao}.api.cognitive.microsoft.com``."""
    host = (urlparse(endpoint.strip()).hostname or "").lower()
    if ".api.cognitive.microsoft.com" not in host:
        return None
    label = host.split(".")[0]
    return label or None


def normalize_azure_speech_for_tts(
    speech_endpoint: str | None,
    speech_region: str | None,
) -> tuple[str | None, str | None]:
    """Corrige endpoint/região comuns que causam corpo HTTP vazio no TTS.

    - ``api.cognitive.microsoft.com`` não é o host do REST de síntese; redireciona para
      ``https://{{regiao}}.tts.speech.microsoft.com/cognitiveservices/v1``.
    - ``southamerica`` não é slug de região válido para o header/subdomínio.
    """
    ep = (speech_endpoint or "").strip().rstrip("/") or None
    reg = (speech_region or "").strip() or None

    inferred: str | None = None
    if ep and "api.cognitive.microsoft.com" in ep:
        inferred = _infer_region_from_cognitive_api_host(ep)
        if inferred:
            ep = f"https://{inferred}.tts.speech.microsoft.com{_TTS_PATH_SUFFIX}"

    if ep and "tts.speech.microsoft.com" in ep:
        base = ep.rstrip("/")
        if not base.endswith("cognitiveservices/v1"):
            ep = base + _TTS_PATH_SUFFIX

    compact = (reg or "").lower().replace(" ", "")
    if compact == "southamerica":
        reg = inferred or "brazilsouth"
    elif not reg and inferred:
        reg = inferred

    return ep, reg


def locale_from_voice_name(voice: str) -> str:
    """Infere locale BCP-47 a partir do nome curto da voz (ex.: pt-BR-FranciscaNeural → pt-BR)."""
    parts = voice.replace("_", "-").split("-")
    if len(parts) >= 3 and len(parts[1]) == 2:
        return f"{parts[0]}-{parts[1].upper()}"
    if len(parts) >= 2 and len(parts[1]) == 2:
        return f"{parts[0]}-{parts[1].upper()}"
    return "pt-BR"


class FixedAzureChunkedStream(AzureChunkedStream):
    """Mesmo contrato que ``livekit.plugins.azure.tts.ChunkedStream``, com I/O mais robusto."""

    def _build_ssml(self) -> str:
        lang = str(self._opts.language or "en-US")
        safe_text = saxutils.escape(self.input_text)

        ssml = (
            f'<speak version="1.0" '
            f'xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" '
            f'xml:lang="{lang}">'
        )
        ssml += f'<voice xml:lang="{lang}" name="{self._opts.voice}">'

        if is_given(self._opts.lexicon_uri):
            ssml += f'<lexicon uri="{self._opts.lexicon_uri}"/>'

        if is_given(self._opts.style):
            degree = f' styledegree="{self._opts.style.degree}"' if self._opts.style.degree else ""
            ssml += f'<mstts:express-as style="{self._opts.style.style}"{degree}>'

        if is_given(self._opts.prosody):
            p = self._opts.prosody
            rate_attr = f' rate="{p.rate}"' if p.rate is not None else ""
            vol_attr = f' volume="{p.volume}"' if p.volume is not None else ""
            pitch_attr = f' pitch="{p.pitch}"' if p.pitch is not None else ""
            ssml += f"<prosody{rate_attr}{vol_attr}{pitch_attr}>{safe_text}</prosody>"
        else:
            ssml += safe_text

        if is_given(self._opts.style):
            ssml += "</mstts:express-as>"

        ssml += "</voice></speak>"
        return ssml

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        from livekit.plugins.azure.tts import SUPPORTED_OUTPUT_FORMATS

        url = self._opts.get_endpoint_url()
        headers = {
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": SUPPORTED_OUTPUT_FORMATS[self._opts.sample_rate],
            "User-Agent": "LiveKit Agents",
        }
        if self._opts.auth_token:
            headers["Authorization"] = f"Bearer {self._opts.auth_token}"
        elif self._opts.subscription_key:
            headers["Ocp-Apim-Subscription-Key"] = self._opts.subscription_key
            if self._opts.region:
                headers["Ocp-Apim-Subscription-Region"] = self._opts.region

        output_emitter.initialize(
            request_id=utils.shortuuid(),
            sample_rate=self._opts.sample_rate,
            num_channels=1,
            mime_type="audio/pcm",
        )

        try:
            _LOG.info(
                "AzureTTS request: url=%s sample_rate=%s voice=%s lang=%s",
                url,
                self._opts.sample_rate,
                self._opts.voice,
                self._opts.language,
            )
            async with self._tts._ensure_session().post(
                url=url,
                headers=headers,
                data=self._build_ssml(),
                timeout=aiohttp.ClientTimeout(total=30, sock_connect=self._conn_options.timeout),
            ) as resp:
                resp.raise_for_status()
                body = await resp.read()
                _LOG.info(
                    "AzureTTS response: status=%s bytes=%s content_type=%r",
                    resp.status,
                    len(body),
                    resp.headers.get("Content-Type", ""),
                )
                if not body:
                    ct = resp.headers.get("Content-Type", "")
                    cl = resp.headers.get("Content-Length", "")
                    hint = ""
                    if "api.cognitive.microsoft.com" in url:
                        hint = (
                            " O AZURE_SPEECH_ENDPOINT não pode ser só *.api.cognitive.microsoft.com — "
                            "use https://{regiao}.tts.speech.microsoft.com/cognitiveservices/v1."
                        )
                    raise APIConnectionError(
                        f"Azure TTS HTTP {resp.status} com corpo vazio "
                        f"(url={url}, Content-Type={ct!r}, Content-Length={cl!r}). "
                        "Confira região da chave no portal, voz neural na mesma região e chave do recurso Speech."
                        f"{hint}"
                    )
                for i in range(0, len(body), _CHUNK):
                    output_emitter.push(body[i : i + _CHUNK])

        except asyncio.TimeoutError:
            _LOG.warning("AzureTTS timeout url=%s", url)
            raise APITimeoutError() from None
        except aiohttp.ClientResponseError as e:
            _LOG.warning("AzureTTS HTTP error url=%s status=%s message=%s", url, e.status, e.message)
            raise APIStatusError(
                message=e.message,
                status_code=e.status,
                request_id=None,
                body=None,
            ) from None
        except Exception as e:
            _LOG.exception("AzureTTS connection error url=%s: %s", url, e)
            raise APIConnectionError(str(e)) from e


class FixedAzureTTS(AzureTTSBase):
    """Drop-in replacement para ``livekit.plugins.azure.TTS``."""

    def __init__(
        self,
        *,
        voice: str = "en-US-JennyNeural",
        language: str | None = None,
        sample_rate: int = 24000,
        prosody: NotGivenOr[ProsodyConfig] = NOT_GIVEN,
        style: NotGivenOr[StyleConfig] = NOT_GIVEN,
        lexicon_uri: NotGivenOr[str] = NOT_GIVEN,
        speech_key: str | None = None,
        speech_region: str | None = None,
        speech_endpoint: str | None = None,
        deployment_id: str | None = None,
        speech_auth_token: str | None = None,
        http_session: aiohttp.ClientSession | None = None,
    ) -> None:
        sk = speech_key if speech_key is not None else os.environ.get("AZURE_SPEECH_KEY")
        sr = speech_region if speech_region is not None else os.environ.get("AZURE_SPEECH_REGION")
        se = speech_endpoint if speech_endpoint is not None else speech_endpoint_from_env()
        sr = (sr or "").strip() or None
        se = (se or "").strip() or None
        se, sr = normalize_azure_speech_for_tts(se, sr)
        super().__init__(
            voice=voice,
            language=language,
            sample_rate=sample_rate,
            prosody=prosody,
            style=style,
            lexicon_uri=lexicon_uri,
            speech_key=sk,
            speech_region=sr,
            speech_endpoint=se,
            deployment_id=deployment_id,
            speech_auth_token=speech_auth_token,
            http_session=http_session,
        )

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> tts.ChunkedStream:
        return FixedAzureChunkedStream(tts=self, input_text=text, conn_options=conn_options)
