"""FastAPI application for the Classification service (Service 8 — CivitroVision)."""

from __future__ import annotations

import sys
from pathlib import Path

# Add shared library to path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "shared"))

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from civitro_common.config import get_config
from civitro_common.database import connect_all, disconnect_all
from civitro_common.errors import register_exception_handlers
from civitro_common.logger import setup_logging, get_logger

from app.routes import router
from app import service as classification_service

SERVICE_NAME = "classification"


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    setup_logging(service_name=SERVICE_NAME)
    log = get_logger(SERVICE_NAME)
    log.info("starting classification service")

    # Connect databases
    await connect_all()

    # Load the ViT model
    classification_service.load_model()

    log.info("classification service ready")
    yield

    # Shutdown
    log.info("shutting down classification service")
    classification_service.unload_model()
    await disconnect_all()


def create_app() -> FastAPI:
    cfg = get_config()
    app = FastAPI(
        title="Civitro Classification Service",
        version=cfg.app.version,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    register_exception_handlers(app)

    # Routes
    app.include_router(router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": SERVICE_NAME}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8008,
        reload=True,
    )
