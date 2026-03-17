## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.

## 2025-05-15 - Array Pre-allocation and Strict V8 Micro-optimizations in Hot Loops
**Learning:** Pre-allocating numeric arrays with `.fill(NaN)` creates significant V8 overhead compared to raw `new Array(length)` with subsequent inline `result[i] = NaN` assignments during iteration. Combining array initialization with the primary loop avoids multiple passes over the array memory. Furthermore, inline strict equality checks for NaN (`val !== val` or `val === val`) instead of the global `isNaN()` function substantially increase processing speed in hot numeric loops. Pre-calculating inverses (`1 / period`) to replace division with multiplication also provides compounding, minor performance gains in tight arithmetic loops like SMA and EMA calculations.
**Action:** When implementing or optimizing calculation-heavy functions involving large arrays (like financial indicators), initialize arrays natively without `.fill()`, manually handle initialization or fallback values within the iteration, prefer inline identity checks for `NaN`, and replace division operations inside loops with pre-computed inverse multiplication.
