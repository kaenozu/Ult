---
name: agstock-backend-testing
description: |
  Correctly runs Python backend tests in the AGStock Ult project. Use when:
  (1) You need to verify backend changes, (2) `ModuleNotFoundError: No module named 'src'` occurs.
  (3) Running tests for new features.
author: Antigravity (Continuous Learning)
version: 1.0.0
date: 2026-01-18
---

# AGStock Backend Testing Protocol

## Problem
The `backend` directory structure separates `src` and `tests`. Running tests from the repository root causes import errors because `src` is not in the Python path relative to the test runner.

## Context / Trigger Conditions
- Error: `ModuleNotFoundError: No module named 'src'`
- Error: `ImportError: attempted relative import with no known parent package`
- Running commands like `python backend/tests/test_foo.py`

## Solution

Always execute tests using `python -m` from the `backend` directory.

### Command Structure
```powershell
cd backend
python -m tests.[test_filename_without_extension]
```

### Examples

**Correct:**
```powershell
cd baackend
python -m tests.test_approval_persistence
```

**Incorrect (Do NOT use):**
```powershell
# From root
python backend/tests/test_approval_persistence.py
```

## Notes
- The `conftest.py` or `pytest.ini` (if added later) might handle this, but currently the manual module execution is the most reliable method for individual test scripts.
