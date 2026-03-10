"""S3 / MinIO async storage client using aioboto3."""

from __future__ import annotations

from typing import Any, BinaryIO

import aioboto3

from civitro_common.config import get_config
from civitro_common.logger import get_logger

log = get_logger(__name__)

_session: aioboto3.Session | None = None


def _get_session() -> aioboto3.Session:
    global _session
    if _session is None:
        _session = aioboto3.Session()
    return _session


def _client_kwargs() -> dict[str, Any]:
    cfg = get_config().storage
    kwargs: dict[str, Any] = {
        "service_name": "s3",
        "endpoint_url": cfg.endpoint,
        "region_name": cfg.region,
        "aws_access_key_id": cfg.access_key,
        "aws_secret_access_key": cfg.secret_key,
    }
    return kwargs


async def upload_file(
    key: str,
    body: bytes | BinaryIO,
    content_type: str = "application/octet-stream",
    bucket: str | None = None,
    metadata: dict[str, str] | None = None,
) -> str:
    """Upload a file and return its S3 key."""
    cfg = get_config().storage
    target_bucket = bucket or cfg.bucket

    session = _get_session()
    async with session.client(**_client_kwargs()) as s3:
        put_kwargs: dict[str, Any] = {
            "Bucket": target_bucket,
            "Key": key,
            "Body": body,
            "ContentType": content_type,
        }
        if metadata:
            put_kwargs["Metadata"] = metadata
        await s3.put_object(**put_kwargs)

    log.info("file uploaded", bucket=target_bucket, key=key)
    return key


async def download_file(key: str, bucket: str | None = None) -> bytes:
    """Download a file and return its contents as bytes."""
    cfg = get_config().storage
    target_bucket = bucket or cfg.bucket

    session = _get_session()
    async with session.client(**_client_kwargs()) as s3:
        response = await s3.get_object(Bucket=target_bucket, Key=key)
        data: bytes = await response["Body"].read()
    return data


async def delete_file(key: str, bucket: str | None = None) -> None:
    """Delete a file from storage."""
    cfg = get_config().storage
    target_bucket = bucket or cfg.bucket

    session = _get_session()
    async with session.client(**_client_kwargs()) as s3:
        await s3.delete_object(Bucket=target_bucket, Key=key)
    log.info("file deleted", bucket=target_bucket, key=key)


async def generate_presigned_url(
    key: str,
    bucket: str | None = None,
    expires_in: int = 3600,
) -> str:
    """Generate a pre-signed GET URL for *key*."""
    cfg = get_config().storage
    target_bucket = bucket or cfg.bucket

    session = _get_session()
    async with session.client(**_client_kwargs()) as s3:
        url: str = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": target_bucket, "Key": key},
            ExpiresIn=expires_in,
        )
    return url


async def get_public_url(key: str) -> str:
    """Return the public / CDN URL for the given key."""
    cfg = get_config().storage
    if cfg.cdn_url:
        return f"{cfg.cdn_url.rstrip('/')}/{key}"
    return f"{cfg.endpoint.rstrip('/')}/{cfg.bucket}/{key}"


async def ensure_bucket(bucket: str | None = None) -> None:
    """Create the bucket if it doesn't already exist (useful at startup)."""
    cfg = get_config().storage
    target_bucket = bucket or cfg.bucket

    session = _get_session()
    async with session.client(**_client_kwargs()) as s3:
        try:
            await s3.head_bucket(Bucket=target_bucket)
        except Exception:
            await s3.create_bucket(Bucket=target_bucket)
            log.info("bucket created", bucket=target_bucket)
