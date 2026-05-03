"""Deterministic text embeddings for local ingestion/search tests."""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from collections.abc import Sequence

DETERMINISTIC_EMBEDDING_MODEL = "boxbrain-deterministic-token-hash"
DETERMINISTIC_EMBEDDING_VERSION = "v1"
DEFAULT_EMBEDDING_DIMS = 1536
_TOKEN_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?")


def tokenize(text: str | None) -> tuple[str, ...]:
    if not text:
        return ()
    return tuple(_TOKEN_RE.findall(text.casefold()))


def deterministic_text_embedding(
    text: str | None,
    *,
    dims: int = DEFAULT_EMBEDDING_DIMS,
) -> tuple[float, ...]:
    """Return a deterministic sparse-hash embedding with unit length."""

    if dims <= 0:
        raise ValueError("dims must be greater than zero")

    vector = [0.0] * dims
    features = Counter(_feature_tokens(tokenize(text)))
    if not features:
        return tuple(vector)

    for feature, count in features.items():
        digest = hashlib.sha256(feature.encode("utf-8")).digest()
        index = int.from_bytes(digest[:8], "big") % dims
        sign = 1.0 if digest[8] & 1 else -1.0
        weight = 1.0 + math.log(count)
        if " " in feature:
            weight *= 0.65
        vector[index] += sign * weight

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return tuple(vector)
    return tuple(round(value / norm, 8) for value in vector)


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right):
        raise ValueError("vectors must have the same dimensionality")
    if not left:
        return 0.0

    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


def _feature_tokens(tokens: Sequence[str]) -> tuple[str, ...]:
    if not tokens:
        return ()
    bigrams = tuple(f"{left} {right}" for left, right in zip(tokens, tokens[1:]))
    return tuple(tokens) + bigrams

