# [PERF-004] データ取得最適化

## 概要

APIレスポンス時間の最適化余地があります。データ取得を最適化し、ユーザー体験を向上させます。

## 対応内容

1. **N+1クエリ検出・修正**
   - クエリ分析ツールの導入
   - N+1問題の検出
   - 一括取得への修正

2. **クエリキャッシュ導入**
   - Redisキャッシュの活用
   - キャッシュ戦略の策定
   - キャッシュ無効化ルール

3. **ページネーション標準化**
   - カーソルベースページネーション
   - オフセットベースページネーション
   - ページネーションライブラリの導入

## 受け入れ条件（Acceptance Criteria）

- [ ] N+1クエリが検出され、修正されている
- [ ] クエリキャッシュが導入され、ヒット率が60%以上である
- [ ] ページネーションが標準化され、全リストAPIで適用されている
- [ ] API平均レスポンス時間が200ms以内に短縮されている
- [ ] P99レイテンシが500ms以内に短縮されている
- [ ] データベースCPU使用率が30%低下している

## 関連するレビュー発見事項

- APIレスポンス時間に最適化余地がある
- N+1クエリの可能性がある
- ページネーションが統一されていない

## 想定工数

24時間

## 優先度

Medium

## 担当ロール

Backend Engineer

## ラベル

`performance`, `priority:medium`, `api`, `database`

---

## 補足情報

### N+1検出ツール

```python
# SQLAlchemy N+1検出
from sqlalchemy import event

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_count', 0)
    conn.info['query_count'] += 1
    conn.info.setdefault('start_time', time.time())

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total_time = time.time() - conn.info['start_time']
    query_count = conn.info['query_count']
    if query_count > 10:  # 閾値
        logger.warning(f"Potential N+1 detected: {query_count} queries in {total_time:.2f}s")
```

### キャッシュ戦略

| データタイプ | キャッシュ時間 | 無効化タイミング |
|--------------|----------------|------------------|
| 銘柄一覧 | 1時間 | 銘柄追加時 |
| ユーザー設定 | 永続 | 設定更新時 |
| 市場データ | 5分 | 新規データ受信時 |
| 計算結果 | 可変 | 入力データ変更時 |

### ページネーション実装

```typescript
// カーソルベースページネーション（推奨）
interface CursorPagination {
  cursor: string | null;
  limit: number;
  direction: 'next' | 'prev';
}

// APIレスポンス
interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}
```
