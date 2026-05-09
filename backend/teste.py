import azure.cognitiveservices.speech as speechsdk

speech_key = "SUA_KEY"
service_region = "SUA_REGION"

speech_config = speechsdk.SpeechConfig(
    subscription=speech_key,
    region=service_region
)

speech_config.speech_synthesis_voice_name = "pt-BR-FranciscaNeural"

audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)

synthesizer = speechsdk.SpeechSynthesizer(
    speech_config=speech_config,
    audio_config=audio_config
)

result = synthesizer.speak_text_async(
    "Olá, eu sou a Kiki."
).get()

print(result)