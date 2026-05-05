COMPOSE ?= $(shell \
	if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then \
		printf 'docker compose'; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		printf 'docker-compose'; \
	elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then \
		printf 'podman compose'; \
	else \
		printf 'docker compose'; \
	fi)
COMPOSE_FILE ?= infra/docker-compose.local.yml
APP_COMPOSE_FILE ?= infra/docker-compose.app.yml
COMPOSE_ENV_FILE ?= $(if $(wildcard .env),.env,.env.example)

ifneq ($(wildcard $(COMPOSE_ENV_FILE)),)
include $(COMPOSE_ENV_FILE)
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' $(COMPOSE_ENV_FILE))
endif

REDIS_URL ?= redis://localhost:6379/0

.PHONY: help install infra-up infra-down infra-logs infra-ps app-build app-up app-down app-logs app-ps app-migrate db-migrate api-db worker-ingest openapi-check verify

help:
	@printf "BoxBrain v2 development targets:\n"
	@printf "  make install        Install workspace dependencies with pnpm\n"
	@printf "  make infra-up       Start local PostgreSQL, Redis, and MinIO\n"
	@printf "  make infra-down     Stop local services\n"
	@printf "  make infra-logs     Follow local service logs\n"
	@printf "  make app-build      Build full-stack app containers\n"
	@printf "  make app-up         Start full-stack app containers\n"
	@printf "  make app-down       Stop full-stack app containers\n"
	@printf "  make app-logs       Follow full-stack app logs\n"
	@printf "  make app-ps         Show full-stack app containers\n"
	@printf "  make app-migrate    Run full-stack app migrations\n"
	@printf "  make db-migrate     Apply backend Alembic migrations\n"
	@printf "  make api-db         Run FastAPI in PostgreSQL/S3/RQ integration mode\n"
	@printf "  make worker-ingest  Run the RQ ingestion worker\n"
	@printf "  make openapi-check  Run the root OpenAPI contract check\n"
	@printf "  make verify         Run root verification\n"

install:
	pnpm install

infra-up:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(COMPOSE_FILE) up -d

infra-down:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(COMPOSE_FILE) down

infra-logs:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(COMPOSE_FILE) logs -f

infra-ps:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(COMPOSE_FILE) ps

app-build:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(APP_COMPOSE_FILE) build

app-up:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(APP_COMPOSE_FILE) up -d --build

app-down:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(APP_COMPOSE_FILE) down

app-logs:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(APP_COMPOSE_FILE) logs -f

app-ps:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(APP_COMPOSE_FILE) ps

app-migrate:
	$(COMPOSE) --env-file $(COMPOSE_ENV_FILE) -f $(APP_COMPOSE_FILE) run --rm migrate

db-migrate:
	cd services/api && uv run alembic upgrade head

api-db:
	cd services/api && BOXBRAIN_REPOSITORY=database BOXBRAIN_STORAGE=s3 BOXBRAIN_ENQUEUE_INGESTION=true uv run uvicorn app.main:app --reload

worker-ingest:
	cd services/api && PYTHONPATH=../..:. BOXBRAIN_REPOSITORY=database BOXBRAIN_STORAGE=s3 BOXBRAIN_ENQUEUE_INGESTION=true uv run rq worker boxbrain-ingestion --url $(REDIS_URL)

openapi-check:
	pnpm openapi:check

verify:
	pnpm verify
