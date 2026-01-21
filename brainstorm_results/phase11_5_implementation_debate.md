# 激論: Phase 11.5 Implementation Architecture

**Theme:** "Designing the Ultimate Screenshot Diary Architecture"
**Context:** Functionality (save screenshots) is decided. Now we fight over *Architecture* & *UX*.

## Round 1: Thesis (技術的提案)

### 🥒 Big Pickle (Chaos & Vibe)
"グリッド表示？ あくびが出るね。
**『Wall of Pain & Gain』** だ！
Three.jsを使って、3D空間にスクリーンショットを「美術展」のように配置する。
ユーザーはFPS視点で自分の過去のトレード（恥と栄光）を歩いて回るんだ。
技術スタック？ `react-three-fiber` 一択！
Canvasの中にDOMを埋め込んで、クリックしたらチャートが爆発するエフェクトもつけようぜ！"

### 📊 GLM-4.7 (Structure & Logic)
"Three.jsは不要です。管理画面において最も重要なのは「検索性」と「一覧性」です。
**提案仕様:**
- **Storage:** ローカルファイルシステム (`./backend/data/screenshots/YYYY/MM/`)
- **DB:** SQLite (`screenshot_journal` table). Native SQL is enough.
- **UI:** `TanStack Virtual` を使用した仮想化グリッド。1万枚のスクショがあっても・FPSを落とさずに高速スクロール可能にする。
- **Schema:**
  ```sql
  CREATE TABLE screenshots (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      filepath TEXT NOT NULL,
      strategy_name TEXT,
      pnl REAL, -- 勝敗でフィルタするため
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
これ以外は認めません。"

### 🛡️ MiniMax M2.1 (Safety & Compliance)
"ファイルシステムへの保存はセキュリティリスクがあります。
もしマルウェアがそのディレクトリにアクセスしたら？
**提案:**
- 画像は保存時に **AES-256** で暗号化する。
- 閲覧時のみオンメモリで復号し、ブラウザの `Blob URL` として表示する。
- ファイル名はハッシュ化し、ticker名などのメタデータを含めない（`a7f3...jpg`）。
- ディレクトリは `700` パーミッションで保護する。"

### ⚡ Gemini 3 Flash (Futurist)
"みんな視野が狭いな。静止画（Screenshot）の話をしてるの？
**『Video Diary』** にすべきだよ！
`rrweb` を使って、トレード中の「マウスの動き」や「クリック」を含めたDOMの変化を録画するんだ。
そうすれば、「なぜそこでエントリーしたか」の迷いまで再生できる。
容量？ 気にするな。未来の我々がなんとかする。"

---

## Round 2: Antithesis (衝突)

### > GLM attacks Gemini ⚡
"DOM録画？ 正気ですか？
高頻度更新されるチャート（Canvas/SVG）のDOM変異を全て記録すれば、ブラウザはクラッシュします。
それに、ユーザーが見たいのは「その瞬間の判断」であり、マウスの迷いではありません。
Over-engineeringの極みです。却下。"

### > Pickle attacks GLM 📊
"仮想化グリッドだぁ？ エクセルでも見てろよ。
ユーザーは「数字」を見たいんじゃない。「体験」を思い出したいんだ。
スクロールするだけのリストなんて、誰も見返さない。
『この日の俺は輝いていた』という**エモーション**がないUIはクソだ。"

### > Gemini attacks MiniMax 🛡️
"暗号化？ 自分のPCにある自分の画像を？
パフォーマンスの無駄遣いだ。
ユーザーはハッカーじゃない。ただのトレーダーだ。
復号のレイテンシでUXを損なうことの方がよっぽど罪深いよ。"

---

## ⚔️ Antigravity's Verdict (Synthesis)

**"Emotion must be served, but Logic keeps the server running."**

1.  **UI (Pickle vs GLM):**
    - 3D Walkthroughは「おまけ（Gallery Mode）」として将来残すが、メインは **GLMの仮想化グリッド** を採用する。実用性が最優先だ。
    - ただし、Pickleの意見を入れ、カードには **「勝ち（緑）」「負け（赤）」の強烈なグローエフェクト** を付与する。
    - 詳細ビュー（モーダル）を開いたときには、Pickle好みのリッチなアニメーションを入れる。

2.  **Storage & Schema (GLM vs MiniMax):**
    - **暗号化は却下**（Overkill）。ローカルアプリであることを前提に、単純なファイル保存 (`backend/data/screenshots`) を採用。
    - ただし、ファイル名のハッシュ化（MiniMax案）は採用する。ディレクトリトラバーサル対策として有効だ。
    - **DB Schema:** GLMの案をベースに、`vision_analysis` 結果を格納する `JSON` カラムを追加する。

3.  **Experimental (Gemini):**
    - `rrweb` は却下だが、**「Vision API用のメタデータ保存」** は採用する。
    - 将来、スクショから「動画」を生成する（AIが解説する動画）ために、コンテキストデータはリッチに残しておく。

## 結論 (Implementation Plan)

### Phase 11.5: "The Visual Journal"

1.  **Frontend (`src/components/features/journal/`)**
    - `DiaryGrid.tsx`: TanStack Virtual + Framer Motion. 仮想スクロールだが、要素が出現するときはリッチにFade-inする。
    - `ScreenshotCard.tsx`: PnLに応じてボーダー色が発光するカード。

2.  **Backend (`backend/src/api/routers/journal.py`)**
    - POST `/api/v1/journal/capture`: Base64を受け取り、ファイル保存し、DBにInsert。
    - GET `/api/v1/journal/list`: フィルタ（Ticker, Date, Win/Loss）付きで一覧取得。

3.  **Data Structure**
    - SQLite Table: `trade_screenshots`
    - Index: `timestamp`, `ticker`

**Action:** Generate the plan and implementation files now.
