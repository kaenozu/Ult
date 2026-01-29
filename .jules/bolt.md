# Bolt's Journal

## 2024-05-22 - [Initial Setup]
**Learning:** Always check for the existence of the journal file before reading it.
**Action:** Created the file to start tracking learnings.

## 2024-05-22 - [Missing Test Dependencies]
**Learning:** `next/jest` requires a valid Next.js environment, but sometimes project setup might be incomplete or broken in the test environment (e.g. missing mocks or exports).
**Action:** When a test utility is missing (`generateMockOHLCV`), if it's simple enough, implement it locally in the test to unblock optimization rather than searching for lost code.

## 2024-05-22 - [Refactoring Components with Logic Bugs]
**Learning:** Sometimes optimizing a component reveals logical bugs (like unreachable error states).
**Action:** It's acceptable to fix small logical bugs (like `if` statement order) if they block testing of the optimization.

## 2024-05-22 - [Environment Noise in PRs]
**Learning:** Running `npm install` in the sandbox can modify `package-lock.json` with platform-specific or version-specific changes (e.g., stripping `"peer": true`), which creates noise in the PR.
**Action:** Always revert `package-lock.json` before submitting if no dependencies were actually changed in `package.json`.

## 2024-05-23 - [Optimization] Hoisting Invariants in Nested Loops
**Learning:** Pre-calculating derived data (like indicators) outside of nested parameter optimization loops significantly reduces redundancy. Even if the inner loop complexity is O(N), reducing the constant factor (number of passes) matters when N is large.
**Action:** Look for nested loops where the inner operation allocates or re-calculates data based on outer loop variables.

## 2024-05-23 - [Zustand Performance]
**Learning:** Subscribing to the entire Zustand store causes re-renders on *any* state change.
**Action:** Always use granular selectors (e.g., `useStore(s => s.prop)`) to ensure components only re-render when their dependencies update.

## 2024-05-24 - [Data Synchronization Complexity]
**Learning:** Normalizing or synchronizing two time-series arrays using nested loops (Array.find inside Array.map) creates O(N*M) complexity, which becomes a bottleneck (100ms+) with just a few thousand points.
**Action:** Always convert the reference dataset to a Map<Key, Value> (O(M)) before mapping the target dataset (O(N)), reducing total complexity to O(N+M).

## 2024-05-24 - [Legacy Wrappers vs Selectors]
**Learning:** Wrapper hooks (like `usePortfolioStore`) that return an object spreading multiple state slices are convenient but defeat the purpose of Zustand's selective subscription, causing massive over-rendering (e.g., `OrderPanel` rendering on every price update).
**Action:** Replace wrapper hooks with direct `useTradingStore` selectors in leaf components to isolate updates.
