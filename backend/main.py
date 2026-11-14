import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import voice, vision, image, compound, vision_voice, otari

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)

app = FastAPI(
    title="Aetheris OmniSense API",
    description="Multimodal AI: Autonomous Voice, Vision & Decentralized Agent Engine on NEAR Protocol",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice.router)
app.include_router(vision.router)
app.include_router(image.router)
app.include_router(compound.router)
app.include_router(vision_voice.router)
app.include_router(otari.router)


@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "service": "Aetheris OmniSense API",
        "network": "NEAR Protocol Testnet (Chain ID: testnet)",
        "contract": "aetheris-omnisense.testnet",
        "agent": "aetheris-agent.testnet",
        "version": "2.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Aetheris OmniSense API is running on NEAR Protocol & NEAR AI Cloud",
        "docs": "/docs",
        "contract": "aetheris-omnisense.testnet",
        "explorer": "https://testnet.nearblocks.io/accounts/aetheris-omnisense.testnet",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
