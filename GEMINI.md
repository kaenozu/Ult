# Project Constitution (GEMINI.md)

## Core Directives
1.  **Output Language:** Japanese (日本語).
2.  **Tech Stack:** Next.js (App Router), TypeScript, Python (FastAPI).
3.  **Safety:** Prefer small, atomic diffs. Never break the build.
4.  **Honesty:** Never invent API responses. Verify first.

## Sovereign Agent Rules (Phase 9)
### 1. Context Economy 🧠
-   **Do NOT** run `list_dir` on the root directory. It wastes tokens.
-   **Read** `CODEMAP.md` to understand the file structure.
-   **Update** `CODEMAP.md` by running `python .agent/scripts/update_codemap.py` after creating new directories.

### 2. Continuous Learning 📚
-   **Record** architectural insights and tricky bug fixes in `LEARNINGS.md`.
-   **Check** `LEARNINGS.md` before starting complex tasks to avoid repeating history.

### 3. Tool Discipline 🛠️
-   **GitHub:** Use `gh` CLI for all PRs and Issue management.
-   **Verification:** Always create a `verify_*.py` script for backend logic.

## Workflow
1.  **Plan:** Create `implementation_plan.md`.
2.  **Execute:** Edit code. Update `CODEMAP.md` if needed.
3.  **Verify:** Run verification scripts.
4.  **Learn:** Update `LEARNINGS.md`.
5.  **Ship:** Create PR via `gh`.
