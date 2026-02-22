# Fix Plan for Trading Platform (2026-02-24)

This plan outlines the steps to address critical issues identified in `REVIEW_REPORT_20260224.md`.

## 1. Scraper Crash (Priority: Critical)

- **Target:** `playwright_scraper/scraper.py`
- **Action:** Add `import os` to the imports.
- **Why:** The script uses `os.environ` but fails to import the module, causing an immediate crash.

## 2. Eliminate "Split Brain" ML Logic (Priority: High)

- **Target:** `trading-platform/app/lib/ml` and `trading-platform/app/lib/aiAnalytics`
- **Action:** Delete these directories.
- **Why:** These contain legacy/prototype code (`EnsembleModel.ts`) that conflicts with the modern, type-safe implementation in `app/domains/prediction`.
- **Pre-requisite:** Verify that no *unique* logic exists in `app/lib/ml` that isn't covered by `app/domains/prediction`. (Preliminary check suggests `app/domains/prediction` is superior).

## 3. Unify Environment Configuration (Priority: Medium)

- **Target:** `trading-platform/app/lib/env.ts` and `trading-platform/app/lib/config/env.ts`
- **Action:**
    1.  Merge the Zod schemas from both files into `app/lib/env.ts`.
    2.  Update all imports to point to `app/lib/env.ts`.
    3.  Delete `app/lib/config/env.ts`.
- **Why:** Eliminate confusion and ensure a single source of truth for configuration.

## 4. Implement Persistent Authentication (Priority: Medium)

- **Target:** `trading-platform/app/lib/auth-store.ts`
- **Action:**
    1.  Replace the in-memory `Map` with a database adapter (e.g., Prisma).
    2.  Remove hardcoded admin credentials.
- **Why:** Prevent data loss on server restarts.

## 5. CI/CD Stabilization (Priority: Low)

- **Target:** `trading-platform/package.json`
- **Action:**
    1.  Run `npm install` to resolve missing dependencies (`eslint-config-next`).
    2.  Add `--max-old-space-size=4096` to test scripts to fix OOM errors.
- **Why:** Enable reliable automated testing.
