# AGENTS.md - ULT Trading Platform Agent Guide

## Project Overview
**ULT (Ultimate Trading Platform)** - AI-powered stock trading support platform combining technical analysis with ML predictions.

**Stack**: Next.js 16 + React 19 + TypeScript 5.9 + Zustand + Chart.js + TensorFlow.js

---

## Essential Commands

### Development
```bash
cd trading-platform
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Production build
npm start                      # Production server
```

### Testing
```bash
npm test                       # Run all unit tests (Jest)
npm test -- MarketDataService.test.ts    # Single test file
npm test -- -t "test pattern"            # Filter by test name
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage report
npm run test:e2e               # Playwright E2E tests
npm run test:e2e:ui            # E2E with UI
```

### Code Quality
```bash
npx tsc --noEmit               # TypeScript type check
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix ESLint issues
npm audit                      # Security audit
./scripts/quality-gates-check.sh  # Pre-PR quality check
```

---

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** - `strict: true` in tsconfig.json
- **Never use `any`** - Use `unknown` or specific types
- **Path aliases**: Use `@/*` for root, `@/domains/*`, `@/infrastructure/*`, `@/ui/*`, `@/shared/*`

### Imports
- Group imports: React/Next → External libs → Internal aliases → Relative
- Use `import type` for type-only imports
- Prefer named exports over default exports

### Naming Conventions
- **Components**: PascalCase (`StockChart.tsx`)
- **Functions**: camelCase (`useChartData()`)
- **Constants**: UPPER_SNAKE_CASE (`CHART_CONFIG`)
- **Types/Interfaces**: PascalCase with descriptive names
- **Services**: Singleton pattern with `getInstance()`

### React Patterns
- Use functional components with hooks
- **Client components**: Add `'use client'` directive at top
- Memoize expensive calculations with `useMemo`
- Use `memo()` for pure components receiving complex props
- Keep components small and focused

### Error Handling
- Always wrap async operations in try-catch
- Use type-safe error handling (avoid `any` in catch)
- Log errors appropriately, never silently fail
- Use React Error Boundaries for component-level errors

### State Management
- **Zustand** for global state
- Keep stores small and domain-specific
- Use selectors to subscribe to minimal state

---

## Architecture

### Directory Structure
```
trading-platform/
├── app/
│   ├── components/          # React UI components
│   ├── lib/                 # Business logic & services
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript definitions
│   └── api/                 # Next.js API routes
├── e2e/                     # Playwright tests
└── scripts/                 # Build utilities
```

### Service Layer Pattern
Services in `app/lib/` follow singleton pattern:
- `MarketDataService` - Data fetching & caching
- `TechnicalIndicatorService` - RSI, SMA, MACD calculations
- `ConsensusSignalService` - BUY/SELL/HOLD signal generation
- `BacktestService` - Strategy backtesting

### Quality Gates (MUST PASS)
- Test coverage ≥ 80%
- TypeScript: 0 errors
- ESLint: 0 errors
- No high/critical security vulnerabilities
- Build succeeds

---

## Key Dependencies
- **Framework**: Next.js 16.1.6, React 19.2.3
- **State**: Zustand 5.0.10
- **Charts**: Chart.js 4.5.1 + react-chartjs-2
- **ML**: TensorFlow.js 4.22.0
- **Testing**: Jest 29.7 + Playwright 1.48
- **Styling**: Tailwind CSS 4.1.18

## Conventional Commits
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting (no logic change)
- `refactor:` - Code restructuring
- `test:` - Tests
- `chore:` - Build/tooling changes
