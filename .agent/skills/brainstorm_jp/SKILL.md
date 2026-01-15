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

### Step 3: 統合と報告 (Synthesis)
OpenCodeから得られた複数の回答を、あなた自身のコンテキスト（プロジェクトの現状）と組み合わせて統合し、Markdownレポートとして出力・報告してください。
「OpenCodeはこのように言っていますが、私はこう思います」という**あなたの考察**を含めることが重要です。

## Usage (Command Reference)

```bash
python backend/src/cli/opencode.py "<SPECIFIC_QUESTION>" --model opencode/big-pickle
```
