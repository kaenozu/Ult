## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.

## 2026-03-18 - Float64Array and fill(NaN) Overhead in V8

**Learning:** When writing performance-critical pure mathematical functions like technical indicators (SMA, EMA), instantiating `Float64Array` and using `.fill(NaN)` creates significant memory allocation and garbage collection overhead. In V8/Node.js, standard JavaScript arrays pre-allocated with a specific length and initialized explicitly with `NaN` in loops, combined with `val === val` identity checks instead of the built-in `isNaN(val)` function, yields up to ~50% performance improvement.
**Action:** When optimizing tight numerical loops processing financial arrays (e.g. `prices: number[]`), avoid `Float64Array` if the input is already a standard array, allocate via `new Array(length)` instead, initialize missing slots manually inside the primary loops, and replace `isNaN(val)` checks with the faster `val === val` equivalent (with a `Number(val)` wrapper for safe coercion of potential undefined elements).
