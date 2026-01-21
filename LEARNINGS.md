# AGStock Project Learnings
*A living record of architectural decisions, bug fixes, and optimization patterns.*

## [2026-01-19] [Data Integration]
**Context:** Implementing Earnings Hunter with `yfinance`.
**Insight:** `yfinance.calendar` return type is inconsistent (sometimes list, sometimes dict) depending on the ticker and internal API changes.
**Action/Rule:** Always verify `yfinance` return types dynamically. Use `isinstance` checks before iterating.

## [2026-01-19] [Testing]
**Context:** Verifying backend modules (`NewsShockDefense`) with standalone scripts.
**Insight:** Python scripts in the root directory fail to import `backend.src` modules if their dependencies (`data_loader`, `schemas`) perform implicit relative imports or assume a specific `sys.path` order.
**Action/Rule:** For verification scripts, always perform `sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))` AND be wary of importing the entire app instance (`server` or `execution_engine`) when testing a single class. Use `unittest.mock` to bypass heavy dependencies.

## [2026-01-21] [Next.js / Frontend]
**Context:** Fixing `Missing getServerSnapshot` error in production build for `/quantum-oracle`.
**Insight:** Next.js Server Components do not allow `next/dynamic` with `ssr: false` directly. Hooks that depend on client-side state (like `useSyncExternalStore` often used in XR/3D components) will fail during static prerendering.
**Action/Rule:** Always wrap client-side-only dynamic components in a separate `"use client"` wrapper component before using them in a Server Component (page.tsx).

## [2026-01-21] [TypeScript / Performance]
**Context:** Solving 100+ `possibly undefined` errors in `pca.ts` and `data-table.tsx`.
**Insight:** In production builds with strict null checks, array indexing (e.g., `matrix[i][j]`) is a common source of type errors. TypeScript cannot guarantee that the index exists even in a bounded loop.
**Action/Rule:** Prefer intermediate variable assignment with null checks (e.g., `const row = matrix[i]; if (!row) continue;`) over direct nested indexing. Use `charAt(i)` for strings to avoid `undefined` results from `str[i]`.
