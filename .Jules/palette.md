## 2025-02-18 - Tab Accessibility Pattern
**Learning:** Using `role="tablist"`, `role="tab"`, and `role="tabpanel"` significantly improves navigation for screen reader users, but requires careful coordination of `aria-selected`, `aria-controls`, and `aria-labelledby`.
**Action:** Always wrap tab content in `role="tabpanel"` and ensure the active tab has `aria-selected="true"`. Use `focus-visible` styles to ensure keyboard users can see where they are.
