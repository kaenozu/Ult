#!/usr/bin/env python3
"""
AGStock API Server - Unified Entry Point

Usage:
    python main.py [--host 0.0.0.0] [--port 8000] [--reload]

Options:
    --host: ホスト（デフォルト: 0.0.0.0）
    --port: ポート（デフォルト: 8000）
    --reload: 自動リロード有効化（開発用）
"""

import sys
from pathlib import Path

# Add backend root to sys.path
backend_root = Path(__file__).parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import argparse
import uvicorn
from src.core.config import settings


def main():
    parser = argparse.ArgumentParser(description="AGStock Trading System")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind")
    parser.add_argument(
        "--reload", action="store_true", help="Enable auto-reload for development"
    )
    args = parser.parse_args()

    # Override settings with command line args
    host = args.host or settings.get("api.host", "0.0.0.0")
    port = args.port or settings.get("api.port", 8000)

    print(f"Starting AGStock Trading System on {host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Environment: {'Development' if args.reload else 'Production'}")

    uvicorn.run(
        "src.api.server:create_app",
        host=host,
        port=port,
        reload=args.reload,
        factory=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
