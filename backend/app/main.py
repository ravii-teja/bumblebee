"""FastAPI Main Application Entrypoint for MUSE FIELD."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.sessions import router as sessions_router
from app.api.v1.vision import router as vision_router
from app.api.v1.diagnostics import router as diagnostics_router
from app.api.v1.parts import router as parts_router
from app.api.v1.procedures import router as procedures_router
from app.api.v1.conversation import router as conversation_router

app = FastAPI(
    title="MUSE FIELD — AI Field Engineer API",
    description="Backend orchestration engine for Meta Muse Spark & SAM 3.1 Automotive Field Repair",
    version="1.0.0"
)

# Enable CORS for local Next.js frontend and production hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(vision_router, prefix="/api/v1")
app.include_router(diagnostics_router, prefix="/api/v1")
app.include_router(parts_router, prefix="/api/v1")
app.include_router(procedures_router, prefix="/api/v1")
app.include_router(conversation_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MUSE FIELD Orchestration Core",
        "models": {
            "reasoning": "Meta Muse Spark / Llama 3.2 Vision",
            "segmentation": "SAM 3.1"
        }
    }
