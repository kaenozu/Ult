---
name: Refactor Assistant
description: Analyze code quality and provide refactoring suggestions for AGStock Ult codebase
---

# Refactor Assistant Skill

Refactor high-complexity React components in the codebase.

## Core Refactoring Patterns

### Pattern 1: Extract Custom Hooks
**When**: Component has complex state management, multiple `useState`/`useEffect`.
**Action**: Move logic to `src/hooks/use-<feature>.ts`.

```typescript
// ❌ Before
const Component = () => {
  const [data, setData] = useState(...)
  useEffect(() => { ... }, [])
  return <div>...</div>
}

// ✅ After
const Component = () => {
  const { data } = useFeatureData()
  return <div>...</div>
}
```

### Pattern 2: Extract Sub-Components
**When**: Single component has multiple UI sections (> 300 lines).
**Action**: Split into `components/features/<feature>/<SubComponent>.tsx`.

### Pattern 3: Simplify Conditionals
**When**: Deep nesting or complex switch statements.
**Action**: Use lookup maps or early returns.

### Pattern 4: React Query
**When**: Component handles raw `fetch`.
**Action**: Use `@tanstack/react-query` hooks (e.g., `useQuery`).

## Workflow
1. **Analyze**: Identify large components (e.g., `SystemMonitor.tsx`, `StockChart.tsx`).
2. **Plan**: Propose a split (Hooks vs UI).
3. **Execute**: Create new files first, then update parent.
4. **Verify**: Ensure no regression.
