## 2024-05-23 - Mobile Sidebar Accessibility
**Learning:** Mobile-only interactive elements (like hamburger menus or sidebar toggles) are often overlooked in accessibility passes because they are hidden on desktop. These are critical for mobile users and screen readers.
**Action:** Always check `lg:hidden` or `md:hidden` elements for `aria-label` and correct state attributes like `aria-expanded`. Ensure consistent close mechanisms across different drawers/sidebars.

## 2024-05-24 - ARIA Tab Accessibility Pitfall
**Learning:** Adding `role="tab"` with `tabIndex={-1}` on inactive tabs *without* implementing arrow key navigation (Roving Tabindex) breaks keyboard accessibility entirely. It removes tabs from the natural tab sequence.
**Action:** For simple tab implementations, either implement full arrow key navigation handlers or avoid setting `tabIndex` manually (letting them default to naturally tabbable `0`), ensuring all tabs remain reachable via Tab key.
