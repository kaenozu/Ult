
## 2026-03-08 - [Avoid In-Place Array Mutation]
**Learning:** In React components, calling in-place mutation methods like `.reverse()` directly on arrays during the render phase (e.g., `{asks.reverse().map(...)}`) mutates the array in-place. This causes UI toggling/flickering bugs and is a common anti-pattern.
**Action:** Always copy the array first before mutating it for rendering (e.g., `{[...asks].reverse()}`).
