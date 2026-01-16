#!/usr/bin/env python3
"""
Test script for API Performance Monitor
"""

import sys
import time
from pathlib import Path

# scriptsディレクトリをパスに追加
scripts_dir = Path(__file__).parent / "scripts"
sys.path.insert(0, str(scripts_dir))

from monitor import APIPerformanceMonitor


def test_monitor():
    """Monitorの基本機能テスト"""
    print("=== API Performance Monitor Test ===")

    # モニター初期化
    monitor = APIPerformanceMonitor()

    # デフォルトエンドポイントでテスト
    if monitor.load_endpoints():
        print(f"[OK] {len(monitor.endpoints)}個のエンドポイントを読み込みました")

        # 単一監視実行
        print("\n[CHECK] 単一監視を実行します...")
        results = monitor.run_monitoring_cycle()

        print(f"[OK] {len(results)}件の結果を取得しました")

        # 統計生成
        print("\n[STATS] 統計情報を生成します...")
        stats = monitor.generate_stats(1)  # 直近1時間

        for endpoint_name, stat in stats.items():
            print(f"  {endpoint_name}:")
            print(f"    総リクエスト: {stat.total_requests}")
            print(f"    成功率: {stat.uptime_percentage:.1%}")
            print(f"    平均応答時間: {stat.avg_response_time:.1f}ms")
            print(f"    エラーレート: {stat.error_rate:.1%}")

        # レポート生成
        print("\n[REPORT] レポートを生成します...")
        report = monitor.generate_report(1)

        print(f"レポート期間: {report['period_hours']}時間")
        print(f"全リクエスト: {report['summary']['total_requests']}")
        print(f"全体稼働率: {report['summary']['overall_uptime']:.1%}")
        print(f"全体エラーレート: {report['summary']['overall_error_rate']:.1%}")

        print("\n[COMPLETE] テスト完了!")
        return True
    else:
        print("[ERROR] エンドポイント読み込み失敗")
        return False


if __name__ == "__main__":
    success = test_monitor()
    sys.exit(0 if success else 1)
