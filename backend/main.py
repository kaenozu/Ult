#!/usr/bin/env python3
"""
AGStock API Server

Usage:
    python run_api.py
    
Options:
    --host: ホスト（デフォルト: 0.0.0.0）
    --port: ポート（デフォルト: 8000）
    --reload: 自動リロード有効化
"""

import argparse
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="AGStock API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args()
    
    print(f"Starting AGStock API Server on {args.host}:{args.port}")
    print(f"API Documentation: http://{args.host}:{args.port}/docs")
    
    uvicorn.run(
        "src.api.server:create_app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        factory=True,
    )


if __name__ == "__main__":
    main()
