"""FastAPI application for the Translation service."""

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
from civitro_common.errors import register_exception_handlers
from civitro_common.logger import setup_logging, get_logger

from app.routes import router, service as translation_service

SERVICE_NAME = "translation"


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    setup_logging(service_name=SERVICE_NAME)
    log = get_logger(SERVICE_NAME)
    log.info("starting translation service")

    log.info("translation service ready")
    yield

    log.info("shutting down translation service")
    await translation_service.close()


def create_app() -> FastAPI:
    cfg = get_config()
    app = FastAPI(
        title="Civitro Translation Service",
        version=cfg.app.version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": SERVICE_NAME}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8021, reload=True)
