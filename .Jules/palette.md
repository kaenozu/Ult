## 2024-05-23 - Mobile Sidebar Accessibility
**Learning:** Mobile-only interactive elements (like hamburger menus or sidebar toggles) are often overlooked in accessibility passes because they are hidden on desktop. These are critical for mobile users and screen readers.
**Action:** Always check `lg:hidden` or `md:hidden` elements for `aria-label` and correct state attributes like `aria-expanded`. Ensure consistent close mechanisms across different drawers/sidebars.

## 2024-05-24 - ARIA Tab Accessibility Pitfall
**Learning:** Adding `role="tab"` with `tabIndex={-1}` on inactive tabs *without* implementing arrow key navigation (Roving Tabindex) breaks keyboard accessibility entirely. It removes tabs from the natural tab sequence.
**Action:** For simple tab implementations, either implement full arrow key navigation handlers or avoid setting `tabIndex` manually (letting them default to naturally tabbable `0`), ensuring all tabs remain reachable via Tab key.

## 2026-02-01 - Div-based Toggle Buttons
**Learning:** Found toggle switches implemented as `div` elements with `onClick` handlers. This pattern is inaccessible to screen readers as it lacks `role="switch"` and keyboard focus support.
**Action:** Refactor to use native `<button>` elements with `role="switch"` and `aria-checked`. Ensure visual toggle state matches ARIA state.

## 2026-02-06 - Accessible Table Sorting
**Learning:** Sortable table headers implemented with `onClick` on the `<th>` element are not keyboard accessible. Screen readers also miss the sortable capability and state without `role="button"` and `aria-sort`.
**Action:** Wrap header content in a `<button>` element that fills the cell, and apply `aria-sort="ascending|descending|none"` to the `<th>`.

## 2026-02-09 - Accessible Names for Switch Controls
**Learning:** Toggle switches (`role="switch"`) implemented without an `aria-label` or `aria-labelledby` are announced as generic "Switch" by screen readers, providing no context about what they control. Proximity to text is not enough.
**Action:** Always link the visual label to the control using `useId` and `aria-labelledby`, ensuring programmatic association.
