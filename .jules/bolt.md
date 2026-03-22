## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-24 - [MACD Performance & Bug Fix]
**Learning:** Generic `calculateEMA` utilities often enforce `price >= 0` (for financial data correctness), but derived indicators like MACD (Fast EMA - Slow EMA) can be negative. Reusing `calculateEMA` for the MACD Signal line caused the signal to vanish when MACD dipped below zero.
**Action:** For derived indicators, use specialized inline calculations or validation logic that permits negative values, rather than reusing strict price-based utilities. Single-pass implementation also yielded a 50% performance boost by avoiding intermediate array allocations.

## 2026-03-22 - [Optimizing Array Allocations and Math.abs in Hot Loops]
**Learning:** Replaced `new Array(length).fill(NaN)` with uninitialized arrays and inline element initialization, eliminated O(N) `Float64Array` mapping, utilized `val === val` identity checks over `isNaN`, and removed `Math.abs` branching for `else if (change < 0)` logic in `calculateSMA`, `calculateEMA`, and `calculateRSI` to massively reduce JavaScript garbage collector pressure and optimize CPU instruction pipelines in tight numeric loops, yielding a 30-50% speedup per function. I also learned that any benchmarking logic MUST be explicitly deleted before finishing a task as they pollute PR reviews and production codebase.
**Action:** When working on numerical algorithm functions inside a tight loop with lengths measuring the hundreds of thousands (like technical analysis algorithms), do not use `Array.fill` or allocate intermediate arrays (`Float64Array`), and remember to aggressively remove testing logic before PR submission.
