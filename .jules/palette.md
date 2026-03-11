## 2026-03-10 - [Header Cash Edit Accessability]
**Learning:** Found that custom interactive elements (like `div` with `onClick`) used to edit sensitive numbers like cash balance are completely inaccessible to keyboard users and lack semantic names.
**Action:** Always add `role="button"`, `tabIndex={0}`, `aria-label`/`title`, a focus ring (`focus-visible:ring-2`), and an `onKeyDown` listener that catches `Enter` and `Space` when transforming non-interactive tags into clickable elements.
