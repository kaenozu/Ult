## 2026-02-14 - Optimized StockTable Sorting
**Learning:** React components that sort large arrays (like stock lists) on every render can suffer from excessive garbage collection and CPU usage due to `toLowerCase()` calls in the sort comparator.
**Action:** Use `Intl.Collator` initialized outside the component (or memoized) for string comparisons. It avoids string allocation and is generally faster (up to ~1.8x in micro-benchmarks). Be aware that `Intl.Collator` handles natural sorting (`numeric: true`) which might slightly change behavior but usually for the better.
