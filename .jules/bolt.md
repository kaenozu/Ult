## 2026-03-05 - React useEffect polling trap with derived dependencies
**Learning:** A `useEffect` loop that schedules a `setTimeout` can turn into an infinite rapid-fire loop if the effect itself depends on a value that is updated by the effect's action.
In `StockTable.tsx`, `useEffect` depended on `getAdaptiveInterval`, which depended on `stocks`.
The effect fetched data -> updated `stocks` -> recreated `getAdaptiveInterval` -> restarted `useEffect` -> fetched data immediately (ignoring timeout).
**Action:** When implementing polling with `useEffect` and `setTimeout`, ensure the recursive scheduling function (or its dependencies) is stable (using `useRef` to access latest state) so the effect doesn't restart on every data update.
