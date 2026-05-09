"""Worker LiveKit: agente de voz da Kiki (STT/LLM/TTS) via LiveKit Agents.

Azure TTS segue o guia LiveKit: https://docs.livekit.io/agents/models/tts/azure/
  - Obrigatório (caso usual): ``AZURE_SPEECH_KEY`` + ``AZURE_SPEECH_REGION`` (slug, ex. brazilsouth).
  - Opcional: ``AZURE_SPEECH_HOST`` (nome na doc LiveKit) ou ``AZURE_SPEECH_ENDPOINT`` (env lido pelo
    plugin). Se vier só o host do portal ``*.api.cognitive.microsoft.com``, ``FixedAzureTTS`` reescreve
    para ``https://<regiao>.tts.speech.microsoft.com/cognitiveservices/v1``.

Outras variáveis (ex.: backend/.env):

  LIVEKIT_URL            WebSocket do projeto (ex.: wss://xxx.livekit.cloud)
  LIVEKIT_API_KEY        API Key do projeto LiveKit Cloud
  LIVEKIT_API_SECRET     API Secret do projeto LiveKit Cloud
                          (Inference LLM usa o mesmo par para o gateway LiveKit)

  ASSEMBLYAI_API_KEY     Chave AssemblyAI para o plugin STT

  AZURE_VOICE_NAME       Opcional; alias de AZURE_TTS_VOICE se esta não estiver definida
  AZURE_TTS_SAMPLE_RATE  Opcional; default 16000 (PCM raw); use 24000 se preferir

  KIKI_VOICE_AGENT_NAME  Opcional; default: kiki-voice (nome do agente no dispatch)
  AZURE_TTS_VOICE        Opcional; default: pt-BR-FranciscaNeural

Comandos (CLI LiveKit Agents):

  python livekit_service.py download-files   — baixa artefatos (Silero VAD, etc.)
  python livekit_service.py start            — modo produção (docker-compose)
  python livekit_service.py dev             — desenvolvimento contra a nuvem
"""
if __name__ == "__main__":
    from kiki_livekit.entrypoint import run_cli

    run_cli()
