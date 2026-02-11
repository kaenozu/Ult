---
name: roadmap-driven-development
description: Use when working from a ROADMAP with multiple priorities, or when new feature development coexists with legacy code issues.
---

# Roadmap Driven Development

## Overview

Systematic approach to executing ROADMAP tasks while managing legacy code issues and maintaining development velocity. This skill provides patterns for prioritization, parallel execution, and graceful handling of technical debt.

**Core principle:** Deliver high-priority features while systematically improving code quality, without being blocked by pre-existing issues.

## When to Use

- Working from ROADMAP.md or similar prioritized task lists
- Multiple tasks with different priority levels (P0, P1, P2)
- New feature development alongside legacy code with lint/test failures
- Need to merge valuable changes while CI has pre-existing failures
- Balancing feature delivery with code quality improvements

**When NOT to use:**
- Greenfield projects without technical debt
- Simple, single-task implementations
- When full CI cleanup is required before any merge (strict environments)

## Core Pattern

### Priority-Based Execution

```
P0 (Critical) → P1 (Important) → P2 (Nice-to-have)
     ↓               ↓                ↓
Immediate      Parallel work      Background
Blocker        acceptable         tasks
```

### Legacy Code Handling Strategy

**Don't:** Block new features on pre-existing failures
**Do:** Fix relevant failures, segregate unrelated issues

```typescript
// ❌ BAD: Fix EVERYTHING before merging
// Leads to giant PRs, context loss

// ✅ GOOD: Fix only what you touch
// Create follow-up tasks for pre-existing issues
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| P0 security issue | Immediate fix + test + docs |
| P1 UI improvement | Implement + tests, merge with existing lint warnings |
| P2 refactoring | Batch when convenient, create separate PR |
| Pre-existing lint error | Ignore if unrelated to your changes |
| New lint error from your changes | Must fix before merge |
| CI failing on your PR only | Must fix before merge |
| CI failing on all PRs (pre-existing) | Document, merge, create cleanup issue |

## Implementation

### Phase 1: Assess and Prioritize

```bash
# Check ROADMAP
head -100 ROADMAP.md

# Check current branch state
git status
git log --oneline -5

# List open PRs and their status
gh pr list --state open
```

### Phase 2: Execute by Priority

**P0 (Security/Mission-Critical):**
- Fix immediately
- Full test coverage
- Documentation update
- No compromises

**P1 (User Experience/Performance):**
- Implement with tests
- Fix directly related lint errors
- Merge if CI failures are pre-existing
- Document known issues

**P2 (Nice-to-have):**
- Implement when P0/P1 clear
- Can be deferred
- Batched with other P2 items

### Phase 3: Handle Legacy Issues

**Identify pre-existing failures:**
```bash
# Check if failure exists on main
gh pr checks main-pr-number

# Compare with your PR
git diff --name-only
```

**Decision matrix:**
- Your files affected by failure → Must fix
- Unrelated files → Document and proceed
- New failures introduced → Must fix

### Phase 4: Merge Strategy

**Clean PRs (all checks pass):**
```bash
gh pr merge <number> --merge --delete-branch
```

**Valuable PRs with pre-existing failures:**
```bash
# Document the situation in PR description
# Get approval acknowledging known issues
# Merge and create follow-up issue
gh pr merge <number> --merge
gh issue create --title "Fix pre-existing lint errors" --body "...
```

## Common Mistakes

| Mistake | Why It Happens | Fix |
|---------|---------------|-----|
| Fixing all lint errors before merging | Perfectionism | Fix only what you touch |
| Never merging because CI is red | Fear of breaking | Distinguish new vs pre-existing failures |
| Giant cleanup PRs | Batch mentality | Small, focused PRs |
| Ignoring all lint warnings | Laziness | Fix your own, document others |
| Blocking features on unrelated issues | Process rigidity | Separate concerns |

## Real-World Impact

**Example from this codebase:**
- Implemented P0 API key protection (`.env.example`)
- Implemented P1 UI debouncing (screener page)
- Fixed related lint errors (5 files)
- Merged despite pre-existing lint failures in other areas
- Result: Security and UX improvements delivered, technical debt tracked separately

## Integration with Other Skills

**REQUIRED SUB-SKILLS:**
- `pr-quality-enforcement` - When to enforce vs when to pragmatically merge
- `systematic-refactoring-execution` - For P2 cleanup tasks
- `finishing-a-development-branch` - Completing work cleanly

**WORKS WELL WITH:**
- `writing-plans` - Converting ROADMAP to implementation plans
- `dispatching-parallel-agents` - Executing multiple P1 tasks in parallel

## Red Flags

- "I can't merge because of unrelated test failures"
- "Let me fix all 500 lint errors first"
- "This PR touches 50 files" (cleanup should be separate)
- Ignoring new lint errors you introduced

**STOP and reassess when:**
- You've spent more time fixing unrelated issues than your task
- Your PR is >500 lines because of "cleanup"
- You're avoiding merge due to fear of red CI

## Workflow

```
1. READ ROADMAP
      ↓
2. Identify P0/P1/P2 for this session
      ↓
3. Execute P0 (blocking)
      ↓
4. Execute P1 in parallel if possible
      ↓
5. Fix only lint/test errors you introduced
      ↓
6. Document pre-existing failures
      ↓
7. Merge valuable changes
      ↓
8. Create issues for remaining cleanup
```

## Success Criteria

- High-priority features delivered on time
- Code quality improved incrementally
- Technical debt tracked and visible
- Development velocity maintained
- No fear-based delays due to unrelated issues
