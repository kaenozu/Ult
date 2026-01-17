# 激論: Phase 4 Ops (Technical Implementation)

## 📅 セッション概要
*   **テーマ:** "Semi-Auto Approval Architecture"
*   **目的:** 承認システムの技術仕様策定。
*   **参加メンバー:** Big Pickle, GLM-4.7, MiniMax, Qwen

---

## Round 1: Technical Standards

*   **🥒 Big Pickle (Ephemeral):**
    > "**Fire and Forget.**"
    > DBなんて使うな。WebSocketで `PUSH_REQUEST` を投げて、ユーザーが反応すればOK。
    > 反応しなければ消えるだけ。データ永続化なんてノロいことしてる暇はない。

*   **📊 GLM-4.7 (Reliability):**
    > "**State Persistence.**"
    > サーバー再起動で承認待ちリクエストが消えるのはバグです。
    > Redisに `approval:{request_id}` (TTL=60s) で保存すべきです。
    > ユーザーがブラウザをリロードしても、承認待ちは残っているべきです。

*   **🛡️ MiniMax (Security):**
    > "**Signed Requests.**"
    > WebSocketは改ざん可能です。`APPROVE` メッセージには、元の `request_id` が必須です。
    > 期限切れのリクエストに対する承認は、サーバー側で厳密にはじく必要があります。

*   **⚡ Qwen (Performance):**
    > "**Client-Side Timer.**"
    > サーバーから毎秒 `remaining_time: 59...` を送るな。帯域の無駄だ。
    > `expires_at` タイムスタンプを一度送り、あとはクライアントJSでカウントダウンしろ。

---

## ⚖️ Antigravity's Verdict (Synthesis)

**裁定: "Hybrid State Protocol"**

1.  **Backend State (GLM):**
    *   **Store:** Redis (Key: `approval:{uuid}`).
    *   **Value:** `{"ticker": "NVDA", "action": "BUY", "expires_at": 1709...}`.
    *   **TTL:** 60秒 (自動削除)。

2.  **Frontend Logic (Qwen):**
    *   **Timer:** `expires_at - Date.now()` で残り時間を計算。
    *   **Persistence:** `useSynapse` が切断・再接続時に `get_status` を呼び、保留中の承認リクエストを再取得する。

3.  **Communication (MiniMax):**
    *   **Request:** Server -> Client `APPROVAL_REQUEST { id, payload, expires_at }`.
    *   **Response:** Client -> Server `APPROVE_ACTION { request_id }` or `REJECT_ACTION { request_id }`.

---

## 結論 (Implementation Plan)

**1. Backend**
- New Service: `backend/src/services/approval_service.py`
    - `request_approval(action)` -> Redis set & WS Broadcast.
    - `check_approval(id)` -> Verify & Execute.

**2. Frontend**
- Component: `ApprovalToast.tsx`
    - Pop-up card with "Hold to Confirm".
    - Countdown ring visualization.

**3. Protocol**
- New Message Type: `APPROVAL_REQUEST`, `APPROVAL_RESPONSE`.
