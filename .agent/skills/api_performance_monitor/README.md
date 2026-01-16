# API Performance Monitor

AGStock Ultアプリケーション用のAPIパフォーマンス監視エージェントスキル。

## Quick Start

### 単一監視実行

```bash
python .agent/skills/api_performance_monitor/scripts/monitor.py --single
```

### 継続監視開始

```bash
python .agent/skills/api_performance_monitor/scripts/monitor.py --continuous
```

### レポート生成

```bash
python .agent/skills/api_performance_monitor/scripts/monitor.py --report --hours 24
```

## 主な機能

- ✅ API応答時間監視（ミリ秒単位）
- ✅ エラーレート追跡と分析
- ✅ 稼働率（Uptime）監視
- ✅ 異常検知とアラート
- ✅ パフォーマンス統計とレポート
- ✅ 安全なURL検証
- ✅ 過去データ保持と分析

## 設定

監視対象エンドポイントは `skill.json` で設定：

```json
{
  "monitored_endpoints": [
    {
      "name": "Portfolio API",
      "url": "http://localhost:8000/api/portfolio",
      "method": "GET",
      "expected_status": 200
    }
  ]
}
```

## 出力例

```
[CHECK] Portfolio API: 245.3ms (200)
[CHECK] Market Data API: 189.7ms (200)
[ALERT] Trading API: 応答時間がしきい値を超過 (3214.5ms > 2000ms)
```

詳細なドキュメントは `SKILL.md` を参照してください。
