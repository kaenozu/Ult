# Debugging Patterns & Solutions

This document captures recurring technical challenges and their proven solutions found during the development of Trader Pro.
Use this as a reference when encountering similar `TypeError` crashes or flaky tests.

## 1. Circular Dependencies in TypeScript

**Symptoms:**
- `TypeError: Class is not a constructor`
- `TypeError: Cannot read properties of undefined`
- Runtime faults where an imported module appears to be empty or undefined, despite intelligent code completion working.

**Common Cause:**
- Two files import each other (e.g., `TradingSystem` -> `BacktestEngine` -> `StrategyEngine` -> `TradingSystem`).
- Barrel files (`index.ts`) re-exporting modules that depend on each other.

**Solution Pattern:**
1.  **Identify the Cycle**: Use `dpdm` or visual inspection of imports.
2.  **Use `import type`**: If a class only needs another class's *interface* (not its value), change the import to `import type`.
    ```typescript
    // BAD (Runtime dependency)
    import { StrategyResult } from './StrategyEngine';
    
    // GOOD (Compile-time only)
    import type { StrategyResult } from './StrategyEngine';
    ```
3.  **Refactor**: Move shared types to a separate `types/index.ts` or `shared/` directory that has no other dependencies.

## 2. Testing Trading Logic (Deterministic vs. Stochastic)

**Symptoms:**
- Tests fail intermittently (`Expected > 0, Received 0`).
- "Flaky" tests that pass locally but fail in CI.

**Common Cause:**
- Using `Math.random()` to generate market data for logic tests.
- Random data may not trigger specific entry/exit conditions (e.g., trend following strategies need a trend).

**Solution Pattern:**
1.  **Strictly Deterministic Data**: Create mock generators that accept trend parameters.
    ```typescript
    const generateMockData = (trend: number = 0) => { 
        // ... price + trend 
    };
    ```
2.  **Force Signals**: When testing "Signal Generation", generally force a strong trend (e.g., +10% linear growth) to guarantee indicators like MA crossovers or RSI triggers.
3.  **Event Verification**: Ensure the system emits events (`SIGNAL_GENERATED`) even if no trade is executed (e.g. due to risk limits), so you can test the *signal logic* independently of the *execution logic*.
