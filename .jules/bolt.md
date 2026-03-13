## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.

## 2026-03-14 - V8 Array Initialization and Float64Array Overhead
**Learning:** In hot functions like SMA and EMA, using `new Float64Array(prices)` inside the function and calling `new Array(length).fill(NaN)` actually degraded V8 performance due to allocation overhead and copying compared to direct iteration with standard arrays (which V8 treats as packed double elements `PACKED_DOUBLE_ELEMENTS` under the hood when homogeneous). Also, relying on `isNaN(val)` is slower than `val !== val` (or `val === val`). Precomputing inverses (`const invPeriod = 1 / period`) avoids expensive division inside loops.
**Action:** Remove `Float64Array` usage in standard iteration loops for financial indicators when inputs are already standard numbers. Remove `.fill(NaN)` and handle initialization directly during the initial window loops to save an entire array iteration pass.
