# 📚 ULT Trading Platform - Documentation

このディレクトリには、ULT Trading Platform のすべてのドキュメントが整理されています。

## 📂 ディレクトリ構成

```
docs/
├── architecture/       # アーキテクチャ・システム設計
├── guides/             # ガイド・チュートリアル
├── features/           # 機能説明・ロードマップ
├── operations/         # Git・CI/CD・運用
├── reports/            # レポート・分析
├── security/           # セキュリティ関連
├── ai-agents/          # AI Agent設定
├── CODEMAPS/           # コードマップ
├── refactoring-issues/ # リファクタリング課題
└── examples/           # コード例
```

---

## 🏗️ Architecture（アーキテクチャ）

システム設計とアーキテクチャに関するドキュメント。

| ドキュメント | 説明 |
|-------------|------|
| [market-correlation-integration.md](architecture/market-correlation-integration.md) | 市場相関分析の統合設計 |
| [market-correlation-integration-summary.md](architecture/market-correlation-integration-summary.md) | 市場相関統合のまとめ |
| [RISK_MONITORING_SYSTEM.md](architecture/RISK_MONITORING_SYSTEM.md) | リアルタイムリスク監視システム |
| [WINNING_TRADING_SYSTEM.md](architecture/WINNING_TRADING_SYSTEM.md) | 勝率の高い取引システム設計 |

---

## 📖 Guides（ガイド）

開発・実装ガイドとチュートリアル。

| ドキュメント | 説明 |
|-------------|------|
| [ML_TRAINING_GUIDE.md](guides/ML_TRAINING_GUIDE.md) | MLモデルの訓練ガイド |
| [ML_PREDICTION_IMPROVEMENT_GUIDE.md](guides/ML_PREDICTION_IMPROVEMENT_GUIDE.md) | ML予測精度向上ガイド |
| [TENSORFLOW_ML_MODELS_GUIDE.md](guides/TENSORFLOW_ML_MODELS_GUIDE.md) | TensorFlow.js MLモデル使用ガイド |
| [BROKER_INTEGRATION.md](guides/BROKER_INTEGRATION.md) | 証券会社APIの統合ガイド |
| [ADVANCED_ORDER_EXECUTION.md](guides/ADVANCED_ORDER_EXECUTION.md) | 高度な注文執行の実装 |

---

## ✨ Features（機能）

機能説明とロードマップ。

| ドキュメント | 説明 |
|-------------|------|
| [JAPANESE_MARKET_DATA_ENHANCEMENT_ROADMAP.md](features/JAPANESE_MARKET_DATA_ENHANCEMENT_ROADMAP.md) | 日本市場データ強化ロードマップ |
| [UI_CHANGES_JAPANESE_MARKET.md](features/UI_CHANGES_JAPANESE_MARKET.md) | 日本市場対応のUI変更 |
| [trading-symbols.md](features/trading-symbols.md) | 対応銘柄リスト |

---

## ⚙️ Operations（運用）

Git操作、CI/CD、運用に関するドキュメント。

| ドキュメント | 説明 |
|-------------|------|
| [CI_CD_GUIDE.md](operations/CI_CD_GUIDE.md) | CI/CDパイプラインガイド |
| [QUALITY_GATES.md](operations/QUALITY_GATES.md) | 品質ゲートシステム |
| [GIT_CLEANUP_GUIDE.md](operations/GIT_CLEANUP_GUIDE.md) | Gitリポジトリクリーンアップ |
| [MERGE_GUIDE.md](operations/MERGE_GUIDE.md) | ブランチマージガイド |
| [MERGE_QUICK_REFERENCE.md](operations/MERGE_QUICK_REFERENCE.md) | マージクイックリファレンス |
| [MERGE_TROUBLESHOOTING.md](operations/MERGE_TROUBLESHOOTING.md) | マージトラブルシューティング |
| [MERGE_RESTART_GUIDE.md](operations/MERGE_RESTART_GUIDE.md) | マージ再開ガイド |
| [MERGE_PROGRESS_REPORT.md](operations/MERGE_PROGRESS_REPORT.md) | マージ進捗レポート |
| [REPOSITORY_SIZE_OPTIMIZATION.md](operations/REPOSITORY_SIZE_OPTIMIZATION.md) | リポジトリサイズ最適化 |
| [REPOSITORY_SIZE_QUICK_REF.md](operations/REPOSITORY_SIZE_QUICK_REF.md) | サイズ管理クイックリファレンス |
| [REPOSITORY_CLEANUP_GUIDE.md](operations/REPOSITORY_CLEANUP_GUIDE.md) | リポジトリクリーンアップガイド |

---

## 📊 Reports（レポート）

実装レポートと分析。

| ドキュメント | 説明 |
|-------------|------|
| [IMPLEMENTATION_SUMMARY_PRED-001.md](reports/IMPLEMENTATION_SUMMARY_PRED-001.md) | TensorFlow.js ML実装サマリー |
| [INVESTMENT_ANALYSIS_REPORT.md](reports/INVESTMENT_ANALYSIS_REPORT.md) | 投資判断レポート |
| [ORDER_EXECUTION_FIX.md](reports/ORDER_EXECUTION_FIX.md) | 注文処理の競合状態修正 |
| [PERFORMANCE_IMPROVEMENTS.md](reports/PERFORMANCE_IMPROVEMENTS.md) | パフォーマンス改善レポート |
| [PROJECT_REVIEW_REPORT.md](reports/PROJECT_REVIEW_REPORT.md) | プロジェクトレビューレポート |
| [REFACTORING_REPORT.md](reports/REFACTORING_REPORT.md) | リファクタリング提案レポート |
| [README_ISSUE_207.md](reports/README_ISSUE_207.md) | Issue #207 完了レポート |

---

## 🔒 Security（セキュリティ）

セキュリティ関連のドキュメント。

| ドキュメント | 説明 |
|-------------|------|
| [COMMAND_INJECTION_PREVENTION.md](security/COMMAND_INJECTION_PREVENTION.md) | コマンドインジェクション対策 |
| [WEBSOCKET_SECURITY.md](security/WEBSOCKET_SECURITY.md) | WebSocketセキュリティ |

---

## 🤖 AI Agents（AIエージェント）

AI開発エージェントの設定。

| ドキュメント | 説明 |
|-------------|------|
| [AGENTS.md](ai-agents/AGENTS.md) | 利用可能なエージェント一覧 |
| [GEMINI.md](ai-agents/GEMINI.md) | Gemini用プロジェクト設定 |

---

## 📁 Other Directories

### CODEMAPS/
コードの構造とフローを可視化したドキュメント。
- [README.md](CODEMAPS/README.md)
- [prediction-services.md](CODEMAPS/prediction-services.md)
- [prediction-ml-models.md](CODEMAPS/prediction-ml-models.md)

### refactoring-issues/
リファクタリング課題の追跡。
- [README.md](refactoring-issues/README.md)
- [REFACTOR-001-constants.md](refactoring-issues/REFACTOR-001-constants.md)
- [REFACTORING_ROADMAP_TRACKING.md](refactoring-issues/REFACTORING_ROADMAP_TRACKING.md)

### examples/
コード例とサンプル。
- [market-correlation-example.ts](examples/market-correlation-example.ts)

---

## 🔗 ルートレベルのドキュメント

重要なドキュメントはリポジトリのルートに配置されています：

| ドキュメント | 説明 |
|-------------|------|
| [README.md](../README.md) | プロジェクト概要・クイックスタート |
| [ROADMAP.md](../ROADMAP.md) | プロジェクトロードマップ |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 貢献ガイド |
| [SECURITY.md](../SECURITY.md) | セキュリティポリシー |
| [CLAUDE.md](../CLAUDE.md) | Claude Code設定 |
| [DEPENDENCIES.md](DEPENDENCIES.md) | 依存関係の説明 |

---

**最終更新**: 2026-02-06
