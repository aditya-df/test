.PHONY: build-development
build-development: ## Build the development docker image.
	docker buildx prune --force
	docker compose -f docker/development/docker-compose.yml build

.PHONY: start-development
start-development: ## Start the development docker container.
	docker compose -f docker/development/docker-compose.yml up -d

.PHONY: stop-development
stop-development: ## Stop the development docker container.
	docker compose -f docker/development/docker-compose.yml down

.PHONY: build-trial
build-trial: ## Build the trial docker image.
	docker buildx prune --force
	docker compose -f docker/trial/docker-compose.yml build

.PHONY: start-trial
start-trial: ## Start the trial docker container.
	docker compose -f docker/trial/docker-compose.yml up -d

.PHONY: stop-trial
stop-trial: ## Stop the trial docker container.
	docker compose -f docker/trial/docker-compose.yml down

.PHONY: build-trialam
build-trialam: ## Build the trialam docker image.
	docker buildx prune --force
	docker compose -f docker/trialam/docker-compose.yml build --no-cache --pull

.PHONY: start-trialam
start-trialam: ## Start the trialam docker container.
	docker compose -f docker/trialam/docker-compose.yml up -d

.PHONY: stop-trialam
stop-trialam: ## Stop the trialam docker container.
	docker compose -f docker/trialam/docker-compose.yml down

.PHONY: build-event
build-event: ## Build the event docker image.
	docker buildx prune --force
	docker compose -f docker/event/docker-compose.yml build

.PHONY: start-event
start-event: ## Start the event docker container.
	docker compose -f docker/event/docker-compose.yml up -d

.PHONY: stop-event
stop-event: ## Stop the event docker container.
	docker compose -f docker/event/docker-compose.yml down


.PHONY: build-staging
build-staging: ## Build the staging docker image.
	docker buildx prune --force
	docker compose -f docker/staging/docker-compose.yml build

.PHONY: start-staging
start-staging: ## Start the staging docker container.
	docker compose -f docker/staging/docker-compose.yml up -d

.PHONY: stop-staging
stop-staging: ## Stop the staging docker container.
	docker compose -f docker/staging/docker-compose.yml down
  
.PHONY: build-production
build-production: ## Build the production docker image.
	docker buildx prune --force
	docker compose -f docker/production/docker-compose.yml build

.PHONY: start-production
start-production: ## Start the production docker container.
	docker compose -f docker/production/docker-compose.yml up -d

.PHONY: stop-production
stop-production: ## Stop the production docker container.
	docker compose -f docker/production/docker-compose.yml down
