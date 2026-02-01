# GitHub Copilot Instructions for ULT Trading Platform

## Project Overview

**ULT (Ultimate Trading Platform)** is a Next.js-based AI-powered trading analysis platform with Python backend services. The platform supports Japanese (Nikkei 225) and US markets (S&P 500, NASDAQ) with machine learning price predictions, technical analysis, and risk management.

### Tech Stack

#### Frontend
- **Next.js 16+** with App Router
- **React 19+** with TypeScript 5.0+
- **Zustand 5.x** for state management
- **Chart.js 4.x** for data visualization
- **Tailwind CSS 4.x** for styling
- **WebSocket (ws)** for real-time data

#### Backend
- **Python 3.10+** for analysis services
- **Next.js API Routes** for API endpoints
- **Alpha Vantage API** for market data
- **Yahoo Finance API** for additional data

#### Testing
- **Jest 30.x** for unit tests
- **Playwright 1.48.x** for E2E tests
- **React Testing Library** for component tests

## Repository Structure

```
Ult/
├── .github/
│   ├── copilot-instructions.md    # This file
│   ├── skills/                    # Agent skill documentation
│   └── workflows/                 # CI/CD workflows
├── trading-platform/              # Frontend Next.js app
│   ├── app/
│   │   ├── api/                  # Next.js API routes
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Business logic & services
│   │   ├── store/                # Zustand stores
│   │   ├── types/                # TypeScript type definitions
│   │   └── workers/              # Web Workers
│   ├── e2e/                      # Playwright E2E tests
│   ├── __tests__/                # Jest unit tests
│   └── package.json
├── backend/                       # Python backend (in development)
│   ├── src/
│   │   ├── market_correlation/
│   │   ├── supply_demand/
│   │   ├── trade_journal_analyzer/
│   │   ├── ult_universe/
│   │   └── cache/
│   └── tests/
├── scripts/                       # Utility scripts
└── docs/                          # Project documentation
```

## Development Workflow

### Setup Commands

```bash
# Frontend setup
cd trading-platform
npm install
cp .env.example .env.local
# Edit .env.local and add ALPHA_VANTAGE_API_KEY

# Start development server
npm run dev  # Runs on http://localhost:3000
```

### Essential Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix linting issues
npx tsc --noEmit        # TypeScript type check

# Testing
npm test                # Run Jest unit tests
npm run test:coverage   # Run tests with coverage
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:ui     # Run E2E tests in UI mode
```

## Code Quality Standards

### TypeScript Requirements
- **Strict mode enabled**: Always use proper TypeScript types
- **No `any` type**: Use `unknown` or specific types instead
- **Type safety**: All functions must have explicit return types
- **Null safety**: Use optional chaining (`?.`) and nullish coalescing (`??`)

### Code Style
- **Consistent formatting**: ESLint rules are enforced
- **Meaningful names**: Use descriptive variable and function names
- **Comments**: Add JSDoc comments for complex functions
- **Error handling**: Always handle errors properly with try-catch
- **No console.log**: Use proper logging (remove before commit)

### React Best Practices
- **Hooks**: Follow React Hooks rules
- **State management**: Use Zustand for global state
- **Performance**: Memoize expensive computations with `useMemo`
- **Components**: Keep components small and focused
- **Testing**: Write tests for all new components

## Testing Requirements

### Unit Tests (Jest)
- Test all business logic in `app/lib/`
- Test custom hooks in `app/hooks/`
- Test utility functions
- Maintain >80% code coverage
- Mock external API calls

### E2E Tests (Playwright)
- Test critical user flows
- Test on multiple browsers (Chromium, Firefox, WebKit)
- Use proper selectors (data-testid)
- Handle async operations properly

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- E2E tests: Place in `e2e/` directory

## CI/CD Workflows

The project uses comprehensive GitHub Actions workflows:

| Workflow | Purpose | When |
|----------|---------|------|
| **CI** | Overall integration | Push, PR |
| **Lint** | ESLint + TypeScript | Push, PR |
| **Test** | Jest unit tests | Push, PR |
| **E2E** | Playwright tests | Push, PR |
| **Build** | Next.js build | Push, PR |
| **Security** | Dependency scan | Push, PR, Weekly |
| **Backend** | Python tests | Push (backend/*), PR |

All PRs must pass these checks before merging.

## Important Patterns

### State Management (Zustand)
```typescript
// app/store/tradingStore.ts
import { create } from 'zustand';

interface TradingStore {
  symbol: string;
  setSymbol: (symbol: string) => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  symbol: '^N225',
  setSymbol: (symbol) => set({ symbol }),
}));
```

### API Routes
```typescript
// app/api/*/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### Services Pattern
```typescript
// app/lib/SomeService.ts
export class SomeService {
  private cache: Map<string, any> = new Map();
  
  async fetchData(symbol: string): Promise<Data> {
    // Check cache
    if (this.cache.has(symbol)) {
      return this.cache.get(symbol);
    }
    
    // Fetch and cache
    const data = await fetch(/* ... */);
    this.cache.set(symbol, data);
    return data;
  }
}

export const someService = new SomeService();
```

## Security Guidelines

### Environment Variables
- **Never commit secrets**: Use `.env.local` for sensitive data
- **API Keys**: Store in environment variables, not in code
- **Validate input**: Always validate and sanitize user input
- **Rate limiting**: Implement for API routes

### Security Checklist
- ✅ No hardcoded API keys or credentials
- ✅ Input validation on all user inputs
- ✅ Proper error messages (don't leak sensitive info)
- ✅ HTTPS in production
- ✅ Regular dependency updates via `npm audit`

## Agent Skills

The repository includes specialized agent skills in `.github/skills/`:

1. **trading-platform-dev.md** - Project-specific development patterns
2. **code-review.md** - Code review automation
3. **debugging.md** - Debugging workflows
4. **pr-management.md** - PR handling strategies
5. **testing-automation.md** - Test execution patterns
6. **security-hardening.md** - Security best practices
7. **performance-monitoring.md** - Performance optimization
8. **documentation.md** - Documentation standards
9. **refactoring-strategy.md** - Refactoring approaches
10. **dependency-management.md** - Dependency update strategies
11. **github-management.md** - GitHub operations

Refer to these skills for detailed guidance on specific tasks.

## Common Issues and Solutions

### Issue: Build Fails
```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Issue: Tests Failing
```bash
# Update snapshots
npm test -- -u

# Run specific test
npm test -- <test-file-name>
```

### Issue: Type Errors
```bash
# Run type check to see all errors
npx tsc --noEmit

# Check specific file
npx tsc --noEmit <file-path>
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation update
style: formatting (no code change)
refactor: code refactoring
test: add/update tests
chore: build/tools configuration
```

## When Making Changes

1. **Understand first**: Review existing code patterns
2. **Minimal changes**: Make the smallest change that works
3. **Test locally**: Run tests before committing
4. **Type safety**: Ensure TypeScript compilation passes
5. **Lint**: Fix all linting errors
6. **Document**: Update documentation if needed
7. **Review**: Self-review changes before pushing

## Key Files to Know

### Core Services
- `app/lib/MarketDataService.ts` - Market data fetching
- `app/lib/TechnicalIndicatorService.ts` - Technical indicators
- `app/lib/ConsensusSignalService.ts` - Signal generation
- `app/lib/AnalysisService.ts` - Core analysis logic
- `app/lib/websocket.ts` - WebSocket implementation

### State Management
- `app/store/tradingStore.ts` - Trading state
- `app/hooks/useWebSocket.ts` - WebSocket hook
- `app/hooks/useMarketData.ts` - Market data hook

### Configuration
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `jest.config.js` - Jest configuration
- `playwright.config.ts` - Playwright configuration

## Additional Resources

- **Main README**: `/README.md` - Project overview and setup
- **Frontend README**: `/trading-platform/README.md` - Detailed frontend docs
- **Tech Debt**: `/REMAINING_TECH_DEBT_ROADMAP.md` - Known issues
- **Skills Index**: `/.github/skills/README.md` - Agent skills catalog
- **CLAUDE.md**: `/CLAUDE.md` - Claude Code specific settings

## Notes for AI Assistants

- Always check existing patterns before suggesting new approaches
- Prefer incremental changes over large refactors
- Run tests after making changes
- Follow the project's established conventions
- Reference the skills documentation for complex tasks
- Maintain backward compatibility unless explicitly requested
- Keep security and performance in mind for all changes
