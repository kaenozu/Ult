# パフォーマンス最適化とロギングシステムの要件

## 依存関係（requirements.txtに追加）

```txt
# 非同期データベース
aiosqlite>=0.19.0
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.28.0

# Redis
aioredis>=2.0.0
redis>=4.5.0

# ELKスタック連携
elasticsearch[async]>=8.9.0
logstash-async>=2.4.0

# パフォーマンス監視
prometheus-client>=0.17.0
psutil>=5.9.0
grafana-api>=1.0.3

# 構造化ログ
structlog>=23.1.0
python-json-logger>=2.0.7

# データ最適化
pandas>=2.0.0
pyarrow>=12.0.0
fastparquet>=0.8.3

# その他ユーティリティ
aiofiles>=23.0.0
cachetools>=5.3.0
```

## 環境設定（.envに追加）

```env
# データベース最適化
DB_POOL_MIN_CONNECTIONS=2
DB_POOL_MAX_CONNECTIONS=20
DB_CONNECTION_TIMEOUT=30.0
DB_IDLE_TIMEOUT=300.0
DB_MAX_LIFETIME=3600.0
QUERY_BATCH_SIZE=1000
ENABLE_ASYNC_QUERIES=true
ENABLE_QUERY_CACHE=true

# Redisキャッシュ
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_TTL=300
REDIS_MAX_CONNECTIONS=20
REDIS_CONNECTION_TIMEOUT=30

# Elasticsearch連携
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_INDEX_PREFIX=trading
ELASTICSEARCH_BATCH_SIZE=1000

# ロギング設定
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=logs/trading.log
LOG_FILE_SIZE_MB=50
LOG_BACKUP_COUNT=10
LOG_CONSOLE=true
STRUCTURED_LOGGING=true

# パフォーマンス監視
PROMETHEUS_PORT=8000
PROMETHEUS_ENABLED=true
MONITORING_INTERVAL_SECONDS=30
ENABLE_PERFORMANCE_TRACKING=true
ANOMALY_DETECTION_ENABLED=true

# コンポーネント別ログレベル
LOG_API_LEVEL=INFO
LOG_DATABASE_LEVEL=WARNING
LOG_TRADING_LEVEL=INFO
LOG_AUTH_LEVEL=INFO
LOG_MONITORING_LEVEL=DEBUG

# アラート設定
SLACK_WEBHOOK_URL=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=
EMAIL_PASSWORD=
ALERT_EMAIL_RECIPIENTS=

# セキュリティログ
AUDIT_LOG_RETENTION_DAYS=90
SECURITY_EVENT_LOGGING=true
ACCESS_LOG_ENABLED=true
```

## Docker Compose拡張（docker-compose.yml）

```yaml
version: '3.8'

services:
  # 既存サービス...

  # Redis（キャッシュ用）
  redis:
    image: redis:7-alpine
    container_name: trading_redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3

  # Elasticsearch（ログストレージ）
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.9.0
    container_name: trading_elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - 'ES_JAVA_OPTS=-Xms512m -Xmx512m'
    ports:
      - '9200:9200'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:9200/_cluster/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3

  # Kibana（ログ可視化）
  kibana:
    image: docker.elastic.co/kibana/kibana:8.9.0
    container_name: trading_kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - '5601:5601'
    depends_on:
      - elasticsearch
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:5601/api/status || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3

  # Prometheus（メトリクス収集）
  prometheus:
    image: prom/prometheus:latest
    container_name: trading_prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  # Grafana（ダッシュボード）
  grafana:
    image: grafana/grafana:latest
    container_name: trading_grafana
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  redis_data:
  elasticsearch_data:
  prometheus_data:
  grafana_data:
```

## Prometheus設定（monitoring/prometheus.yml）

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'trading-app'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: /metrics
    scrape_interval: 30s
    scrape_timeout: 10s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['host.docker.internal:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # - alertmanager:9093
```

## Grafanaデータソース設定（monitoring/grafana/datasources/prometheus.yml）

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

## Grafanaダッシュボード設定（monitoring/grafana/dashboards/trading-dashboard.json）

```json
{
  "dashboard": {
    "id": null,
    "title": "Trading Platform Dashboard",
    "tags": ["trading"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      },
      {
        "id": 4,
        "title": "System Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "system_cpu_usage",
            "legendFormat": "CPU %"
          },
          {
            "expr": "system_memory_usage",
            "legendFormat": "Memory %"
          }
        ]
      },
      {
        "id": 5,
        "title": "Trading Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(trading_operations_total[5m])",
            "legendFormat": "{{symbol}} {{action}}"
          }
        ]
      },
      {
        "id": 6,
        "title": "Database Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(database_operations_total[5m])",
            "legendFormat": "{{operation}} {{table}}"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

## Kibanaインデックスパターン設定

```json
{
  "attributes": {
    "title": "logs-*",
    "timeFieldName": "timestamp",
    "fields": "[{\"name\":\"timestamp\",\"type\":\"date\",\"searchable\":true,\"aggregatable\":true},{\"name\":\"level\",\"type\":\"string\",\"searchable\":true,\"aggregatable\":true},{\"name\":\"component\",\"type\":\"string\",\"searchable\":true,\"aggregatable\":true},{\"name\":\"message\",\"type\":\"string\",\"searchable\":true,\"aggregatable\":false},{\"name\":\"user_id\",\"type\":\"string\",\"searchable\":true,\"aggregatable\":true},{\"name\":\"correlation_id\",\"type\":\"string\",\"searchable\":true,\"aggregatable\":true}]"
  }
}
```

## 起動スクリプト（scripts/start-optimized.sh）

```bash
#!/bin/bash

# 最適化された取引プラットフォーム起動スクリプト

echo "Starting optimized trading platform..."

# 必要なディレクトリ作成
mkdir -p logs/monitoring
mkdir -p data/cache
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources

# Dockerサービス起動
echo "Starting Docker services..."
docker-compose up -d redis elasticsearch kibana prometheus grafana

# サービス起動待機
echo "Waiting for services to start..."
sleep 30

# ヘルスチェック
echo "Performing health checks..."

# Redis
redis-cli ping || (echo "Redis not ready" && exit 1)

# Elasticsearch
curl -f http://localhost:9200/_cluster/health || (echo "Elasticsearch not ready" && exit 1)

# Prometheus
curl -f http://localhost:9090/-/healthy || (echo "Prometheus not ready" && exit 1)

echo "All services are ready!"

# アプリケーション起動
echo "Starting trading application..."
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo "Optimized trading platform started successfully!"
echo "Access URLs:"
echo "  - API: http://localhost:8000"
echo "  - Metrics: http://localhost:8000/metrics"
echo "  - Grafana: http://localhost:3000 (admin/admin123)"
echo "  - Kibana: http://localhost:5601"
echo "  - Prometheus: http://localhost:9090"
```

## テストスクリプト（scripts/test-performance.sh）

```bash
#!/bin/bash

# パフォーマンステストスクリプト

echo "Running performance tests..."

# ロードテスト
echo "Running load test..."
ab -n 1000 -c 10 http://localhost:8000/api/v1/trades || echo "Load test completed"

# メモリ使用量チェック
echo "Checking memory usage..."
ps aux | grep python | grep -v grep

# データベース性能テスト
echo "Running database performance test..."
python -c "
import asyncio
import time
from src.database.async_manager import get_async_db_manager

async def test_db():
    db = await get_async_db_manager()
    start = time.time()

    # 一括挿入テスト
    test_data = [{'total_value': i*1000, 'cash_balance': i*500} for i in range(1000)]
    await db.save_portfolio_optimized(test_data)

    duration = time.time() - start
    print(f'Database batch insert of 1000 records: {duration:.2f}s')

asyncio.run(test_db())
"

# ログパフォーマンステスト
echo "Running log performance test..."
python -c "
import asyncio
import time
from src.logging.structured_logger import get_logger

logger = get_logger('performance_test')
start = time.time()

for i in range(10000):
    logger.info(f'Performance test log message {i}')

duration = time.time() - start
print(f'10,000 log messages: {duration:.2f}s ({10000/duration:.0f} msg/s)'
"

echo "Performance tests completed!"
```

## メトリクス収集スクリプト（scripts/collect-metrics.py）

```python
#!/usr/bin/env python3
"""
メトリクス収集スクリプト
定期的にシステムメトリクスを収集してPrometheusに送信
"""

import asyncio
import time
import psutil
import requests
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway
from src.core.config import settings

def collect_system_metrics():
    """システムメトリクス収集"""
    return {
        'cpu_percent': psutil.cpu_percent(),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_percent': psutil.disk_usage('/').percent,
        'network_bytes_sent': psutil.net_io_counters().bytes_sent,
        'network_bytes_recv': psutil.net_io_counters().bytes_recv,
    }

async def main():
    """メイン処理"""

    # Prometheusレジストリ
    registry = CollectorRegistry()

    # メトリクス定義
    cpu_gauge = Gauge('system_cpu_usage', 'System CPU usage', registry=registry)
    memory_gauge = Gauge('system_memory_usage', 'System memory usage', registry=registry)
    disk_gauge = Gauge('system_disk_usage', 'System disk usage', registry=registry)

    while True:
        try:
            # メトリクス収集
            metrics = collect_system_metrics()

            # Prometheusゲージ設定
            cpu_gauge.set(metrics['cpu_percent'])
            memory_gauge.set(metrics['memory_percent'])
            disk_gauge.set(metrics['disk_percent'])

            # Pushgatewayに送信（使用する場合）
            if settings.get("metrics.pushgateway.enabled"):
                push_to_gateway(
                    settings.get("metrics.pushgateway.url", "localhost:9091"),
                    job='system_metrics',
                    registry=registry
                )

            print(f"Metrics collected: {metrics}")

        except Exception as e:
            print(f"Metrics collection error: {e}")

        await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(main())
```
