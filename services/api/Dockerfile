# syntax=docker/dockerfile:1

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app:/app/services/api \
    UV_PROJECT_ENVIRONMENT=/app/services/api/.venv \
    UV_LINK_MODE=copy

WORKDIR /app/services/api

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        fonts-dejavu \
        libreoffice \
    && rm -rf /var/lib/apt/lists/*

COPY services/api/pyproject.toml services/api/uv.lock ./
RUN uv sync --frozen --no-dev

COPY services/api /app/services/api
COPY services/worker /app/services/worker
COPY infra /app/infra

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
