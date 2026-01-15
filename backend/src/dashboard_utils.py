"""
ダッシュボード用ユーティリティ関数
"""

import datetime
import subprocess
import time

import pandas as pd
import streamlit as st

from src.data_loader import fetch_stock_data
from src.paper_trader import PaperTrader
import os


def _demo_mode() -> bool:
    env_flag = os.getenv("USE_DEMO_DATA", "")
    return bool(st.session_state.get("use_demo_data")) or env_flag.lower() in {
        "1",
        "true",
        "yes",
    }


def check_and_execute_missed_trades():
    """
    起動時に前日の取引が未実行なら自動実行する関数

    ダッシュボードの起動時に呼び出すことで、
    15:30に起動していなくても自動取引を補完します。
    """
    if _demo_mode():
        st.info("デモモード: 自動取引チェックはスキップしています。")
        return

    # セッション状態で1回だけ実行
    if "auto_trade_checked" in st.session_state:
        return

    st.session_state.auto_trade_checked = True

    try:
        pt = PaperTrader()

        # 最後の取引日を確認
        history = pt.get_trade_history(limit=1)
        today = datetime.date.today()

        # 取引履歴がない、または最後の取引が今日でない場合
        should_trade = False

        if history.empty:
            should_trade = True
        else:
            # 日付カラムの特定
            date_col = "date"
            if "date" not in history.columns and "timestamp" in history.columns:
                date_col = "timestamp"

            if date_col in history.columns:
                last_trade_date = pd.to_datetime(history[date_col].iloc[0]).date()
                # 平日で、最後の取引が昨日以前なら実行
                if today.weekday() < 5 and last_trade_date < today:
                    should_trade = True

        if should_trade:
            # バックグラウンドで自動取引実行
            with st.spinner("📊 前回の取引を実行中..."):
                # fully_automated_trader.py を実行
                result = subprocess.run(
                    ["python", "fully_automated_trader.py", "--force"],
                    capture_output=True,
                    text=True,
                    timeout=180,  # 3分タイムアウト
                )

                if result.returncode == 0:
                    st.success("✅ 前回の取引を自動実行しました！")
                    time.sleep(2)
                    st.experimental_rerun()
                else:
                    st.error(f"自動取引エラー: {result.stderr}")

        pt.close()

    except Exception as e:
        # エラーは無視（通常の表示を続ける）
        print(f"Auto-trade check error: {e}")


def get_multi_timeframe_trends(ticker: str) -> dict:
    """
    Get trend analysis for multiple timeframes (Short, Medium, Long).
    """
    try:
        if _demo_mode():
            return {"short": "up", "medium": "neutral", "long": "up"}

        # Fetch data (1 year to calculate long term MA)
        data_map = fetch_stock_data([ticker], period="2y")  # Fetch a bit more to be safe
        if ticker not in data_map or data_map[ticker].empty:
            return {"short": "neutral", "medium": "neutral", "long": "neutral"}

        df = data_map[ticker]
        close = df["Close"]

        if len(close) < 5:
            return {"short": "neutral", "medium": "neutral", "long": "neutral"}

        # Calculate SMAs
        sma5 = close.rolling(window=5).mean().iloc[-1]
        sma20 = close.rolling(window=20).mean().iloc[-1] if len(close) >= 20 else close.mean()
        sma60 = close.rolling(window=60).mean().iloc[-1] if len(close) >= 60 else close.mean()
        sma200 = close.rolling(window=200).mean().iloc[-1] if len(close) >= 200 else sma60

        current_price = close.iloc[-1]

        # Determine trends
        trends = {}

        # Short term: Price vs SMA5
        if current_price > sma5:
            trends["short"] = "up"
        elif current_price < sma5:
            trends["short"] = "down"
        else:
            trends["short"] = "neutral"

        # Medium term: SMA5 vs SMA20
        if sma5 > sma20:
            trends["medium"] = "up"
        elif sma5 < sma20:
            trends["medium"] = "down"
        else:
            trends["medium"] = "neutral"

        # Long term: SMA60 vs SMA200 (or Price vs SMA200 for simpler view)
        if sma60 > sma200:
            trends["long"] = "up"
        elif sma60 < sma200:
            trends["long"] = "down"
        else:
            trends["long"] = "neutral"

        return trends

    except Exception as e:
        print(f"Error getting trends for {ticker}: {e}")
        return {"short": "error", "medium": "error", "long": "error"}


def get_market_regime(ticker: str = "^N225") -> dict:
    """
    Determine the current market regime (Bull, Bear, Ranging).
    Uses Nikkei 225 as default market proxy.
    """
    try:
        if _demo_mode():
            return {
                "regime": "demo",
                "description": "デモモード（疑似データ）",
                "strategy_desc": "学習・デモ用。実取引は行われません。",
                "trends": {"short": "up", "medium": "neutral", "long": "up"},
            }

        trends = get_multi_timeframe_trends(ticker)

        regime = "ranging"
        description = "横ばい・方向感なし"
        strategy_desc = "レンジ逆張り / 個別株選定"

        # Aggregating trends
        up_counts = sum(1 for v in trends.values() if v == "up")
        down_counts = sum(1 for v in trends.values() if v == "down")

        if up_counts == 3:
            regime = "strong_bull"
            description = "強い上昇トレンド"
            strategy_desc = "順張り / モメンタム投資"
        elif up_counts >= 2:
            regime = "trending_up"
            description = "上昇傾向"
            strategy_desc = "押し目買い"
        elif down_counts == 3:
            regime = "strong_bear"
            description = "強い下落トレンド"
            strategy_desc = "キャッシュ確保 / 売りヘッジ"
        elif down_counts >= 2:
            regime = "trending_down"
            description = "下落傾向"
            strategy_desc = "戻り売り / 防御的ポートフォリオ"

        return {
            "regime": regime,
            "description": description,
            "strategy_desc": strategy_desc,
            "trends": trends,
        }

    except Exception as e:
        return {
            "regime": "unknown",
            "description": f"判定エラー ({e})",
            "strategy_desc": "保守的運用",
        }
