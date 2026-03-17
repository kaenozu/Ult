## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.
## 2026-03-24 - Pre-allocating Arrays and Math Avoidance in V8 Hot Loops
**Learning:** When calculating technical indicators (like SMA, EMA, RSI) over large arrays (`number[]` or `Float64Array`), using `Array.prototype.push()` and repeated array slicing (`Array.slice()`) inside loops causes significant memory allocation and Garbage Collection (GC) overhead. Furthermore, repeated division inside a hot loop is slower than multiplying by a pre-calculated inverse constant (`const invPeriod = 1 / period;`).
**Action:** Always prefer `new Array(length)` to pre-allocate arrays when the output size is known (which is true for technical indicators). Use a single pass or sliding window algorithm instead of `slice()` or re-calculating sums. Replace division by a constant inside a loop with multiplication by the inverse constant.
