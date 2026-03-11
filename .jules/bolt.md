## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.

## 2026-03-10 - [Optimize ATR and ADX Hot Loops]
**Learning:** In V8 (Node.js/Chrome), repeating array indexing (e.g. `data[i-1]`) and performing division (`/ period`) inside tightly bound data-processing loops introduces significant overhead. Accessing object properties across loop iterations forces V8 to perform bounds checks and memory lookups. Similarly, division operations are more CPU-intensive than multiplication.
**Action:** When working in hot loops (e.g. computing historical indicator series for ADX or ATR), explicitly cache previous elements using a local variable (`let prev = data[i-1]`) and pre-calculate the inverse constant for denominators (`const invPeriod = 1 / period`) to replace the division operation (`x * invPeriod`). Implementing this yields a >15-20% execution speed up.
