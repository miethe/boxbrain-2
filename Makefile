COMPOSE ?= docker compose
COMPOSE_FILE ?= infra/docker-compose.local.yml
COMPOSE_ENV_FILE ?= $(if $(wildcard .env),.env,.env.example)

.PHONY: help install infra-up infra-down infra-logs infra-ps db-migrate openapi-check verify

help:
	@printf "BoxBrain v2 development targets:\n"
	@printf "  make install        Install workspace dependencies with pnpm\n"
	@printf "  make infra-up       Start local PostgreSQL, Redis, and MinIO\n"
	@printf "  make infra-down     Stop local services\n"
	@printf "  make infra-logs     Follow local service logs\n"
	@printf "  make db-migrate     Apply backend Alembic migrations\n"
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

db-migrate:
	cd services/api && uv run alembic upgrade head

openapi-check:
	pnpm openapi:check

verify:
	pnpm verify
