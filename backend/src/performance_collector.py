#!/usr/bin/env python3
"""
パフォーマンス監視バックグラウンドサービス
定期的にシステムメトリクスを収集して保存
"""

import time
import json
import os
import psutil
from datetime import datetime, timedelta
import threading
from typing import Dict, Any, List
import logging


class PerformanceCollector:
    """パフォーマンスデータ収集クラス"""

    def __init__(self, data_dir: str = "data/performance"):
        self.data_dir = data_dir
        self.running = False
        self.collection_interval = 60  # 60秒ごと
        self.max_records = 1440  # 24時間分

        # ディレクトリ作成
        os.makedirs(self.data_dir, exist_ok=True)

        # ロギング設定
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(f"{self.data_dir}/collector.log"),
                logging.StreamHandler(),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def collect_metrics(self) -> Dict[str, Any]:
        """システムメトリクス収集"""
        try:
            timestamp = datetime.now().isoformat()

            # 基本システムメトリクス
            metrics = {
                "timestamp": timestamp,
                "cpu_percent": psutil.cpu_percent(interval=1),
                "cpu_freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None,
                "cpu_count": psutil.cpu_count(),
                "cpu_count_logical": psutil.cpu_count(logical=True),
                "memory": {
                    "total": psutil.virtual_memory().total,
                    "available": psutil.virtual_memory().available,
                    "percent": psutil.virtual_memory().percent,
                    "used": psutil.virtual_memory().used,
                    "free": psutil.virtual_memory().free,
                },
                "disk": {},
                "network": {
                    "bytes_sent": psutil.net_io_counters().bytes_sent,
                    "bytes_recv": psutil.net_io_counters().bytes_recv,
                    "packets_sent": psutil.net_io_counters().packets_sent,
                    "packets_recv": psutil.net_io_counters().packets_recv,
                },
                "boot_time": psutil.boot_time(),
                "process_count": len(psutil.pids()),
            }

            # ディスク使用率
            partitions = psutil.disk_partitions()
            for partition in partitions:
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    metrics["disk"][partition.device] = {
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free,
                        "percent": (usage.used / usage.total) * 100,
                    }
                except PermissionError:
                    continue

            # AGStock固有のメトリクス
            metrics.update(self.collect_agstock_metrics())

            return metrics

        except Exception as e:
            self.logger.error(f"メトリクス収集エラー: {e}")
            return {}

    def collect_agstock_metrics(self) -> Dict[str, Any]:
        """AGStock固有のメトリクス収集"""
        agstock_metrics = {}

        try:
            # ログファイルから取引統計
            trading_log_file = "logs/trading_log.json"
            if os.path.exists(trading_log_file):
                with open(trading_log_file, "r", encoding="utf-8") as f:
                    logs = json.load(f)

                # 最近1時間のログ
                one_hour_ago = datetime.now() - timedelta(hours=1)
                recent_logs = [
                    log
                    for log in logs
                    if log.get("timestamp") and datetime.fromisoformat(log["timestamp"]) > one_hour_ago
                ]

                agstock_metrics["trading_stats"] = {
                    "last_hour_trades": len(recent_logs),
                    "successful_trades": len([log for log in recent_logs if log.get("status") == "success"]),
                    "failed_trades": len([log for log in recent_logs if log.get("status") == "error"]),
                    "avg_execution_time": sum(log.get("execution_time", 0) for log in recent_logs)
                    / max(len(recent_logs), 1),
                }

            # 設定ファイル
            config_file = "config.json"
            if os.path.exists(config_file):
                with open(config_file, "r", encoding="utf-8") as f:
                    config = json.load(f)
                agstock_metrics["config_hash"] = hash(str(config))

            # エラーログ統計
            error_log_file = "logs/error.log"
            if os.path.exists(error_log_file):
                # 最近1時間のエラー数
                with open(error_log_file, "r", encoding="utf-8") as f:
                    error_lines = f.readlines()

                one_hour_ago = datetime.now() - timedelta(hours=1)
                recent_errors = []
                if error_lines:
                    for line in error_lines[-100:]:
                        try:
                            # ログ形式のタイムスタンプを解析
                            line_time_str = line.split()[0]
                            if "[" in line_time_str:
                                line_time_str = line_time_str.replace("[", "").replace("]", "")
                            line_time = datetime.fromisoformat(line_time_str)
                            if line_time > one_hour_ago:
                                recent_errors.append(line)
                        except:
                            continue

                agstock_metrics["error_stats"] = {
                    "last_hour_errors": len(recent_errors),
                    "total_errors": len(error_lines) if error_lines else 0,
                }

        except Exception as e:
            self.logger.warning(f"AGStockメトリクス収集エラー: {e}")

        return agstock_metrics

    def save_metrics(self, metrics: Dict[str, Any]):
        """メトリクスをファイルに保存"""
        try:
            # 日次ファイル
            date_str = datetime.now().strftime("%Y-%m-%d")
            daily_file = f"{self.data_dir}/metrics_{date_str}.json"

            # 既存データ読み込み
            existing_data = []
            if os.path.exists(daily_file):
                with open(daily_file, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)

            # 新データ追加
            existing_data.append(metrics)

            # 最大レコード数制限
            if len(existing_data) > self.max_records:
                existing_data = existing_data[-self.max_records :]

            # 保存
            with open(daily_file, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, indent=2)

            # 最新データとしても保存
            latest_file = f"{self.data_dir}/latest_metrics.json"
            with open(latest_file, "w", encoding="utf-8") as f:
                json.dump(metrics, f, indent=2)

            self.logger.debug(f"メトリクス保存完了: {len(existing_data)} レコード")

        except Exception as e:
            self.logger.error(f"メトリクス保存エラー: {e}")

    def cleanup_old_files(self):
        """古いデータファイルを削除"""
        try:
            current_date = datetime.now()
            files = os.listdir(self.data_dir)

            for file in files:
                if file.startswith("metrics_") and file.endswith(".json"):
                    file_date_str = file[8:-5]  # metrics_YYYY-MM-DD.json -> YYYY-MM-DD
                    file_date = datetime.strptime(file_date_str, "%Y-%m-%d")

                    # 30日より古いファイルを削除
                    if (current_date - file_date).days > 30:
                        os.remove(os.path.join(self.data_dir, file))
                        self.logger.info(f"古いファイル削除: {file}")

        except Exception as e:
            self.logger.error(f"ファイルクリーンアップエラー: {e}")

    def start_collection(self):
        """メトリクス収集開始"""
        self.running = True
        self.logger.info("パフォーマンスメトリクス収集開始")

        def collect_loop():
            while self.running:
                try:
                    metrics = self.collect_metrics()
                    if metrics:
                        self.save_metrics(metrics)

                    # 毎日0時に古いファイルを削除
                    if datetime.now().hour == 0 and datetime.now().minute < self.collection_interval // 60:
                        self.cleanup_old_files()

                    time.sleep(self.collection_interval)

                except KeyboardInterrupt:
                    self.logger.info("収集停止: 割り込み")
                    break
                except Exception as e:
                    self.logger.error(f"収集ループエラー: {e}")
                    time.sleep(5)  # エラー時は短く待機

        # バックグラウンドスレッドで実行
        self.collection_thread = threading.Thread(target=collect_loop, daemon=True)
        self.collection_thread.start()

    def stop_collection(self):
        """メトリクス収集停止"""
        self.running = False
        self.logger.info("パフォーマンスメトリクス収集停止")


def main():
    """メイン実行"""
    collector = PerformanceCollector()

    try:
        collector.start_collection()

        # メインスレッドを維持
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n停止中...")
        collector.stop_collection()
        print("停止完了")


if __name__ == "__main__":
    main()
