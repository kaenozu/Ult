## 2024-05-23 - Mobile Sidebar Accessibility
**Learning:** Mobile-only interactive elements (like hamburger menus or sidebar toggles) are often overlooked in accessibility passes because they are hidden on desktop. These are critical for mobile users and screen readers.
**Action:** Always check `lg:hidden` or `md:hidden` elements for `aria-label` and correct state attributes like `aria-expanded`. Ensure consistent close mechanisms across different drawers/sidebars.
