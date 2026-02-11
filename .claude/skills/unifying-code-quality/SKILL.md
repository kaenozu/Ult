---
name: unifying-code-quality
description: Use when codebase has inconsistent patterns, mixed quality levels, or needs systematic refactoring to establish unified standards.
---

# Unifying Code Quality

## Overview

Systematic approach to unifying code quality across a codebase with inconsistent patterns, mixed type safety levels, and varying adherence to standards. This skill provides patterns for establishing unified conventions and refactoring legacy code incrementally.

**Core principle:** Establish clear patterns, fix incrementally, and maintain quality gates to prevent regression.

## When to Use

- Codebase has inconsistent naming conventions
- Mix of `any`/`unknown` types with strict TypeScript
- Varying error handling patterns across modules
- Inconsistent file organization
- Mixed async/await and callback patterns
- Some files pass lint, others fail
- New code conflicts with legacy patterns

**When NOT to use:**
- Starting a new project (use project setup guides instead)
- Single file fix (use direct editing)
- Codebase already has unified standards

## Core Pattern

### The Three-Layer Approach

```
Layer 1: Establish Standards
├── Define patterns
├── Create examples
└── Document conventions

Layer 2: Incremental Refactoring
├── Fix by module (not by rule)
├── Boy scout rule: Leave it better
└── Don't break functionality

Layer 3: Prevent Regression
├── CI gates
├── Code review checklists
└── Automated enforcement
```

### Incremental Refactoring Strategy

**Don't:** Try to fix everything at once
**Do:** Fix incrementally, module by module

```typescript
// ❌ BAD: Giant "cleanup" PR
git diff --stat
50 files changed, 2000 insertions(+), 1500 deletions(-)

// ✅ GOOD: Module-by-module fixes
git diff --stat  
3 files changed, 45 insertions(+), 32 deletions(-)
```

## Quick Reference

| Issue | Priority | Strategy |
|-------|----------|----------|
| `any` types | P1 | Replace with proper types incrementally |
| Unused variables | P0 | Remove immediately |
| Inconsistent naming | P2 | Fix when touching files |
| Mixed error handling | P1 | Unify pattern per module |
| Type safety gaps | P1 | Add types progressively |
| Import order | P2 | Use auto-fix on save |
| File organization | P2 | Reorganize with features |
| Test coverage | P2 | Add tests for new code first |

## Implementation

### Phase 1: Assess Current State

```bash
# Check overall health
npm run lint 2>&1 | grep -E "(error|warning)" | wc -l

# Check specific issues
grep -r "as any" --include="*.ts" --include="*.tsx" | wc -l
grep -r "as unknown" --include="*.ts" --include="*.tsx" | wc -l

# Identify worst offenders
npm run lint 2>&1 | grep "error" | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
```

### Phase 2: Establish Standards

**Create a QUALITY_STANDARDS.md:**

```markdown
# Quality Standards

## TypeScript
- No `any` except in test mocks
- Explicit return types on public APIs
- Use `unknown` for runtime validation

## Error Handling
- Use typed errors, not `Error`
- Always handle Promise rejections
- Log with context

## Naming
- camelCase for variables/functions
- PascalCase for classes/components
- SCREAMING_SNAKE_CASE for constants
- kebab-case for files

## File Organization
- Co-locate tests: `component.test.tsx`
- Group by feature, not type
- Keep files <300 lines
```

### Phase 3: Fix by Module

**Select a module:**
```bash
# Pick a module with clear boundaries
ls app/components/StockTable/
# StockTable.tsx, StockTable.test.tsx, types.ts, utils.ts
```

**Fix all issues in module:**
```bash
# 1. Run lint on specific module
npm run lint -- app/components/StockTable/

# 2. Fix auto-fixable issues
npm run lint -- --fix app/components/StockTable/

# 3. Manual fixes for remaining
# - Replace any with proper types
# - Add missing error handling
# - Unify naming

# 4. Verify
git diff --stat
# Should show focused changes in target module only
```

### Phase 4: Type Safety Improvements

**Replacing `any`:**

```typescript
// ❌ BEFORE
function processData(data: any): any {
  return data.map(item => item.value);
}

// ✅ AFTER - Step 1: Define interface
interface DataItem {
  value: number;
  label: string;
}

// ✅ AFTER - Step 2: Use strict types
function processData(data: DataItem[]): number[] {
  return data.map(item => item.value);
}
```

**Unknown for runtime validation:**

```typescript
// ✅ Pattern for external data
function parseApiResponse(data: unknown): ApiResponse {
  if (!isApiResponse(data)) {
    throw new ValidationError('Invalid API response');
  }
  return data;
}
```

### Phase 5: Unify Error Handling

**Before (inconsistent):**
```typescript
// File A
try {
  await fetchData();
} catch (e) {
  console.error(e);
}

// File B
try {
  await fetchData();
} catch (err) {
  throw new Error(`Failed: ${err}`);
}

// File C
fetchData().catch(console.error);
```

**After (unified):**
```typescript
// Unified error handler
import { AppError, handleError } from '@/app/lib/errors';

async function fetchWithErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T | AppError> {
  try {
    return await fn();
  } catch (error) {
    return handleError(error);
  }
}

// Usage
const result = await fetchWithErrorHandling(() => fetchData());
if (result instanceof AppError) {
  // Handle error
} else {
  // Use data
}
```

### Phase 6: CI Gates

**Add to CI pipeline:**

```yaml
# .github/workflows/quality.yml
name: Quality Gates

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Type Check
        run: npx tsc --noEmit
        
      - name: Lint
        run: npm run lint
        
      - name: Test
        run: npm test
        
      - name: Check for new 'any' types
        run: |
          ANY_COUNT=$(grep -r "as any" --include="*.ts" src/ | wc -l)
          if [ $ANY_COUNT -gt 10 ]; then
            echo "Error: $ANY_COUNT 'any' types found (limit: 10)"
            exit 1
          fi
```

### Phase 7: Code Review Standards

**PR Review Checklist:**

```markdown
## Quality Review Checklist

### Types
- [ ] No new `any` types introduced
- [ ] Return types explicit on public APIs
- [ ] Props/interfaces defined, not inferred

### Error Handling
- [ ] Errors handled, not silently caught
- [ ] Error messages user-friendly
- [ ] Async errors caught properly

### Testing
- [ ] New code has tests
- [ ] Tests pass
- [ ] Edge cases covered

### Conventions
- [ ] Follows naming standards
- [ ] File organization matches pattern
- [ ] No console.log in production code
```

## Common Patterns

### Pattern: Gradual Type Strictness

```typescript
// Step 1: Allow implicit any (tsconfig.json)
"noImplicitAny": false

// Step 2: Fix critical files, enable for new code
"noImplicitAny": true,
"strictNullChecks": false  // Still permissive

// Step 3: Full strict mode
"strict": true
```

### Pattern: Boy Scout Rule

```typescript
// When fixing bug in legacy file:

// ❌ BAD: Minimal change
function buggyFunction() {
  // ...fix bug only...
}

// ✅ GOOD: Fix bug + small improvements
function fixedFunction() {
  // ...fix bug...
  // + remove unused import
  // + add return type
  // + rename unclear variable
}
```

### Pattern: Type Guards

```typescript
// Create type guards for runtime validation
function isStock(obj: unknown): obj is Stock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'symbol' in obj &&
    typeof (obj as Stock).symbol === 'string'
  );
}

// Use in API boundaries
function processStockData(data: unknown): Stock {
  if (!isStock(data)) {
    throw new ValidationError('Invalid stock data');
  }
  return data;
}
```

## Common Mistakes

| Mistake | Why It Happens | Fix |
|---------|---------------|-----|
| Giant refactor PRs | Trying to "clean up" everything | Module-by-module approach |
| Disabling lint rules | Too many errors to fix | Fix incrementally, don't disable |
| Fixing style in logic PRs | Mixing concerns | Separate style PRs |
| Ignoring types in tests | "It's just tests" | Test types matter too |
| Adding more `any` | Quick fix pressure | Create proper types |
| Inconsistent naming | No clear standard | Document and enforce |

## Real-World Examples

**Example 1: Any Type Reduction**

```bash
# Initial state
grep -r "as any" --include="*.ts" | wc -l
# 247

# After 3 months of incremental fixes
grep -r "as any" --include="*.ts" | wc -l
# 12 (only in test mocks)
```

**Example 2: Error Handling Unification**

```typescript
// Before: 5 different patterns
// After: Single unified pattern with typed errors
```

**Example 3: File Organization**

```
# Before: Type-based
components/
  Button.tsx
  Input.tsx
  Modal.tsx
features/
  trading/
    api.ts
    store.ts
    utils.ts

# After: Feature-based
features/
  trading/
    components/
      OrderPanel.tsx
      PositionTable.tsx
    api/
      tradingApi.ts
    store/
      tradingStore.ts
    utils/
      calculations.ts
```

## Integration with Other Skills

**REQUIRED SUB-SKILLS:**
- `systematic-refactoring-execution` - For structural changes
- `pr-quality-enforcement` - For maintaining gates
- `roadmap-driven-development` - For prioritizing fixes

**WORKS WELL WITH:**
- `test-driven-development` - Add types via tests
- `writing-plans` - Create refactoring plans
- `variant-analysis` - Find pattern inconsistencies

## Metrics to Track

```bash
# Type safety
grep -r "as any" --include="*.ts" | wc -l
grep -r "as unknown" --include="*.ts" | wc -l

# Lint health
npm run lint 2>&1 | grep -c "error"
npm run lint 2>&1 | grep -c "warning"

# Test coverage
npm run test -- --coverage 2>&1 | grep "All files"

# File organization
find app -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
# Average lines per file decreasing = better organization
```

## Success Criteria

- Unified patterns across codebase
- Type safety improved (any types reduced)
- CI passes consistently
- New code follows standards automatically
- Developer onboarding simplified
- Refactoring velocity maintained
- No giant cleanup PRs needed

## Workflow Summary

```
1. ASSESS
   ├── Run lint/typecheck
   ├── Identify worst offenders
   └── Prioritize by impact

2. ESTABLISH
   ├── Document standards
   ├── Create examples
   └── Set up CI gates

3. REFACTOR
   ├── Pick one module
   ├── Fix all issues
   └── Commit focused change

4. PREVENT
   ├── PR review checklist
   ├── Automated gates
   └── Team conventions

5. REPEAT
   └── Next module
```
