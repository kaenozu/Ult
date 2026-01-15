"""
リソース使用量モニタリング
"""

import psutil
import time
from datetime import datetime
from typing import Dict, List, Tuple
import json
import os


class ResourceMonitor:
    """システムリソースモニター"""

    def __init__(self):
        self.history: List[Dict] = []
        self.monitoring = False

    def get_system_resources(self) -> Dict:
        """システムリソース使用量を取得"""
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)

        # メモリ使用量
        memory = psutil.virtual_memory()

        # ディスク使用量
        disk = psutil.disk_usage("/")

        # ネットワーク使用量
        net_io = psutil.net_io_counters()

        # プロセス情報
        processes = []
        for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            try:
                processes.append(
                    {
                        "pid": proc.info["pid"],
                        "name": proc.info["name"],
                        "cpu_percent": proc.info["cpu_percent"] or 0,
                        "memory_percent": proc.info["memory_percent"] or 0,
                    }
                )
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        # 上位CPU使用プロセス
        top_cpu_processes = sorted(processes, key=lambda x: x["cpu_percent"], reverse=True)[:5]

        # 上位メモリ使用プロセス
        top_memory_processes = sorted(processes, key=lambda x: x["memory_percent"], reverse=True)[:5]

        return {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "count": psutil.cpu_count(),
                "freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else {},
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent,
                "free": memory.free,
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100 if disk.total > 0 else 0,
            },
            "network": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
            },
            "processes": {"count": len(processes), "top_cpu": top_cpu_processes, "top_memory": top_memory_processes},
        }

    def start_monitoring(self, interval: int = 5):
        """リソースモニタリングを開始"""
        self.monitoring = True
        print(f"リソースモニタリングを開始しました (間隔: {interval}秒)")

        while self.monitoring:
            try:
                resources = self.get_system_resources()
                self.history.append(resources)

                # 履歴を100件に制限
                if len(self.history) > 100:
                    self.history.pop(0)

                print(
                    f"[{resources['timestamp']}] "
                    f"CPU: {resources['cpu']['percent']:.1f}% "
                    f"Memory: {resources['memory']['percent']:.1f}% "
                    f"Disk: {resources['disk']['percent']:.1f}%"
                )

                time.sleep(interval)
            except KeyboardInterrupt:
                print("\nモニタリングを停止しました")
                self.monitoring = False
            except Exception as e:
                print(f"モニタリングエラー: {e}")
                time.sleep(interval)

    def stop_monitoring(self):
        """リソースモニタリングを停止"""
        self.monitoring = False

    def get_resource_history(self) -> List[Dict]:
        """リソース使用履歴を取得"""
        return self.history

    def get_current_status(self) -> Dict:
        """現在のリソースステータスを取得"""
        if not self.history:
            return {}
        return self.history[-1]

    def save_history(self, filename: str = "resource_history.json"):
        """リソース使用履歴を保存"""
        os.makedirs("reports", exist_ok=True)
        filepath = f"reports/{filename}"

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.history, f, ensure_ascii=False, indent=2)

        return filepath

    def load_history(self, filename: str = "resource_history.json"):
        """リソース使用履歴を読み込み"""
        filepath = f"reports/{filename}"

        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                self.history = json.load(f)

        return len(self.history)


# 使用例
if __name__ == "__main__":
    monitor = ResourceMonitor()

    try:
        # 5秒間隔で30秒間モニタリング
        import threading

        monitor_thread = threading.Thread(target=monitor.start_monitoring, args=(5,))
        monitor_thread.daemon = True
        monitor_thread.start()

        time.sleep(30)
        monitor.stop_monitoring()

        # 履歴を保存
        filepath = monitor.save_history()
        print(f"リソース履歴を保存しました: {filepath}")

    except KeyboardInterrupt:
        monitor.stop_monitoring()
        print("モニタリングを停止しました")
