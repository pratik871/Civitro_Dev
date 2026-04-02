"""FastAPI application for the Bhashini NMT (IndicTrans2) service."""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router, service as nmt_service

SERVICE_NAME = "bhashini-nmt"

logging.basicConfig(
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)
logger = logging.getLogger(SERVICE_NAME)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting Bhashini NMT service — loading IndicTrans2 models...")
    await nmt_service.load_models()
    logger.info("Bhashini NMT service ready")
    yield
    logger.info("Shutting down Bhashini NMT service — unloading models...")
    await nmt_service.unload_models()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Civitro Bhashini NMT Service",
        description="Offline IndicTrans2 translation for 22 Indian languages",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    @app.get("/health")
    async def health() -> dict[str, str | bool]:
        return {
            "status": "ok" if nmt_service.is_loaded else "loading",
            "service": SERVICE_NAME,
            "models_loaded": nmt_service.is_loaded,
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8025, reload=True)
