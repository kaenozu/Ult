# ブレスト会議議事録: Phase 24 Earnings Hunter

## 📝 テーマ: 決算機能の実装 (Earnings Integration)
市場スキャナーに「決算発表日」の情報を統合し、リスク（決算またぎの暴落）を回避、あるいはチャンス（決算プレー）を狙えるようにする。

## 🗣️ 対話の記録 (The Council of Five Debate)

### 1. Data & Structure (GLM-4.7 - The Strategist)
> "データの整合性が全てです。決算日は頻繁に変更されます。"
*   **提案:** `EarningsProvider` クラスを作成し、Yahoo Finance (yfinance) または Finnhub からデータを取得。
*   **DB設計:** `market.py` のレスポンスに `next_earnings_date` (ISO8601) と `earnings_status` (confirmed/estimated) を追加すべき。
*   **懸念:** 日本株(JP_STOCKS)の決算データは米国APIだと不正確な場合が多い。`Kabutan` などのスクレイピングが必要になる可能性が高い。

### 2. Vibe & UI (Big Pickle - The Hacker)
> "決算は『お祭り』だろ？ 地味な日付表示じゃつまらねぇ！"
*   **提案:**
    *   **"Bomb Timer":** 決算まであと何時間かをカウントダウン表示。「爆発」か「ロケット」か、賭けの時間だ。
    *   **"Ghost Warning":** 決算3日前に入ると、カードが赤く点滅したり、ゴーストが警告（Whisper）を出す。「Beware... Volatility incoming...」
    *   **Visual:** 決算通過銘柄には「生存マーク（Shield）」、通過前には「危険マーク（Skull or Dice）」をつけよう。

### 3. Reliability & Risk (MiniMax M2.1 - The Pragmatist)
> "Pickle、遊びすぎです。ユーザーの資産を守るのが最優先です。"
*   **提案:**
    *   **Auto-Lock:** 「Defensive Mode」がONの場合、決算発表の24時間前に自動的にポジションを解消（手仕舞い）する機能を提案します。
    *   **Flag:** `is_earnings_imminent` (bool) フラグを作成し、Trueの場合はLightGBMのBUYシグナルを強制的に無効化（Override）すべきです。決算ギャンブルはアルゴリズムではないからです。

### 4. Speed & Performance (Grok Code Fast 1 - The Speedster)
> "遅いデータは死んだデータだ。スクレイピングなんてしてたら30秒待機に戻るぞ。"
*   **提案:**
    *   **Prefetching:** 決算データはリアルタイムである必要はない（1日1回更新でいい）。夜間にバッチ処理(`cron`)で取得し、`market_watchlist` と同じキャッシュに乗せるべき。
    *   **Lightweight:** フロントエンドでのカウントダウン計算はクライアントサイドで行い、サーバー負荷を減らす。

### 5. Integration & Integrity (Antigravity - The Pilot)
> "みんな良いアイデアだが、実装するのは私とユーザーだ。Next.jsのHydration Errorだけは勘弁してくれ。"
*   **主張:** 
    *   Pickleの「Bomb Timer」はサーバーサイドレンダリング(SSR)とクライアント時刻のズレでエラーになりやすい。`useEffect` でマウント後にカウントダウンを開始する実装が必要。
    *   MiniMaxの「強制売り」は強力だが、`PortfolioManager` のロック取得中にタイムアウトしないよう、非同期処理の設計を厳密にする必要がある。
    *   **結論:** 全員の意見を採用するが、コード品質の最終責任は私が持つ。

## ⚔️ 議論 (Synthesis)

*   **GLM vs Grok:** GLMは正確さを求めてAPIを推すが、Grokはパフォーマンスを懸念。
    *   -> **裁定:** Grok案を採用。決算日は「バッチ取得 + キャッシュ」で運用し、リアルタイム取得はしない。データソースは `yfinance` でまず試し、ダメなら `scraper` を検討。
*   **Pickle vs MiniMax:** Pickleは「ギャンブル演出」、MiniMaxは「安全装置」。
    *   -> **裁定:** 両立させる。UIは派手に（Pickle）、ロジックは保守的に（MiniMax）。「派手な警告を出して、自動で逃げる」のが最高にクールで安全。

## ⚖️ 最終決定 (Final Decision)

### Phase 24 実装プラン
1.  **Backend (GLM/Grok):**
    *   `src/data_loader.py` に `fetch_earnings_dates(tickers)` を追加。(`yfinance` 利用)
    *   `MARKET_CACHE` に決算日データを含める（バッチ更新）。
2.  **Logic (MiniMax):**
    *   `LightGBMStrategy` に「決算フィルター」を追加。決算5営業日前はシグナルを `NEUTRAL` (0) に強制書き換え。
3.  **Frontend (Big Pickle):**
    *   マーケットカードに「決算カウントダウン」アイコンを追加。
    *   決算直前(5日以内)の銘柄は、枠線を黄色/赤色に変えて警告表示。

これで「楽しく、かつ安全な」Earnings Hunterが完成します。
