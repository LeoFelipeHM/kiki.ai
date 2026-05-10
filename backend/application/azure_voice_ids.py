"""Identificadores curtos das vozes Azure Neural pt-BR (Speech REST).

Lista alinhada à API de vozes do Azure Cognitive Speech para regiões onde GA está disponível.
"""

from __future__ import annotations

# Fonte: GET …/cognitiveservices/voices/list — Locale == pt-BR, neural GA da seleção do projeto.
AZURE_PT_BR_NEURAL_VOICE_IDS: tuple[str, ...] = (
    "pt-BR-FranciscaNeural",
    "pt-BR-AntonioNeural",
    "pt-BR-MacerioMultilingualNeural",
    "pt-BR-ThalitaMultilingualNeural",
    "pt-BR-BrendaNeural",
    "pt-BR-DonatoNeural",
    "pt-BR-ElzaNeural",
    "pt-BR-FabioNeural",
    "pt-BR-GiovannaNeural",
    "pt-BR-HumbertoNeural",
    "pt-BR-JulioNeural",
    "pt-BR-LeilaNeural",
    "pt-BR-LeticiaNeural",
    "pt-BR-ManuelaNeural",
    "pt-BR-NicolauNeural",
    "pt-BR-ThalitaNeural",
    "pt-BR-ValerioNeural",
    "pt-BR-YaraNeural",
)

AZURE_PT_BR_VOICE_IDS_FROZEN = frozenset(AZURE_PT_BR_NEURAL_VOICE_IDS)
