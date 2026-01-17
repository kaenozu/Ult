# 激論: Phase 4 Execution Priority (Core vs UI)

## 📅 セッション概要
*   **テーマ:** "Where do we start? Backend (Core) or Frontend (Monitor)?"
*   **目的:** 開発順序の決定。
*   **参加メンバー:** Big Pickle, GLM-4.7, MiniMax, Qwen

---

## Round 1: Comparison

*   **🥒 Big Pickle (Team UI):**
    > "**Visuals First.**"
    > ロジックなんて最初はランダムでいい。
    > 画面上で「AIが考えているフリ」をするアニメーション（Skeleton Loading）を先に作れ。
    > これだけでデモができるし、ユーザー（と投資家）を安心させられる。

*   **📊 GLM-4.7 (Team Core):**
    > "**Logic First.**"
    > UIはデータを表示するだけの「ガワ」です。
    > データ生成元（Core）が存在しないのにUIを作るのは、中身のない箱をラッピングするようなものです。
    > 開発リソースの無駄です。

*   **⚡ Qwen (Team Performance):**
    > "**Backend Bottleneck.**"
    > AIの思考プロセスは重い。Redisへの非同期書き込みが機能するか先に検証すべきだ。
    > UIを作ってから「実はデータが届きません」では遅すぎる。

*   **🛡️ MiniMax (Safe Monitor):**
    > "**Visibility is Safety.**"
    > 思考プロセスが見えないAIは危険ですが、
    > そもそも思考していないAIを表示しても意味がありません。Coreの信頼性が先です。

---

## ⚖️ Antigravity's Verdict (Synthesis)

**裁定: "Core-First / Mock-UI" Strategy**

1.  **Priority: Core (Agent Loop)**
    *   GLMとQwenの主張を採用。
    *   **理由:** データ構造（Schema）が決まった今、それを生成するロジック（Agent Loop）が無いと、UIの実装は「ダミーデータのハードコード」になり、二度手間になるため。

2.  **Mitigation for Pickle (The Vibe):**
    *   ただし、Coreの検証には可視化が必要。
    *   本格的な `NeuralMonitor` の前に、CLIベースの簡易ログストリーム（`print` デバッグの強化版）を実装し、Pickleを納得させる。

3.  **Next Action:**
    *   `src/core/agent_loop.py` を実装する。
    *   Redis Streamを使わず、まずはオンメモリの `AsyncGenerator` でプロトタイプを作成する（Qwenの懸念: 遅延の排除）。

---

## 結論 (Next Step)

**Step 3: Implement Async Agent Loop**
- Use `asyncio` for non-blocking thought generation.
- Use `Pydantic` models for Output.
- Broadcast via WebSocket (Phase 3 infrastructure).
