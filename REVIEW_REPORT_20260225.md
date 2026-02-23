# Source Code Review Report (2026-02-25)

## 1. Summary
A comprehensive review of the `trading-platform` and `playwright_scraper` repositories was conducted. Several critical issues preventing correct execution were identified, along with architectural technical debt and security considerations.

**Overall Health:** ⚠️ **At Risk**
- **Critical Bugs:** 2 (Prevent execution/testing)
- **Major Issues:** 2 (Architecture/Logic)
- **Tech Debt:** Moderate (Duplicate code, In-memory store)

## 2. Critical Issues (Blockers)

### 2.1. ReferenceError in Feature Engineering
- **File:** `trading-platform/app/lib/services/feature-engineering-service.ts`
- **Issue:** The helper function `last` is used before it is defined within `calculateTechnicalFeatures`.
- **Impact:** Causes `ReferenceError: Cannot access 'last' before initialization`.
- **Evidence:** 10/12 tests failed in `enhanced-prediction-service.test.ts`.
- **Fix:** Move helper function definitions (`last`, `prev`) to the top of the `calculateTechnicalFeatures` scope.

### 2.2. Missing Import in Scraper
- **File:** `playwright_scraper/scraper.py`
- **Issue:** The `os` module is used (`os.environ.get`) but not imported.
- **Impact:** Causes `NameError: name 'os' is not defined` immediately upon execution.
- **Fix:** Add `import os` to the imports section.

## 3. Major Issues (Architecture & Logic)

### 3.1. Inconsistent Prediction Logic (Worker vs Main Thread)
- **File:** `trading-platform/app/lib/services/enhanced-prediction-service.ts`
- **Issue:** The `predictWithWorker` method returns **hardcoded stub values** for:
  - `ensembleContribution` (e.g., `rf: 0.3`)
  - `pattern` features (all zeros)
- **Contrast:** The `predictOnMainThread` method calculates *real* values using `candlestickPatternService` and model inference.
- **Impact:** Using the Worker path (default in browser) yields fake/incorrect explanations and pattern data, causing "Logic Drift" and potentially misleading users.

### 3.2. Duplicate & Legacy Code
- **Files:** `trading-platform/app/lib/ml` and `trading-platform/app/lib/aiAnalytics`
- **Issue:** These directories exist alongside the new unified `trading-platform/app/lib/services/feature-engineering-service.ts`.
- **Impact:** Maintenance nightmare. The new service explicitly comments that it "replicates" logic from these old paths.
- **Recommendation:** Delete `app/lib/ml` and `app/lib/aiAnalytics` after confirming full migration.

### 3.3. In-Memory Authentication Store
- **File:** `trading-platform/app/lib/auth-store.ts`
- **Issue:** Users are stored in a JavaScript `Map`.
- **Impact:** All user data is lost on server restart. Not suitable for production.
- **Status:** Documented as a known limitation, but remains a risk if deployed.

## 4. Minor Issues & Observations

### 4.1. Type Safety in StockChart
- **File:** `trading-platform/app/components/StockChart/StockChart.tsx`
- **Issue:** Explicit use of `any` for `markers` due to missing `setMarkers` definition in `lightweight-charts` types.
- **Recommendation:** Extend the type definition locally or update the library if possible.

### 4.2. Security (Positive Findings)
- **File:** `trading-platform/app/lib/env.ts`
- **Status:** Secure. Enforces strong `JWT_SECRET` in production.
- **File:** `trading-platform/app/api/trading/route.ts`
- **Status:** Secure. Implements input sanitization (`sanitizeSymbol`, `sanitizeText`) and CSRF protection.

### 4.3. Performance (Positive Findings)
- **File:** `trading-platform/app/lib/utils/technical-analysis.ts`
- **Status:** Optimized. Uses `Float64Array` and single-pass loops.
- **File:** `trading-platform/app/components/StockTable.tsx`
- **Status:** Optimized. Uses `React.memo` with custom comparator.

## 5. Recommendations

1.  **Immediate Fixes:**
    - Fix the `ReferenceError` in `feature-engineering-service.ts`.
    - Fix the missing import in `scraper.py`.

2.  **Logic Correction:**
    - Update `predictWithWorker` in `enhanced-prediction-service.ts` to return real values or remove the stubbing if the worker isn't ready.

3.  **Cleanup:**
    - Delete legacy `ml` and `aiAnalytics` directories.

4.  **Future Work:**
    - Migrate `AuthStore` to a database (e.g., SQLite/Postgres).
    - Fix `StockChart` types.
