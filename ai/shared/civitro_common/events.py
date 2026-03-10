"""Kafka producer / consumer helpers using aiokafka."""

from __future__ import annotations

import json
from typing import Any, Callable, Awaitable

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from civitro_common.config import get_config
from civitro_common.logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Producer
# ---------------------------------------------------------------------------

_producer: AIOKafkaProducer | None = None


async def init_producer() -> AIOKafkaProducer:
    """Start a singleton Kafka producer."""
    global _producer
    if _producer is not None:
        return _producer

    cfg = get_config().events
    log.info("starting kafka producer", brokers=cfg.brokers)
    _producer = AIOKafkaProducer(
        bootstrap_servers=",".join(cfg.brokers),
        value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if isinstance(k, str) else k,
    )
    await _producer.start()
    log.info("kafka producer started")
    return _producer


async def publish(topic: str, value: dict[str, Any], key: str | None = None) -> None:
    """Publish a JSON message to *topic*."""
    producer = await init_producer()
    await producer.send_and_wait(topic, value=value, key=key)
    log.debug("event published", topic=topic, key=key)


async def close_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
        log.info("kafka producer stopped")


# ---------------------------------------------------------------------------
# Consumer
# ---------------------------------------------------------------------------


async def consume(
    topics: list[str],
    group_id: str,
    handler: Callable[[str, dict[str, Any]], Awaitable[None]],
    *,
    from_beginning: bool = False,
) -> None:
    """Start consuming *topics* and invoke *handler(topic, payload)* for each
    message.  This coroutine runs forever — launch it as a background task.
    """
    cfg = get_config().events
    full_group = f"{cfg.consumer_group_prefix}.{group_id}"
    log.info("starting kafka consumer", topics=topics, group_id=full_group)

    consumer = AIOKafkaConsumer(
        *topics,
        bootstrap_servers=",".join(cfg.brokers),
        group_id=full_group,
        auto_offset_reset="earliest" if from_beginning else "latest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        enable_auto_commit=True,
    )
    await consumer.start()
    log.info("kafka consumer started")

    try:
        async for msg in consumer:
            try:
                await handler(msg.topic, msg.value)
            except Exception:
                log.exception(
                    "error processing kafka message",
                    topic=msg.topic,
                    offset=msg.offset,
                )
    finally:
        await consumer.stop()
        log.info("kafka consumer stopped")


def get_topic(name: str) -> str:
    """Look up a topic name from config by its short key.

    Example: ``get_topic("issue")`` -> ``"civitro.issue.events"``
    """
    cfg = get_config().events.topics
    value = getattr(cfg, name, None)
    if value is None:
        raise KeyError(f"Unknown topic key: {name}")
    return value
