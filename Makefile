# ============================================================
#  ft_transcendence — Makefile
# ============================================================

# --- Variables -----------------------------------------------

SHELL        := /bin/bash
COMPOSE      := docker compose

# docker-compose.override.yml is loaded automatically when present,
# switching all services to dev mode (watch + hot reload).
# COMPOSE_PROD forces production-only config by ignoring the override.
COMPOSE_PROD := docker compose -f docker-compose.yml

CERTS_DIR    := ./certs
AUTH_DIR     := ./shared/auth
DTO_DIR      := ./shared/dto
TYPES_DIR    := ./shared/types

# Colors
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
CYAN   := \033[36m
RESET  := \033[0m
BOLD   := \033[1m

# --- Phony targets -------------------------------------------

.PHONY: all generate migrate certs up up-prod down restart clean clean-data fclean re rebuild \
        prune logs ps help \
        logs-auth logs-user logs-game logs-matchmaking logs-frontend \
        logs-postgres logs-migration logs-gateway logs-ngrok logs-redis \
        shell-auth shell-user shell-game shell-matchmaking shell-postgres \
        shell-frontend shell-gateway shell-redis

# --- Default target ------------------------------------------

all: up

# --- Shared packages build -----------------------------------

generate: ##@Setup — Build shared packages (@transcendence/types + @transcendence/dto + @transcendence/auth)
	@printf "$(CYAN)>>> Building @transcendence/types...$(RESET)\n"
	@cd $(TYPES_DIR) && npm install --silent && npm run build || \
		(printf "$(RED)>>> FAILED: @transcendence/types build$(RESET)\n" && exit 1)
	@printf "$(CYAN)>>> Building @transcendence/dto...$(RESET)\n"
	@cd $(DTO_DIR) && npm install --silent && npm run build || \
		(printf "$(RED)>>> FAILED: @transcendence/dto build$(RESET)\n" && exit 1)
	@printf "$(CYAN)>>> Building @transcendence/auth...$(RESET)\n"
	@cd $(AUTH_DIR) && npm install --silent && npm run build || \
		(printf "$(RED)>>> FAILED: @transcendence/auth build$(RESET)\n" && exit 1)
	@printf "$(GREEN)>>> Shared packages built successfully.$(RESET)\n"

# --- Database migrations -------------------------------------

migrate: ##@DB — Create a new Prisma migration (usage: make migrate NAME=my_migration)
	@test -n "$(NAME)" || (printf "$(RED)>>> ERROR: NAME is required. Usage: make migrate NAME=my_migration$(RESET)\n" && exit 1)
	@$(COMPOSE) ps postgres | grep -q "running" || \
		(printf "$(RED)>>> ERROR: postgres is not running. Run 'make up' first.$(RESET)\n" && exit 1)
	@printf "$(CYAN)>>> Creating migration: $(NAME)...$(RESET)\n"
	@$(COMPOSE) run --rm --entrypoint "" \
		db-migration npx prisma migrate dev \
		--schema=/app/prisma/schema.prisma \
		--name=$(NAME)
	@printf "$(GREEN)>>> Migration created. Run 'make generate' to rebuild shared types.$(RESET)\n"

# --- Certificates generation ---------------------------------

certs: ##@Setup — Generate self-signed TLS certificates if missing
	@mkdir -p $(CERTS_DIR)
	@if [ ! -f $(CERTS_DIR)/cert.key ]; then \
		printf "$(CYAN)>>> Generating self-signed certificates...$(RESET)\n"; \
		openssl req -x509 -newkey rsa:4096 -nodes \
			-keyout $(CERTS_DIR)/cert.key \
			-out $(CERTS_DIR)/cert.crt \
			-days 365 \
			-subj "/CN=localhost" \
			-addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null; \
		printf "$(GREEN)>>> Certificates created.$(RESET)\n"; \
	else \
		printf "$(YELLOW)>>> Certificates already present, skipping.$(RESET)\n"; \
	fi

# --- Lifecycle -----------------------------------------------

up: certs ##@Docker — Build images and start all services in DEV mode (override.yml auto-loaded)
	@printf "$(CYAN)>>> Starting services in dev mode...$(RESET)\n"
	@$(COMPOSE) up -d --build
	@printf "$(GREEN)>>> All services started. Use 'make logs' to follow output.$(RESET)\n"

up-prod: certs ##@Docker — Build images and start all services in PRODUCTION mode (override.yml ignored)
	@printf "$(CYAN)>>> Starting services in production mode...$(RESET)\n"
	@$(COMPOSE_PROD) up -d --build
	@printf "$(GREEN)>>> All services started in production mode.$(RESET)\n"

down: ##@Docker — Stop and remove containers (volumes preserved)
	@printf "$(YELLOW)>>> Stopping services...$(RESET)\n"
	@$(COMPOSE) down

restart: down up ##@Docker — Full stop + start (dev mode)

rebuild: certs ##@Docker — Force rebuild without cache (DB preserved), then start
	@printf "$(CYAN)>>> Rebuilding without cache...$(RESET)\n"
	@$(COMPOSE) down --remove-orphans
	@$(COMPOSE) build --no-cache
	@$(COMPOSE) up -d
	@printf "$(GREEN)>>> Rebuild complete.$(RESET)\n"

re: fclean up ##@Docker — Full wipe (DB included) + fresh build

# --- Cleanup -------------------------------------------------

clean-data: ##@Cleanup — Stop services and remove DB + Redis volumes (images preserved)
	@printf "$(YELLOW)>>> Removing data volumes (postgres + redis)...$(RESET)\n"
	@$(COMPOSE) down -v
	@printf "$(GREEN)>>> Data volumes removed. Run 'make up' to restart fresh.$(RESET)\n"

clean: ##@Cleanup — Stop services and remove containers (volumes and images preserved)
	@printf "$(YELLOW)>>> Stopping services and removing containers...$(RESET)\n"
	@$(COMPOSE) down --remove-orphans
	@printf "$(GREEN)>>> Containers removed.$(RESET)\n"

fclean: ##@Cleanup — Remove containers, volumes, project images, and dangling layers
	@printf "$(RED)>>> Full cleanup: containers, volumes, images...$(RESET)\n"
	@$(COMPOSE) down -v --rmi all --remove-orphans
	@docker image prune -f
	@printf "$(GREEN)>>> Cleanup complete.$(RESET)\n"

prune: ##@Cleanup — Wipe project resources and purge entire Docker system (WARNING: affects all projects)
	@printf "$(RED)>>> WARNING: This will delete ALL Docker images, cache and volumes system-wide.$(RESET)\n"
	@printf "$(YELLOW)>>> Press CTRL+C to abort, ENTER to continue...$(RESET)\n"
	@read _
	@printf "$(RED)>>> [1/5] Stopping project containers and volumes...$(RESET)\n"
	@$(COMPOSE) down -v --rmi all --remove-orphans
	@printf "$(RED)>>> [2/5] Pruning stopped containers...$(RESET)\n"
	@docker container prune -f
	@printf "$(RED)>>> [3/5] Pruning all images...$(RESET)\n"
	@docker image prune -af
	@printf "$(RED)>>> [4/5] Pruning volumes and networks...$(RESET)\n"
	@docker volume prune -f
	@docker network prune -f
	@printf "$(RED)>>> [5/5] Pruning build cache (this may take a while)...$(RESET)\n"
	@docker buildx prune -af
	@printf "$(GREEN)>>> Full Docker system pruned.$(RESET)\n"

# --- Observability -------------------------------------------

logs: ##@Status — Stream logs from all services
	@$(COMPOSE) logs -f

ps: ##@Status — Show container status
	@$(COMPOSE) ps

# --- Per-service logs ----------------------------------------

logs-auth: ##@Logs — Stream auth-service logs
	@$(COMPOSE) logs -f auth-service

logs-user: ##@Logs — Stream user-service logs
	@$(COMPOSE) logs -f user-service

logs-game: ##@Logs — Stream game-service logs
	@$(COMPOSE) logs -f game-service

logs-matchmaking: ##@Logs — Stream matchmaking-service logs
	@$(COMPOSE) logs -f matchmaking-service

logs-frontend: ##@Logs — Stream frontend logs
	@$(COMPOSE) logs -f frontend

logs-postgres: ##@Logs — Stream postgres logs
	@$(COMPOSE) logs -f postgres

logs-migration: ##@Logs — Stream db-migration logs
	@$(COMPOSE) logs -f db-migration

logs-gateway: ##@Logs — Stream gateway (nginx) logs
	@$(COMPOSE) logs -f gateway

logs-ngrok: ##@Logs — Stream ngrok tunnel logs
	@$(COMPOSE) logs -f ngrok

logs-redis: ##@Logs — Stream redis logs
	@$(COMPOSE) logs -f redis

# --- Shell access --------------------------------------------

shell-auth: ##@Shells — Open shell in auth-service
	@$(COMPOSE) exec auth-service sh

shell-user: ##@Shells — Open shell in user-service
	@$(COMPOSE) exec user-service sh

shell-game: ##@Shells — Open shell in game-service
	@$(COMPOSE) exec game-service sh

shell-matchmaking: ##@Shells — Open shell in matchmaking-service
	@$(COMPOSE) exec matchmaking-service sh

shell-postgres: ##@Shells — Open psql shell in postgres
	@$(COMPOSE) exec postgres sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

shell-frontend: ##@Shells — Open shell in frontend container
	@$(COMPOSE) exec frontend sh

shell-gateway: ##@Shells — Open shell in gateway (nginx) container
	@$(COMPOSE) exec gateway sh

shell-redis: ##@Shells — Open redis-cli in redis container
	@$(COMPOSE) exec redis redis-cli

# --- Help ----------------------------------------------------

help: ##@ Other — Show this help
	@printf "\n$(BOLD)Usage:$(RESET) make $(CYAN)[target]$(RESET)\n\n"
	@awk -F '##@?' \
		'BEGIN { section="" } \
		 /^[a-zA-Z_-]+:.*##@/ { \
		     split($$2, a, " — "); \
		     split($$1, b, ":"); \
		     if (a[1] != section) { printf "\n  $(BOLD)%s$(RESET)\n", a[1]; section=a[1] } \
		     printf "    $(CYAN)%-20s$(RESET) %s\n", b[1], a[2] \
		 } \
		 /^[a-zA-Z_-]+:.*##[^@]/ { \
		     if (section != "") printf "    $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 \
		 }' \
		$(MAKEFILE_LIST)
	@printf "\n"