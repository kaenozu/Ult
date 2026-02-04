# ULT - Ultimate Trading Platform

[![CI](https://github.com/kaenozu/Ult/actions/workflows/ci.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/ci.yml)
[![Quality Gates](https://github.com/kaenozu/Ult/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/quality-gates.yml)
[![Lint](https://github.com/kaenozu/Ult/actions/workflows/lint.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/lint.yml)
[![Tests](https://github.com/kaenozu/Ult/actions/workflows/test.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/test.yml)
[![E2E](https://github.com/kaenozu/Ult/actions/workflows/e2e.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/e2e.yml)
[![Security](https://github.com/kaenozu/Ult/actions/workflows/security.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/security.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-green.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ULT is a trading platform that combines a Next.js frontend with Python analytics modules, a WebSocket layer for real-time updates, and a database schema managed via Prisma migrations.

## Tech Stack
- Frontend: Next.js 16, React 19, TypeScript 5, Tailwind CSS
- Backend: Python 3.10 analytics modules
- Tests: Jest, Playwright, pytest
- Data layer: Prisma schema + SQL migrations in `db/`

## Repository Layout
- `trading-platform/` Next.js app (routes, UI, API handlers, store, types)
- `backend/` Python analytics modules in `backend/src/` with tests in `backend/tests/`
- `db/` Prisma schema, migrations, and seeds
- `scripts/` quality gates, DB migration helpers, and utilities
- `docs/` additional technical documentation

## Quick Start
Frontend:
```bash
cd trading-platform
npm install
cp .env.example .env.local
npm run dev
```

WebSocket server (optional, separate process):
```bash
cd trading-platform
npm run ws:server
```

Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
pytest
```

OpenAPI spec is served from the app at `/api/openapi.json` when running the frontend.

## Common Commands
Run from `trading-platform/` unless noted:
- `npm run dev` start the dev server
- `npm run build` / `npm run start` build and serve production
- `npm run lint` / `npx tsc --noEmit` lint and typecheck
- `npm test` / `npm run test:coverage` run unit tests
- `npm run test:e2e` run Playwright E2E tests
- `npm run db:migrate:status|create|validate` DB migration helpers

Repo-wide:
- `./scripts/quality-gates-check.sh` run CI quality gates locally

## Configuration
Copy `trading-platform/.env.example` to `.env.local` and fill required values. The WebSocket server and external market data providers can be enabled via env vars. Keep secrets out of git.

## Contributing
See `AGENTS.md` for contributor guidelines and `CONTRIBUTING.md` for workflow details, branch naming, and Conventional Commits.

## Security
Please follow `SECURITY.md` for vulnerability reporting and security checks.

## License
MIT. See `LICENSE`.
