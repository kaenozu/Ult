## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.

## 2026-03-07 - [V8 Array Allocation and Fill Performance]
**Learning:** In V8 (Node.js/Chrome), creating a `new Float64Array(prices)` from a standard Javascript array inside frequently called utility functions (like `calculateSMA` and `calculateEMA`) degrades performance due to memory allocation and copying overhead. Furthermore, pre-allocating arrays with `new Array(length)` and manually setting initial `NaN` values via a targeted `for` loop up to `period - 1` is significantly faster than calling `.fill(NaN)` on the entire array, which wastes cycles on elements that will be immediately overwritten. Finally, replacing division by `period` with multiplication by an inverse constant (`invPeriod = 1 / period`) inside the sliding window hot loop yields compounding performance benefits.
**Action:** When optimizing technical indicators or other tight data processing loops, rely on V8's native optimizations for homogeneous standard number arrays (`PACKED_DOUBLE_ELEMENTS`) instead of coercing to TypedArrays. Replace blanket `.fill()` calls with targeted initialization loops, and pre-calculate inverse constants to replace division operations.
