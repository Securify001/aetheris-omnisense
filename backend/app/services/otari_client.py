"""
near_ai_client.py — OpenAI-Compatible Clients for NEAR AI Cloud & Hub
────────────────────────────────────────────────────────────────────────
Routes chat, vision, reasoning, and smart contract requests through NEAR AI Cloud
(`https://api.near.ai/v1`) with Bearer token authentication.
"""

from openai import AsyncOpenAI
from app.config import (
    NEAR_AI_API_KEY,
    NEAR_AI_BASE_URL,
    OTARI_API_KEY,
    OTARI_BASE_URL,
    GROQ_API_KEY,
    GROQ_BASE_URL,
)

_NEAR_AI_HEADERS = {
    "Authorization": f"Bearer {NEAR_AI_API_KEY or 'near_ai_unconfigured'}",
    "X-NEAR-Client": "Aetheris-OmniSense/2.0 (near-protocol-agent-economy)",
}

# Primary NEAR AI client (chat, compound, reasoning, TTS)
otari = AsyncOpenAI(
    api_key=NEAR_AI_API_KEY or "near_ai_unconfigured",
    base_url=NEAR_AI_BASE_URL,
    default_headers=_NEAR_AI_HEADERS,
)

# Zero-retry fast client for real-time webcam vision & low-latency voice
otari_fast = AsyncOpenAI(
    api_key=NEAR_AI_API_KEY or "near_ai_unconfigured",
    base_url=NEAR_AI_BASE_URL,
    max_retries=0,
    default_headers=_NEAR_AI_HEADERS,
)

near_ai = otari
near_ai_fast = otari_fast

# Optional Groq Whisper helper for STT audio transcription
groq = AsyncOpenAI(
    api_key=GROQ_API_KEY or "groq_unconfigured",
    base_url=GROQ_BASE_URL,
    max_retries=0,
)
