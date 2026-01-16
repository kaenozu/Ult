# ブレスト会議議事録：ソースコードレビュー方針策定

## 🎯 テーマ
**"Ult" Trading System Comprehensive Source Review Policy**
技術的な堅牢性と、製品としての"魂"（Cyberpunk/Neon Vibe）の両面からレビュースタンダードを策定する。

## 🗣️ 対話の記録 (Dialogue Transcript)

### Q1: 堅牢なトレーディングシステムのための「技術的戒律」は？
- **A1 (Qwen - Technical Lead):** "Here are the 5 Strict Commandments for the Ult System:"
    1.  **Trust No Float:** `float`型による金額計算は禁止。必ず `Decimal` または整数（JpyCent）を使用せよ。浮動小数点誤差は破産を招く。
    2.  **Async Irony:** 非同期処理（`asyncio`）における競合状態を徹底排除せよ。DB書き込みや発注処理は必ず `Lock` で保護されていること。
    3.  **Fail-Safe First:** 外部API（Finnhub, Alpaca）は「失敗するもの」として扱え。タイムアウト、リトライ、サーキットブレーカーが実装されていない呼び出しは認めない。
    4.  **Schema Sanctity:** データ構造はPydantic等のスキーマで厳格に定義せよ。`dict` のままデータをバケツリレーするな。型安全性こそが正義だ。
    5.  **Audit Trail:** 全ての意思決定（売買、リバランス、AIのアドバイス）はログに残せ。ブラックボックスは許されない。

### Q2: "Ghost in the Machine" を殺さないための「Vibe Check」は？
- **A2 (Big Pickle - Creative Director):** (Simulated based on persona due to encoding error)
    - **"No Default UI":** ブラウザ標準のスクロールバー、白い背景、青いリンク...これらは「没入感」を削ぐノイズだ。全て排除し、Custom ScrollbarとDark Modeを強制せよ。
    - **"Alive Data":** 静止した数値は退屈だ。価格、レイテンシ、損益...全ての変動する数値はアニメーション（CountUp/Color Pulse）させろ。生きている鼓動を感じさせろ。
    - **"The Ghost Speaks":** エラーメッセージに事務的な言葉（"Internal Server Error"）を使うな。"Neural Link Severed", "Matrix Glitch Detected" のように、世界観を保った言葉選びをせよ。

## ⚖️ 最終決定 (Review Policy)

本レビューでは、以下の2つの観点で全ファイルを精査する。

### 1. Technical Audit (by Qwen)
- 金額計算の正確性 (`Decimal` usage)
- 並行処理の安全性 (`asyncio.Lock` usage)
- エラーハンドリングの網羅性
- **Target:** `backend/src/`, `backend/src/portfolio_manager.py`, `backend/src/api_server.py`

### 2. Vibe Check (by Big Pickle)
- スタイリングの統一感 (Tailwind colors, CSS effects)
- インタラクションの「手触り」 (Hover effects, Animations)
- **Target:** `src/components/`, `src/app/globals.css`

### Next Step
- この方針に基づき、まず `backend/src` のTechnical Auditから開始する。
