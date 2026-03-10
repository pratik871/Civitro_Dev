"""Database helpers — async connection pools for PostgreSQL, MongoDB and Redis."""

from __future__ import annotations

from typing import Any

import asyncpg
import motor.motor_asyncio as motor
from redis import asyncio as aioredis

from civitro_common.config import get_config
from civitro_common.logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# PostgreSQL (asyncpg)
# ---------------------------------------------------------------------------

_pg_pool: asyncpg.Pool | None = None


async def init_postgres() -> asyncpg.Pool:
    """Create (or return cached) asyncpg connection pool."""
    global _pg_pool
    if _pg_pool is not None:
        return _pg_pool

    cfg = get_config().databases.postgres
    log.info(
        "connecting to postgres",
        host=cfg.host,
        port=cfg.port,
        database=cfg.name,
    )
    _pg_pool = await asyncpg.create_pool(
        dsn=cfg.dsn,
        min_size=2,
        max_size=cfg.pool_size,
        ssl="require" if cfg.ssl else None,
    )
    log.info("postgres pool created")
    return _pg_pool


async def get_postgres() -> asyncpg.Pool:
    """Return the cached pool, initialising lazily if needed."""
    if _pg_pool is None:
        return await init_postgres()
    return _pg_pool


async def close_postgres() -> None:
    global _pg_pool
    if _pg_pool is not None:
        await _pg_pool.close()
        _pg_pool = None
        log.info("postgres pool closed")


# ---------------------------------------------------------------------------
# MongoDB (motor)
# ---------------------------------------------------------------------------

_mongo_client: motor.AsyncIOMotorClient | None = None  # type: ignore[type-arg]
_mongo_db: Any = None


def init_mongo() -> motor.AsyncIOMotorDatabase:  # type: ignore[type-arg]
    """Create (or return cached) Motor async MongoDB client + database handle."""
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db

    cfg = get_config().databases.mongodb
    log.info("connecting to mongodb", uri=cfg.uri, database=cfg.database)
    _mongo_client = motor.AsyncIOMotorClient(cfg.uri)
    _mongo_db = _mongo_client[cfg.database]
    return _mongo_db


def get_mongo() -> motor.AsyncIOMotorDatabase:  # type: ignore[type-arg]
    if _mongo_db is None:
        return init_mongo()
    return _mongo_db


async def close_mongo() -> None:
    global _mongo_client, _mongo_db
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None
        log.info("mongodb client closed")


# ---------------------------------------------------------------------------
# Redis (redis.asyncio, formerly aioredis)
# ---------------------------------------------------------------------------

_redis_client: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis:
    """Create (or return cached) async Redis client."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    cfg = get_config().databases.redis
    log.info("connecting to redis", host=cfg.host, port=cfg.port)
    _redis_client = aioredis.from_url(
        cfg.url,
        decode_responses=True,
    )
    # Quick connectivity check
    await _redis_client.ping()
    log.info("redis connected")
    return _redis_client


async def get_redis() -> aioredis.Redis:
    if _redis_client is None:
        return await init_redis()
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
        log.info("redis client closed")


# ---------------------------------------------------------------------------
# Convenience: connect / disconnect everything
# ---------------------------------------------------------------------------


async def connect_all() -> None:
    """Open all database connections."""
    await init_postgres()
    init_mongo()
    await init_redis()


async def disconnect_all() -> None:
    """Close all database connections."""
    await close_postgres()
    await close_mongo()
    await close_redis()
