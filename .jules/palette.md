## 2024-05-22 - Form Accessibility in Trading Panels
**Learning:** Trading interfaces often neglect form accessibility in favor of density. Adding explicit `htmlFor` labels and `aria-label` to inputs like "Quantity" and "Price" is critical because screen reader users need to know exactly what they are trading and at what price, especially when financial risk is involved.
**Action:** Always check that high-stakes input fields (money, quantity) have explicit programmatic labels, even if the visual design implies the relationship.

## 2024-05-24 - Keyboard Accessibility for Interactive Tables
**Learning:** Interactive table rows (used for selection) often lack keyboard support, making the primary navigation path inaccessible to non-mouse users. Additionally, actions revealed only on hover (like "Delete") are invisible to keyboard users unless `focus:opacity-100` is applied.
**Action:** Always add `tabIndex={0}` and `onKeyDown` (for Enter/Space) to clickable rows, and ensure hidden action buttons become visible when focused.
