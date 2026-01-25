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

## 2025-05-23 - [Redundant Indicator Calculation in Optimization Loops]
**Learning:** Parameter optimization loops (`optimizeParameters`) often recalculate derived data (like RSI/SMA) for the same parameters multiple times inside nested loops, causing O(N^2) complexity.
**Action:** Pre-calculate all candidate indicators outside the optimization loop and pass them into the scoring function.
