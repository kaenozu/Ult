.PHONY: help install install-dev test test-cov lint format clean docker-build docker-run docs

PYTHON := python
PIP := pip
PYTEST := pytest
BLACK := black
ISORT := isort
FLAKE8 := flake8
MYPY := mypy

help:
	@echo "Available targets:"
	@echo "  install      - Install production dependencies"
	@echo "  install-dev  - Install development dependencies"
	@echo "  test         - Run tests"
	@echo "  test-cov     - Run tests with coverage"
	@echo "  lint         - Run all linters"
	@echo "  format       - Format code with black and isort"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  docs         - Generate documentation"

install:
	$(PIP) install -e .
	playwright install chromium

install-dev:
	$(PIP) install -e ".[dev]"
	playwright install chromium

test:
	$(PYTEST) tests/ -v

test-cov:
	$(PYTEST) tests/ -v --cov=playwright_scraper --cov-report=html --cov-report=term

lint:
	$(BLACK) --check .
	$(ISORT) --check-only .
	$(FLAKE8) .
	$(MYPY) playwright_scraper

format:
	$(BLACK) .
	$(ISORT) .

clean:
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf __pycache__/
	rm -rf htmlcov/
	rm -rf .coverage
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

docker-build:
	docker build --target production -t playwright-scraper:latest .

docker-run:
	docker run --rm -v $(PWD)/output:/app/output -v $(PWD)/logs:/app/logs playwright-scraper:latest $(ARGS)

docker-dev:
	docker-compose -f docker-compose.yml run --rm scraper-dev

docs:
	@echo "Documentation generation not yet implemented"
	@echo "Consider using Sphinx: pip install sphinx"
