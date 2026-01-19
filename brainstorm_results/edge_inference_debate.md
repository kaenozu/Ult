# 激論: Edge Inference Pilot (Browser-side AI)

## 参加者 (The Council)
*   🥒 **Big Pickle**: "Chaos & Vibe"
*   📊 **GLM-4.7**: "Structure & Logic"
*   🛡️ **MiniMax M2.1**: "Safety & Compliance"
*   ⚡ **Qwen**: "Extreme Speed"

---

## Round 1: 主張 (Thesis)

> テーマ: ブラウザ上で動くAI（Edge Inference）をどう実装するか？

*   **🥒 Big Pickle (Simulated):**
    *   "WebCamでユーザーの表情を読み取れ！ ユーザーがパニック顔なら画面を赤く点滅させ、BGMを『第九』にしろ！ これぞVibesだ！"
*   **📊 GLM-4.7:**
    *   **"Client-side Schema Validation"**
    *   サーバー負荷を減らすため、送信データの整合性チェック（JSON Schema）をクライアントのWASMで行うべきです。地味ですが、最もROIが高い。
*   **🛡️ MiniMax M2.1:**
    *   **"PII & Phishing Shield"**
    *   ユーザーが入力したテキスト（ニュースやメモ）に含まれる個人情報（PII）を、サーバーに送る前にブラウザ内で検知・マスキングするべきです。
*   **⚡ Qwen:**
    *   **"1ms Signal Processing (WASM)"**
    *   高頻度取引データのノイズ除去をRust/WASMで行う。JavaScriptの重いガベージコレクションを回避し、ミリ秒単位の優位性を確保する。

---

## Round 2: 衝突 (Antithesis)

> 互いの案を攻撃せよ。

*   **🛡️ MiniMaxの攻撃 (vs Pickle):**
    *   "WebCamへのアクセス要求はユーザーに「監視されている」恐怖を与えます。プライバシーリスクが甚大です。絶対反対。"
*   **📊 GLMの攻撃 (vs Qwen):**
    *   "WASMによる信号処理は、デバッグ困難なブラックボックスを作ります。保守性が低く、Web標準から逸脱しています。"
*   **⚡ Qwenの攻撃 (vs GLM & MiniMax):**
    *   "Schema検査やPIIチェックなど、ユーザー体験を阻害するだけの「遅延」だ。我々はトレーディングシステムを作っている。速度こそ正義だ。"

---

## ⚔️ Antigravity's Verdict (Synthesis)

全会一致の解はない。しかし、それぞれの強みを統合した**「実用的かつ魅せる」**機能を決定する。

### **結論: Local Sentiment Analysis (感情分析) with Transformers.js**

1.  **Architecture (GLM-Compliant)**:
    *   Web標準技術である **Transformers.js** を採用。
    *   出力は厳格な `SentimentSchema` (Positive/Negative/Score) に従う。
2.  **Safety (MiniMax-Approved)**:
    *   サーバーにデータを送らず、**全てブラウザ内で完結**させる。「入力したテキストが外部に漏れない」ことを保証。
3.  **Vibe (Pickle-Satisfied)**:
    *   分析結果（ポジティブ/ネガティブ）に応じて、**UIの「オーラ」を動的に変化**させる。数値だけでなく、直感的な色と光で表現する。
4.  **Speed (Qwen-Optimized)**:
    *   モデルは量子化された軽量モデル (`Xenova/distilbert...`) を使用し、ロード時間を最小化する。WebWorkerでメインスレッドをブロックしない。

---

## Next Action
*   `EdgeInferenceWidget.tsx` の作成。
*   Transformers.js の導入。
*   デモ機能: ユーザーが入力した「市場ニュース」や「つぶやき」を即座に分析し、スコアを表示する。
