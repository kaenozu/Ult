# Source Code Review Report (2026-02-26)

## 1. Summary
A comprehensive review of the `trading-platform` and `playwright_scraper` repositories was conducted on 2026-02-26. This review verifies the current state of the codebase, checks against previous reports, and identifies critical blockers.

**Overall Health:** ⚠️ **At Risk**
- **Critical Bugs:** 1 (Prevents execution of scraper)
- **Major Issues:** 2 (Architecture/Logic)
- **Resolved Issues:** 1 (Previously reported critical bug)
- **Test Status:** 56 Tests Failed (11 Test Suites)
- **Lint Status:** 751 Warnings

## 2. Critical Issues (Blockers)

### 2.1. Missing Import in Scraper (Confirmed)
- **File:** `playwright_scraper/scraper.py`
- **Issue:** The `os` module is used (`os.environ.get`) but not imported.
- **Impact:** Causes `NameError: name 'os' is not defined` immediately upon execution.
- **Action Required:** Add `import os` to the imports section.

## 3. Major Issues (Architecture & Logic)

### 3.1. Inconsistent Prediction Logic (Logic Drift)
- **File:** `trading-platform/app/lib/services/enhanced-prediction-service.ts`
- **Issue:** The `predictWithWorker` method returns **hardcoded stub values** for pattern features (all zeros) and ensemble contributions.
- **Contrast:** The `predictOnMainThread` method calculates real values.
- **Impact:** The application behaves differently depending on whether Web Workers are supported/enabled, leading to inconsistent user experience and potentially misleading "AI Explanations".
- **Recommendation:** Implement full feature calculation in the worker or disable the worker path until parity is achieved.

### 3.2. In-Memory Authentication Store (Data Loss Risk)
- **File:** `trading-platform/app/lib/auth-store.ts`
- **Issue:** User data is stored in a JavaScript `Map`.
- **Impact:** All user accounts and data are lost whenever the server restarts or redeploys.
- **Recommendation:** Migrate to a persistent database (PostgreSQL/SQLite) using Prisma or Drizzle ORM.

## 4. Resolved Issues

### 4.1. ReferenceError in Feature Engineering (Fixed)
- **File:** `trading-platform/app/lib/services/feature-engineering-service.ts`
- **Previous Report:** Claimed `last` helper function was used before definition.
- **Current Status:** Verified as **FIXED**.
- **Evidence:**
  - `tsc --noEmit` passed for this file.
  - `enhanced-prediction-service.test.ts` passed (12/12 tests).
  - Manual inspection confirms `last` is defined before use within `calculateTechnicalFeatures`.

## 5. Minor Issues & Tech Debt

### 5.1. Type Safety in StockChart
- **File:** `trading-platform/app/components/StockChart/StockChart.tsx`
- **Issue:** Explicit use of `any` casting: `(candleSeries as any).setMarkers(markers)`.
- **Impact:** Bypasses TypeScript safety. Potential runtime errors if `lightweight-charts` API changes.
- **Recommendation:** Update `lightweight-charts` types or extend the interface locally.

### 5.2. Test Suite Failures
- **Status:** 56 Tests Failed.
- **Key Failures:**
  - `MLIntegrationService.test.ts`: Expects models to be unavailable/null, but service returns default values or empty arrays. Likely due to the unification of `FeatureEngineeringService` changing default behaviors.
  - `OrderPanel.test.tsx`: Fails to find "処理中..." text, indicating a rendering or timing issue in the test.

### 5.3. Lint Warnings
- **Status:** 751 Warnings.
- **Primary Causes:**
  - `no-explicit-any`: Excessive use of `any`.
  - `no-unused-vars`: Unused variables and imports.

## 6. Recommendations & Next Steps

1.  **Immediate Fix (P0):**
    - Fix `playwright_scraper/scraper.py` by adding `import os`.

2.  **High Priority (P1):**
    - Address the 56 failing tests to restore CI green state.
    - Implement real logic in `predictWithWorker` or disable it.

3.  **Medium Priority (P2):**
    - Migrate `AuthStore` to a persistent database.
    - Clean up `any` types in critical components (`StockChart`, `MLIntegrationService`).

4.  **Low Priority (P3):**
    - Address 750+ lint warnings (automated fix where possible).
