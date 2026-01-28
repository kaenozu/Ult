---
name: Project Healer
description: Automates environment restoration and health verification for the trading platform.
---

# Project Healer Skill

The **Project Healer** skill is designed to automatically detect and fix common environment issues, ensuring the project is always in a deployable state.

## Functionality

1.  **Dependency Check**: Verifies if `node_modules` exists and if critical binaries (`next`, `jest`) are present. Reinstalls dependencies if missing.
2.  **Build Verification**: Runs `npm run build` to ensure the application compiles without TypeScript errors.
3.  **Test Verification**: Runs `npm test` to ensure all unit tests pass.
4.  **Linting**: Runs `npm run lint -- --fix` (and `npx eslint ... --fix`) to automatically correct code style issues.
5.  **Runtime Check**: Checks if Port 3000 is available for the development server.

## Usage

Run the healer script from the project root (or `Ult_sub` root):

```bash
node skills/project-healer.js
```

## detailed Steps

- **Step 1**: Check `trading-platform/node_modules`.
- **Step 2**: Check `next` and `jest` binaries.
- **Step 3**: Execute `npm run build` in `trading-platform`.
- **Step 4**: Execute `npm test` in `trading-platform`.
- **Step 5**: Execute Auto-Lint.
- **Step 6**: Report health status.
