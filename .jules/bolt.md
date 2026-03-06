## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.

## 2026-03-06 - V8 Homogeneous Array Optimization

**Learning:** When dealing with standard homogeneous arrays of numbers (like price data in technical indicators), V8 highly optimizes them as `PACKED_DOUBLE_ELEMENTS`. Creating a `new Float64Array()` from these standard arrays inside hot functions (like `calculateRSI`) actually introduces memory allocation and copying overhead that severely degrades performance. Direct array indexing combined with manually hoisting operations like `invPeriod = 1 / period` and replacing function calls (like `Math.abs`) with inline conditionals cuts execution time by over 50%.
**Action:** Do not use `Float64Array` inside utility functions when passing in a standard number array if the environment is V8/Node.js. Instead, directly index the standard array, manually pre-allocate result arrays with `new Array(length)` without `fill(NaN)`, and optimize the inner loop logic.
