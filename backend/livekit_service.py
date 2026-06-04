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

  KIKI_VOICE_MODE        Opcional: classic (default) ou openai_realtime
  OPENAI_REALTIME_MODEL  Opcional; default: gpt-realtime-mini (modo openai_realtime)
  OPENAI_REALTIME_VOICE  Opcional; default: marin (modo openai_realtime)
  OPENAI_REALTIME_SPEED  Opcional; default: 1.0 (modo openai_realtime)
  ASSEMBLYAI_API_KEY     Chave AssemblyAI para o plugin STT (modo classic)

  AZURE_VOICE_NAME       Opcional; alias de AZURE_TTS_VOICE se esta não estiver definida
  AZURE_TTS_SAMPLE_RATE  Opcional; default 16000 (PCM raw); use 24000 se preferir

  KIKI_VOICE_AGENT_NAME  Opcional; default: kiki-voice (nome do agente no dispatch)
  AZURE_TTS_VOICE        Opcional; default: pt-BR-FranciscaNeural

  OpenAI (mesmo núcleo do chat HTTP; o llm_node da voz chama ``generate_reply_with_tools``):

  OPENAI_API_KEY         Obrigatório para o raciocínio do agente (Responses API).
  OPENAI_RESPONSES_MODEL Opcional; modelo da Responses API (default: OPENAI_CHAT_MODEL ou gpt-5.4-nano).
  OPENAI_CHAT_MODEL      Fallback se OPENAI_RESPONSES_MODEL não estiver definido.
  OPENAI_WEB_SEARCH_CONTEXT_SIZE  Opcional: low | medium | high (default medium).
  OPENAI_WEB_SEARCH_COUNTRY       Opcional; código ISO do país para relevância da busca (default BR).
  OPENAI_REASONING_EFFORT        Opcional; none|minimal|low|medium|high|xhigh para modelos com raciocínio.

Comandos (CLI LiveKit Agents):

  python livekit_service.py download-files   — baixa artefatos (Silero VAD, etc.)
  python livekit_service.py start            — modo produção (docker-compose)
  python livekit_service.py dev             — desenvolvimento contra a nuvem
"""
if __name__ == "__main__":
    from kiki_livekit.entrypoint import run_cli

    run_cli()
