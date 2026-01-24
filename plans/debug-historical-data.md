# Debug Plan: Fix "Failed to fetch historical data"

## 1. Analysis
*   **Symptom:** API returns "Failed to fetch historical data".
*   **Error Log:** `yf.chart failed for AAPL: Sensitive database connection string failed`
*   **Hypothesis:** 
    *   The error message "Sensitive database connection string failed" is unusual for `yahoo-finance2`.
    *   It might be a misleading error message from a lower-level network library, or an issue with how `yahoo-finance2` is configured/used.
    *   Maybe an environment variable issue?

## 2. Actions
1.  **Enhance Logging:** Modify `app/api/market/route.ts` to log the full error object, not just the message.
2.  **Verify Configuration:** Check if any unexpected environment variables are affecting `yahoo-finance2`.
3.  **Test Isolation:** Create a standalone script to run `yf.chart` directly (outside Next.js) to see if it fails there too. This isolates Next.js/API route issues from basic library connectivity.

## 3. Step-by-Step
- [ ] Modify `route.ts` to log `JSON.stringify(innerError, Object.getOwnPropertyNames(innerError))`
- [ ] Create `scripts/test-yf.ts` to run a simple `yf.chart('AAPL')`.
- [ ] Run the script and analyze output.
