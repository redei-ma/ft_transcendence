# ============================================================
#  ft_transcendence — Makefile
# ============================================================

# --- Variables -----------------------------------------------

COMPOSE      := docker compose
COMPOSE_FILE := docker-compose.yml

CERTS_DIR    := ./certs
TYPES_DIR    := ./shared/types

# --- Phony targets -------------------------------------------

.PHONY: all generate migrate certs up down restart clean fclean re rebuild prune logs ps help 

# --- Default target ------------------------------------------

all: up

# --- Types generation ----------------------------------------

generate: ## Generate enums from schema.prisma and build @transcendence/types
	cd $(TYPES_DIR) && npm install && npm run build

# --- Migrations ----------------------------------------------

migrate: ## Create a migration from schema changes. Usage: make migrate name=<migration_name>
		@if [ -z "$(name)" ]; then \
				echo "  Error: migration name required."; \
				echo "  Usage: make migrate name=<migration_name>"; \
				exit 1; \
		fi
		@echo "Starting postgres (no-op if already running)..."
		$(COMPOSE) -f $(COMPOSE_FILE) up -d --wait postgres
		@echo "Creating migration '$(name)'..."
		$(COMPOSE) -f $(COMPOSE_FILE) run --rm \
				--no-deps \
				--entrypoint "" \
				--volume "$(CURDIR)/shared/prisma:/app/db-migration/prisma:rw" \
				db-migration \
				sh -c "npx prisma migrate dev --name $(name)"
		@$(MAKE) --no-print-directory generate
		@echo ""
		@echo "  Migration '$(name)' created and applied to postgres."
		@echo "  Shared types rebuilt."
		@echo "  Apply to running services: make restart"

# --- Certificates generation --------------------------------

certs: ## Generate self-signed TLS certificates if not already present
		@mkdir -p $(CERTS_DIR)
		@if [ ! -f $(CERTS_DIR)/cert.key ]; then \
				echo "Generating self-signed certificates..."; \
				openssl req -x509 -newkey rsa:4096 -nodes \
						-keyout $(CERTS_DIR)/cert.key \
						-out $(CERTS_DIR)/cert.crt \
						-days 365 \
						-subj "/CN=localhost" 2>/dev/null; \
				echo "Done: $(CERTS_DIR)/cert.crt and $(CERTS_DIR)/cert.key"; \
		else \
				echo "Certificates already present, skipping."; \
		fi
	
# --- Lifecycle -----------------------------------------------

up: certs generate ## Create required dirs, build images and start all services
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build

down: ## Stop and remove containers and networks (volumes and images are preserved)
	$(COMPOSE) -f $(COMPOSE_FILE) down

restart: down up ## Full stop followed by a full start

# --- Cleanup -------------------------------------------------

clean: down ## Stop services and remove stopped containers
	$(COMPOSE) -f $(COMPOSE_FILE) rm -f

fclean: down ## clean + remove named volumes and locally built images
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi local

re: fclean up ## Full wipe followed by a fresh build and start

rebuild: ## Force a full image rebuild without cache, then start services
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

prune: fclean ## fclean + wipe entire Docker build cache (WARNING: host-wide)
	docker system prune -af --volumes

# --- Observability -------------------------------------------

logs: ## Stream logs from all running services
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

ps: ## Show current status of all containers
	$(COMPOSE) -f $(COMPOSE_FILE) ps

# --- Help ----------------------------------------------------

help: ## List all available targets with their descriptions
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@awk -F ':.*##' \
		'/^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@echo ""