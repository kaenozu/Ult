# AGENTS.md - ULT Trading Platform Development Guide

**ULT (Ultimate Trading Platform)** - AI-powered stock trading platform combining technical analysis with ML predictions.

**Tech Stack**: Next.js 16 + React 19 + TypeScript 5.9 + Zustand + Chart.js + TensorFlow.js

---

## 🌏 Language Preferences

**優先言語**: 日本語を優先して使用してください
- エラーメッセージや説明は日本語で
- コードコメントは英語、説明は日本語のハイブリッド形式
- 変数名や関数名は英語（コーディング規約に準拠）

---

## 📋 Essential Commands

### Development (from `trading-platform/`)
```bash
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Production build
npm start                      # Production server
```

### Testing - Single Test Execution
```bash
# Run all unit tests
npm test

# Run single test file
npm test -- MarketDataService.test.ts

# Filter by test name pattern
npm test -- -t "should calculate RSI"
npm test -- --testNamePattern="RSI"

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e               # All tests
npm run test:e2e:ui            # UI mode
npm run test:e2e:headed        # Visible browser
```

### Code Quality
```bash
npx tsc --noEmit               # TypeScript type check
npx tsc --noEmit path/to/file.ts  # Specific file
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix issues
npm audit                      # Security audit
./scripts/quality-gates-check.sh  # Pre-PR check
```

---

## 🎯 Code Style Guidelines

### TypeScript
- **Strict mode**: `"strict": true` - all checks enabled
- **NO `any`**: Use `unknown` or specific types
- **Type safety**: Explicit return types for all functions
- **Null safety**: Use `?.` and `??`
- **Interfaces**: Prefer `interface` for objects, `type` for unions

### Imports (order matters)
1. React/Next.js (with `'use client'` first for client components)
2. Standard library (fs, path)
3. Third-party packages
4. Internal path aliases (`@/*`, `@/domains/*`, etc.)
5. Relative imports (`./`, `../`)
6. Type-only: `import type`

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `StockChart.tsx` |
| Functions | camelCase | `fetchMarketData()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `TradingPosition` |
| Services | Class + Singleton | `MarketDataService.getInstance()` |
| Files | kebab-case | `technical-indicator.ts` |
| Directories | kebab-case | `technical-analysis` |

### React Patterns
- Functional components only with hooks
- Client components: `'use client'` directive first line
- Memoize expensive calculations with `useMemo`
- Use `React.memo()` for pure components with complex props
- Keep components small and focused
- Never use array index as key

### Error Handling
- Always wrap async operations in try-catch
- Type-safe catch: `catch (error: unknown) { if (error instanceof Error) ... }`
- Never silently fail - always log errors
- Use Error Boundaries for component-level errors
- API routes: return structured errors with proper status codes

### State Management (Zustand)
- Global state with Zustand
- Keep stores small and domain-specific
- Subscribe to minimal state slices to prevent re-renders
- Always return new state objects (never mutate)
- Define async actions within store

### Service Layer Pattern
Services in `app/lib/` follow singleton pattern:
```typescript
export class MarketDataService {
  private static instance: MarketDataService;
  private cache = new Map<string, MarketData>();
  
  private constructor() {}
  
  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }
}
```

---

## 🏗️ Architecture

### Directory Structure
```
trading-platform/
├── app/
│   ├── api/          # Next.js API Routes
│   ├── components/   # React UI components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Business logic & services
│   ├── store/        # Zustand stores
│   ├── types/        # TypeScript definitions
│   └── workers/      # Web Workers
├── e2e/              # Playwright tests
├── __tests__/        # Jest unit tests
└── scripts/          # Build utilities
```

### Quality Gates (MUST PASS)
- ✅ Test coverage ≥ 80%
- ✅ TypeScript: 0 errors (`npx tsc --noEmit`)
- ✅ ESLint: 0 errors (`npm run lint`)
- ✅ Security: 0 high/critical vulnerabilities (`npm audit`)
- ✅ Build succeeds (`npm run build`)
- ✅ All tests pass (`npm test`)

---

## 🔐 Security Requirements

- **Never commit secrets**: Use `.env.local` for API keys
- **Server-only**: Only server code accesses `process.env.*`
- **Public vars**: Use `NEXT_PUBLIC_*` prefix for client exposure
- **Input validation**: Validate all API inputs with Zod or manual checks
- **XSS protection**: Use `dompurify` for HTML sanitization
- **No eval**: Never use `eval()` or `Function()` with user input

---

## 🧪 Testing Strategy

### Test Naming & Location
- Unit tests: `*.test.ts` or `*.test.tsx` (alongside source or in `__tests__/`)
- E2E tests: `e2e/*.spec.ts`
- Test utilities: `app/lib/__tests__/test-utils.ts`

### Coverage Requirements
- 80% global threshold (branches, functions, lines, statements)
- Enforced in `jest.config.js`

### Test Pattern
```typescript
import { renderWithProviders, screen } from '@/lib/__tests__/test-utils';

describe('MyService', () => {
  it('should work correctly', async () => {
    const result = await service.method();
    expect(result).toBeDefined();
  });
});
```

---

## 📦 Key Dependencies

### Core
- `next@^16.1.6` - React framework
- `react@19.2.3` - UI library
- `typescript@5.9.3` - TypeScript compiler
- `zustand@^5.0.10` - State management
- `chart.js@^4.5.1` - Charts
- `@tensorflow/tfjs@4.22.0` - ML inference

### Development
- `eslint@^9` + `eslint-config-next@16.1.4`
- `jest@^29.7.0` + `@testing-library/*`
- `@playwright/test@^1.48.0`
- `husky@^9.1.6` + `lint-staged@^15.2.10`

---

## 📝 Git & Agent Guidance

### Conventional Commits
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting only
- `refactor:` - Code restructuring
- `test:` - Add/update tests
- `chore:` - Build/tooling changes

### Agent Skills Available
Specialized skills in `.github/skills/`:
- `dev-master.md` - Proactive quality monitoring (auto-applied)
- `trading-platform-dev.md` - Project-specific patterns
- `code-review.md` - Review guidelines
- `debugging.md` - Debugging workflows
- `testing-automation.md` - Test execution
- `performance-optimization.md` - Performance tuning
- `security-hardening.md` - Security best practices

### Pre-commit Checklist
1. Understand existing patterns
2. Make minimal changes
3. Run affected tests locally
4. Type check: `npx tsc --noEmit`
5. Lint: `npm run lint:fix`
6. Quality gate: `./scripts/quality-gates-check.sh`
7. Self-review with `git diff`

---

## 🚨 Troubleshooting

### Port 3000 in use
```bash
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
# Or use different port
PORT=3001 npm run dev
```

### TypeScript errors
```bash
npx tsc --noEmit path/to/file.ts
npm run lint:fix
```

### WebSocket fails
```bash
# Start WebSocket server in separate terminal
npm run ws:server
# Verify ws://localhost:3001
```

### Build memory error
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### E2E timeout
```bash
npm run test:e2e:headed  # Watch execution
```

---

## 📚 Important References

- `.github/copilot-instructions.md` - Comprehensive development guide
- `.github/skills/README.md` - Agent skills catalog
- `CLAUDE.md` - Claude Code auto-skill configuration
- `DEPENDENCIES.md` - Dependency explanations
- `SECURITY.md` - Security policy
- `trading-platform/AGENTS.md` - Additional platform-specific details
