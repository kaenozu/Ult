---
name: brainstorm_jp
description: 「ブレストして」という指示で、AntigravityがファシリテーターとなりOpenCode AIと対話してアイデアをまとめます。
---

# ブレストして (Interactive Brainstorming)

このスキルは、単にコマンドを一つ実行するだけではありません。
**あなた（Antigravity）がファシリテーターとなり、OpenCode AIから質の高いアイデアを引き出し、ユーザーに最終的な成果物を届けるための一連の手順（プロトコル）です。**

## 🛑 Agent Protocol (必ず守ること)

ユーザーから「ブレストして」と頼まれたら、以下のステップを実行してください。**一度のコマンドで終わらせてはいけません。**

### Step 1: テーマの分解 (Decomposition)
タイムアウトを防ぎ、深い回答を得るために、テーマを複数の側面に分解します。
*   例：「アプリの改善」→「UI/UXのアイデア」「バックエンドの機能」「セキュリティ」

### Step 2: インタラクティブな対話 (Execution)
分解したサブテーマごとに、`opencode.py` を実行して意見を求めます。
無料モデル (`opencode/big-pickle`) を使用してください。

```python
# Round 1: UI Ideas
run_command('python backend/src/cli/opencode.py "List 3 unique cyberpunk UI concepts for..." --model opencode/big-pickle')

# Round 2: Functional Features
run_command('python backend/src/cli/opencode.py "List 3 technical features for..." --model opencode/big-pickle')
```

### Step 3: 統合と報告 (Synthesis & Transcript)
OpenCodeから得られた複数の回答を統合し、レポートを作成します。
**重要:** ユーザーは「会話の流れ」を見たがっています。レポートには必ず以下の2点を含めてください。

1.  **Conversation Log (会話ログ):** あなたが投げかけた具体的な質問と、OpenCodeからの回答（要約で可）の履歴。
2.  **Antigravity's Synthesis (考察):** それらを踏まえたあなたの結論。

## Output Format (Artifact Example)
```markdown
# Brainstorming Session Log

## 🗣️ Dialogue Transcript
- **Q1 (Antigravity):** "List 3 UI ideas..."
- **A1 (OpenCode):** "1. Holographic graphs, 2. ..."

### 実行例
- **基本:** 「UIの改善案についてブレストして」 (Single Model)
- **3者会議 (推奨):** 「次の機能について、3者会議で議論して」
  - この場合、以下のコマンドを実行します:
  ```python
  run_command('python backend/src/cli/opencode.py "議題..." --model "opencode/big-pickle,local/qwen"')
  ```

## 🧠 Final Synthesis
...
```

```bash
python backend/src/cli/opencode.py "<SPECIFIC_QUESTION>" --model opencode/big-pickle
```
