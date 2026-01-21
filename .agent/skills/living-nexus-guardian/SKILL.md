---
name: living-nexus-guardian
description: "Living Nexus" 自律取引システムの運用、監視、トラブルシューティングに特化したスキル。ログ解析、モデルの状態確認、システム健全性の維持に使用します。
---

# Living Nexus Guardian

このスキルは、Next.js + FastAPI + LightGBM をベースとした自律取引システム「Living Nexus」の安定稼働を支援します。

## コアワークフロー

### 1. システム健全性診断 (System Pulse)
システムの状態を一括で確認します。
- `backend/logs/` の最新ログを確認し、エラー（特に 'ERROR', 'CRITICAL'）を特定。
- `data/agstock.db` の整合性と WAL モードの状態を確認。
- 実行中プロセス（Agent Loop, FastAPI）の死活監視。

### 2. トレード実行のトラブルシューティング
取引が失敗した場合の調査手順：
- **Circuit Breaker:** `CircuitBreaker` がトリガーされていないか確認。
- **News Shock:** `NewsShockDefense` による緊急停止が発生していないか確認。
- **Approval Queue:** `ApprovalService` で保留中の承認がないか確認。

### 3. AI モデル管理
- `models/checkpoints/` 内の `.joblib` ファイルの最終更新日を確認。
- `LightGBMStrategy` の再学習が必要な場合、`train()` メソッドのトリガーを検討。
- `RegimeClassifier` の閾値が現在の相場に適合しているか評価。

## 重要なファイルパス
- メインループ: `backend/src/core/agent_loop.py`
- コンセンサス: `backend/src/agents/consensus_engine.py`
- ログ: `backend/logs/`
- DB: `backend/data/agstock.db`

## 指針
- **安全第一:** 異常を検知した場合は、即座に `AutonomousAgent.stop()` を提案。
- **エビデンス重視:** 推測ではなく、ログと DB の実データに基づいて判断。
- **コスト最適化:** API 呼び出し（VisionAgent, LLM）が過剰でないか監視。