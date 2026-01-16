---
name: brainstorm_jp
description: 「議論して」という指示で、AntigravityがファシリテーターとなりOpenCode AIと対話してアイデアをまとめます。
---

# 議論して (Interactive Debate)

このスキルは、単にコマンドを一つ実行するだけではありません。
**あなた（Antigravity）がファシリテーターとなり、OpenCode AIから質の高いアイデアを引き出し、ユーザーに最終的な成果物を届けるための一連の手順（プロトコル）です。**

## 🛑 Agent Protocol (必ず守ること)

ユーザーから「議論して」と頼まれたら、以下のステップを実行してください。**一度のコマンドで終わらせてはいけません。**

### Step 1: テーマの分解 (Decomposition)
タイムアウトを防ぎ、深い回答を得るために、テーマを複数の側面に分解します。
*   例：「アプリの改善」→「UI/UXのアイデア」「バックエンドの機能」「セキュリティ」

### Step 2: インタラクティブな対話 (Execution)
分解したサブテーマごとに、`opencode.py` を実行して意見を求めます。
**多様な視点を得るために、可能であれば複数のモデル（`opencode/big-pickle` と `local/qwen` など）を使用してください。**

```python
# Round 1: Qwen for Structure/Logic
run_command('python backend/src/cli/opencode.py "List 3 features..." --model local/qwen > qwen_out.txt')

# Round 2: Big Pickle for Creative/Wildcard
run_command('python backend/src/cli/opencode.py "List 3 wild ideas..." --model opencode/big-pickle > pickle_out.txt')
```

### Step 3: 統合と報告 (Synthesis & Transcript) - 日本語で
各モデルから得られた回答を比較・検討し、レポートを作成します。
**重要:** 単なる羅列ではなく、モデル間の「議論（Debate）」として構成し、最終的な意思決定を行ってください。

1.  **Conversation Log:** 各モデルへの質問と回答の要約。
2.  **Debate (議論):** モデル間の意見の対立や、それぞれの強み（例：Art vs Logic）を比較。
3.  **Final Decision (最終決定):** 議論を踏まえて、Antigravityとしてどの案を採用するか、またはどう統合するかを断言する。

## Output Format (Artifact Example)
```markdown
# ブレスト会議議事録

## 🗣️ 対話の記録 (Dialogue Transcript)
- **Q1:** ...
- **A1 (Big Pickle):** ...
- **A2 (Qwen):** ...

## ⚔️ 議論 (Debate)
- **Big Pickleの主張:** "アートこそ正義" -> エコシステムマップを提案
- **Qwenの主張:** "効率こそ正義" -> レジーム検知を提案
- **考察:** Qwenの機能性の上に、Pickleの世界観を乗せるのがベスト。

## ⚖️ 最終決定 (Final Decision)
以下の2つのプロジェクトを採択する。
1. **Neural Nexus:** エコシステムマップの実装...
```

```bash
python backend/src/cli/opencode.py "<SPECIFIC_QUESTION>" --model opencode/big-pickle
```
