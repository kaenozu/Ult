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
