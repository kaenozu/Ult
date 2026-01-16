# Meeting Minutes: Project Clean-up (Trash Collection)
**Date:** 2026-01-16
**Theme:** "KonMari" the Project
**Attendees:** Antigravity (Janitor), Qwen (Archivist), Big Pickle (Executioner)

## 1. The Mess
**Antigravity:** We have accumulated a lot of debris from our intense brainstorming and debugging sessions.
*   **Root Folder:** 50 files. Mostly `*.txt` from `opencode` outputs (`qwen_ui.txt`, `pickle_calib.txt`, `debate_qwen.txt` etc.).
*   **Backend Folder:** `debug_signal.py` (mission accomplished).
*   **Databases:** `ult_trading.db` exists in BOTH Root and Backend. This is dangerous.

## 2. Categorization

### A. The "Trash" (Immediate Deletion)
**Big Pickle:** "Burn them. They served their purpose."
*   `debug_signal.py` (We don't need debug scripts in production).
*   `*_calib.txt` (Temporary thinking).
*   `*utf8.txt` (Encoding artifacts).
*   `brainstorm_*.txt` (Old raw brainstorming logs).
*   `debate_*.txt` (Old debates).
*   `meeting_*.txt` (Raw logs).
*   `qwen_*.txt` & `pickle_*.txt` (Persona outputs).
*   `help.txt` / `opencode_help.txt` (If redundant).

### B. The "Archives" (Keep in `brainstorm_results`)
**Qwen:** "History is valuable, but organize it."
*   We already have meaningful summaries in `brainstorm_results/*.md`.
*   The raw `.txt` files in root are redundant if we have the Markdown summaries.
*   **Decision:** Delete the raw `.txt` files in root. Keep `brainstorm_results` clean.

### C. The "Danger" (Duplicate DBs)
**Antigravity:** `ult_trading.db`, `stock_data.db`, `cache.db` exist in BOTH `c:\gemini-thinkpad\Ult` and `c:\gemini-thinkpad\Ult\backend`.
*   The system *should* be running from `backend`.
*   **Action:** Verify which DB is being written to (check timestamp). Likely `backend` is the source of truth.
*   **Decision:** Delete the ROOT versions of `.db` files to prevent confusion.

## 3. Execution Plan
1.  **Delete** all `*.txt` files in `c:\gemini-thinkpad\Ult` (Root).
2.  **Delete** `debug_signal.py` in `backend`.
3.  **Delete** redundant DB files in `Root` (`*.db`).
4.  **Keep** `task.md`, `README.md`, `walkthrough.md` and standard config files.

**Action:** Execute cleanup.
