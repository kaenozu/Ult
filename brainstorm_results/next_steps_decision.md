# Decision Log: Next Steps (Cleanup vs Phase 5)

## 📅 Session Summary
-   **Context:** Phase 4 Complete. Codebase has technical debt (238 files in `backend/src`, legacy `websocket_server.py`). Phase 5 (WebXR) is the goal.
-   **Participants:** Big Pickle, MiniMax, Qwen, GLM.

---

## 🏛️ Debate Round: "The Refactoring Dilemma"

### 🥒 Big Pickle (Chaos)
> "Screw the files! Nobody looks at the backend folder.
> The users want THE VOID. Give them the neon grid.
> If you start 'cleaning', we'll be here for 3 weeks renaming variables.
> **VOTE:** SHIP WEBXR."

### 🛡️ MiniMax (Order)
> "Unacceptable. 238 files in a flat directory is a ticking time bomb.
> `websocket_server.py` is actively dangerous—it's a duplicate server.
> If a developer runs the wrong one, the system forks.
> **VOTE:** CLEANUP FIRST."

### 📊 GLM-4.7 (Architecture)
> "A compromise is logically robust.
> Full Domain-Driven Design (DDD) is too heavy for now.
> However, we must delete dead code. Dead code breeds bugs.
> **VOTE:** TACTICAL CLEANUP (Delete legacy, keep structure)."

### ⚡ Qwen (Speed)
> "I agree with GLM.
> `rm websocket_server.py` takes 2 seconds.
> Moving 200 files takes 2 days.
> Do the 2 seconds task. Then build the UI.
> **VOTE:** DELETE & BUILD."

---

## ⚖️ Antigravity's Verdict

**Strategy: "Flash Cleanup & Sprint"**

We will not halt progress for a perfect architecture. We will perform a "surgical strike" on the worst debt.

1.  **Immediate Cleanup (The "2 Second" Tasks):**
    -   DELETE `backend/src/api/websocket_server.py` (Legacy).
    -   DELETE Root Log Files (`*.txt`, `opencode_debug.log`).
    -   This satisfies MiniMax (Safety) and Qwen (Speed).

2.  **Phase 5 Execution (The Goal):**
    -   Immediately following cleanliness, we install `r3f` and build `VoidScene.tsx`.
    -   This satisfies Pickle (Cool Shit).

3.  **Deferred:**
    -   Full `src` restructuring (DDD) is pushed to **Phase 5.5 (Refining)**.

## 🚀 Execution Order
1.  Verify & Delete `websocket_server.py`.
2.  Clean root directory.
3.  Notify User & Start Phase 5.
