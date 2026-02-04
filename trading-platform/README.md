# ULT Trading Platform (Frontend)

This package contains the Next.js 16 + React 19 frontend for ULT, including UI, API routes, WebSocket clients, and docs endpoints.

## Stack
- Next.js 16 (App Router)
- React 19
- TypeScript 5 (strict mode)
- Tailwind CSS
- Jest + Testing Library, Playwright

## Structure
- `app/` application routes and feature areas
- `app/components/` shared UI components
- `app/api/` API routes (includes `/api/openapi.json`)
- `app/store/` Zustand state
- `app/types/` shared TypeScript types
- `public/` static assets

## Setup
Node.js 20+ recommended (see `CONTRIBUTING.md`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` after the dev server starts.

## WebSocket Server (Optional)
Run the local WS server in a separate terminal:
```bash
npm run ws:server
```
Default URL: `ws://localhost:3001` (configured by `NEXT_PUBLIC_WS_URL`).

## Common Commands
- `npm run dev` start the Next.js dev server
- `npm run build` / `npm run start` build and serve production
- `npm run lint` / `npx tsc --noEmit` lint and typecheck
- `npm test` / `npm run test:coverage` run unit tests
- `npm run test:e2e` run Playwright E2E tests
- `npm run db:migrate:status|create|validate` run DB migration helpers

## Docs
- OpenAPI spec is served at `/api/openapi.json` when the app is running.
- `npm run docs:generate` outputs a note pointing to the endpoint.

## Environment
Copy `.env.example` to `.env.local` and fill required values (JWT, database, WS, data providers). Never commit `.env.local`.

## Related Docs
- `../AGENTS.md` contributor guidelines
- `../CONTRIBUTING.md` workflow and commit conventions
