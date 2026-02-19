# Palette's Journal 🎨

## 2026-02-05 - Invisible Accessibility Wins
**Learning:** Even in a data-heavy application like a trading platform, dynamic feedback (success/error messages) is often invisible to screen readers without explicit `role="alert"` or `role="status"`. The visual "toast" pattern is common but requires these roles to be truly accessible.
**Action:** Always check dynamic message containers for appropriate ARIA roles, even if they are visually prominent.

## 2026-02-09 - Accessible Filters
**Learning:** Filter buttons that act as "select one" but are implemented as `<button>` elements (not radios) benefit significantly from `aria-pressed`. It provides the missing state information that visual styling (background color) communicates to sighted users.
**Action:** When implementing filter sets as buttons, ensure `aria-pressed` reflects the active state.

## 2026-02-18 - Semantic Structures in Modals
**Learning:** Complex components like `AlertConditionManager` often use `div`s for layout (e.g., tabs, modals) without semantic roles. This makes navigation impossible for screen readers. Explicitly adding `role="dialog"`, `aria-modal="true"`, and `role="tablist"` transforms a confusing "soup of divs" into a navigable application structure.
**Action:** When creating or reviewing modal interfaces with tabs, always ensure the container has `role="dialog"` and the tab controls use the `tablist`/`tab` pattern.
