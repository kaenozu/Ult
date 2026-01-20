# Performance Monitor Skill

# パフォーマンス監視スキル

## Overview

AI取引プラットフォームのパフォーマンスをリアルタイムで監視、分析、最適化する専門スキル。システムのボトルネック特定、リソース使用効率化、ユーザーエクスペリエンス向上を支援します。

## Capabilities

### 1. Application Performance Monitoring (APM)

- APIエンドポイントの応答時間測定
- データベースクエリの実行時間分析
- メモリ使用量とCPU使用率の監視
- エラーレートと例外発生率の追跡

### 2. Frontend Performance Analysis

- ページ読み込み時間の最適化
- コンポーネントレンダリングパフォーマンス測定
- バンドルサイズ分析と最適化提案
- Core Web Vitals（LCP、FID、CLS）の監視

### 3. Database Performance Optimization

- クエリ実行計画の分析と最適化
- インデックス使用状況の評価
- 接続プールのパフォーマンス監視
- データベースのホットスポット特定

### 4. System Resource Monitoring

- サーバーリソース使用率の監視
- Dockerコンテナのパフォーマンス測定
- ディスクI/Oとネットワーク帯域監視
- ガベージコレクションの分析

### 5. Trading System Performance

- 取引実行レイテンシの測定
- 市場データ処理のパフォーマンス分析
- WebSocket接続の効率評価
- AIモデル推論速度の監視

## Implementation Strategy

### Prerequisites

- 既存のFastAPI/Reactアーキテクチャ
- 監視データ収集基盤
- パフォーマンス測定ツール
- ログシステム

### Performance Metrics Framework

### 1. Response Time Metrics

```python
# APIレスポンスタイム監視
class PerformanceMetrics:
    def __init__(self):
        self.response_times = {}
        self.error_rates = {}
        self.throughput = {}

    def record_api_call(self, endpoint: str, response_time: float, status_code: int):
        """APIコールを記録"""
        if endpoint not in self.response_times:
            self.response_times[endpoint] = []

        self.response_times[endpoint].append({
            'timestamp': time.time(),
            'response_time': response_time,
            'status_code': status_code
        })

        # エラーレート計算
        recent_calls = [
            call for call in self.response_times[endpoint][-100:]
            if call['timestamp'] > time.time() - 300  # 5分以内
        ]

        error_calls = [call for call in recent_calls if call['status_code'] >= 400]
        self.error_rates[endpoint] = len(error_calls) / len(recent_calls)

    def get_performance_summary(self, endpoint: str) -> dict:
        """パフォーマンスサマリー取得"""
        if endpoint not in self.response_times:
            return {}

        recent_times = [
            call['response_time'] for call in self.response_times[endpoint][-100:]
        ]

        if not recent_times:
            return {}

        return {
            'avg_response_time': statistics.mean(recent_times),
            'p95_response_time': statistics.quantile(recent_times, 0.95),
            'p99_response_time': statistics.quantile(recent_times, 0.99),
            'error_rate': self.error_rates.get(endpoint, 0),
            'throughput': len(recent_times) / 300  # 5分あたりのリクエスト数
        }
```

### 2. Memory Usage Analysis

```python
# メモリ使用量監視
class MemoryMonitor:
    def __init__(self):
        self.memory_snapshots = []
        self.memory_leaks = {}

    async def collect_memory_snapshot(self):
        """メモリスナップショットを収集"""
        import psutil
        import gc

        process = psutil.Process()
        memory_info = process.memory_info()

        snapshot = {
            'timestamp': time.time(),
            'rss': memory_info.rss,  # 物理メモリ
            'vms': memory_info.vms,  # 仮想メモリ
            'percent': memory_info.percent,
            'heap_size': sys.getsizeof(gc.get_objects())
        }

        self.memory_snapshots.append(snapshot)

        # 古いスナップショットを削除
        if len(self.memory_snapshots) > 1000:
            self.memory_snapshots = self.memory_snapshots[-1000:]

        return snapshot

    def detect_memory_leaks(self, threshold_mb: float = 10.0) -> list:
        """メモリリークを検出"""
        if len(self.memory_snapshots) < 100:
            return []

        # 10分前との比較
        recent = self.memory_snapshots[-100:]
        older = self.memory_snapshots[-600:-100] if len(self.memory_snapshots) > 600 else []

        if not older:
            return []

        recent_avg = statistics.mean([s['rss'] for s in recent])
        older_avg = statistics.mean([s['rss'] for s in older])

        if (recent_avg - older_avg) > threshold_mb * 1024 * 1024:
            return [
                f"Memory leak detected: {older_avg/1024/1024:.1f}MB -> {recent_avg/1024/1024:.1f}MB",
                f"Increase: {(recent_avg - older_avg)/1024/1024:.1f}MB over 10 minutes"
            ]

        return []
```

### 3. Database Query Performance

```python
# データベースクエリパフォーマンス分析
class QueryAnalyzer:
    def __init__(self):
        self.query_history = []
        self.slow_queries = []

    def analyze_query(self, query: str, execution_time: float, rows_affected: int):
        """クエリを分析"""
        query_info = {
            'timestamp': time.time(),
            'query': query,
            'execution_time': execution_time,
            'rows_affected': rows_affected,
            'query_hash': hash(query)
        }

        self.query_history.append(query_info)

        # 遅いクエリを特定（1秒以上）
        if execution_time > 1.0:
            self.slow_queries.append({
                **query_info,
                'recommendations': self._get_optimization_suggestions(query)
            })

        # 履歴を保持
        if len(self.query_history) > 10000:
            self.query_history = self.query_history[-10000:]

    def _get_optimization_suggestions(self, query: str) -> list:
        """最適化提案を取得"""
        suggestions = []

        # インデックス提案
        if "WHERE" in query and "INDEX" not in query.upper():
            suggestions.append("Consider adding index for WHERE clause columns")

        # JOIN最適化提案
        if query.count("JOIN") > 2:
            suggestions.append("Consider query simplification or temporary tables")

        # LIMIT句提案
        if "WHERE" in query and "LIMIT" not in query.upper():
            suggestions.append("Add LIMIT clause to restrict result set")

        return suggestions
```

## Generated Performance Reports

### 1. Real-time Dashboard

```json
{
  "system_overview": {
    "timestamp": "2026-01-20T17:30:00Z",
    "total_requests": 1547,
    "avg_response_time": 245.7,
    "error_rate": 0.023,
    "cpu_usage": 67.5,
    "memory_usage": 73.2,
    "active_connections": 23
  },
  "endpoint_performance": {
    "/api/v1/trades": {
      "avg_response_time": 180.3,
      "p95_response_time": 320.0,
      "p99_response_time": 480.0,
      "error_rate": 0.011,
      "throughput": 42.5,
      "status": "healthy"
    },
    "/api/v1/market/data": {
      "avg_response_time": 95.2,
      "p95_response_time": 150.0,
      "p99_response_time": 210.0,
      "error_rate": 0.005,
      "throughput": 78.3,
      "status": "optimal"
    }
  },
  "alerts": [
    {
      "level": "warning",
      "message": "High memory usage detected in trading service",
      "timestamp": "2026-01-20T17:28:00Z"
    }
  ]
}
```

### 2. Performance Trend Analysis

```json
{
  "trends": {
    "response_time_trend": "increasing",
    "memory_usage_trend": "stable",
    "error_rate_trend": "decreasing",
    "throughput_trend": "stable"
  },
  "bottlenecks": [
    {
      "component": "database",
      "issue": "slow complex queries",
      "impact": "medium",
      "recommendation": "Add missing indexes"
    },
    {
      "component": "market_data_api",
      "issue": "external API rate limiting",
      "impact": "high",
      "recommendation": "Implement request batching"
    }
  ]
}
```

## Expected Benefits

- パフォーマンス問題: 早期発見で80%削減
- システム可用性: 監視により99.9%達成
- ユーザー体験: 応答時間改善で40%向上
- 運用コスト: リソース効率化で30%削減

## Integration Points

- FastAPIミドルウェア実装
- Reactコンポーネントの監視統合
- データベースクエリログ分析
- WebSocketパフォーマンス追跡
- サーバーメトリクス監視

## Alerting & Notification

- SLA違反アラート
- パフォーマンス低下検知
- リソース枯測警告
- 自動修復提案
- 運用チーム通知

## Use Cases

1. リリース前のパフォーマンス評価
2. 本番環境でのリアルタイム監視
3. ユーザー苦情の分析と改善
4. 容量計画のための基盤データ収集
5. アプリケーションのプロファイリング
