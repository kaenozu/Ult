# Review Report (2026-02-20)

## 1. Executive Summary

The `trading-platform` codebase shows a sophisticated application with advanced features (ML prediction, Backtesting, Risk Management). However, it currently suffers from **critical security misconfigurations**, **severe performance bottlenecks in core algorithms**, and **technical debt** related to a partial architectural migration.

- **Security Posture**: Mixed. Strong sanitization libraries are used, but API authentication has critical flaws (hardcoded secrets in dev-mode that might leak to prod logic, tokens exposed in body).
- **Performance**: The backtesting engine contains an O(N²) complexity flaw in feature extraction that will make large-scale testing unviable.
- **Code Health**: High number of lint warnings (690+) and broken TypeScript types indicate a degrading development experience.

## 2. Critical Findings (Security & Stability)

### 2.1 Authentication Flaws
- **Hardcoded Secrets**: `auth/login/route.ts` and `register/route.ts` use a fallback secret `'demo-secret-dev-only'`. While guarded by `NODE_ENV`, this pattern is risky.
- **Token Exposure**: JWT tokens are returned in the JSON response body. This makes them vulnerable to XSS theft.
  - **Recommendation**: Return tokens as `httpOnly`, `secure`, `SameSite=Strict` cookies.
- **Insecure ID Generation**: `AuditLogger` and `User` ID generation uses `Math.random()`, which is not cryptographically secure and prone to collisions.
  - **Recommendation**: Use `crypto.randomUUID()` or `crypto.getRandomValues()`.

### 2.2 Infrastructure Reliability
- **Broken Retry Logic**: `ApiClient` (`infrastructure/api.ts`) accepts a `retries` configuration but **does not implement the retry loop**. Network instability will cause immediate failures.
- **Unbounded Cache**: The `Cache` class (`infrastructure/cache.ts`) does not automatically prune old entries or enforce a max size, leading to potential **memory leaks** in long-running server processes.

## 3. Major Findings (Performance & Logic)

### 3.1 Algorithmic Complexity (Backtesting)
- **O(N²) Feature Extraction**: In `FeatureEngineering.ts`, the `extractFeatures` method iterates through the dataset and calls `calculateTechnicalFeatures` for a sliding window. Inside that, functions like `calculateRSI` iterate the *entire* window again.
  - **Impact**: Backtesting speed degrades exponentially with data size.
  - **Recommendation**: Calculate all technical indicators for the full dataset *once* (O(N)) and then slice the result arrays by index.

### 3.2 Inefficient React Rendering
- **`StockTable.tsx`**: Sorting logic creates a new array on every render if the `stocks` prop reference changes, potentially causing UI stutter during high-frequency updates.
- **`StockChart.tsx`**: Lint errors indicate `ref` values are being accessed during render, which is unsafe in React 19/concurrent mode.

### 3.3 Market Data Fetching
- **Sequential Fetching**: `MarketDataService.getAllMarketData` iterates through indices and `await`s them one by one.
  - **Recommendation**: Use `Promise.all` to fetch data in parallel.

## 4. Architectural Assessment

### 4.1 "Split Brain" Architecture
The codebase is in a state of partial migration between a monolithic `app/lib` structure and a Domain-Driven Design (DDD) `app/domains` structure.
- **Duplication**: `MLService` exists in both `app/lib/ml` (ensemble logic) and `app/domains/prediction` (model definitions).
- **Service Confusion**: `MarketDataService` (lib) is the main entry point, but complex logic resides in `app/domains/market-data`.
- **Recommendation**: Complete the migration. Move all core logic to `app/domains` and make `app/lib` purely for generic utilities (math, formatting).

## 5. Automated Analysis Results

- **Linting**: **692 issues** (1 error, 691 warnings).
  - Critical: `Component definition is missing display name` in `query-wrapper.tsx`.
  - Noise: High volume of `any` usage and `unused variables` masks real issues.
- **TypeScript**: Build fails due to missing modules (`../types` in `prediction/service.ts`) and type mismatches (`Zod` schema in `env.ts`).
- **Tests**:
  - `npm test`: 299 passed, 2 failed.
    - `data-aggregator.test.ts`: Timeout (performance issue?).
    - `VolumeProfilePlugin.test.ts`: TypeError (logic issue).
  - `playwright_scraper`: `pytest` failed due to missing dependencies in environment.

## 6. Recommendations Plan

### Immediate Actions (v0.1.1)
1.  **Fix Security**: Switch to `httpOnly` cookies for auth and remove hardcoded fallback secrets. Use `crypto.randomUUID()`.
2.  **Fix Infrastructure**: Implement the `while` loop for retries in `ApiClient` and add auto-pruning to `Cache`.
3.  **Fix Critical Performance**: Refactor `FeatureEngineering.ts` to vectorise indicator calculation (calculate once, then map).

### Short-term Actions (v0.2.0)
1.  **Consolidate Architecture**: Move `MLService` and `MarketDataService` fully into `app/domains`. Deprecate `app/lib` counterparts.
2.  **Fix Lint/Types**: Run a massive `eslint --fix` and manually address the `any` types in critical paths.
3.  **Parallelize Data**: Update `getAllMarketData` to use `Promise.all`.

### Long-term
1.  **Backend Migration**: Moving heavy ML logic (TensorFlow.js) from Next.js API routes to a dedicated Python microservice (fast-api) sharing logic with the scraper.
