# API Performance Monitor

## Overview

API Performance Monitorは、AGStock UltアプリケーションのAPIエンドポイントパフォーマンスを監視・分析するエージェントスキルです。

## Features

### 🔍 Core Monitoring

- **Response Time Tracking**: 各APIエンドポイントの応答時間をミリ秒単位で監視
- **Error Rate Analysis**: リクエスト成功/失敗率のリアルタイム追跡
- **Uptime Monitoring**: サービス稼働率の継続的監視
- **HTTP Status Code Tracking**: ステータスコードの詳細な記録

### 📊 Analytics & Reporting

- **Performance Statistics**: 平均、最小、最大、P95応答時間の統計
- **Trend Analysis**: 時系列データに基づくパフォーマンストレンド分析
- **Historical Data**: 最大30日間の監視データ保持
- **Automated Reports**: JSON形式での詳細レポート生成

### 🚨 Alerting & Anomaly Detection

- **Response Time Alerts**: しきい値超過時の即時警告
- **Error Rate Alerts**: 異常なエラー率の検知と通知
- **Timeout Detection**: リクエストタイムアウトの監視

### ⚙️ Configuration

- **Flexible Endpoints**: 複数のAPIエンドポイント監視設定
- **Custom Thresholds**: 応答時間とエラーレートのカスタムしきい値
- **Adjustable Intervals**: 監視間隔のカスタマイズ設定
- **Security Validation**: 監視対象URLの安全性検証

## Installation

### Dependencies

```bash
pip install requests psutil matplotlib
```

### Setup

1. スキルディレクトリに配置
2. `skill.json`の設定をカスタマイズ
3. エンドポイント設定を確認

## Usage

### Single Check Mode

単一監視を実行して即座に結果を確認：

```bash
python scripts/monitor.py --single
```

### Continuous Monitoring

バックグラウンドで継続監視を実行：

```bash
python scripts/monitor.py --continuous
```

### Report Generation

過去データに基づきレポート生成：

```bash
python scripts/monitor.py --report --hours 24 --output performance_report.json
```

## Configuration

### Endpoints Configuration

```json
{
  "monitored_endpoints": [
    {
      "name": "Portfolio API",
      "url": "http://localhost:8000/api/portfolio",
      "method": "GET",
      "expected_status": 200,
      "timeout": 10
    },
    {
      "name": "Market Data API",
      "url": "http://localhost:8000/api/market",
      "method": "GET",
      "expected_status": 200,
      "timeout": 15
    },
    {
      "name": "Trading API",
      "url": "http://localhost:8000/api/trade",
      "method": "POST",
      "expected_status": 201,
      "timeout": 20
    }
  ]
}
```

### Thresholds Configuration

```json
{
  "max_response_time_threshold": 2000,
  "error_rate_threshold": 0.05,
  "default_check_interval": 60,
  "default_timeout": 10,
  "enable_alerts": true,
  "data_retention_days": 30
}
```

## Output Examples

### Console Output

```
[CHECK] Portfolio API: 245.3ms (200)
[CHECK] Market Data API: 189.7ms (200)
[CHECK] Trading API: 321.4ms (201)
[ALERT] Trading API: 応答時間がしきい値を超過 (321.4ms > 2000ms)
```

### Report Structure

```json
{
  "report_generated": "2026-01-16T10:30:00",
  "period_hours": 24,
  "total_endpoints": 3,
  "summary": {
    "total_requests": 2880,
    "total_successful": 2754,
    "total_failed": 126,
    "overall_uptime": 0.956,
    "overall_error_rate": 0.044
  },
  "endpoints": {
    "Portfolio API": {
      "total_requests": 960,
      "successful_requests": 945,
      "failed_requests": 15,
      "avg_response_time": 234.5,
      "min_response_time": 145.2,
      "max_response_time": 567.8,
      "p95_response_time": 389.4,
      "error_rate": 0.016,
      "uptime_percentage": 0.984
    }
  }
}
```

## Security Features

- **URL Validation**: localhostとローカルネットワークのみを監視対象に許可
- **Request Headers Support**: カスタムヘッダー設定対応
- **Timeout Protection**: 無限待機防止のためのタイムアウト設定
- **Input Sanitization**: 全設定値の検証とサニタイズ

## Data Management

- **Data Storage**: `.agent/data/api_performance/metrics.json`
- **Retention**: 設定可能な保持期間（デフォルト30日）
- **Format**: JSON形式での時系列データ保存
- **Cleanup**: 自動古いデータ整理機能

## Integration with AGStock Ult

### Backend API Monitoring

- Portfolio API (`/api/portfolio`)
- Market Data API (`/api/market`)
- Trading API (`/api/trade`)
- User Settings API (`/api/settings`)

### Performance Metrics

- Real-time dashboard integration
- Alert system compatibility
- Historical trend analysis
- Service health monitoring

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - ネットワーク接続を確認
   - APIサーバーの稼働状態を確認
   - タイムアウト値を調整

2. **High Error Rates**
   - APIエンドポイントのURLを確認
   - 認証情報が必要か確認
   - 期待されるステータスコードを検証

3. **Missing Data**
   - 監視データ保存ディレクトリの権限を確認
   - ディスク容量を確認
   - 保持期間設定を検証

### Debug Mode

```bash
python scripts/monitor.py --single --config debug_config.json
```

## Performance Optimization

- **Concurrent Monitoring**: 複数エンドポイントの並列監視
- **Memory Efficient**: 大規模データ処理の最適化
- **Minimal Overhead**: 監視によるシステム負荷の最小化

## Future Enhancements

- Grafana連携による可視化
- Slack/Discord通知連携
- 機械学習による異常検知
- APIリクエストペイロード分析
- レートリミット監視
