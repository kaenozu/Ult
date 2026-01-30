# Multi-stage build for Playwright Web Scraper

# Stage 1: Base image with dependencies
FROM python:3.12-slim as base

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Stage 2: Development image
FROM base as development

# Install development dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]"

# Install Playwright browsers
RUN playwright install chromium

# Copy source code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Default command
CMD ["python", "-m", "pytest", "tests/", "-v"]

# Stage 3: Production image
FROM base as production

# Copy requirements first for better caching
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e "."

# Install Playwright browsers (chromium only for smaller size)
RUN playwright install chromium

# Copy source code
COPY playwright_scraper/ ./playwright_scraper/

# Create directories for output and logs
RUN mkdir -p /app/output /app/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV SCRAPER_HEADLESS=true
ENV SCRAPER_OUTPUT_DIR=/app/output
ENV SCRAPER_LOG_DIR=/app/logs

# Create non-root user for security
RUN useradd -m -u 1000 scraper && \
    chown -R scraper:scraper /app
USER scraper

# Default command
ENTRYPOINT ["python", "-m", "playwright_scraper.scraper"]
CMD ["--help"]
