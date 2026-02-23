# Source Code Review Report (2026-02-24)

## 1. Executive Summary

A comprehensive "Full Source Review" was conducted on the `trading-platform` and `playwright_scraper` codebases.

**Status:** 🔴 **CRITICAL ISSUES FOUND**

The review identified immediate runtime crashes in the scraper, severe data loss risks in the authentication system, and a "Split Brain" architecture in the Machine Learning domain where logic is triplicated across legacy and modern implementations.

While the Frontend (Next.js) remains high-quality and performant, the Backend and ML infrastructure require immediate remediation to be production-ready.

## 2. Critical Findings (Bugs & Security)

### 🔴 2.1 Scraper Runtime Crash (Immediate Fix Required)
- **File:** `playwright_scraper/scraper.py`
- **Issue:** The script attempts to access environment variables via `os.environ.get("SCRAPER_PASSWORD", "")` but fails to import the `os` module.
- **Impact:** The scraper will crash immediately upon execution with `NameError: name 'os' is not defined`.
- **Recommendation:** Add `import os` to the imports.

### 🔴 2.2 Authentication Data Loss (Severe Risk)
- **File:** `trading-platform/app/lib/auth-store.ts`
- **Issue:** User data is stored in an in-memory `Map<string, User>`.
- **Impact:** **100% Data Loss** occurs whenever the server restarts or redeploys (common in serverless/containerized environments). This renders the registration/login system useless for production.
- **Security:** The system hardcodes an admin password hash (`hashSync('admin123', 10)`), which is a security vulnerability if exposed.
- **Recommendation:** Replace with a persistent database (PostgreSQL + Prisma).

### 🟠 2.3 Environment Configuration Conflict
- **Files:**
    - `trading-platform/app/lib/env.ts` (Zod schema A)
    - `trading-platform/app/lib/config/env.ts` (Zod schema B)
- **Issue:** Two competing "sources of truth" for environment variables exist.
    - `env.ts` manages `JWT_SECRET` and basic API keys.
    - `config/env.ts` manages `OPENAI_API_KEY`, `DATABASE_URL`, and feature flags.
- **Impact:** Inconsistent configuration, confusion for developers, and potential security gaps if one file is updated but not the other.
- **Recommendation:** Merge into a single `app/lib/env.ts`.

## 3. Architectural Findings ("Split Brain" ML)

The Machine Learning logic is fractured across three locations, creating a maintenance nightmare.

1.  **`app/domains/prediction` (✅ KEEP):**
    - **Status:** Modern, robust, type-safe.
    - **Features:** Comprehensive types (`ModelConfig`, `EnsemblePrediction`), service-oriented architecture (`services/`), and integration with TensorFlow/LSTM/XGBoost concepts.
    - **Verdict:** This is the correct home for ML logic.

2.  **`app/lib/ml` (❌ DELETE):**
    - **Status:** Legacy/Rule-based.
    - **Features:** Contains `EnsembleModel.ts` with hardcoded technical analysis rules (RSI < 30 = Buy) masquerading as an ML model. Japanese comments indicate older codebase.
    - **Verdict:** Duplicate and inferior logic.

3.  **`app/lib/aiAnalytics` (❌ DELETE):**
    - **Status:** Duplicate/Prototype.
    - **Features:** Contains another copy of `EnsembleModel.ts` and `PredictiveAnalyticsEngine.ts`.
    - **Verdict:** Redundant.

## 4. Infrastructure & Tooling

- **CI/CD:**
    - `npm run lint` fails due to missing dependencies (`eslint-config-next`).
    - `npm test` crashes with `JavaScript heap out of memory` (OOM).
- **Dependencies:**
    - `package.json` scripts are standard but the environment is fragile.

## 5. Recommendations

1.  **Immediate Fixes:**
    - Patch `playwright_scraper/scraper.py` (Add `import os`).
    - Delete `app/lib/ml` and `app/lib/aiAnalytics` to stop the "Split Brain".
    - Unify `env.ts` and `config/env.ts`.

2.  **Short-Term Roadmap:**
    - Implement PostgreSQL/Prisma for Auth.
    - Fix CI/CD pipeline (install deps, fix OOM).
