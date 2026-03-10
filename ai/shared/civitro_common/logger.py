"""Structured logging via structlog, configured from the central YAML config."""

from __future__ import annotations

import logging
import sys

import structlog

from civitro_common.config import get_config

_CONFIGURED = False


def setup_logging(*, service_name: str | None = None) -> None:
    """Initialise structlog processors and stdlib root logger.

    Safe to call multiple times; subsequent calls are no-ops.
    """
    global _CONFIGURED
    if _CONFIGURED:
        return
    _CONFIGURED = True

    cfg = get_config().monitoring.logging
    level = getattr(logging, cfg.level.upper(), logging.DEBUG)

    # Choose renderer
    if cfg.format == "json":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty())

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if service_name:
        shared_processors.insert(0, structlog.processors.EventRenamer("msg"))

        def _add_service(
            _logger: structlog.types.WrappedLogger,
            _method: str,
            event_dict: structlog.types.EventDict,
        ) -> structlog.types.EventDict:
            event_dict.setdefault("service", service_name)
            return event_dict

        shared_processors.insert(0, _add_service)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout if cfg.output == "stdout" else sys.stderr),
        cache_logger_on_first_use=True,
    )

    # Also configure stdlib logging so third-party libs behave
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level, force=True)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger, ensuring setup has run."""
    if not _CONFIGURED:
        setup_logging()
    return structlog.get_logger(name)  # type: ignore[return-value]
