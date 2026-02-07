# GEMINI.md - Project Constitution

This file serves as the primary instructional context for Gemini CLI agents working on the **ULT (Ultimate Trading Platform)**, also known as **Trader Pro**. All interactions and code modifications must adhere to the principles and conventions defined here.

## 🎯 Project Overview

**ULT (Ultimate Trading Platform)** is a next-generation stock trading support platform that combines AI prediction with technical analysis. It supports both Japanese and US markets, providing machine learning-based price predictions, real-time charting, and comprehensive risk management.

### Core Technologies
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4.
- **State Management:** Zustand.
- **Charting:** Chart.js, react-chartjs-2.
- **Backend:** Python 3.10+ (Market correlation, Supply/Demand analysis, Universe management).
- **ML/AI:** TensorFlow.js, Ensemble learning (Random Forest, XGBoost, LSTM).
- **Data Source:** Yahoo Finance 2, Alpha Vantage.
- **Testing:** Jest, React Testing Library, Playwright (E2E), pytest (Backend).

### Architecture
- **App Router:** Modern Next.js structure with `app/` directory.
- **Service Layer:** Logic resides in `app/lib/` (e.g., `MarketDataService`, `TechnicalIndicatorService`).
- **Store Layer:** Global state managed in `app/store/`.
- **Automation:** Specialized AI agent skills in `skills/` for development support.

---

## 🛠 Building and Running

### Frontend (trading-platform/)
```bash
cd trading-platform
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm test             # Run unit tests
npm run lint         # Run ESLint and Type check
```

### Backend (backend/)
```bash
cd backend
# Recommended: Create a virtual environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest               # Run backend tests
```

### Automation Skills (Root)
Execute scripts from the project root to assist development:
```bash
# Watch for changes and auto-run tests/build
node skills/auto-runner.js watch --tasks=build,test

# TDD development helper
node skills/tdd-developer.js verify-red-green-refactor <ComponentName>

# Full frontend verification
node skills/frontend-tester.js full-check
```

---

## 📏 Development Conventions

### 1. Language Mandate
- **Output Language:** All communication with the user and UI text MUST be in **Japanese (日本語)**.
- Code comments should be in English (concise) or as per existing patterns.

### 2. Coding Standards
- **TypeScript:** Strict mode is mandatory. Avoid `any`, use `unknown` or specific interfaces.
- **Styling:** Use Tailwind CSS v4 utility classes.
- **Components:** Functional components with Hooks. Located in `app/components/`.
- **Immutability:** Maintain immutable state patterns, especially with Zustand.

### 3. Testing & Quality (Quality Gates)
- **TDD Recommended:** Write tests before or alongside implementation.
- **Coverage Goal:** Minimum 80% coverage for new features.
- **Pre-commit Checks:** Must pass Lint, Type Check, and Tests.
- **No Regressions:** Never degrade existing functionality. Small, safe changes are preferred.

### 4. Git Workflow
- Use dedicated feature branches.
- Commit messages should follow [Conventional Commits](https://www.conventionalcommits.org/).
- Use `gh` CLI for GitHub operations where appropriate.

### 5. AI Agent Skills
The project utilizes several specialized skills located in `skills/`. Gemini agents should be aware of:
- `forecast-master.md`: AI prediction and backtesting logic.
- `supply-demand-master.md`: Volume profile and supply/demand zone analysis.
- `stock-universe-manager.md`: Managing the 100-stock universe with TDD.
- `safe-process-manager.md`: Safe process management for development servers.

---

## 📁 Directory Structure
- `trading-platform/`: Main Next.js application.
- `backend/`: Python-based analysis engine.
- `db/`: Database migrations and schema definitions.
- `scripts/`: Utility scripts (DB migration, quality checks).
- `skills/`: AI agent skill definitions and automation scripts.
- `docs/`: Comprehensive project documentation.

---

## 🛡 Security
- **API Keys:** NEVER commit API keys (e.g., Alpha Vantage). Use `.env.local`.
- **Dependencies:** Regularly scan for vulnerabilities using `npm audit`.

---
*Last Updated: 2026-02-06*
