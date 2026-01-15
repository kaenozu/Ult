import logging
import os
import sqlite3
import pandas as pd
from datetime import datetime
from src.oracle.oracle_2026 import Oracle2026

logger = logging.getLogger(__name__)


class SovereignReporter:
    """
    Sovereign Reporter: システムのパフォーマンス、AI委員会の決議、
    およびOracleの預言を統合した聖域報告書を生成する。
    """

    def __init__(self, db_path: str = "data/agstock.db"):
        self.db_path = db_path
        self.oracle = Oracle2026()

    def generate_report(self) -> str:
        """月次/週次の聖域報告書をMarkdown形式で生成する。"""
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. データの取得
        try:
            conn = sqlite3.connect(self.db_path)
            trade_logs = pd.read_sql_query("SELECT * FROM trade_logs ORDER BY timestamp DESC LIMIT 50", conn)
            # 議決データ（もしあれば）
            try:
                votes = pd.read_sql_query("SELECT * FROM council_votes ORDER BY timestamp DESC LIMIT 10", conn)
            except:
                votes = pd.DataFrame()
            conn.close()
        except Exception as e:
            logger.error(f"Report data loading failed: {e}")
            return f"Error: Could not load data for report. {e}"

        # 2. パフォーマンス要約
        total_pnl = trade_logs["pnl"].sum() if not trade_logs.empty else 0
        win_rate = (len(trade_logs[trade_logs["pnl"] > 0]) / len(trade_logs) * 100) if not trade_logs.empty else 0

        # 3. Oracleの預言
        scenarios = self.oracle.speculate_scenarios()
        resilience = self.oracle.assess_portfolio_resilience([])

        # 4. レポートの構築
        report = f"""# 🏛️ AGStock Sovereign Report
**Generated at:** {now}

---

## 📈 Performance Reflection (2025-2026 Transition)
直近の取引活動を通じ、システムは以下の成果を収めました。

- **Total Realized PnL:** ¥{total_pnl:,.0f}
- **Win Rate:** {win_rate:.1f}%
- **Status:** {"Transcendent Ascension" if total_pnl > 0 else "Stealth Accumulation"}

---

## 🏛️ AI Council Resolutions (Committee Decisions)
AI投資委員会（Council of Avatars）による最近の議決事項です。
"""
        if not votes.empty:
            for _, v in votes.iterrows():
                report += f"- **{v['ticker']}**: {v['decision']} (Confidence: {v['confidence']*100:.0f}%)\n"
        else:
            report += "- 現在、記録された議決事項はありません。全エージェントは自律守護モードです。\n"

        report += f"""
---

## 🔮 Oracle of 2026: Future Mandate
預言エンジンが検知した来たるべき世界の予兆です。

### Detected Scenarios:
"""
        for s in scenarios:
            report += f"- **{s['name']}** ({s['risk_level']} Risk): {s['description']}\n"

        report += f"""
### Portfolio Resilience:
- **Resilience Score:** {resilience['resilience_score']}/100
- **Mandate:** {resilience['recommendation']}

---
*This report is signed with the digital soul of AGStock. May the Chronos favor your wealth.*
"""
        return report

    def save_report(self, filename: str = None):
        """報告書をファイルとして保存する。"""
        if not filename:
            filename = f"reports/sovereign_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

        os.makedirs("reports", exist_ok=True)
        content = self.generate_report()
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)

        logger.info(f"Sovereign Report saved to {filename}")
        return filename
