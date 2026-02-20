## 2026-02-18 - Array.slice vs Index Loop Performance

**Learning:** Replacing `Array.slice` with manual index-based loops in hot paths (like data aggregation) can significantly reduce memory allocation and GC pressure, even if the raw execution time improvement is modest or sometimes variable due to JIT optimizations.
**Action:** When processing large arrays in chunks, prefer passing index ranges (start/end) to processing functions or using nested loops instead of creating temporary subarrays with `slice`, especially if the chunk size is small and the number of chunks is large.

## 2026-02-18 - Redundant Computations in Analysis Pipelines

**Learning:** Functions in analysis pipelines (like `calculateVolumeProfile` called by `analyzeVolumeProfile`) are often called multiple times redundantly. Passing computed results as optional arguments allows reuse without breaking public APIs, yielding massive gains (2x in this case).
**Action:** Always check the call graph of expensive analysis functions. If a "master" function calls multiple sub-functions that depend on the same expensive intermediate result, refactor to compute it once and pass it down.

## 2026-02-23 - Indicator Validity Logic vs Performance

**Learning:** Reusing generic validation logic (like `_getValidPrice` which enforces `>= 0`) in technical indicators can be dangerous. MACD signals were failing silently for downtrends because the Signal line calculation (an EMA) was rejecting negative MACD values as invalid.
**Action:** When optimizing or implementing technical indicators, explicit logic is often safer and faster than generic helpers. Inlining the EMA calculation allowed both a 3x speedup and a critical bug fix for negative values.
