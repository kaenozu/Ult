# Coverage Visualization Guide

## Overview

This guide explains how to view and analyze test coverage for the ULT Trading Platform. We use Jest for unit/integration test coverage and Codecov for CI/CD coverage tracking.

## Quick Reference

| Method | Command/Access | Best For |
|--------|---------------|----------|
| Local HTML Report | `npm run test:coverage` then open `coverage/lcov-report/index.html` | Interactive exploration |
| Codecov Dashboard | Click badge on README or visit https://codecov.io/gh/kaenozu/Ult | Historical trends, PR comments |
| CLI Upload | `npx codecov` (in CI) | Automated reporting |
| GitHub Checks | PR page → Checks tab | Quick per-PR coverage delta |

## 1. Local Coverage Reports

After running tests with coverage:

```bash
cd trading-platform
npm run test:coverage
```

Open the HTML report:

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

The HTML report provides:
- **File-level coverage**: See which files are tested
- **Line-by-line highlighting**: Green = covered, Red = uncovered
- **Branch coverage**: Visualize which branches are taken
- **Clickable navigation**: Jump between files

## 2. Codecov Integration

The project is integrated with [Codecov](https://codecov.io/) for cloud-based coverage tracking.

### Access Codecov Dashboard

1. Visit the public dashboard: https://codecov.io/gh/kaenozu/Ult
2. View:
   - Overall coverage trends over time
   - Coverage breakdown by file
   - Patch coverage (only changed lines in PRs)
   - Historical comparison between branches

### Codecov Badge

Add coverage badge to README or other docs:

```markdown
[![codecov](https://codecov.io/gh/kaenozu/Ult/branch/main/graph/badge.svg)](https://codecov.io/gh/kaenozu/Ult)
```

## 3. Coverage Data Formats

Jest generates multiple coverage output formats in the `coverage/` directory:

| File | Format | Use Case |
|------|--------|----------|
| `coverage-final.json` | JSON | Programmatic access, custom processing |
| `lcov.info` | LCOV | Upload to Codecov, many tools |
| `clover.xml` | Clover | TeamCity, some CI systems |
| `coverage-summary.json` | JSON | Quick summary metrics |

### Example: Parse Coverage Summary

```typescript
import { readFileSync } from 'fs';

const summary = JSON.parse(
  readFileSync('trading-platform/coverage/coverage-summary.json', 'utf-8')
);

console.log(`Total coverage: ${summary.total.lines.pct}%`);
console.log(`Statements: ${summary.total.statements.pct}%`);
console.log(`Branches: ${summary.total.branches.pct}%`);
console.log(`Functions: ${summary.total.functions.pct}%`);
```

## 4. CI/CD Coverage Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) includes:

1. **Test with coverage**: `npm run test:coverage`
2. **Upload to Codecov**: Automatic via Codecov action
3. **PR comments**: Codecov posts coverage changes in PRs
4. **Status checks**: Coverage threshold enforcement

### Coverage Threshold Enforcement

In `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

If coverage drops below thresholds, the CI job fails, blocking merges.

## 5. Coverage Analysis Tips

### Identify Uncovered Code

Use the HTML report to find "red" lines. Common reasons:

- **Error paths not tested**: Throw statements, catch blocks
- **Conditional branches**: `if/else` where one branch is untested
- **Platform-specific code**: Browser vs Node.js checks
- **Mocked dependencies**: Over-mocking can skip real logic

### Increase Coverage Meaningfully

- **Test edge cases**: Empty inputs, null values, extreme values
- **Test error handling**: Simulate API failures, network errors
- **Test async flows**: Await promises, use fake timers
- **Avoid testing implementation details**: Focus on observable behavior

### Avoid Coverage Anti-Patterns

```typescript
// ❌ BAD: Testing internal implementation
it('calls private method', () => {
  const spy = jest.spyOn(instance, '_privateMethod');
  instance.publicMethod();
  expect(spy).toHaveBeenCalled(); // This just increases coverage numbers
});

// ✅ GOOD: Testing observable outcome
it('processes data correctly', () => {
  const result = instance.publicMethod(input);
  expect(result).toEqual(expectedOutput);
});
```

## 6. Common Issues & Solutions

### Problem: "No coverage information collected"

**Cause**: Tests ran without `--coverage` flag or `collectCoverage: true` in Jest config.

**Solution**: Ensure you use `npm run test:coverage` not `npm test`.

---

### Problem: Coverage not uploading to Codecov

**Cause**: Missing `CODECOV_TOKEN` or network issue.

**Solution**:
- For PRs from fork: Codecov doesn't upload from forks by default
- Check CI logs for upload errors
- Verify Codecov app is installed in GitHub repo settings

---

### Problem: High coverage but tests are flaky

**Cause**: Coverage measures quantity, not quality. 100% coverage with poor assertions is meaningless.

**Solution**: Focus on **test quality**:
- Assert on behavior, not just that code ran
- Use realistic test data
- Include integration tests that cover multiple units together

---

### Problem: Coverage drop after refactoring

**Cause**: Code moved to new files, Jest config doesn't include new paths.

**Solution**: Update `jest.config.js` `collectCoverageFrom` array to include new file patterns.

```javascript
collectCoverageFrom: [
  'app/lib/**/*.ts',
  '!app/lib/**/*.test.ts',
  '!app/lib/**/__tests__/**' // Add new exclusions if needed
]
```

## 7. Advanced: Custom Coverage Reports

### Generate HTML Report in CI

```yaml
# .github/workflows/ci.yml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./trading-platform/coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
```

### Compare Coverage Between Branches

Use Codecov's comparison tool:

1. Go to Codecov dashboard
2. Select "Compare" tab
3. Choose base branch (e.g., `main`) and compare branch (e.g., `feature/new`)
4. See exactly which files/lines changed in coverage

## 8. Coverage Goals Tracking

Monitor progress toward 80% targets:

```bash
# Generate coverage summary
cd trading-platform
npm run test:coverage

# View current stats
cat coverage/coverage-summary.json | grep -E '"pct"'
```

Add to PR template (`.github/pull_request_template.md`):

```markdown
## Coverage Changes

- [ ] No coverage decrease
- [ ] New code has >= 80% coverage
- [ ] Uncovered code documented as intentional (e.g., error boundaries)
```

## 9. Resources

- [Jest Coverage Documentation](https://jestjs.io/docs/cli#--coverage)
- [Codecov Documentation](https://docs.codecov.com/)
- [Istanbul (underlying coverage engine)](https://github.com/istanbuljs/istanbuljs)

## 10. Coverage Best Practices

✅ **DO**:
- Keep coverage reports in `.gitignore` (they're generated)
- Run coverage on CI, not commit to repo
- Use coverage as a guide, not a target
- Test edge cases and error paths
- Review coverage in PRs

❌ **DON'T**:
- Commit `coverage/` directory to git
- Chase 100% coverage at all costs
- Write meaningless tests just to increase numbers
- Ignore uncovered production code
- Use coverage as the only quality metric

---

**Last Updated**: 2025-02-03
**Owner**: DevOps Team
**Related**: [README.md](./README.md#テストカバレッジ), [CI/CD Pipeline](./docs/ci-cd.md)
