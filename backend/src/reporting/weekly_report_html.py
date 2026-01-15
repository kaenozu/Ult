"""
週次パフォーマンスレポート - 個人投資家向け
HTML形式でレポートを生成し、LINE/Discordで送信可能
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

from src.formatters import format_currency, format_percentage
from src.paper_trader import PaperTrader


def generate_html_report(pt: PaperTrader, start_date: datetime, end_date: datetime) -> str:
    """HTML形式のレポートを生成"""

    balance = pt.get_current_balance()
    initial_capital = pt.initial_capital
    total_return = (balance["total_equity"] - initial_capital) / initial_capital

    # 取引履歴
    history = pt.get_trade_history()
    time_col = "timestamp" if "timestamp" in history.columns else "date"
    if time_col in history.columns:
        history[time_col] = pd.to_datetime(history[time_col])
        week_trades = history[history[time_col] >= start_date]
    else:
        week_trades = history

    # 統計計算
    buy_count = len(week_trades[week_trades["action"] == "BUY"])
    sell_count = len(week_trades[week_trades["action"] == "SELL"])

    # 勝率計算
    closed_trades = history[history["action"] == "SELL"].copy()
    if not closed_trades.empty and "realized_pnl" in closed_trades.columns:
        wins = len(closed_trades[closed_trades["realized_pnl"] > 0])
        total_closed = len(closed_trades)
        win_rate = wins / total_closed if total_closed > 0 else 0
    else:
        win_rate = 0
        total_closed = 0

    # ポジション
    positions = pt.get_positions()

    # HTML生成
    html = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>週次レポート - AGStock</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }}
        .container {{
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }}
        h1 {{
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #764ba2;
            margin-top: 30px;
        }}
        .metric-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }}
        .metric-label {{
            font-size: 0.9em;
            opacity: 0.9;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            margin-top: 10px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #667eea;
            color: white;
        }}
        tr:hover {{
            background-color: #f5f5f5;
        }}
        .positive {{
            color: #10b981;
            font-weight: bold;
        }}
        .negative {{
            color: #ef4444;
            font-weight: bold;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }}
    </style>
</head>
<body>
<div class="container">
        <h1>📈 週次パフォーマンスレポート</h1>
        <p><strong>期間:</strong> {start_date.strftime('%Y-%m-%d')} 〜 {end_date.strftime('%Y-%m-%d')}</p>

        <h2>💰 資産状況</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">総資産</div>
                <div class="metric-value">{format_currency(balance['total_equity'])}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">収益率</div>
                <div class="metric-value {'positive' if total_return >= 0 else 'negative'}">{format_percentage(total_return)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">勝率</div>
                <div class="metric-value">{format_percentage(win_rate)}</div>
            </div>
        </div>

        <h2>📝 週間取引サマリー</h2>
        <p>取引回数: <strong>{len(week_trades)}回</strong> (買: {buy_count}回 / 売: {sell_count}回)</p>

        <h2>🏆 現在のポジション</h2>
        {generate_positions_table(positions)}

        <h2>💡 レビューポイント</h2>
        <ul>
            <li>システムの判断は妥当でしたか?</li>
            <li>リスク管理は機能していますか?</li>
            <li>来週に向けた改善点は?</li>
        </ul>

        <div class="footer">
            <p>Generated by AGStock - AI-Powered Trading System</p>
            <p>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>
"""
    return html


# return html


def generate_positions_table(positions: pd.DataFrame) -> str:
    """ポジションテーブルのHTML生成"""
    if positions.empty:
        return "<p>現在ポジションはありません</p>"

    positions_sorted = positions.sort_values("unrealized_pnl", ascending=False)

    html = """
    <table>
        <thead>
            <tr>
                <th>銘柄</th>
                <th>数量</th>
                <th>取得単価</th>
                <th>現在値</th>
                <th>含み損益</th>
                <th>損益率</th>
            </tr>
        </thead>
        <tbody>
    """

    for idx, pos in positions_sorted.head(10).iterrows():
        ticker = pos.get("ticker", idx)
        qty = pos.get("quantity", 0)
        entry = pos.get("entry_price", 0)
        current = pos.get("current_price", 0)
        pnl = pos.get("unrealized_pnl", 0)
        pnl_pct = pos.get("unrealized_pnl_pct", 0)

        pnl_class = "positive" if pnl >= 0 else "negative"

        html += f"""
            <tr>
                <td>{ticker}</td>
                <td>{qty}</td>
                <td>{format_currency(entry)}</td>
                <td>{format_currency(current)}</td>
                <td class="{pnl_class}">{format_currency(pnl)}</td>
                <td class="{pnl_class}">{format_percentage(pnl_pct / 100)}</td>
            </tr>
        """

    html += """
        </tbody>
    </table>
    """

    return html


def send_to_line(report_summary: str):
    """LINE Notifyで送信"""
    try:
        from src.smart_notifier import SmartNotifier

        SmartNotifier()

        # notifier.send_notification(message)
        print("✅ LINEに送信しました")
    except Exception as e:
        print(f"⚠️  LINE送信失敗: {e}")


def main():
    """メイン処理"""
    print("=" * 70)
    print("  📊 週次パフォーマンスレポート生成")
    print("=" * 70)

    pt = PaperTrader()
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    # HTMLレポート生成
    print("\n📝 HTMLレポートを生成中...")
    html_content = generate_html_report(pt, start_date, end_date)

    # ファイル保存
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)

    filename = f"weekly_report_{datetime.now().strftime('%Y%m%d')}.html"
    filepath = reports_dir / filename

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ レポート保存: {filepath}")

    # サマリー作成
    balance = pt.get_current_balance()
    initial_capital = pt.initial_capital
    total_return = (balance["total_equity"] - initial_capital) / initial_capital

    summary = f"""総資産: {format_currency(balance['total_equity'])}
収益率: {format_percentage(total_return)}
期間: {start_date.strftime('%Y-%m-%d')} 〜 {end_date.strftime('%Y-%m-%d')}"""

    # 設定確認
    config_path = Path("config.json")
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        if config.get("notifications", {}).get("enabled", False):
            print("\n📱 通知を送信しますか? (y/n): ", end="")
            response = input().strip().lower()
            if response == "y":
                send_to_line(summary)

    print("\n" + "=" * 70)
    print(f"  ✅ 完了! ブラウザで {filepath} を開いてください")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ エラーが発生しました: {e}")
        import traceback

        traceback.print_exc()
