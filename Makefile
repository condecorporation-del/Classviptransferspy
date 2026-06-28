.PHONY: help install dev test lint format check seed setup db clean

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependencias de producción
	cd backend && uv sync --no-dev

dev: ## Instalar dependencias de desarrollo
	cd backend && uv sync

test: ## Correr tests
	cd backend && python -m pytest app/tests/ -v

lint: ## Lint + formato
	cd backend && ruff check . && ruff format --check .

format: ## Auto-formatear código
	cd backend && ruff format . && ruff check --fix .

check: ## Validación completa (lint + security + tests)
	cd backend && ruff format . && ruff check . && bandit -r app -ll && pip-audit && python -m pytest app/tests/ -q

seed: ## Cargar datos semilla (hoteles, áreas, pricing)
	cd backend && python scripts/seed.py

setup: ## Setup inicial (crear DB + admin)
	cd backend && python scripts/setup_db.py

db: ## Iniciar PostgreSQL local con Docker
	docker run -d --name classvip-db -p 5432:5432 \
		-e POSTGRES_DB=classvip \
		-e POSTGRES_USER=classvip \
		-e POSTGRES_PASSWORD=classvip_dev \
		postgres:16-alpine

db-stop: ## Detener PostgreSQL local
	docker stop classvip-db && docker rm classvip-db

run: ## Iniciar servidor de desarrollo
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

clean: ## Limpiar archivos temporales
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.pyc' -delete
	rm -rf backend/.pytest_cache backend/.ruff_cache backend/htmlcov backend/.coverage
