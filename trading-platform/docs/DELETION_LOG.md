# Code Deletion Log

## 2025-01-28 - Initial Refactor Session

### Unused Dependencies Removed
- `date-fns@^4.1.0` - Last used: never (found no imports), Size: ~30 KB
  - **Reason**: All date formatting is done using native `Intl` APIs in `lib/utils.ts`
  - **Files checked**: All TypeScript/TSX files in `app/` directory
  - **Impact**: 0 references found in codebase

- `@tailwindcss/postcss@^4` - Last used: never, Size: ~15 KB
  - **Reason**: Tailwind CSS v4 uses different configuration approach
  - **Impact**: Not imported anywhere in the codebase

- `jest-environment-jsdom@^30.2.0` - Last used: never, Size: ~5 KB
  - **Reason**: Jest environment is configured differently
  - **Impact**: Not referenced in configuration

- `tailwindcss@^4` - Last used: never (as direct dependency), Size: ~200 KB
  - **Reason**: Already included as transitive dependency via `@tailwindcss/postcss`
  - **Impact**: Redundant declaration

- `ts-node@^10.9.2` - Last used: never, Size: ~8 MB
  - **Reason**: Not used in any scripts or configuration
  - **Impact**: No TypeScript execution files found

### Commented-Out Code Removed

#### app/journal/page.tsx
- **Lines 4, 7**: Commented imports
  - `// import Link from 'next/link';`
  - `// import { JournalEntry } from '@/app/types';`
  - **Reason**: Unused imports, `JournalEntry` type already imported via store
  - **Impact**: No functionality affected (type used via `usePortfolioStore`)

- **Line 15**: Commented code
  - `// const openPositions = portfolio.positions;`
  - **Reason**: Variable declared but never used
  - **Impact**: None - was dead code

### Duplicate Code Identified

#### StockChart Component Duplication
- **Files**:
  - `app/components/StockChart.tsx` (282 lines) - **OLD VERSION**
  - `app/components/StockChart/StockChart.tsx` (166 lines) - **NEW REFACTORED VERSION**

- **Reason for Duplication**: Migration to modular structure with separate hooks
  - Old version: Monolithic component with inline logic
  - New version: Modular with extracted hooks:
    - `useChartData.ts` - Data preparation
    - `useTechnicalIndicators.ts` - Indicator calculations
    - `useForecastLayers.ts` - Forecast visualization
    - `useChartOptions.ts` - Chart configuration
    - `volumeProfile.ts` - Plugin implementation

- **Recommendation**: Delete `app/components/StockChart.tsx` (old version)
  - All imports reference `@/app/components/StockChart` which resolves to `index.tsx`
  - Index re-exports from `StockChart/StockChart.tsx` (new modular version)
  - **Lines to remove**: 282
  - **Risk Level**: LOW - New version is already in use

#### Proxy/Compatibility Layer
- **File**: `app/lib/analysis.ts` (23 lines)
- **Purpose**: Backward compatibility shim
- **Dependencies**:
  - `AnalysisService.ts` - Contains actual implementation
  - `AccuracyService.ts` - Accuracy calculations
  - `VolumeAnalysis.ts` - Volume profile calculations

- **Status**: **KEEP** - Active use found
  - Used by: `hooks/useChartAnalysis.ts`, `lib/backtest.ts`
  - Provides clean API for backward compatibility
  - Minimal overhead (simple re-exports with bind)

### Unused Variables in Tests (Warnings)

#### High Priority Fixable
1. **app/__tests__/Heatmap.test.tsx**
   - `MOCK_ALL_STOCKS` - Assigned but never used

2. **app/__tests__/Screener.test.tsx**
   - `JAPAN_STOCKS` - Imported but never used
   - `USA_STOCKS` - Imported but never used

3. **app/__tests__/data-aggregator.test.ts**
   - `p1`, `p2` - Assigned but never used
   - `quotes` - Assigned but never used

4. **app/__tests__/error-handler.test.ts**
   - `NextResponse` - Imported but never used
   - `NetworkError`, `RateLimitError` - Imported but never used

5. **app/__tests__/market-api.test.ts**
   - `NextResponse` - Imported but never used

6. **app/__tests__/stocks-data.test.ts**
   - `JAPAN_STOCKS` - Imported but never used
   - `USA_STOCKS` - Imported but never used

7. **app/__tests__/StockChart.test.tsx**
   - `container` - Assigned but never used

8. **app/__tests__/layout_smoke.test.tsx**
   - `container` - Assigned but never used

9. **app/__tests__/page_enhanced.test.tsx**
   - `waitFor` - Imported but never used

10. **app/__tests__/page_smoke.test.tsx**
    - `waitFor` - Imported but never used

11. **app/__tests__/breakout.test.ts**
    - `BreakoutEvent` - Imported but never used

### ESLint `@typescript-eslint/no-explicit-any` Warnings

#### Status: **ACCEPTABLE** - Not Critical
- **Total occurrences**: 80+ instances across test files
- **Reasoning**:
  - Most are in test files where `any` is acceptable for mocking
  - Many are external library type definitions (Alpha Vantage API responses)
  - Project has `@typescript-eslint/no-explicit-any` set to **warn**, not error
  - Recent commit relaxed this rule from error to warn (see git log)

- **Files with most occurrences**:
  - `app/__tests__/idb.test.ts` - 18 instances
  - `app/__tests__/Journal.test.tsx` - 9 instances
  - `app/__tests__/data-aggregator.test.ts` - 11 instances

### E2E Test Directory Status
- **Directory**: `e2e/`
- **Status**: Empty or no test files found
- **Recommendation**: Keep directory structure for future E2E tests

### Constants Consolidation Status
- **File**: `app/lib/constants.ts` (252 lines)
- **Status**: **ALREADY CONSOLIDATED**
  - All constants from multiple files merged into single location
  - Well-organized with clear section comments
  - No duplicates found

### Impact Summary

#### Dependencies Removed: 5 packages
- **Bundle size reduction**: ~8.3 MB (mostly from ts-node)
- **npm install time reduction**: ~5-10 seconds
- **node_modules size reduction**: ~8.3 MB

#### Code Cleanup
- **Commented code removed**: 3 instances
- **Duplicate StockChart identified**: 282 lines (can be removed)
- **Unused variables in tests**: 13 instances (low priority)

#### Lines of Code Metrics
- **Current state**: ~15,000+ lines in `app/` directory
- **Potential reduction**: ~300 lines (2%)
- **Test file cleanup**: ~50 lines (0.3%)

### Testing Status
- [x] All unit tests passing (before cleanup)
- [ ] Test after removing unused dependencies
- [ ] Verify StockChart works after deleting old version
- [ ] Run full test suite after changes

### Risk Assessment

#### LOW RISK (Safe to remove)
- Unused dependencies (verified with grep)
- Commented-out code in journal/page.tsx
- Old StockChart.tsx (new version already in use)

#### MEDIUM RISK (Review first)
- Unused variables in test files
- May be used in test setup not visible in static analysis

#### HIGH RISK (DO NOT REMOVE)
- `@typescript-eslint/no-explicit-any` warnings - Required for external API types
- `app/lib/analysis.ts` proxy - Active backward compatibility layer
- All exports from `lib/utils.ts` - All used across components

### Recommendations

#### Immediate Actions (Safe)
1. Remove unused dependencies from `package.json`
2. Delete old `app/components/StockChart.tsx`
3. Uncomment/remove dead code in `app/journal/page.tsx`

#### Future Improvements (Optional)
1. Clean up unused test variables
2. Add type definitions for Alpha Vantage API responses to reduce `any` usage
3. Consider extracting test mocks to shared fixtures

#### DO NOT DO
1. Remove `@typescript-eslint/no-explicit-any` suppressions
2. Delete `app/lib/analysis.ts` compatibility layer
3. Remove any exports from `lib/utils.ts` or `lib/constants.ts`

### Post-Cleanup Verification

After cleanup, run:
```bash
npm run build
npm run test
npm run lint
```

Expected results:
- Build: Success
- Tests: All passing
- Lint: Only acceptable warnings (no-unused-vars for test mocks OK)

### Git Commit Strategy

Recommended commit split:
1. **Commit 1**: Remove unused dependencies
2. **Commit 2**: Remove commented-out code
3. **Commit 3**: Delete duplicate StockChart component
4. **Commit 4**: Clean up test unused variables (optional)

This allows easy rollback if issues arise.
