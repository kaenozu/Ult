"""
パフォーマンスボトルネック分析と最適化提案
"""

from typing import Dict, List, Tuple
import numpy as np
from datetime import datetime
from .resource_monitor import ResourceMonitor


class PerformanceAnalyzer:
    """パフォーマンス分析器"""

    def __init__(self):
        self.resource_monitor = ResourceMonitor()
        self.thresholds = {
            "cpu_high": 80.0,
            "memory_high": 85.0,
            "disk_high": 90.0,
            "cpu_critical": 95.0,
            "memory_critical": 95.0,
            "disk_critical": 98.0,
        }

    def analyze_performance_bottlenecks(self) -> Dict:
        """パフォーマンスボトルネックを分析"""
        resources = self.resource_monitor.get_current_status()

        if not resources:
            return {"status": "no_data", "bottlenecks": [], "recommendations": []}

        bottlenecks = []
        recommendations = []

        # CPU分析
        cpu_percent = resources["cpu"]["percent"]
        if cpu_percent > self.thresholds["cpu_critical"]:
            bottlenecks.append(
                {
                    "type": "cpu",
                    "severity": "critical",
                    "value": cpu_percent,
                    "description": f"CPU使用率が非常に高いです ({cpu_percent:.1f}%)",
                }
            )
            recommendations.append(
                "CPU使用率が非常に高いです。プロセスの最適化またはスケールアップを検討してください。"
            )
        elif cpu_percent > self.thresholds["cpu_high"]:
            bottlenecks.append(
                {
                    "type": "cpu",
                    "severity": "high",
                    "value": cpu_percent,
                    "description": f"CPU使用率が高いです ({cpu_percent:.1f}%)",
                }
            )
            recommendations.append("CPU使用率が高いです。不要なプロセスを終了するか、処理の最適化を検討してください。")

        # メモリ分析
        memory_percent = resources["memory"]["percent"]
        if memory_percent > self.thresholds["memory_critical"]:
            bottlenecks.append(
                {
                    "type": "memory",
                    "severity": "critical",
                    "value": memory_percent,
                    "description": f"メモリ使用率が非常に高いです ({memory_percent:.1f}%)",
                }
            )
            recommendations.append(
                "メモリ使用率が非常に高いです。メモリリークの可能性があります。アプリケーションを再起動してください。"
            )
        elif memory_percent > self.thresholds["memory_high"]:
            bottlenecks.append(
                {
                    "type": "memory",
                    "severity": "high",
                    "value": memory_percent,
                    "description": f"メモリ使用率が高いです ({memory_percent:.1f}%)",
                }
            )
            recommendations.append(
                "メモリ使用率が高いです。キャッシュサイズの調整や不要なデータのクリアを検討してください。"
            )

        # ディスク分析
        disk_percent = resources["disk"]["percent"]
        if disk_percent > self.thresholds["disk_critical"]:
            bottlenecks.append(
                {
                    "type": "disk",
                    "severity": "critical",
                    "value": disk_percent,
                    "description": f"ディスク使用率が非常に高いです ({disk_percent:.1f}%)",
                }
            )
            recommendations.append(
                "ディスク使用率が非常に高いです。ストレージのクリーンアップまたはスケールアップが必要です。"
            )
        elif disk_percent > self.thresholds["disk_high"]:
            bottlenecks.append(
                {
                    "type": "disk",
                    "severity": "high",
                    "value": disk_percent,
                    "description": f"ディスク使用率が高いです ({disk_percent:.1f}%)",
                }
            )
            recommendations.append(
                "ディスク使用率が高いです。不要なファイルの削除やログのローテーションを検討してください。"
            )

        # プロセス分析
        processes = resources["processes"]
        top_cpu = processes["top_cpu"]
        top_memory = processes["top_memory"]

        if top_cpu and top_cpu[0]["cpu_percent"] > 50.0:
            bottlenecks.append(
                {
                    "type": "process_cpu",
                    "severity": "high",
                    "value": top_cpu[0]["cpu_percent"],
                    "description": f"プロセス '{top_cpu[0]['name']}' がCPUを大量に使用しています ({top_cpu[0]['cpu_percent']:.1f}%)",
                }
            )
            recommendations.append(
                f"プロセス '{top_cpu[0]['name']}' がCPUを大量に使用しています。処理の最適化を検討してください。"
            )

        if top_memory and top_memory[0]["memory_percent"] > 30.0:
            bottlenecks.append(
                {
                    "type": "process_memory",
                    "severity": "high",
                    "value": top_memory[0]["memory_percent"],
                    "description": f"プロセス '{top_memory[0]['name']}' がメモリを大量に使用しています ({top_memory[0]['memory_percent']:.1f}%)",
                }
            )
            recommendations.append(
                f"プロセス '{top_memory[0]['name']}' がメモリを大量に使用しています。メモリ使用量の最適化を検討してください。"
            )

        status = (
            "critical"
            if any(b["severity"] == "critical" for b in bottlenecks)
            else "warning" if bottlenecks else "normal"
        )

        return {
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "resources": resources,
            "bottlenecks": bottlenecks,
            "recommendations": recommendations,
        }

    def get_optimization_recommendations(self) -> List[str]:
        """最適化提案を生成"""
        analysis = self.analyze_performance_bottlenecks()
        return analysis.get("recommendations", [])

    def get_resource_trends(self, hours: int = 1) -> Dict:
        """リソース使用傾向を分析"""
        history = self.resource_monitor.get_resource_history()

        if len(history) < 2:
            return {"status": "insufficient_data"}

        # 最新のデータをフィルタリング
        cutoff_time = datetime.now().timestamp() - (hours * 3600)
        recent_data = [
            entry for entry in history if datetime.fromisoformat(entry["timestamp"]).timestamp() > cutoff_time
        ]

        if len(recent_data) < 2:
            return {"status": "insufficient_data"}

        # CPU使用率の傾向
        cpu_values = [entry["cpu"]["percent"] for entry in recent_data]
        cpu_trend = self._calculate_trend(cpu_values)

        # メモリ使用率の傾向
        memory_values = [entry["memory"]["percent"] for entry in recent_data]
        memory_trend = self._calculate_trend(memory_values)

        # ディスク使用率の傾向
        disk_values = [entry["disk"]["percent"] for entry in recent_data]
        disk_trend = self._calculate_trend(disk_values)

        return {
            "status": "success",
            "period_hours": hours,
            "trends": {
                "cpu": {
                    "values": cpu_values,
                    "trend": cpu_trend,
                    "average": np.mean(cpu_values),
                    "max": np.max(cpu_values),
                    "min": np.min(cpu_values),
                },
                "memory": {
                    "values": memory_values,
                    "trend": memory_trend,
                    "average": np.mean(memory_values),
                    "max": np.max(memory_values),
                    "min": np.min(memory_values),
                },
                "disk": {
                    "values": disk_values,
                    "trend": disk_trend,
                    "average": np.mean(disk_values),
                    "max": np.max(disk_values),
                    "min": np.min(disk_values),
                },
            },
        }

    def _calculate_trend(self, values: List[float]) -> str:
        """値の傾向を計算"""
        if len(values) < 2:
            return "stable"

        # 線形回帰の傾きを計算
        x = np.arange(len(values))
        slope = np.polyfit(x, values, 1)[0]

        if slope > 0.5:
            return "increasing"
        elif slope < -0.5:
            return "decreasing"
        else:
            return "stable"

    def generate_performance_report(self) -> str:
        """パフォーマンスレポートを生成"""
        analysis = self.analyze_performance_bottlenecks()
        trends = self.get_resource_trends()

        report = f"""
{'='*60}
📊 AGStock パフォーマンス分析レポート
{'='*60}
生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
現在のリソース使用状況
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        if analysis["status"] == "no_data":
            report += "データがありません\n"
            return report

        resources = analysis["resources"]
        report += f"""CPU使用率:     {resources['cpu']['percent']:5.1f}%
メモリ使用率:   {resources['memory']['percent']:5.1f}%
ディスク使用率: {resources['disk']['percent']:5.1f}%
プロセス数:     {resources['processes']['count']:5d}個
"""

        report += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ボトルネック分析
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステータス: {analysis['status'].upper()}
"""

        if analysis["bottlenecks"]:
            for bottleneck in analysis["bottlenecks"]:
                severity_icon = "🔴" if bottleneck["severity"] == "critical" else "🟡"
                report += f"{severity_icon} {bottleneck['description']}\n"
        else:
            report += "ボトルネックは検出されませんでした\n"

        report += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
最適化提案
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        if analysis["recommendations"]:
            for i, recommendation in enumerate(analysis["recommendations"], 1):
                report += f"{i}. {recommendation}\n"
        else:
            report += "最適化の必要はありません\n"

        report += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
リソース使用傾向 (過去1時間)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        if trends["status"] == "success":
            for resource, data in trends["trends"].items():
                trend_icon = "↗️" if data["trend"] == "increasing" else "↘️" if data["trend"] == "decreasing" else "➡️"
                report += f"{resource.upper()}: {trend_icon} 平均{data['average']:5.1f}% (最大{data['max']:5.1f}% / 最小{data['min']:5.1f}%)\n"
        else:
            report += "傾向データが不足しています\n"

        report += f"\n{'='*60}\n"

        return report


# 使用例
if __name__ == "__main__":
    analyzer = PerformanceAnalyzer()

    # パフォーマンスレポートを生成
    report = analyzer.generate_performance_report()
    print(report)

    # 最適化提案を表示
    recommendations = analyzer.get_optimization_recommendations()
    if recommendations:
        print("\n最適化提案:")
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
