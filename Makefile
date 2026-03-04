# ============================================================
#  ft_transcendence — Makefile
# ============================================================

# --- Variables -----------------------------------------------

COMPOSE      := docker compose
COMPOSE_FILE := docker-compose.yml

CERTS_DIR    := ./certs
TYPES_DIR    := ./shared/types
AUTH_DIR     := ./shared/auth

# Colors
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
CYAN   := \033[36m
RESET  := \033[0m
BOLD   := \033[1m

# --- Phony targets -------------------------------------------

.PHONY: all generate certs up down restart clean fclean re rebuild \
        prune logs ps status help \
        logs-auth logs-user logs-game logs-db \
        shell-auth shell-user shell-game shell-db

# --- Default target ------------------------------------------

all: up

# --- Shared packages build -----------------------------------

generate: ## Build shared packages (@transcendence/auth + @transcendence/types)
	@printf "$(CYAN)>>> Building @transcendence/auth...$(RESET)\n"
	@cd $(AUTH_DIR) && npm install --silent && npm run build || \
		(printf "$(RED)>>> FAILED: @transcendence/auth build$(RESET)\n" && exit 1)
	@printf "$(CYAN)>>> Building @transcendence/types...$(RESET)\n"
	@cd $(TYPES_DIR) && npm install --silent && npm run build || \
		(printf "$(RED)>>> FAILED: @transcendence/types build$(RESET)\n" && exit 1)
	@printf "$(GREEN)>>> Shared packages built successfully.$(RESET)\n"

# --- Certificates generation ---------------------------------

certs: ## Generate self-signed TLS certificates if missing
	@mkdir -p $(CERTS_DIR)
	@if [ ! -f $(CERTS_DIR)/cert.key ]; then \
		printf "$(CYAN)>>> Generating self-signed certificates...$(RESET)\n"; \
		openssl req -x509 -newkey rsa:4096 -nodes \
			-keyout $(CERTS_DIR)/cert.key \
			-out $(CERTS_DIR)/cert.crt \
			-days 365 \
			-subj "/CN=localhost" 2>/dev/null; \
		printf "$(GREEN)>>> Certificates created.$(RESET)\n"; \
	else \
		printf "$(YELLOW)>>> Certificates already present, skipping.$(RESET)\n"; \
	fi

# --- Lifecycle -----------------------------------------------

up: certs generate ## Build images and start all services
	@printf "$(CYAN)>>> Starting services...$(RESET)\n"
	@$(COMPOSE) -f $(COMPOSE_FILE) up -d --build
	@printf "$(GREEN)>>> All services started. Use 'make logs' to follow output.$(RESET)\n"

down: ## Stop and remove containers (volumes preserved)
	@printf "$(YELLOW)>>> Stopping services...$(RESET)\n"
	@$(COMPOSE) -f $(COMPOSE_FILE) down

restart: down up ## Full stop + start

rebuild: certs generate ## Force rebuild without cache (DB preserved), then start
	@printf "$(CYAN)>>> Rebuilding without cache...$(RESET)\n"
	@$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	@$(COMPOSE) -f $(COMPOSE_FILE) up -d
	@printf "$(GREEN)>>> Rebuild complete.$(RESET)\n"

re: fclean up ## Full wipe (DB included) + fresh build

# --- Cleanup -------------------------------------------------

clean: down ## Stop services and remove stopped containers
	@$(COMPOSE) -f $(COMPOSE_FILE) rm -f

fclean: ## Remove containers, volumes, and locally built images
	@printf "$(RED)>>> Full cleanup: containers, volumes, images...$(RESET)\n"
	@$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi local
	@printf "$(GREEN)>>> Cleanup complete.$(RESET)\n"

prune: ## Remove ALL project resources (containers, volumes, networks, images)
	@$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi all
	@docker image prune -f

# --- Observability -------------------------------------------

logs: ## Stream logs from all services
	@$(COMPOSE) -f $(COMPOSE_FILE) logs -f

ps: ## Show container status
	@$(COMPOSE) -f $(COMPOSE_FILE) ps

status: ps ## Alias for ps

# --- Per-service logs ----------------------------------------

logs-auth: ## Stream auth-service logs
	@$(COMPOSE) -f $(COMPOSE_FILE) logs -f auth-service

logs-user: ## Stream user-service logs
	@$(COMPOSE) -f $(COMPOSE_FILE) logs -f user-service

logs-game: ## Stream game-service logs
	@$(COMPOSE) -f $(COMPOSE_FILE) logs -f game-service

logs-db: ## Stream postgres + db-migration logs
	@$(COMPOSE) -f $(COMPOSE_FILE) logs -f postgres db-migration

# --- Shell access --------------------------------------------

shell-auth: ## Open shell in auth-service
	@$(COMPOSE) -f $(COMPOSE_FILE) exec auth-service sh

shell-user: ## Open shell in user-service
	@$(COMPOSE) -f $(COMPOSE_FILE) exec user-service sh

shell-game: ## Open shell in game-service
	@$(COMPOSE) -f $(COMPOSE_FILE) exec game-service sh

shell-db: ## Open psql shell in postgres
	@$(COMPOSE) -f $(COMPOSE_FILE) exec postgres sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

# --- Help ----------------------------------------------------

help: ## Show this help
	@printf "\n$(BOLD)Usage:$(RESET) make $(CYAN)[target]$(RESET)\n\n"
	@awk -F ':.*##' \
		'/^[a-zA-Z_-]+:.*##/ { printf "  $(CYAN)%-14s$(RESET) %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@printf "\n"
