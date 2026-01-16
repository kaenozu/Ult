---
name: clean_project
description: プロジェクト内の不要な一時ファイル（*.txt, debug_*.py, root *.db）をスキャンし、削除します。
---

# Project Cleaner (お掃除スキル)

プロジェクトのルートディレクトリおよびサブディレクトリに溜まった「不要な一時ファイル」を検出し、削除するスキルです。

## 🧹 対象ファイル (Trash Target)

以下のファイルを「ゴミ」として扱います。

1.  **一時テキストファイル (`root/*.txt`):**
    *   `opencode` の出力ログ (`qwen_*.txt`, `pickle_*.txt`, `brainstorm_*.txt` 等)
    *   会議メモ (`meeting_*.txt`, `debate_*.txt`)
    *   **除外:** `CMakeLists.txt`, `robots.txt`, `LICENSE.txt` などのシステムファイル
2.  **デバッグスクリプト:**
    *   `backend/debug_*.py`
3.  **重複データベース (`root/*.db`):**
    *   `ult_trading.db`, `stock_data.db` (バックエンド側のものが正)
    *   **注意:** `backend/*.db` は削除**しない**こと。

## 🚀 実行手順 (Procedure)

1.  **スキャン (Dry Run):**
    まず、削除対象となるファイルをリストアップして表示します。
    ```powershell
    Get-ChildItem -Path . -Filter *.txt | Where-Object { $_.Name -ne 'CMakeLists.txt' -and $_.Name -ne 'robots.txt' }
    Get-ChildItem -Path . -Filter *.db
    Get-ChildItem -Path backend -Filter debug_*.py
    ```

2.  **確認 (Confirmation):**
    ユーザーに削除してよいか確認します（インタラクティブな場合）。
    ※ 自動実行 (`// turbo`) の場合はスキップ.

3.  **削除 (Delete):**
    一括削除を実行します。
    ```powershell
    Get-ChildItem -Path . -Filter *.txt | Where-Object { $_.Name -ne 'CMakeLists.txt' -and $_.Name -ne 'robots.txt' } | Remove-Item -Force
    Get-ChildItem -Path . -Filter *.db | Remove-Item -Force
    Remove-Item backend/debug_*.py -Force -ErrorAction SilentlyContinue
    ```

4.  **報告 (Report):**
    「お掃除が完了しました」と報告します。

## ⚠️ 安全装置 (Safety)
*   `src/` や `backend/src/` の中のコードファイルは決して削除しません。
*   `task.md` や `README.md` などのMarkdownファイルは対象外です。
