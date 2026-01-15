---
name: brainstorm_jp
description: 「ブレストして」という指示でOpenCode AIとブレインストーミングを行います。
---

# ブレストして (Brainstorm in Japanese)

「ブレストして」や「アイデア出し」といった日本語の指示で、OpenCode AIとブレインストーミングを行うためのスキルです。
無料プランで動作する `opencode/big-pickle` モデルをデフォルトで使用します。

## Usage

### ブレインストーミングの開始
テーマを指定してブレストを開始します。

```bash
python backend/src/cli/opencode.py "ブレスト: <TOPIC>" --model opencode/big-pickle
```

**引数:**
- `<TOPIC>`: ブレストしたいテーマや課題（例：「ダッシュボードの改善案」「新規機能のアイデア」）。
- `--model`: デフォルトで `opencode/big-pickle` を使用しますが、カンマ区切りで複数指定も可能です。

### 実行例
- 「UIの改善案についてブレストして」→ `<TOPIC>`="UIの改善案"
- 「アーキテクチャの悩みについてブレストして」→ `<TOPIC>`="アーキテクチャの悩み"

## Output Format (JSON)
```json
{
  "instruction": "ブレスト: ...",
  "executed": true,
  "output": "...",
  "returncode": 0
}
```
