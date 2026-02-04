# Repository Guidelines

## Project Structure & Module Organization
- `trading-platform/` is the Next.js 16 + React 19 frontend. Key areas: `app/` (routes/features), `app/components/`, `app/store/`, `app/types/`, `app/api/`.
- `backend/` hosts Python 3.10 analytics modules in `backend/src/` with tests in `backend/tests/`.
- `db/` contains Prisma schema and SQL migrations (`db/schema.prisma`, `db/migrations/`, `db/seeds/`).
- `scripts/` provides repo automation (quality gates, DB migration, websocket server).
- `docs/`, `archived-reports/`, and `worktrees/` are documentation/archives and not part of the runtime.

## Build, Test, and Development Commands
Frontend (run from `trading-platform/`):
- `npm run dev` - start the local Next.js dev server.
- `npm run build` / `npm run start` - production build and serve.
- `npm run lint` / `npx tsc --noEmit` - lint and typecheck.
- `npm test` / `npm run test:coverage` - Jest unit tests + coverage.
- `npm run test:e2e` - Playwright end-to-end tests.
- `npm run ws:server` - local websocket server for realtime features.
- `npm run db:migrate:status|create|validate` - database migration helpers.
Repo-wide:
- `./scripts/quality-gates-check.sh` - run CI quality gates locally.

Backend (run from `backend/`):
- `pytest` - Python unit tests.

## Coding Style & Naming Conventions
- TypeScript runs in `strict` mode; prefer `unknown` over `any`.
- Follow existing formatting: TS/TSX uses 2-space indentation; Python uses 4.
- Components/types use PascalCase (`UserProfile.tsx`), functions camelCase, constants UPPER_SNAKE_CASE.
- Linting uses ESLint (Next.js config). Pre-commit runs `npm audit --audit-level=high` and `lint-staged`.

## Testing Guidelines
- Frontend: Jest + Testing Library (`**/*.test.ts(x)`), E2E: Playwright (`e2e/`).
- Backend: pytest (`backend/tests/test_*.py`).
- Quality gates target ~80% overall coverage; see `CONTRIBUTING.md` for tiered targets.

## Commit & Pull Request Guidelines
- Commit style follows Conventional Commits: `feat|fix|docs|refactor|test|chore|perf` with optional scope (`fix(types): ...`).
- Branch naming: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`.
- PRs should be small and focused, include a clear description, link issues, update docs/tests as needed, and pass all CI checks. The PR template is required; fill all fields.

## Security & Configuration Tips
- Frontend config lives in `trading-platform/.env.local` (copy from `.env.example`).
- Follow `SECURITY.md` for vulnerability reporting.
