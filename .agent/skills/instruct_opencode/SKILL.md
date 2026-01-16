---
name: instruct_opencode
description: Give natural language instructions to the OpenCode interpreter to perform coding or system tasks.
---

# Instruct OpenCode (AIへの直接指示)

AGStockのバックエンドに搭載されている自律型コーディングエージェント「OpenCode」に対して、自然言語で直接タスクを依頼します。
簡単なコード修正、リファクタリング、データの分析レポート作成などに使用できます。

## 🚀 使い方 (Usage)

### Command
```bash
python backend/src/cli/opencode.py "[Instruction]" --model local/qwen
```
*   `--model` はタスクに応じて使い分け可能です。
    *   `local/qwen`: 論理的、コード生成、構造化データが得意。（デフォルト推奨）
    *   `opencode/big-pickle`: クリエイティブ、アイデア出し、UX/Vibeチェックが得意。

### Examples
1.  **リファクタリング:**
    ```bash
    python backend/src/cli/opencode.py "Refactor src/utils.py to use type hints." --model local/qwen
    ```
2.  **バグ調査:**
    ```bash
    python backend/src/cli/opencode.py "Analyze backend/logs/error.log and suggest fixes." --model local/qwen
    ```
3.  **アイデア出し:**
    ```bash
    python backend/src/cli/opencode.py "Suggest 3 cool names for the new AI feature." --model opencode/big-pickle
    ```

## ⚠️ 注意点
*   OpenCodeはファイルシステムに直接アクセスし、変更を加える能力を持っています。
*   破壊的な変更を依頼する場合は、事前にGitコミットを行ってください。
