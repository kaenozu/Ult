# ブレスト会議議事録：UIデザイン (The Face of the Ghost)

## 🎯 テーマ
**「システムヘルスモニター」の機能要件と、「AIエージェント（Ghost）」の視覚的アイデンティティの確立。**

## 🗣️ 対話の記録 (Dialogue Transcript)

### Q1: 「宇宙船のコックピット」のようなシステムモニターに必要なメトリクスは？
- **A1 (Qwen - Technical):**
    - **Core Vitals:**
        - `API Latency`: リアルタイムの応答速度（ms）。スパイクを赤色で強調。
        - `Error Rate`: 過去1分間の5xxエラー数/率。
        - `Task Queue`: バックグラウンドジョブ（リバランス計算等）の滞留数。
    - **Visualization Tech:**
        - **Radar Chart:** 5つの健全性指標（Latency, Error, CPU, Memory, API Limit）を多角形で表示。歪な形になれば異常。
        - **Scrolling Log:** マトリックス風に流れるリアルタイムログ（Infoは緑、Errorは赤）。

### Q2: AI Agent（Ghost）のサイバーパンクな見た目は？
- **A2 (Big Pickle - Creative):**
    - **Concept 1: "The Glitch Spirit" (グリッチ・スピリット)**
        - 基本は幾何学的な球体だが、市場が荒れる（VIX上昇）とノイズが走り、形が崩れる。
        - 安定時は青白く発光、暴落時は赤黒く点滅し、「警告」のホログラムを展開する。
    - **Concept 2: "Neon Waveform" (ネオン波形)**
        - 音声波形のようなラインが常に動いている。ユーザーの話しかけに反応して振幅が変わる。
        - シンプルだが、「生きている」感が出る。
    - **Concept 3: "The Oracle Eye" (オラクルの瞳)**
        - 巨大な機械的な瞳。ユーザーを見つめるようにマウスカーソルを追従する。
        - ちょっと不気味だが、全知全能感がある。

## ⚔️ 議論 (Debate)
- **Qwenの主張:**
    - 「モニターは機能美だ。グリッチ演出はカッコいいが、重要な数値（例えば資産残高）が見えなくなっては本末転倒だ。エージェントは邪魔にならないように右端に配置すべき。」
- **Big Pickleの主張:**
    - 「つまらん！ ユーザーは『操縦席』に座りたいんだ。エージェントはセンターに居座って、緊急事態には画面全体をジャックして警告するくらいの迫力が欲しい。」
- **Antigravity (Facilitator) の考察:**
    - 普段は「右端のナビゲーター（Neon Waveform）」として控えめに振る舞い、緊急時（Circuit Breaker発動時）のみ「全画面警告（Glitch Effect）」を行うハイブリッド型が良いだろう。

## ⚖️ 最終決定 (Final Decision)

1.  **Project: HUD Monitor (システムモニター)**
    - 画面上部または左サイドバーに、Qwen提案の「Radar Chart」と「Latency Graph」を常駐させる。
    - デザインは `Glassmorphism` x `Neon` で統一。
2.  **Project: Living Persona (AIアバター)**
    - Big Pickleの「Neon Waveform」を採用。
    - 通常時は波形アニメーション。
    - 「AI Advisor」の発言に合わせて波形が動く（Lip Syncの代わり）。
    - 市場クラッシュ時のみ、画面全体にノイズ（Glitch）を走らせる演出を入れる。

### Next Step
- Phase 11では、まず「System Health Dashboard」を実装し、その中に「Waveform Agent」を組み込む。
