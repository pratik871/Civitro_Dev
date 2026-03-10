"""Celery tasks for heavy background report processing."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from celery import Celery

from civitro_common.config import get_config
from civitro_common.logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Celery app
# ---------------------------------------------------------------------------


def _make_celery() -> Celery:
    cfg = get_config().databases.redis
    broker_url = cfg.url.replace("/0", "/1")  # Use DB 1 for Celery
    return Celery(
        "datamine",
        broker=broker_url,
        backend=broker_url,
    )


celery_app = _make_celery()
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------


def _run_async(coro: Any) -> Any:
    """Run an async function from synchronous Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_report(self: Any, report_id: str) -> dict[str, Any]:
    """Process an analytics report in the background."""
    from app.repository import get_report, update_report_status

    async def _process() -> dict[str, Any]:
        row = await get_report(report_id)
        if not row:
            return {"error": "report not found"}

        await update_report_status(report_id, "processing")
        report_type = row["type"]

        try:
            if report_type == "heatmap":
                from app.service import get_heatmap
                result = await get_heatmap(row["boundary_id"])
                result_data = result.model_dump_json()
            elif report_type == "demographic":
                from app.service import get_demographics
                result = await get_demographics(row["boundary_id"])
                result_data = result.model_dump_json()
            elif report_type == "issue_trends":
                from app.service import get_issue_trends
                result = await get_issue_trends(row["boundary_id"])
                result_data = result.model_dump_json()
            else:
                result_data = json.dumps({"type": report_type, "status": "not_implemented"})

            # Upload result to S3
            from civitro_common.storage import upload_file, generate_presigned_url

            key = f"reports/{report_id}.json"
            await upload_file(key, result_data.encode(), content_type="application/json")
            url = await generate_presigned_url(key)

            await update_report_status(report_id, "completed", result_url=url)
            log.info("report completed", report_id=report_id, type=report_type)
            return {"report_id": report_id, "status": "completed"}

        except Exception as exc:
            log.exception("report processing failed", report_id=report_id)
            await update_report_status(
                report_id, "failed", error_message=str(exc)
            )
            raise self.retry(exc=exc)

    return _run_async(_process())
