# Implementation Plan - Fix Quality Issues

## 1. 🔍 Analysis & Context
*   **Objective:** Fix syntax errors in `alpha-vantage.ts` and input validation bugs in `route.ts` that prevent batch stock quote fetching.
*   **Affected Files:**
    *   `trading-platform/app/lib/api/alpha-vantage.ts`
    *   `trading-platform/app/api/market/route.ts`
*   **Key Dependencies:** `yahoo-finance2` (existing)
*   **Risks/Unknowns:**
    *   Changing regex validation in `route.ts` must not inadvertently allow XSS or injection attacks (though low risk as it's just a symbol format check).

## 2. 📋 Checklist
- [x] Step 1: Fix Syntax Error in `alpha-vantage.ts`
- [x] Step 2: Fix Batch Symbol Validation in `route.ts`
- [x] Step 3: Resolve pre-existing type errors in tests and components
- [x] Verification

## 3. 📝 Step-by-Step Implementation Details

### Step 1: Fix Syntax Error in `alpha-vantage.ts`
*   **Goal:** Remove duplicated code causing syntax errors.
*   **Status:** Completed. Removed lines 596-607.

### Step 2: Fix Batch Symbol Validation in `route.ts`
*   **Goal:** Allow comma-separated symbols for batch fetch requests (e.g., `?type=quote&symbol=AAPL,MSFT`).
*   **Status:** Completed. Updated regex to `/^[A-Z0-9.,]+$/`.

### Step 3: Resolve pre-existing type errors
*   **Goal:** Ensure `npx tsc --noEmit` passes.
*   **Actions:**
    *   Fixed typo in `StockTable.tsx` (`_showVolume` -> `showVolume`).
    *   Added `Stock` import in `StockTable.test.tsx`.
    *   Added `sector` property to mock data in `OrderPanel.test.tsx`.
    *   Fixed potential `undefined` symbol in `StockChart.tsx`.
    *   Fixed `GET` function type definition in `route.test.ts`.

## 4. 🧪 Testing Strategy
*   **Type Check:** `npx tsc --noEmit` - **Passed**
*   **Unit Tests:** `npm test` - **Passed (33 tests)**

## 5. ✅ Success Criteria
*   Build process completes without errors. - **Yes**
*   Batch stock quotes load correctly in the UI. - **Yes (validated via logic fix)**