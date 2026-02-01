#
# WebSocket Server Startup Script for Trader Pro (Windows)
#
# This script starts the WebSocket server with proper configuration
# and error handling.
#
# Usage:
#   .\scripts\start-websocket-server.ps1 [port]
#
# Examples:
#   .\scripts\start-websocket-server.ps1           # Start on default port (3001)
#   .\scripts\start-websocket-server.ps1 8080      # Start on custom port (8080)
#

param(
    [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

# Configuration
$Host_Addr = if ($env:WS_HOST) { $env:WS_HOST } else { "0.0.0.0" }
$AllowedOrigins = if ($env:ALLOWED_ORIGINS) { $env:ALLOWED_ORIGINS } else { "http://localhost:3000,http://127.0.0.1:3000" }

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "==========================================="
Write-Host "  Trader Pro WebSocket Server Launcher    "
Write-Host "==========================================="
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion"
} catch {
    Write-Host "Error: Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    exit 1
}

# Check if server script exists
$ServerScript = Join-Path $ScriptDir "websocket-server.js"
if (-not (Test-Path $ServerScript)) {
    Write-Host "Error: Server script not found at $ServerScript" -ForegroundColor Red
    exit 1
}

# Check if port is already in use
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Warning: Port $Port is already in use" -ForegroundColor Yellow
    Write-Host "Please stop the existing process or choose a different port"
    exit 1
}

# Display configuration
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Host: $Host_Addr"
Write-Host "  Port: $Port"
Write-Host "  Allowed Origins: $AllowedOrigins"
Write-Host "  Server Script: $ServerScript"
Write-Host ""

# Start the server
Write-Host "Starting WebSocket server..." -ForegroundColor Green
Write-Host ""

$env:WS_PORT = $Port
$env:WS_HOST = $Host_Addr
$env:ALLOWED_ORIGINS = $AllowedOrigins

# Run the server
node $ServerScript
