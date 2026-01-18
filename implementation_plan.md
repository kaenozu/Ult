# Implementation Plan - Patch 4.5: The Missing Link (Hardening Phase 4)

## Goal
Address critical gaps identified during the "Council of Five" debate to complete Phase 4 (Autonomous Ghost Personas).
Specifically, implement **Approval Persistence** (to prevent data loss on restart) and **Global Alert System** (to visualize Circuit Breaker events).

## User Review Required
> [!IMPORTANT]
> This patch introduces a dependency on `ult_trading.db` for the Approval System. 
> ensure `backend/src/db/` or equivalent schema migration logic is ready if needed. (We will use a simple table creation if not exists).

## Proposed Changes

### Backend (Python)
#### [MODIFY] [approval_system.py](file:///c:/gemini-thinkpad/Ult/backend/src/approval_system.py)
- Import `sqlite3` or use existing DB utility.
- Add `_init_db()` method to create `approval_history` table if missing.
- Update `create_approval_request` to insert into DB.
- Update `approve`, `reject`, `cancel` to update DB status.
- Update `get_history` to query DB instead of in-memory list.
- Remove `redis_store` TTL dependence (Redis remains for pub/sub or cache, but DB is truth).

#### [MODIFY] [circuit_breaker.py](file:///c:/gemini-thinkpad/Ult/backend/src/risk/circuit_breaker.py)
- Confirm that `trigger_circuit_breaker` broadcasts a `system_status` update via WebSocket.
- If not, add `websocket_manager.broadcast("system_status", {"status": "EMERGENCY", ...})`.

### Frontend (Next.js)
#### [MODIFY] [AppLayout.tsx](file:///c:/gemini-thinkpad/Ult/src/components/layout/AppLayout.tsx)
- Subscribe to `system_status` or `regime` channel.
- If status is `EMERGENCY` or `CIRCUIT_BREAKER`, overlay a red pulsing border or "DEFCON 1" banner across the entire app.

## Verification Plan

### Automated Tests (Backend)
- Create `backend/tests/test_approval_persistence.py`:
    1. Create approval request.
    2. Restart `ApprovalWorkflowManager` (simulate server restart).
    3. Call `get_request(id)` and verify it still exists with correct status.

```bash
cd backend
python -m pytest tests/test_approval_persistence.py
```

### Manual Verification (UI)
1. Trigger a fake Circuit Breaker event (via API or CLI).
2. Verify the Web App turns "Red" (Global Alert).
3. Create an approval request via API.
4. Restart Backend.
5. Reload Web App -> Verify request is still visible in "Pending" list.
