---
name: Frontend Testing
description: Generate Vitest + React Testing Library tests for frontend components, hooks, and utilities.
---

# Frontend Testing Skill

## Tech Stack
- **Vitest**: Test runner
- **React Testing Library**: Component testing
- **nock**: HTTP mocking

## When to Use
- User asks to "write tests" for a component.
- User mentions "Vitest" or "coverage".

## Test Structure Template

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Component from './index'

// Mock external dependencies
vi.mock('@/services/api')
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/test',
}))

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Rendering (REQUIRED)
  it('should render without crashing', () => {
    render(<Component title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  // 2. User Interactions
  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Component onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  // 3. Edge Cases
  it('should handle null data', () => {
    render(<Component data={null} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
```

## Workflow (Incremental)
1. **Plan**: List files to test.
2. **Execute**: Write test for ONE file -> Run -> Fix.
3. **Verify**: Ensure 100% statement coverage for that file before moving to next.

## Core Principles
1. **AAA Pattern**: Arrange, Act, Assert.
2. **Semantic Queries**: `getByRole` > `getByText`.
3. **Single Behavior**: One strict assertion per test case.
