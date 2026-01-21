---
name: UX Polish & Verification
description: A systematic workflow for refining UI features into production-grade quality, focusing on Hydration, Loading States, Visual Feedback, and Browser Verification.
---

# UX Polish & Verification Skill

## Purpose
To ensure every UI feature is not just "functional" but **polished**, **robust**, and **delightful**. This skill codifies the lessons learned from fixing the Visual Journal and Dashboard.

## Core Philosophy: "No Naked UIs"
1.  **Zero Console Errors**: Hydration errors and CORS blocks are unacceptable. They erode trust.
2.  **Always Loading**: Never show a blank space. Use `Skeleton` loaders that mimic the final content shape.
3.  **Juice It**: Every user action (Click, Submit, Capture) must have immediate visual feedback (Flash, Ripple, Toast, Sound).
4.  **Verify via Browser**: "It compiles" is not enough. "It renders without red text" is the standard.

## Checklist

### 1. Hydration & Console Hygiene
- [ ] **Hydration Mismatch**: 
    - Does the server HTML match client HTML? 
    - Fix: Use `suppressHydrationWarning` on `html`/`body` for dynamic attributes (themes, fonts).
    - Fix: ongoing `useEffect` for random/time-based data.
- [ ] **CORS**:
    - Are API requests blocked?
    - Fix: Check `backend/src/core/config.py` `cors_origins`. Remove wildcards `*` if using credentials.
- [ ] **Unique Keys**: Ensure all list items have unique `key` props.

### 2. Loading Experience (Perceived Performance)
- [ ] **Skeleton UI**:
    - Do NOT use simple spinners for main content.
    - Use `src/components/ui/skeleton.tsx`.
    - Match the height/width of the loaded content to prevent layout shift (CLS).
    ```tsx
    {isLoading ? <Skeleton className="h-4 w-[200px]" /> : <Content />}
    ```
- [ ] **Empty States**:
    - What happens if data is null/empty? Show a friendly placeholder, not blank space.

### 3. "Juice" (Micro-interactions)
- [ ] **Action Feedback**:
    - Did the button click register?
    - Add `active:scale-95` to buttons.
    - Add Flash overlay (white div fade-out) for captures/snapshots.
- [ ] **Transitions**:
    - Use `animate-in` / `animate-out` (Tailwind) or `framer-motion` for smooth entry/exit.

### 4. Browser Verification Protocol
- [ ] **Subagent Test**:
    1.  Navigate to the page.
    2.  **Explicitly check console logs** for Red text.
    3.  Interact with the feature (Click/Scroll).
    4.  Verify visual changes (Screenshot).

## Common Fixes

### Resolving Hydration Errors
```tsx
// src/app/layout.tsx
<body suppressHydrationWarning>...</body>
```

### Resolving CORS (FastAPI)
```python
# backend/src/core/config.py
cors_origins=["http://localhost:3000", "http://127.0.0.1:3000"] # No wildcard if creds=True
```

### Adding Flash Effect
```tsx
const [flash, setFlash] = useState(false);
useEffect(() => { if(flash) setTimeout(() => setFlash(false), 300) }, [flash]);

return (
  <>
    {flash && <div className="fixed inset-0 bg-white animate-out fade-out duration-300 pointer-events-none z-50" />}
    <Button onClick={() => setFlash(true)}>Capture</Button>
  </>
)
```
