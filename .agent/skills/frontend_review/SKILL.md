---
name: Frontend Code Review
description: Trigger when the user requests a review of frontend files (e.g., .tsx, .ts, .js). Support both pending-change reviews and focused file reviews while applying the checklist rules.
---

# Frontend Code Review

## Intent
Use this skill whenever the user asks to review frontend code (especially .tsx, .ts, or .js files). Support two review modes:
- **Pending-change review** – inspect staged/working-tree files slated for commit and flag checklist violations before submission.
- **File-targeted review** – review the specific file(s) the user names and report the relevant checklist findings.

## Checklist (Condensed)
*Since original references are external, use these core Dify-inspired principles:*

### Code Quality
- [ ] **Naming:** Variable/Function names should be descriptive and camelCase. Component names PascalCase.
- [ ] **Hooks:** Ensure `useMemo` and `useCallback` are used correctly to prevent re-renders. Check dependency arrays.
- [ ] **Clean Code:** No `console.log` or commented-out code.
- [ ] **Types:** No `any`. Use properly defined interfaces.

### Performance
- [ ] **Lazy Loading:** Use `React.lazy` for large components/routes.
- [ ] **Render Cycle:** Avoid side effects in render body. Use `useEffect`.
- [ ] **Images:** confirm `next/image` is used instead of `<img>`.

### Business Logic
- [ ] **Error Handling:** API calls must have try-catch or error boundaries.
- [ ] **State Management:** Local state should stay local. Global state (Zustand/Redux) only when shared.

## Required output
When invoked, the response must exactly follow one of the two templates:

### Template A (any findings)
```markdown
# Code review
Found <N> urgent issues need to be fixed:

## 1 <brief description of bug>
FilePath: <path> line <line>
<relevant code snippet or pointer>

### Suggested fix
<brief description of suggested fix>

---
(repeat for each urgent issue)

Found <M> suggestions for improvement:

## 1 <brief description of suggestion>
FilePath: <path> line <line>
<relevant code snippet or pointer>

### Suggested fix
<brief description of suggested fix>
```

### Template B (no issues)
```markdown
## Code review
No issues found.
```
