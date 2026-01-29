# Trading Platform Development Agents

This document describes available agents and skills for trading platform development.

## Quick Start

```bash
# Auto-run all tasks (build + test)
node skills/auto-runner.js run

# Watch for changes and auto-run
node skills/auto-runner.js watch --tasks=build,test

# TDD workflow for new component
node skills/tdd-developer.js verify-red-green-refactor StockChart

# Full frontend test suite
node skills/frontend-tester.js full-check
```

---

## Auto Runner Agent

Automatically run development tasks on file changes or at intervals.

### Skill File
`skills/auto-runner.json`

### Usage
```bash
node skills/auto-runner.js <action> [options]
```

### Actions
- `watch` - Watch for file changes and run tasks
- `schedule` - Run tasks at regular intervals
- `pre-commit` - Run before git commits
- `run` - Run tasks once
- `status` - Show current configuration

### Options
- `--tasks=build,test,lint` - Tasks to run
- `--interval=300` - Interval in seconds (schedule mode)

### Examples
```bash
# Watch for changes and auto-run
node skills/auto-runner.js watch --tasks=build,test

# Run every 5 minutes
node skills/auto-runner.js schedule --interval=300

# Git pre-commit hook
node skills/auto-runner.js pre-commit

# Run once
node skills/auto-runner.js run --tasks=build
```

---

## TDD Developer Agent

Test-Driven Development workflow: Write tests first, then implement features.

### Skill File
`skills/tdd-developer.json`

### Usage
```bash
node skills/tdd-developer.js <action> <component> [options]
```

### Actions
- `write-tests` - Write failing tests for component
- `run-tests` - Run tests for component
- `test-coverage` - Run tests with coverage
- `verify-red-green-refactor` - Full TDD workflow
- `create-test-file` - Create test from template
- `mock-api` - Create API mock

### Examples
```bash
# Full TDD workflow for new component
node skills/tdd-developer.js verify-red-green-refactor SignalPanel

# Write tests with specific features
node skills/tdd-developer.js write-tests StockChart --feature=interactive --feature=loading

# Run tests with coverage
node skills/tdd-developer.js test-coverage SignalPanel

# Create test file from template
node skills/tdd-developer.js create-test-file useTrading hook

# Create API mock
node skills/tdd-developer.js mock-api /api/stocks '{"data":[]}'
```

### TDD Workflow
```
1. RED: Write failing tests
   → node skills/tdd-developer.js write-tests MyComponent

2. GREEN: Write code to pass tests
   → Implement component in app/components/MyComponent.tsx

3. REFACTOR: Improve code, keep tests passing
   → node skills/tdd-developer.js run-tests MyComponent
```

---

## Frontend Testing Agent

Test and verify frontend functionality.

### Skill File
`skills/frontend-tester.json`

### Usage
```bash
node skills/frontend-tester.js <action>
```

### Actions
- `check-build` - Verify Next.js build
- `start-server` - Start dev server
- `verify-pages` - Check page loading
- `check-console` - Detect errors
- `full-check` - Complete test suite

### Examples
```bash
# Full verification
node skills/frontend-tester.js full-check

# Quick build check
node skills/frontend-tester.js check-build

# Verify all pages load
node skills/frontend-tester.js verify-pages
```

---

## Development Commands

### Build
```bash
cd trading-platform && npm run build
```

### Development Server
```bash
cd trading-platform && npm run dev
```

### Linting
```bash
cd trading-platform && npm run lint
```

### Type Checking
```bash
cd trading-platform && npx tsc --noEmit
```

---

## Project Structure

```
trading-platform/
├── app/
│   ├── page.tsx           # Workstation
│   ├── heatmap/page.tsx   # Heatmap
│   ├── journal/page.tsx   # Journal
│   ├── screener/page.tsx  # Screener
│   ├── components/        # React components
│   ├── lib/              # Utilities & ML
│   ├── store/            # State management
│   ├── data/             # Mock data
│   └── types/            # TypeScript types
├── skills/               # Agent skills
│   ├── auto-runner.js    # Auto-run tasks
│   ├── tdd-developer.js  # TDD workflow
│   └── frontend-tester.js # Frontend tests
└── public/               # Static assets
```

---

## Technology Stack
- Next.js 16 + React 18 + TypeScript
- Tailwind CSS
- Chart.js + react-chartjs-2
- Zustand (state management)
- ML Prediction (Ensemble model)

---

## Auto-Setup for Git Hooks

To auto-run before commits, add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
node skills/auto-runner.js pre-commit
```

Or use npm scripts in `package.json`:

```json
{
  "scripts": {
    "precommit": "node skills/auto-runner.js pre-commit",
    "test:ci": "node skills/frontend-tester.js full-check",
    "tdd": "node skills/tdd-developer.js"
  }
}
```
