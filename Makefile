# ============================================================
#  ft_transcendence — Makefile
# ============================================================

# --- Variables -----------------------------------------------

COMPOSE      := docker compose
COMPOSE_FILE := docker-compose.yml

CERTS_DIR    := ./certs
UPLOADS_DIR  := ./user-service/uploads

# --- Phony targets -------------------------------------------

.PHONY: all up down restart clean fclean re rebuild prune logs ps help

# --- Default target ------------------------------------------

all: up

# --- Lifecycle -----------------------------------------------

up: $(CERTS_DIR) $(UPLOADS_DIR) ## Create required dirs, build images and start all services
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build

down: ## Stop and remove containers and networks (volumes and images are preserved)
	$(COMPOSE) -f $(COMPOSE_FILE) down

restart: down up ## Full stop followed by a full start

# --- Directory setup -----------------------------------------

$(CERTS_DIR):
	mkdir -p $(CERTS_DIR)

$(UPLOADS_DIR):
	mkdir -p $(UPLOADS_DIR)

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