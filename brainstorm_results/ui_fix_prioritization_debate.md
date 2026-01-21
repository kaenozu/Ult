# 激論: UI/UX Audit Fix Prioritization

**Topic:** "The System is Bleeding. Where do we put the tourniquet?"
**Context:** Extensive audit revealed Backend 500 crashes, WebSocket failures, and missing assets.
**Input:** `ui_audit_report.md`

## Round 1: Defining the Critical Path

### 📊 GLM-4.7 (The Architect)
"感情論は排除します。
最優先事項は **Error 500 on `/signals`** です。
これは 'Market Analyst' 機能のそのものであり、これが動かない限りこのアプリケーションの価値は半減します。
`curl` の結果を見る限り、CORSではなく内部ロジックのクラッシュです。
おそらく `ConsensusEngine` の依存関係か、`fetch_external_data` などのデータプロバイダーが壊れています。
これを直すまでは、デザインの修正など無意味です。"

### 🛡️ MiniMax M2.1 (The Guardian)
"同意しますが、**WebSocket Failure** も同等に深刻です。
Dashboardが 'Initializing...' で止まるのは、ユーザーに「システム全体がダウンしている」という印象を与えます。
WebSocketが繋がらない場合の **Graceful Degradation (静的データへのフォールバック)** が実装されていないことが設計上の欠陥です。
バックエンドが不安定でも、フロントエンドは最低限の情報を表示すべきです。"

### 🥒 Big Pickle (The Trader)
"お前ら、分かってねえな。
一番ダサいのは **`grid-pattern.svg` 404** だよ！
背景が真っ白で、コンソールが赤文字だらけ？ 使う気が失せるね。
SVG一枚配置するのに何分かかる？ 30秒だろ？
**Quick Win** を先に取れよ。モチベーションに関わるんだ。"

### ⚡ Gemini 3 Flash (The Visionary)
"And what about **AI Lab**?
The sidebar link goes to a 404 page. It looks unfinished.
If we aren't ready to ship AI Lab, we should **hide the link** immediately.
Broken promises are worse than no promises."

---

## Round 2: The Battle of Priorities

### > GLM attacks Pickle 📊 -> 🥒
"SVGを置いても、データが表示されなければただの『綺麗なハリボテ』です。
エンジニアリングのリソースは有限です。装飾に時間を割く前に、コア機能を復旧させるべきです。"

### > Pickle counters 🥒 -> 📊
"見た目がショボいと、誰も中身を信用しねえんだよ！
それに、500エラーのデバッグは沼る可能性がある。その間にSVG配置とAI Labリンクの非表示くらいやっとけって話だ。"

---

## ⚔️ Antigravity's Consensus (Strategic Plan)

**Order of Operations (作戦順序):**

1.  **Phase 0: Quick Wins (The Pickle Directive)** ⚡
    *   `grid-pattern.svg` を `public/` に配置する（見た目の安定）。
    *   Sidebarの `AI Lab` リンクを一時的にコメントアウトする（ナビゲーションの信頼性）。
    *   **Cost:** 2 minutes. **Impact:** High (Perceived Quality).

2.  **Phase 1: Core Rescue (The GLM Imperative)** 🛡️
    *   `/signals` エンドポイント (Market Analyst) の **Fatal Error (500)** をデバッグ・修正する。
    *   `src/api/routers/market.py` 内の `try-except` ブロックを強化し、詳細なトレースバックをログに出力させる。
    *   **Cost:** Unknown (High Risk). **Impact:** Critical.

3.  **Phase 2: System Resilience (The MiniMax Guard)** 🧱
    *   DashboardのWebSocket接続失敗時に、リトライロジックまたは静的表示への切り替えを実装する。
    *   **Cost:** Medium. **Impact:** Reliability.

**Conclusion:**
まず **Phase 0 (SVG & Link)** を瞬殺し、すぐに **Phase 1 (Backend Debug)** に全力を注ぐ。
議論終了。作業を開始せよ。
