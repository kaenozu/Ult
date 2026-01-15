---
name: Check System Health
description: Check the health status of the AGStock API server and its components.
---

# Check System Health

This skill allows you to verify if the AGStock backend API is running and healthy. It checks the `/health` endpoint and reports the status of core components (database, AI system, etc.).

## Usage

```bash
python -m src.cli.health
```

## Output Example
```
Status: healthy
Uptime: 123.45s
  - database: connected
  - ai_system: active
  - market_data: active
```

## Troubleshooting
- If the connection fails, ensure the backend API server is running (usually on port 8000).
