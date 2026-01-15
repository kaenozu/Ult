"""
朝活ダッシュボード - 出勤前の5分で完結
Morning Dashboard for Personal Investors

使い方:
  streamlit run morning_dashboard.py
  または
  python morning_dashboard.py --auto
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import streamlit as st

from src.anomaly_detector import AnomalyDetector
from src.formatters import format_currency, format_percentage
from src.paper_trader import PaperTrader

# ページ設定はmainブロックに移動しました

# カスタムCSS (スマホ対応)
st.markdown(
    """
<style>
    /* モバイルフレンドリー */
    .main {
        padding: 1rem;
    }

    /* 大きなボタン */
    .stButton > button {
        width: 100%;
        height: 60px;
        font-size: 18px;
        font-weight: bold;
        border-radius: 10px;
        margin: 5px 0;
    }

    /* メトリックカード */
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 15px;
        margin: 10px 0;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .metric-value {
        font-size: 2.5em;
        font-weight: bold;
        margin: 10px 0;
    }

    .metric-label {
        font-size: 1em;
        opacity: 0.9;
    }

    /* アクションカード */
    .action-card {
        background: white;
        border: 2px solid #667eea;
        border-radius: 10px;
        padding: 15px;
        margin: 10px 0;
    }

    .action-title {
        font-size: 1.2em;
        font-weight: bold;
        color: #667eea;
        margin-bottom: 10px;
    }

    /* アラート */
    .alert-critical {
        background: #fee;
        border-left: 4px solid #f44;
        padding: 15px;
        margin: 10px 0;
        border-radius: 5px;
    }

    .alert-warning {
        background: #ffc;
        border-left: 4px solid #fa0;
        padding: 15px;
        margin: 10px 0;
        border-radius: 5px;
    }

    .alert-info {
        background: #eff;
        border-left: 4px solid #4af;
        padding: 15px;
        margin: 10px 0;
        border-radius: 5px;
    }
</style>
""",
    unsafe_allow_html=True,
)


def get_morning_greeting() -> str:
    """時間帯に応じた挨拶"""
    hour = datetime.now().hour
    if hour < 6:
        return "🌙 おはようございます(早起きですね!)"
    elif hour < 12:
        return "🌅 おはようございます"
    elif hour < 18:
        return "☀️ こんにちは"
    else:
        return "🌙 こんばんは"


def check_portfolio_health(pt: PaperTrader) -> Dict:
    """ポートフォリオの健康度チェック"""
    positions = pt.get_positions()
    balance = pt.get_current_balance()

    health_status = {
        "status": "HEALTHY",
        "issues": [],
        "warnings": [],
        "total_positions": len(positions),
        "cash_ratio": balance["cash"] / balance["total_equity"] if balance["total_equity"] > 0 else 0,
    }

    if positions.empty:
        health_status["warnings"].append("ポジションがありません")
        return health_status

    # 大きな含み損をチェック
    for idx, pos in positions.iterrows():
        pnl_pct = pos.get("unrealized_pnl_pct", 0)
        ticker = pos.get("ticker", idx)

        if pnl_pct < -10:  # -10%以上の含み損
            health_status["status"] = "CRITICAL"
            health_status["issues"].append(f"{ticker}: {pnl_pct:.1f}% (損切り検討)")
        elif pnl_pct < -5:  # -5%以上の含み損
            health_status["status"] = "WARNING" if health_status["status"] == "HEALTHY" else health_status["status"]
            health_status["warnings"].append(f"{ticker}: {pnl_pct:.1f}% (要注意)")

    # 現金比率チェック
    if health_status["cash_ratio"] < 0.1:  # 現金10%未満
        health_status["warnings"].append(f"現金比率が低い ({health_status['cash_ratio']:.1%})")

    return health_status


def get_top_signals(limit: int = 3) -> List[Dict]:
    """今日の注目銘柄を取得"""
    try:
        # 最新のスキャン結果を読み込み
        scan_file = Path("scan_results.json")
        if scan_file.exists():
            with open(scan_file, "r", encoding="utf-8") as f:
                scan_data = json.load(f)

            signals = scan_data.get("signals", [])

            # 信頼度でソート
            signals_sorted = sorted(signals, key=lambda x: x.get("confidence", 0), reverse=True)

            return signals_sorted[:limit]
        else:
            return []
    except Exception as e:
        st.error(f"シグナル読み込みエラー: {e}")
        return []


def get_action_items(pt: PaperTrader, health_status: Dict) -> List[Dict]:
    """今日のアクションアイテムを生成"""
    actions = []

    # 1. 健康度に基づくアクション
    if health_status["status"] == "CRITICAL":
        actions.append(
            {
                "priority": "HIGH",
                "type": "RISK",
                "title": "🚨 損切り検討",
                "description": "大きな含み損のポジションがあります",
                "items": health_status["issues"],
                "action_required": True,
            }
        )

    if health_status["warnings"]:
        actions.append(
            {
                "priority": "MEDIUM",
                "type": "WARNING",
                "title": "⚠️ 要注意ポジション",
                "description": "監視が必要なポジションがあります",
                "items": health_status["warnings"],
                "action_required": False,
            }
        )

    # 2. 新規シグナル
    top_signals = get_top_signals(3)
    if top_signals:
        signal_items = [
            f"{s['ticker']}: {s.get('strategy', 'AI')} (信頼度{s.get('confidence', 0):.0%})" for s in top_signals
        ]
        actions.append(
            {
                "priority": "MEDIUM",
                "type": "OPPORTUNITY",
                "title": "💡 新規投資機会",
                "description": f"{len(top_signals)}件の有望銘柄",
                "items": signal_items,
                "action_required": True,
                "signals": top_signals,
            }
        )

    # 3. 現金比率
    if health_status["cash_ratio"] < 0.1:
        actions.append(
            {
                "priority": "LOW",
                "type": "INFO",
                "title": "ℹ️ 現金比率",
                "description": "現金比率が低めです。リバランスを検討してください。",
                "items": [f"現在: {health_status['cash_ratio']:.1%}"],
                "action_required": False,
            }
        )

    return actions


def execute_recommended_action(action: Dict, pt: PaperTrader):
    """推奨アクションを実行"""
    if action["type"] == "OPPORTUNITY" and "signals" in action:
        # 新規購入
        for signal in action["signals"]:
            ticker = signal["ticker"]
            price = signal.get("price", 0)

            # 簡易的な数量計算
            balance = pt.get_current_balance()
            target_amount = balance["cash"] * 0.1  # 現金の10%
            quantity = int(target_amount / price / 100) * 100

            if quantity >= 100:
                pt.execute_trade(
                    ticker=ticker,
                    action="BUY",
                    quantity=quantity,
                    price=price,
                    reason=f"朝活ダッシュボード承認: {signal.get('strategy', 'AI')}",
                )
                st.success(f"✅ {ticker} を {quantity}株 購入しました")
            else:
                st.warning(f"⚠️ {ticker}: 資金不足")


def render_dashboard(pt: PaperTrader = None):
    """ダッシュボードを描画"""
    if pt is None:
        pt = PaperTrader()

    balance = pt.get_current_balance()

    # セクション1: 資産サマリー
    st.markdown("---")
    st.subheader("💰 資産状況")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown(
            f"""
        <div class="metric-card">
            <div class="metric-label">総資産</div>
            <div class="metric-value">{format_currency(balance['total_equity'])}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col2:
        total_return = (balance["total_equity"] - pt.initial_capital) / pt.initial_capital
        color = "#10b981" if total_return >= 0 else "#ef4444"
        st.markdown(
            f"""
        <div class="metric-card" style="background: linear-gradient(135deg, {color} 0%, {color}dd 100%);">
            <div class="metric-label">収益率</div>
            <div class="metric-value">{format_percentage(total_return)}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col3:
        # 勝率計算
        history = pt.get_trade_history()
        if not history.empty and "realized_pnl" in history.columns:
            wins = len(history[history["realized_pnl"] > 0])
            total = len(history[history["realized_pnl"] != 0])
            win_rate = wins / total if total > 0 else 0
        else:
            win_rate = 0

        st.markdown(
            f"""
        <div class="metric-card">
            <div class="metric-label">勝率</div>
            <div class="metric-value">{format_percentage(win_rate)}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    # セクション2: ポートフォリオ健康度
    st.markdown("---")
    st.subheader("🏥 ポートフォリオ健康度")

    health_status = check_portfolio_health(pt)

    if health_status["status"] == "HEALTHY":
        st.success("✅ 健全な状態です")
    elif health_status["status"] == "WARNING":
        st.warning("⚠️ 要注意")
    else:
        st.error("🚨 要対応")

    # アノマリー検知
    try:
        detector = AnomalyDetector()
        anomalies = detector.run_all_checks()

        if anomalies:
            st.markdown("### 🚨 検出されたアノマリー")
            for anomaly in anomalies:
                severity = anomaly["severity"]
                alert_class = f"alert-{severity.lower()}"
                st.markdown(
                    f"""
                <div class="{alert_class}">
                    <strong>{anomaly['type']}</strong><br>
                    {anomaly['message']}
                </div>
                """,
                    unsafe_allow_html=True,
                )
    except Exception as e:
        st.warning(f"アノマリー検知エラー: {e}")

    # セクション3: 今日のアクション
    st.markdown("---")
    st.subheader("📋 今日のアクションリスト")

    actions = get_action_items(pt, health_status)

    if not actions:
        st.info("✅ 今日は特にアクションは必要ありません。良い一日を!")
    else:
        for i, action in enumerate(actions):
            priority_emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}

            with st.expander(
                f"{priority_emoji.get(action['priority'], '⚪')} {action['title']}",
                expanded=(action["priority"] == "HIGH"),
            ):
                st.markdown(f"**{action['description']}**")

                if action["items"]:
                    for item in action["items"]:
                        st.markdown(f"- {item}")

                # アクションボタン
                if action["action_required"]:
                    col_approve, col_reject = st.columns(2)

                    with col_approve:
                        if st.button("✅ 承認", key=f"morning_approve_{i}"):
                            execute_recommended_action(action, pt)

                    with col_reject:
                        if st.button("❌ 却下", key=f"morning_reject_{i}"):
                            st.info("却下しました")

    # セクション4: 注目銘柄
    st.markdown("---")
    st.subheader("⭐ 今日の注目銘柄 TOP3")

    top_signals = get_top_signals(3)

    if top_signals:
        for i, signal in enumerate(top_signals, 1):
            col_rank, col_info = st.columns([1, 4])

            with col_rank:
                st.markdown(f"### {i}")

            with col_info:
                ticker = signal["ticker"]
                confidence = signal.get("confidence", 0)
                strategy = signal.get("strategy", "AI")
                price = signal.get("price", 0)

                st.markdown(
                    f"""
                **{ticker}** - {strategy}
                信頼度: {confidence:.0%} | 価格: {format_currency(price)}
                """
                )
    else:
        st.info("現在、推奨銘柄はありません")

    # セクション5: クイックアクション
    st.markdown("---")
    st.subheader("⚡ クイックアクション")

    col_a, col_b = st.columns(2)

    with col_a:
        if st.button("📊 詳細レポート", use_container_width=True, key="morning_report_btn"):
            st.info("週次レポートを生成します...")
            # weekly_report_html.pyを実行
            import subprocess

            subprocess.Popen(["python", "weekly_report_html.py"])

    with col_b:
        if st.button("🔄 市場スキャン", use_container_width=True, key="morning_scan_btn"):
            st.info("市場スキャンを開始します...")
            # daily_scan.pyを実行
            import subprocess

            subprocess.Popen(["python", "daily_scan.py"])

    # フッター
    st.markdown("---")
    st.caption("💡 このダッシュボードは毎朝自動更新されます")
    st.caption("⏰ 推奨確認時間: 出勤前の5分")


def main():
    """メイン処理"""

    # ヘッダー
    st.title("🌅 朝活ダッシュボード")
    st.markdown(f"### {get_morning_greeting()}")
    st.caption(f"📅 {datetime.now().strftime('%Y年%m月%d日 %H:%M')}")

    # ダッシュボード描画
    render_dashboard()


if __name__ == "__main__":
    # コマンドライン引数チェック
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        # 自動モード: コンソール出力のみ
        print("=" * 60)
        print("🌅 朝活ダッシュボード (自動モード)")
        print("=" * 60)

        pt = PaperTrader()
        balance = pt.get_current_balance()
        health_status = check_portfolio_health(pt)
        actions = get_action_items(pt, health_status)

        print(f"\n💰 総資産: {format_currency(balance['total_equity'])}")
        print(f"🏥 健康度: {health_status['status']}")
        print(f"📋 アクション: {len(actions)}件")

        if actions:
            print("\n今日のアクション:")
            for action in actions:
                print(f"  - {action['title']}")

        print("\n" + "=" * 60)
    else:
        # Streamlitモード
        main()
