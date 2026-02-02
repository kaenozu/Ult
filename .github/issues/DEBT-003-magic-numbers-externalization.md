# [DEBT-003] マジックナンバー外部化

## 概要

`cache_manager.py:123`の`0.1`(10% eviction rate)等、マジックナンバーが複数箇所に散在しています。設定値を外部化し、保守性と可読性を向上させます。

## 対応内容

1. **`backend/src/config/constants.py`作成**
   - アプリケーション全体で使用する定数の定義
   - 環境別設定のサポート
   - 型安全性の確保

2. **CacheConfig/PerformanceConfig定義**
   - キャッシュ関連設定の集約
   - パフォーマンス関連設定の集約
   - バリデーション機能の実装

3. **全モジュールのリファクタリング**
   - マジックナンバーの定数への置き換え
   - 設定値のドキュメント化
   - テストの更新

## 受け入れ条件（Acceptance Criteria）

- [ ] `backend/src/config/constants.py`が作成され、主要な定数が定義されている
- [ ] `CacheConfig`クラスが作成され、キャッシュ関連設定が集約されている
- [ ] `PerformanceConfig`クラスが作成され、パフォーマンス関連設定が集約されている
- [ ] 全てのマジックナンバーが定数に置き換えられている
- [ ] 設定値に適切なコメントとドキュメントが付与されている
- [ ] 環境変数による設定オーバーライドが可能である

## 関連するレビュー発見事項

- `cache_manager.py:123`の`0.1`(10% eviction rate)等、マジックナンバーが散在
- 設定値の変更が複数箇所の修正を必要とする
- 設定値の意味が不明確で可読性が低下

## 想定工数

16時間

## 優先度

Medium

## 担当ロール

Backend Engineer

## ラベル

`tech-debt`, `priority:medium`, `backend`, `refactoring`

---

## 補足情報

### 設定分類案

```python
# constants.py 構成案
class CacheConfig:
    """キャッシュ設定"""
    DEFAULT_TTL_SECONDS: int = 3600
    EVICTION_RATE: float = 0.1  # 10%
    MAX_MEMORY_MB: int = 512
    CLEANUP_INTERVAL_SECONDS: int = 300

class PerformanceConfig:
    """パフォーマンス設定"""
    MONITORING_INTERVAL_SECONDS: int = 60
    ALERT_THRESHOLD_CPU_PERCENT: float = 80.0
    ALERT_THRESHOLD_MEMORY_PERCENT: float = 85.0
    MAX_CONCURRENT_REQUESTS: int = 100

class APIConfig:
    """API設定"""
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 1000
    RATE_LIMIT_PER_MINUTE: int = 60
    TIMEOUT_SECONDS: int = 30
```

### マイグレーション対象

| ファイル | 行番号 | 現在の値 | 定数名案 |
|----------|--------|----------|----------|
| cache_manager.py | 123 | 0.1 | EVICTION_RATE |
| cache_manager.py | 45 | 3600 | DEFAULT_TTL |
| performance_monitor.py | 78 | 80.0 | CPU_ALERT_THRESHOLD |
| performance_monitor.py | 79 | 85.0 | MEMORY_ALERT_THRESHOLD |
