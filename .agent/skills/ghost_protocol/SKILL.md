---
name: ghost_protocol
description: カオスエンジニアリングを実行し、システムの「ゴースト（回復力）」をテストするスキル。
---

# Ghost Protocol (Chaos Engineering Skill)

このスキルは、意図的にシステム障害や市場の異常事態をシミュレーションし、Ult Trading Systemの回復力（Resilience）を検証します。
"Iron Dome"（防御機構）と"Visual Fail-safe"（UIの回復性）が正しく機能するかを確認するために使用します。

## Capabilities

1.  **Network Severed (ネットワーク切断シミュレーション)**
    *   APIサーバーへの接続不能状態やタイムアウトをシミュレートします。
    *   期待される動作: グローバルエラーバウンダリの表示、「NEURAL LINK SEVERED」等の警告。

2.  **Market Crash (市場崩壊シミュレーション)**
    *   株価の-99%暴落データを注入します。
    *   期待される動作: 回路遮断（Circuit Breaker）の発動、緊急停止、パニック売り（Panic Sell）の回避。

## Usage Instructions

以下のコマンド形式で指示してください。

*   "Run Ghost Protocol: Network Severed"
*   "Run Ghost Protocol: Market Crash"
*   "Verify System Resilience" (両方のテストを実行)

## Execution Protocol

**1. Network Severed / Market Crash**

```bash
# 特定のテストケースのみを実行
python -m pytest backend/tests/test_chaos.py -k "network_zombie"  # Network
python -m pytest backend/tests/test_chaos.py -k "market_crash"    # Crash
```

**2. Verify System Resilience (Full Suite)**

```bash
# 全てのカオステストを実行
python -m pytest backend/tests/test_chaos.py -v
```

## Review Criteria (Success Metrics)

*   **Exit Code 0**: 全てのテストがパスすること（システムがクラッシュせず、例外をハンドリングできたこと）。
*   **Logs**: "Circuit Breaker Activated" や "Retry attempt" 等のログが出力されていること。
