## 問題の概要
trading-platform/ディレクトリに30以上のログファイル（*.log）がコミットされており、リポジトリを肥大化させています。

## 該当ファイル
- alert_panel_failure.log
- alert_service_failure.log
- alert_service_failure_2.log
- build.log
- debug_ws.log
- dev-server.log
- dev.log
- dev_server.log
- dev_server_clean.log
- dev_server_new.log
- header_debug.log
- header_failure.log
- monkey_debug.log
- notification_debug.log
- notification_failure.log
- notification_failure_2.log
- test_debug.log
- test_failures.log
- test_output.log
- test_panel.log
- test_panel_2.log
- ui_debug.log
- ws_debug.log
- ... その他多数

## 影響
- リポジトリサイズの肥大化
- git clone時間の増加
- 機密情報の露出リスク
- 不要なファイルの管理コスト

## 修正案
1. すべての*.logファイルをgitから削除
2. .gitignoreに`*.log`を追加
3. logs/ディレクトリを.gitignoreに追加

## 優先度
**Medium** - リポジトリ管理

Closes #306
