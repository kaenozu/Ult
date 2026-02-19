---
name: test-fixing
description: Run tests and systematically fix all failing tests using smart error grouping.
---

# Test Fixing

Systematically identify and fix all failing tests using smart grouping strategies.

## Systematic Approach

### 1. Initial Test Run
Run `npm test` to identify all failing tests.

### 2. Smart Error Grouping
Group similar failures by:
- **Error type**: ImportError, AttributeError, AssertionError, etc.
- **Module/file**: Same file causing multiple test failure.
- **Root cause**: Missing dependencies, API changes, refactoring impacts.

### 3. Systematic Fixing Process
For each group:
1. **Identify root cause**: Read relevant code and check recent changes.
2. **Implement fix**: Make minimal, focused changes.
3. **Verify fix**: Run subset of tests for this group.

### 4. Fix Order Strategy
1. **Infrastructure first**: Import errors, missing dependencies.
2. **API changes**: Function signature changes, module reorganization.
3. **Logic issues**: Assertion failures, business logic bugs.

### 5. Final Verification
After all groups fixed, run complete test suite and verify no regressions.
