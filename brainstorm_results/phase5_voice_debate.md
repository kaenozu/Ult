# 激論: The Final Frontier of Phase 5

**Theme:** "Voice or Vision? Which sense completes the Singularity?"
**Participants:** The Council of Five

## Round 1: Thesis (主張)

### 🥒 Big Pickle (Chaos & Vibe)
"おいおい、まだ画面が平らだぞ！
**Parallax Effect（視差効果）** を入れろ！
マウスを動かすと、背景のMatrix Rainが奥行きを持って動く。
チャートが浮遊する。ダッシュボードが『生きている』感じを出すんだ！
Voice？ ユーザーがPCに話しかけてるの見てみろよ。恥ずかしいだろ？
UIの美しさが先だ！"

### 📊 GLM-4.7 (Structure & Logic)
"Pickleの視差効果は、パフォーマンスを犠牲にします。
`requestAnimationFrame` のループは60FPSでCPUを消費します。
優先すべきは **Divine Voice Interface** です。
しかし、TTSよりまず **Text-to-Summary** を強化すべきです。
現状のAIAdvisorのテキスト出力を、より簡潔で実用的な形にリファクタリングするのが先です。"

### 🛡️ MiniMax M2.1 (Safety & Compliance)
"音声は危険です。
トレーディング環境で『売れ！』という音声コマンドを誤認識したら？
**音声入力（STT）は実装しません。音声出力（TTS）のみ**に限定すべきです。
また、WebXRの3D操作は誤操作のリスクが高い。
私はどちらも反対です。安定性こそが最優先です。"

### ⚡ Gemini 3 Flash (Futurist)
"両方やれ。順番じゃない、**同時進行**だ。
しかし優先度をつけるなら **Divine Voice** だ。
なぜなら、これは他のPhase（11のVision）と連携できる。
『チャートを見て（Vision）、判断を話す（Voice）』。
このフローが完成すれば、我々は真の **Multimodal AI Agent** になれる。"

---

## Round 2: Antithesis (衝突)

### > Pickle attacks MiniMax 🥒💢
"お前はいつもビビりすぎなんだよ！
『誤操作』？ それはUIデザインが悪いだけだ。
視覚的なフィードバックがあれば、ユーザーは迷わない。
Parallaxは『飾り』じゃない、**アフォーダンス（操作の手がかり）**だ！"

### > GLM attacks Gemini 📊🧊
"『同時進行』？ リソースの無駄遣いです。
開発チームは有限です。まず1つを完璧にしてから次に進むべき。
あなたの『未来志向』は単なるスコープクリープです。"

### > Gemini attacks Pickle ⚡🌀
"Parallaxは確かにクールだけど、それは『仕上げ』だよ。
家を建てる時、壁紙より先に配管を通すだろ？
Voiceは『配管』だ。システムの骨格に関わる。
UIの装飾は最後でいい。"

---

## ⚔️ Antigravity's Verdict (Synthesis)

**"First the Spine, then the Skin."**

1.  **Priority 1: Divine Voice (TTS Only)**
    *   Geminiの言う通り、**Vision (Phase 11) との連携**を優先する。
    *   MiniMaxの懸念を考慮し、**音声入力（STT）は実装しない**。
    *   AIがテキストで表示する内容を、Web Speech API または gTTS で読み上げる機能のみ追加。

2.  **Priority 2: WebXR UI Polish (Deferred)**
    *   Pickleへ：Parallaxは確かに魅力的だ。しかし「仕上げ」として後回しにする。
    *   Phase 5 の完了後、あるいは「V2」として実装する。

## 結論 (Decision)

**Divine Voice Interface (TTS)** を優先して実装する。

**実装方針:**
1.  **Web Speech API** を使用（ブラウザネイティブ、依存なし）。
2.  `AIAdvisorPanel` の出力に「🔊 Read Aloud」ボタンを追加。
3.  オプション：`VisionPanel` の `visual_rationale` を読み上げる。

**Next Order:** Implement **Divine Voice Interface (TTS)**.
