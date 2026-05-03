from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

import boto3

from app.config import Settings, get_settings


@dataclass(frozen=True, slots=True)
class StoredArtifact:
    storage_uri: str
    bucket: str
    key: str


class ObjectStorage:
    def put_bytes(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str | None,
        metadata: dict[str, str] | None = None,
    ) -> StoredArtifact:
        raise NotImplementedError

    def get_bytes(self, key: str) -> bytes:
        raise NotImplementedError


class InMemoryObjectStorage(ObjectStorage):
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    def put_bytes(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str | None,
        metadata: dict[str, str] | None = None,
    ) -> StoredArtifact:
        normalized_key = _normalize_key(key)
        self.objects[normalized_key] = bytes(content)
        return StoredArtifact(
            storage_uri=f"memory://boxbrain-artifacts/{normalized_key}",
            bucket="boxbrain-artifacts",
            key=normalized_key,
        )

    def get_bytes(self, key: str) -> bytes:
        return self.objects[_normalize_key(key)]


class S3ObjectStorage(ObjectStorage):
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.client = boto3.client(
            "s3",
            endpoint_url=self.settings.s3_endpoint_url,
            aws_access_key_id=self.settings.s3_access_key_id,
            aws_secret_access_key=self.settings.s3_secret_access_key,
        )

    def put_bytes(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str | None,
        metadata: dict[str, str] | None = None,
    ) -> StoredArtifact:
        normalized_key = _normalize_key(key)
        put_kwargs: dict[str, Any] = {
            "Bucket": self.settings.s3_bucket,
            "Key": normalized_key,
            "Body": content,
        }
        if content_type:
            put_kwargs["ContentType"] = content_type
        if metadata:
            put_kwargs["Metadata"] = metadata
        self.client.put_object(**put_kwargs)
        return StoredArtifact(
            storage_uri=f"s3://{self.settings.s3_bucket}/{normalized_key}",
            bucket=self.settings.s3_bucket,
            key=normalized_key,
        )

    def get_bytes(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.settings.s3_bucket, Key=_normalize_key(key))
        return response["Body"].read()


def build_object_storage(settings: Settings | None = None) -> ObjectStorage:
    resolved = settings or get_settings()
    if resolved.storage_mode == "s3":
        return S3ObjectStorage(resolved)
    return InMemoryObjectStorage()


def artifact_key(*, sha256: str, filename: str) -> str:
    extension = PurePosixPath(filename).suffix.casefold() or ".bin"
    return f"originals/{sha256[:2]}/{sha256}{extension}"


def _normalize_key(key: str) -> str:
    normalized = str(PurePosixPath(key))
    if normalized.startswith("../") or "/../" in normalized or normalized.startswith("/"):
        raise ValueError("storage object key must be relative and normalized")
    return normalized
