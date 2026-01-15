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
- `<TOPIC>`: ブレストしたいテーマ。
  > [!TIP]
  > 長すぎるテーマはタイムアウトする可能性があります。「UIについて」「機能について」のように細かく分けるとスムーズです。
- `--model`: デフォルトで `opencode/big-pickle` を使用します。
  - 複数同時実行: `--model "opencode/big-pickle,opencode/qwen3-coder"` のようにカンマ区切りで指定可能。

### 実行例
- 「UIの改善案についてブレストして」 (Single Model)
- 「次の機能について、複数のAIでブレストして」 (Multi-Model inferred if configured, or explicitly passed by agent)
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
