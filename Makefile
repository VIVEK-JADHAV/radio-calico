.PHONY: help install test test-watch test-coverage test-backend test-frontend test-integration security audit audit-fix audit-production docker-build docker-up docker-down docker-restart docker-logs docker-ps docker-clean clean dev start

.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

start: ## Start the application
	npm start

dev: ## Start the application in development mode
	npm run dev

test: ## Run all tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage report
	npm run test:coverage

test-backend: ## Run backend tests only
	npm run test:backend

test-frontend: ## Run frontend tests only
	npm run test:frontend

test-integration: ## Run integration tests only
	npm run test:integration

security: ## Run security audit and tests
	@echo "=========================================="
	@echo "Running Security Checks"
	@echo "=========================================="
	@echo ""
	@echo "1. Checking for known vulnerabilities..."
	@npm audit --production || (echo "❌ Security vulnerabilities found" && exit 1)
	@echo ""
	@echo "2. Running test suite..."
	@npm test || (echo "❌ Tests failed" && exit 1)
	@echo ""
	@echo "=========================================="
	@echo "✓ All security checks passed"
	@echo "=========================================="

audit: ## Run npm audit for vulnerabilities
	npm audit

audit-fix: ## Attempt to fix npm audit issues
	npm audit fix

audit-production: ## Run npm audit for production dependencies only
	npm audit --production

docker-build: ## Build docker containers
	docker-compose build

docker-up: ## Start docker containers in background
	docker-compose up -d

docker-down: ## Stop docker containers
	docker-compose down

docker-restart: ## Restart docker containers
	docker-compose restart

docker-logs: ## View docker container logs (follow mode)
	docker-compose logs -f

docker-ps: ## Show running docker containers
	docker-compose ps

docker-clean: ## Stop containers and remove volumes (WARNING: destroys data)
	@echo "WARNING: This will remove all volumes and data"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "✓ Containers and volumes removed"; \
	else \
		echo "Cancelled"; \
	fi

clean: ## Clean generated files and caches
	rm -rf node_modules
	rm -rf coverage
	rm -rf .nyc_output
	rm -f database/*.db
	rm -f database/*.db-shm
	rm -f database/*.db-wal
	@echo "✓ Cleaned generated files"
