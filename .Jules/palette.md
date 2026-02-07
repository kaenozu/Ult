# Palette's Journal 🎨

## 2026-02-05 - Invisible Accessibility Wins
**Learning:** Even in a data-heavy application like a trading platform, dynamic feedback (success/error messages) is often invisible to screen readers without explicit `role="alert"` or `role="status"`. The visual "toast" pattern is common but requires these roles to be truly accessible.
**Action:** Always check dynamic message containers for appropriate ARIA roles, even if they are visually prominent.
