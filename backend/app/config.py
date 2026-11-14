import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── NEAR Protocol & NEAR AI Cloud Gateway ────────────────────────────────────
NEAR_AI_API_KEY  = os.getenv("NEAR_AI_API_KEY", "sk-f64938ae942244baa2545bb985cb3139")
NEAR_AI_BASE_URL = os.getenv("NEAR_AI_BASE_URL", "https://cloud-api.near.ai/v1")
NEAR_AI_MODEL    = os.getenv("NEAR_AI_MODEL", "deepseek/deepseek-v3.2")
ONECLICK_BASE_URL= os.getenv("ONECLICK_BASE_URL", "https://1click.chaindefuser.com")
NEAR_RPC_URL     = os.getenv("NEAR_RPC_URL", "https://rpc.testnet.near.org")

# Backward compatibility alias
OTARI_API_KEY  = NEAR_AI_API_KEY
OTARI_BASE_URL = NEAR_AI_BASE_URL

# ── Groq (Whisper STT helper) ─────────────────────────────────────────────────
GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# ── Sarvam AI (primary STT — Saaras v3, Indian-language optimised) ────────────
SARVAM_API_KEY  = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = "https://api.sarvam.ai"

# Priority order for STT engines (first = primary)
STT_ENGINE_PRIORITY = ["sarvam", "groq", "near_ai"]

# ── Open-Weight Models via NEAR AI Cloud (Decentralized GPU Nodes) ───────────
OPEN_WEIGHT_MODELS = {
    "deepseek_v3": {
        "id": "deepseek/deepseek-v3.2",
        "near_id": "deepseek/deepseek-v3.2",
        "name": "DeepSeek V3.2 (NEAR AI Cloud)",
        "license": "MIT (Open-Weight)",
        "role": "Primary Reasoning & Intent Synthesis on NEAR",
        "cost_per_1k_tokens": 0.0003,
    },
    "reasoning": {
        "id": "deepseek/deepseek-v4.1-flash",
        "near_id": "deepseek/deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash (NEAR AI)",
        "license": "MIT (Open-Weight)",
        "role": "Ultra Low Latency Reasoning & Proof Generation",
        "cost_per_1k_tokens": 0.0002,
    },
    "multimodal": {
        "id": "anthropic/claude-sonnet-5",
        "near_id": "anthropic/claude-sonnet-5",
        "name": "Claude Sonnet 5 (NEAR AI Gateway)",
        "license": "Commercial via NEAR AI",
        "role": "Advanced Vision Analysis & Scene Decomposition",
        "cost_per_1k_tokens": 0.003,
    },
    "fast_fallback": {
        "id": "meta-llama/Llama-3.3-70B-Instruct",
        "near_id": "meta-llama/Llama-3.3-70B-Instruct",
        "name": "Meta Llama 3.3 70B Instruct (NEAR AI)",
        "license": "Llama 3.3 Community License",
        "role": "Consensus Fallback & Guardrail Safety Classifier",
        "cost_per_1k_tokens": 0.0004,
    },
}

MODELS = {
    "chat":            "deepseek/deepseek-v3.2",
    "chat_fallback":   [
        "deepseek/deepseek-v4.1-flash",
        "meta-llama/Llama-3.3-70B-Instruct",
    ],
    "chat_voice":      "deepseek/deepseek-v3.2",
    "vision":          "anthropic/claude-sonnet-5",
    "vision_fallback": [
        "deepseek/deepseek-v3.2",
    ],
    "stt":             "saaras:v3",
    "stt_groq":        "whisper-large-v3-turbo",
    "tts":             "kokoro-82m",
    "detect":          "deepseek/deepseek-v3.2",
    "image":           "black-forest-labs/FLUX.2-klein-4B",
    "image_fast":      "black-forest-labs/FLUX.2-klein-4B",
}

MAX_TOKENS_CHAT     = 4096
MAX_TOKENS_VOICE    = 1200
MAX_TOKENS_VISION   = 1024
MAX_TOKENS_COMPOUND = 8192
IMAGE_DEFAULT_SIZE  = "1024x1024"
STT_LANGUAGE        = None
VISION_INTERVAL_S   = 8

TEMPERATURE          = 0.35
TEMPERATURE_VOICE    = 0.20
TEMPERATURE_COMPOUND = 0.50
TOP_P                = 0.85
TOP_P_VOICE          = 0.80

MIN_RESPONSE_CHARS_VOICE   = 80
MIN_RESPONSE_CHARS_DETAIL  = 300
MAX_RETRY_ATTEMPTS         = 2

SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "stt_code": "en", "sarvam_code": "en-IN", "kokoro_voice": "af_heart", "gtts_lang": "en", "tts_engine": "gtts", "script": "Latin"},
    "hi": {"name": "Hindi", "stt_code": "hi", "sarvam_code": "hi-IN", "kokoro_voice": "af_heart", "gtts_lang": "hi", "tts_engine": "gtts", "script": "Devanagari"},
    "kn": {"name": "Kannada", "stt_code": "kn", "sarvam_code": "kn-IN", "kokoro_voice": "af_heart", "gtts_lang": "kn", "tts_engine": "gtts", "script": "Kannada"},
    "ta": {"name": "Tamil", "stt_code": "ta", "sarvam_code": "ta-IN", "kokoro_voice": "af_heart", "gtts_lang": "ta", "tts_engine": "gtts", "script": "Tamil"},
    "te": {"name": "Telugu", "stt_code": "te", "sarvam_code": "te-IN", "kokoro_voice": "af_heart", "gtts_lang": "te", "tts_engine": "gtts", "script": "Telugu"},
    "es": {"name": "Spanish", "stt_code": "es", "sarvam_code": None, "kokoro_voice": "af_heart", "gtts_lang": "es", "tts_engine": "gtts", "script": "Latin"},
    "fr": {"name": "French", "stt_code": "fr", "sarvam_code": None, "kokoro_voice": "af_heart", "gtts_lang": "fr", "tts_engine": "gtts", "script": "Latin"},
    "ja": {"name": "Japanese", "stt_code": "ja", "sarvam_code": None, "kokoro_voice": "af_heart", "gtts_lang": "ja", "tts_engine": "gtts", "script": "Japanese"},
}
