"""FastAPI application for the Sentiment service (Service 9)."""

from __future__ import annotations

import sys
from pathlib import Path

# Add shared library to path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "shared"))

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from civitro_common.config import get_config
from civitro_common.database import connect_all, disconnect_all
from civitro_common.errors import register_exception_handlers
from civitro_common.events import close_producer
from civitro_common.logger import setup_logging, get_logger

from app.routes import router
from app import service as sentiment_service

SERVICE_NAME = "sentiment"


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    setup_logging(service_name=SERVICE_NAME)
    log = get_logger(SERVICE_NAME)
    log.info("starting sentiment service")

    await connect_all()
    sentiment_service.load_model()

    # Launch Kafka consumer as a background task
    consumer_task = asyncio.create_task(sentiment_service.start_consumer())

    log.info("sentiment service ready")
    yield

    log.info("shutting down sentiment service")
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass

    sentiment_service.unload_model()
    await close_producer()
    await disconnect_all()


def create_app() -> FastAPI:
    cfg = get_config()
    app = FastAPI(
        title="Civitro Sentiment Service",
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

    uvicorn.run("app.main:app", host="0.0.0.0", port=8009, reload=True)
