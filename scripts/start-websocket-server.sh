#!/bin/bash
#
# WebSocket Server Startup Script for Trader Pro
#
# This script starts the WebSocket server with proper configuration
# and error handling.
#
# Usage:
#   ./scripts/start-websocket-server.sh [port]
#
# Examples:
#   ./scripts/start-websocket-server.sh           # Start on default port (3001)
#   ./scripts/start-websocket-server.sh 8080      # Start on custom port (8080)
#

set -e

# Configuration
DEFAULT_PORT=3001
PORT=${1:-$DEFAULT_PORT}
HOST=${WS_HOST:-0.0.0.0}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-"http://localhost:3000,http://127.0.0.1:3000"}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Trader Pro WebSocket Server Launcher    ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if server script exists
SERVER_SCRIPT="$SCRIPT_DIR/websocket-server.js"
if [ ! -f "$SERVER_SCRIPT" ]; then
    echo -e "${RED}Error: Server script not found at $SERVER_SCRIPT${NC}"
    exit 1
fi

# Check if port is already in use
if command -v lsof &> /dev/null; then
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Port $PORT is already in use${NC}"
        echo "Please stop the existing process or choose a different port"
        exit 1
    fi
fi

# Display configuration
echo -e "${GREEN}Configuration:${NC}"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  Allowed Origins: $ALLOWED_ORIGINS"
echo "  Server Script: $SERVER_SCRIPT"
echo ""

# Start the server
echo -e "${GREEN}Starting WebSocket server...${NC}"
echo ""

export WS_PORT=$PORT
export WS_HOST=$HOST
export ALLOWED_ORIGINS=$ALLOWED_ORIGINS

# Run the server with proper signal handling
node "$SERVER_SCRIPT"
