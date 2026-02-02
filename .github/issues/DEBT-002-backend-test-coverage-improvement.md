# [DEBT-002] バックエンドテストカバレッジ向上

## 概要

`cache_manager.py`(200+行)、`performance_monitor.py`(150+行)にテストがありません。バックエンド全体のテストカバレッジを向上させ、品質と保守性を確保します。

## 対応内容

1. **`test_cache_manager.py`作成**
   - キャッシュ操作のユニットテスト
   - エッジケースのテスト
   - 並行アクセスのテスト

2. **`test_performance_monitor.py`作成**
   - パフォーマンス計測機能のテスト
   - メトリクス収集のテスト
   - アラート機能のテスト

3. **その他未カバーモジュールのテスト作成**
   - 目標: バックエンド全体80%+
   - 優先度に基づく段階的実装

## 受け入れ条件（Acceptance Criteria）

- [ ] `test_cache_manager.py`が作成され、主要機能のテストカバレッジが90%以上
- [ ] `test_performance_monitor.py`が作成され、主要機能のテストカバレッジが90%以上
- [ ] バックエンド全体のテストカバレッジが80%以上に達している
- [ ] CIでテストカバレッジレポートが自動生成される
- [ ] 新規コードはPR時にカバレッジチェックが実行される
- [ ] テスト実行時間が5分以内に収まっている

## 関連するレビュー発見事項

- `cache_manager.py`(200+行)にテストなし
- `performance_monitor.py`(150+行)にテストなし
- バックエンド全体のテストカバレッジが30%程度

## 想定工数

40時間

## 優先度

High

## 担当ロール

Backend Engineer + QA Engineer

## ラベル

`tech-debt`, `priority:high`, `backend`, `testing`

---

## 補足情報

### テスト作成優先順位

| モジュール | 行数 | 優先度 | 理由 |
|------------|------|--------|------|
| cache_manager.py | 200+ | 最高 | コア機能、並行処理あり |
| performance_monitor.py | 150+ | 最高 | 監視機能、重要度大 |
| market_correlation/analyzer.py | 100+ | 高 | 分析機能 |
| supply_demand/analyzer.py | 100+ | 高 | 分析機能 |
| trade_journal_analyzer/analyzer.py | 100+ | 中 | 分析機能 |
| ult_universe/universe.py | 80+ | 中 | データ管理 |

### 推奨テスト構成

```python
# test_cache_manager.py 構成案
test_cache_manager.py
├── test_basic_operations      # 基本操作
├── test_ttl_expiration        # TTL期限切れ
├── test_concurrent_access     # 並行アクセス
├── test_memory_management     # メモリ管理
└── test_error_handling        # エラーハンドリング

# test_performance_monitor.py 構成案
test_performance_monitor.py
├── test_metrics_collection    # メトリクス収集
├── test_alert_thresholds      # アラート閾値
├── test_reporting             # レポート機能
└── test_integration           # 統合テスト
```
