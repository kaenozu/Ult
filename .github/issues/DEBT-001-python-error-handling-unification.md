# [DEBT-001] Pythonエラーハンドリング統一

## 概要

`performance_monitor.py:43`で`print(warning)`が直接使用されており、ログレベルが不統一です。Pythonバックエンド全体で統一されたエラーハンドリングとロギング体制を構築します。

## 対応内容

1. **`backend/src/utils/logging_config.py`作成**
   - 統一されたログフォーマット定義
   - ログレベル設定（DEBUG, INFO, WARNING, ERROR, CRITICAL）
   - ファイル出力とコンソール出力の設定

2. **AppLoggerクラス実装**
   - アプリケーション全体で使用するロガークラス
   - 構造化ログ出力対応
   - コンテキスト情報（リクエストID等）の自動付加

3. **全モジュールの移行（段階的）**
   - `performance_monitor.py`の移行
   - `cache_manager.py`の移行
   - その他バックエンドモジュールの移行

## 受け入れ条件（Acceptance Criteria）

- [ ] `logging_config.py`が作成され、統一設定が定義されている
- [ ] `AppLogger`クラスが実装され、全モジュールで使用可能である
- [ ] `performance_monitor.py`の`print()`がすべてロガーに置き換えられている
- [ ] ログレベルが適切に設定され、開発/本番環境で切り替え可能である
- [ ] 構造化ログ（JSON形式）がオプションで出力可能である
- [ ] 既存のログ出力と比較して、情報量が維持または向上している

## 関連するレビュー発見事項

- `performance_monitor.py:43`で`print(warning)`直接使用
- ログレベル不統一（INFO, WARNING, ERRORの使い分けが不明確）
- エラーハンドリングがモジュールごとに異なる

## 想定工数

24時間

## 優先度

High

## 担当ロール

Backend Engineer

## ラベル

`tech-debt`, `priority:high`, `backend`, `logging`

---

## 補足情報

### 推奨ログフォーマット

```python
# 標準フォーマット
"%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# 構造化ログ（JSON）例
{
  "timestamp": "2026-02-02T10:30:00Z",
  "level": "WARNING",
  "logger": "performance_monitor",
  "message": "High memory usage detected",
  "context": {
    "request_id": "abc-123",
    "memory_usage_mb": 1024,
    "threshold_mb": 512
  }
}
```

### 移行対象モジュール

- [ ] `backend/src/utils/performance_monitor.py`
- [ ] `backend/src/cache/cache_manager.py`
- [ ] `backend/src/market_correlation/analyzer.py`
- [ ] `backend/src/supply_demand/analyzer.py`
- [ ] `backend/src/trade_journal_analyzer/analyzer.py`
- [ ] `backend/src/ult_universe/universe.py`
