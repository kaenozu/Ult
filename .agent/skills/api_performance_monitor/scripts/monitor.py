#!/usr/bin/env python3
"""
AGStock Ult API Performance Monitor

APIエンドポイントのパフォーマンス監視、応答時間追跡、エラーレート分析、
異常検知、レポート生成を自動化するエージェント
"""

import os
import sys
import json
import time
import argparse
import statistics
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from urllib.parse import urlparse
import requests
import threading


# プロジェクトルートをパスに追加
def find_project_root(start_path: Path) -> Path:
    """Find project root by looking for package.json"""
    current = start_path
    while current.parent != current:
        if (current / "package.json").exists():
            return current
        current = current.parent
    raise FileNotFoundError("Project root not found")


project_root = find_project_root(Path(__file__).resolve())


@dataclass
class EndpointConfig:
    """監視対象エンドポイント設定"""

    name: str
    url: str
    method: str = "GET"
    expected_status: int = 200
    timeout: int = 10
    headers: Optional[Dict[str, str]] = None


@dataclass
class MetricResult:
    """監視結果"""

    timestamp: datetime
    endpoint: str
    response_time: float  # ms
    status_code: int
    success: bool
    error_message: Optional[str] = None
    content_length: int = 0


@dataclass
class PerformanceStats:
    """パフォーマンス統計"""

    endpoint: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    error_rate: float
    uptime_percentage: float


class APIPerformanceMonitor:
    """APIパフォーマンス監視エージェント"""

    def __init__(self, config_file: Optional[Path] = None):
        self.project_root = project_root
        self.data_dir = self.project_root / ".agent" / "data" / "api_performance"
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # 設定読み込み
        self.config = self._load_config(config_file)
        self.endpoints: List[EndpointConfig] = []

        # 監視データ
        self.metrics: List[MetricResult] = []
        self.monitoring_active = False
        self.monitor_thread: Optional[threading.Thread] = None

        # セッション設定
        self.session = requests.Session()
        self.default_timeout = self.config.get("default_timeout", 10)

    def _load_config(self, config_file: Optional[Path]) -> Dict[str, Any]:
        """設定ファイル読み込み"""
        default_config = {
            "default_check_interval": 60,
            "default_timeout": 10,
            "max_response_time_threshold": 2000,
            "error_rate_threshold": 0.05,
            "enable_alerts": True,
            "data_retention_days": 30,
            "monitored_endpoints": [],
        }

        if config_file and config_file.exists():
            try:
                with open(config_file, "r", encoding="utf-8") as f:
                    user_config = json.load(f)
                default_config.update(user_config)
                print(f"[CONFIG] 設定ファイルを読み込みました: {config_file}")
            except Exception as e:
                print(f"[WARNING] 設定ファイル読み込み失敗: {e}")

        return default_config

    def _validate_endpoint_url(self, url: str) -> bool:
        """URLの安全性検証"""
        try:
            parsed = urlparse(url)
            return parsed.scheme in ["http", "https"] and (
                parsed.netloc in ["localhost", "127.0.0.1", "0.0.0.0"]
                or parsed.netloc.startswith("192.168.")
                or parsed.netloc.startswith("10.")
                or parsed.netloc.startswith("172.")
                or "localhost" in parsed.netloc
            )
        except Exception:
            return False

    def load_endpoints(self) -> bool:
        """監視対象エンドポイントを読み込み"""
        try:
            self.endpoints = []
            for endpoint_data in self.config.get("monitored_endpoints", []):
                # URL検証
                if not self._validate_endpoint_url(endpoint_data["url"]):
                    print(
                        f"[WARNING] 安全でないURLをスキップします: {endpoint_data['url']}"
                    )
                    continue

                endpoint = EndpointConfig(
                    name=endpoint_data["name"],
                    url=endpoint_data["url"],
                    method=endpoint_data.get("method", "GET"),
                    expected_status=endpoint_data.get("expected_status", 200),
                    timeout=endpoint_data.get(
                        "timeout", self.config.get("default_timeout", 10)
                    ),
                    headers=endpoint_data.get("headers"),
                )
                self.endpoints.append(endpoint)

            print(
                f"[ENDPOINTS] {len(self.endpoints)}個のエンドポイントを監視対象に設定"
            )
            return True

        except Exception as e:
            print(f"[ERROR] エンドポイント読み込み失敗: {e}")
            return False

    def check_endpoint(self, endpoint: EndpointConfig) -> MetricResult:
        """単一エンドポイントの監視実行"""
        start_time = time.time()
        timestamp = datetime.now()

        try:
            # リクエスト実行
            response = self.session.request(
                method=endpoint.method,
                url=endpoint.url,
                headers=endpoint.headers,
                timeout=endpoint.timeout,
            )

            response_time = (time.time() - start_time) * 1000  # msに変換
            success = response.status_code == endpoint.expected_status
            error_message = None if success else f"HTTP {response.status_code}"
            content_length = len(response.content)

            result = MetricResult(
                timestamp=timestamp,
                endpoint=endpoint.name,
                response_time=response_time,
                status_code=response.status_code,
                success=success,
                error_message=error_message,
                content_length=content_length,
            )

            print(
                f"[CHECK] {endpoint.name}: {response_time:.1f}ms ({response.status_code})"
            )
            return result

        except requests.exceptions.Timeout:
            response_time = (time.time() - start_time) * 1000
            print(f"[TIMEOUT] {endpoint.name}: {response_time:.1f}ms (Timeout)")
            return MetricResult(
                timestamp=timestamp,
                endpoint=endpoint.name,
                response_time=response_time,
                status_code=0,
                success=False,
                error_message="Request timeout",
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            print(f"[ERROR] {endpoint.name}: {response_time:.1f}ms ({str(e)})")
            return MetricResult(
                timestamp=timestamp,
                endpoint=endpoint.name,
                response_time=response_time,
                status_code=0,
                success=False,
                error_message=str(e),
            )

    def run_monitoring_cycle(self) -> List[MetricResult]:
        """1回の監視サイクル実行"""
        results = []

        print(f"[CYCLE] 監視サイクルを開始します ({len(self.endpoints)}エンドポイント)")

        for endpoint in self.endpoints:
            result = self.check_endpoint(endpoint)
            results.append(result)
            self.metrics.append(result)

        # 異常検知
        self._detect_anomalies(results)

        return results

    def _detect_anomalies(self, results: List[MetricResult]):
        """異常検知"""
        max_threshold = self.config.get("max_response_time_threshold", 2000)
        error_threshold = self.config.get("error_rate_threshold", 0.05)

        slow_requests = [r for r in results if r.response_time > max_threshold]
        failed_requests = [r for r in results if not r.success]

        # スローリクエスト警告
        if slow_requests:
            for req in slow_requests:
                print(
                    f"[ALERT] {req.endpoint}: 応答時間がしきい値を超過 ({req.response_time:.1f}ms > {max_threshold}ms)"
                )

        # エラーレート警告
        if len(results) > 0:
            current_error_rate = len(failed_requests) / len(results)
            if current_error_rate > error_threshold:
                print(
                    f"[ALERT] エラーレートがしきい値を超過: {current_error_rate:.1%} > {error_threshold:.1%}"
                )

    def generate_stats(self, hours: int = 24) -> Dict[str, PerformanceStats]:
        """パフォーマンス統計生成"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [m for m in self.metrics if m.timestamp > cutoff_time]

        stats = {}

        for endpoint in self.endpoints:
            endpoint_metrics = [
                m for m in recent_metrics if m.endpoint == endpoint.name
            ]

            if not endpoint_metrics:
                continue

            response_times = [m.response_time for m in endpoint_metrics]
            successful_requests = [m for m in endpoint_metrics if m.success]

            total_requests = len(endpoint_metrics)
            failed_requests = total_requests - len(successful_requests)

            stats[endpoint.name] = PerformanceStats(
                endpoint=endpoint.name,
                total_requests=total_requests,
                successful_requests=len(successful_requests),
                failed_requests=failed_requests,
                avg_response_time=statistics.mean(response_times)
                if response_times
                else 0,
                min_response_time=min(response_times) if response_times else 0,
                max_response_time=max(response_times) if response_times else 0,
                p95_response_time=statistics.quantiles(response_times, n=20)[18]
                if len(response_times) >= 20
                else 0,
                error_rate=failed_requests / total_requests
                if total_requests > 0
                else 0,
                uptime_percentage=len(successful_requests) / total_requests
                if total_requests > 0
                else 0,
            )

        return stats

    def start_continuous_monitoring(self):
        """継続監視開始"""
        if self.monitoring_active:
            print("[MONITOR] 監視はすでに実行中です")
            return

        self.monitoring_active = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop, daemon=True
        )
        self.monitor_thread.start()
        print(f"[MONITOR] 継続監視を開始しました")

    def _monitoring_loop(self):
        """監視ループ"""
        check_interval = self.config.get("default_check_interval", 60)

        while self.monitoring_active:
            try:
                self.run_monitoring_cycle()
                time.sleep(check_interval)
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"[ERROR] 監視ループエラー: {e}")
                time.sleep(check_interval)

    def stop_monitoring(self):
        """監視停止"""
        self.monitoring_active = False
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        print("[MONITOR] 監視を停止しました")

    def save_metrics(self):
        """監視データ保存"""
        try:
            data_file = self.data_dir / "metrics.json"

            # 既存データ読み込み
            existing_data = []
            if data_file.exists():
                with open(data_file, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)

            # 新規データ追加
            new_data = [asdict(metric) for metric in self.metrics]

            # 古いデータ整理
            retention_days = self.config.get("data_retention_days", 30)
            cutoff_date = datetime.now() - timedelta(days=retention_days)

            all_data = existing_data + new_data
            filtered_data = [
                item
                for item in all_data
                if datetime.fromisoformat(item["timestamp"]) > cutoff_date
            ]

            # 保存
            with open(data_file, "w", encoding="utf-8") as f:
                json.dump(filtered_data, f, ensure_ascii=False, indent=2, default=str)

            print(f"[SAVE] 監視データを保存しました ({len(filtered_data)}件)")

        except Exception as e:
            print(f"[ERROR] データ保存失敗: {e}")

    def generate_report(self, hours: int = 24) -> Dict[str, Any]:
        """パフォーマンスレポート生成"""
        stats = self.generate_stats(hours)

        report = {
            "report_generated": datetime.now().isoformat(),
            "period_hours": hours,
            "total_endpoints": len(self.endpoints),
            "summary": {
                "total_requests": sum(s.total_requests for s in stats.values()),
                "total_successful": sum(s.successful_requests for s in stats.values()),
                "total_failed": sum(s.failed_requests for s in stats.values()),
                "overall_uptime": 0,
                "overall_error_rate": 0,
            },
            "endpoints": {},
        }

        # 全体統計
        total_requests = report["summary"]["total_requests"]
        if total_requests > 0:
            report["summary"]["overall_uptime"] = (
                report["summary"]["total_successful"] / total_requests
            )
            report["summary"]["overall_error_rate"] = (
                report["summary"]["total_failed"] / total_requests
            )

        # エンドポイント別統計
        for endpoint_name, stat in stats.items():
            report["endpoints"][endpoint_name] = asdict(stat)

        return report

    def run_single_check(self) -> Dict[str, Any]:
        """単一監視実行"""
        print("[CHECK] 単一監視を実行します")

        if not self.load_endpoints():
            return {"error": "エンドポイント読み込み失敗"}

        results = self.run_monitoring_cycle()
        report = self.generate_report(1)  # 直近1時間の統計

        # 結果保存
        self.save_metrics()

        return report


def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description="API Performance Monitor")
    parser.add_argument("--config", help="設定ファイルパス")
    parser.add_argument("--continuous", action="store_true", help="継続監視モード")
    parser.add_argument("--single", action="store_true", help="単一監視モード")
    parser.add_argument("--report", action="store_true", help="レポート生成のみ")
    parser.add_argument("--hours", type=int, default=24, help="レポート期間（時間）")
    parser.add_argument("--output", help="レポート出力ファイルパス")

    args = parser.parse_args()

    monitor = APIPerformanceMonitor(Path(args.config) if args.config else None)

    if not monitor.load_endpoints():
        print("[ERROR] エンドポイント読み込みに失敗しました")
        sys.exit(1)

    try:
        if args.continuous:
            monitor.start_continuous_monitoring()
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                monitor.stop_monitoring()

        elif args.single:
            report = monitor.run_single_check()
            print(f"\n[RESULT] 監視完了")
            print(f"  全リクエスト: {report['summary']['total_requests']}")
            print(f"  成功: {report['summary']['total_successful']}")
            print(f"  失敗: {report['summary']['total_failed']}")
            print(f"  稼働率: {report['summary']['overall_uptime']:.1%}")

        elif args.report:
            # 既存データ読み込み
            try:
                data_file = monitor.data_dir / "metrics.json"
                if data_file.exists():
                    with open(data_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    for item in data:
                        metric = MetricResult(
                            timestamp=datetime.fromisoformat(item["timestamp"]),
                            endpoint=item["endpoint"],
                            response_time=item["response_time"],
                            status_code=item["status_code"],
                            success=item["success"],
                            error_message=item.get("error_message"),
                            content_length=item.get("content_length", 0),
                        )
                        monitor.metrics.append(metric)
            except Exception as e:
                print(f"[WARNING] 既存データ読み込み失敗: {e}")

            report = monitor.generate_report(args.hours)

            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    json.dump(report, f, ensure_ascii=False, indent=2)
                print(f"[OUTPUT] レポートを保存しました: {args.output}")
            else:
                print(json.dumps(report, ensure_ascii=False, indent=2))

        else:
            print("モードを指定してください (--continuous, --single, --report)")
            sys.exit(1)

    except Exception as e:
        print(f"[ERROR] 実行エラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
