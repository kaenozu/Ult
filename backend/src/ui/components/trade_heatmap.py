"""トレードヒートマップ可視化

時間帯 x 曜日 で損益をヒートマップ表示
"""

from typing import List

import pandas as pd
import plotly.graph_objects as go
import streamlit as st


def render_trade_heatmap(trades_df: pd.DataFrame):
    """トレードヒートマップをレンダリング

    Args:
        trades_df: 取引データ（timestamp, pnl 列が必要）
    """
    if trades_df.empty:
        st.info("取引データがありません")
        return

    # データ準備
    df = trades_df.copy()

    # timestamp列の確認と変換
    if "timestamp" not in df.columns:
        if "date" in df.columns:
            df["timestamp"] = pd.to_datetime(df["date"])
        elif "created_at" in df.columns:
            df["timestamp"] = pd.to_datetime(df["created_at"])
        else:
            st.warning("タイムスタンプ列が見つかりません")
            return
    else:
        df["timestamp"] = pd.to_datetime(df["timestamp"])

    # pnl列の確認
    if "pnl" not in df.columns:
        if "profit" in df.columns:
            df["pnl"] = df["profit"]
        elif "return" in df.columns:
            df["pnl"] = df["return"]
        else:
            st.warning("損益列が見つかりません")
            return

    # 時間と曜日を抽出
    df["hour"] = df["timestamp"].dt.hour
    df["weekday"] = df["timestamp"].dt.day_name()

    # 曜日の順序を定義
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    # ピボットテーブル作成
    pivot = df.pivot_table(values="pnl", index="hour", columns="weekday", aggfunc="sum", fill_value=0)

    # 曜日の順序を並べ替え
    existing_weekdays = [w for w in weekday_order if w in pivot.columns]
    pivot = pivot[existing_weekdays]

    # 時間をソート
    pivot = pivot.sort_index()

    # ヒートマップ作成
    fig = go.Figure(
        data=go.Heatmap(
            z=pivot.values,
            x=pivot.columns,
            y=[f"{h:02d}:00" for h in pivot.index],
            colorscale=[
                [0, "#ef4444"],  # 赤（損失）
                [0.5, "#1e293b"],  # ニュートラル
                [1, "#22c55e"],  # 緑（利益）
            ],
            zmid=0,
            text=[[f"¥{v:,.0f}" for v in row] for row in pivot.values],
            texttemplate="%{text}",
            textfont={"size": 10},
            hovertemplate="%{y} %{x}<br>損益: ¥%{z:,.0f}<extra></extra>",
        )
    )

    fig.update_layout(
        title={
            "text": "📅 取引時間帯分析",
            "font": {"size": 18, "color": "#f8fafc"},
        },
        xaxis_title="曜日",
        yaxis_title="時間",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#94a3b8"},
        height=500,
        margin={"l": 60, "r": 20, "t": 60, "b": 40},
    )

    st.plotly_chart(fig, use_container_width=True)

    # サマリー統計
    col1, col2, col3 = st.columns(3)

    with col1:
        best_hour = pivot.sum(axis=1).idxmax()
        st.metric("🌟 最高の時間帯", f"{best_hour:02d}:00")

    with col2:
        best_day = pivot.sum(axis=0).idxmax()
        st.metric("📈 最高の曜日", best_day)

    with col3:
        worst_hour = pivot.sum(axis=1).idxmin()
        st.metric("⚠️ 要注意時間帯", f"{worst_hour:02d}:00")


def render_monthly_performance(trades_df: pd.DataFrame):
    """月別パフォーマンスチャート

    Args:
        trades_df: 取引データ
    """
    if trades_df.empty:
        return

    df = trades_df.copy()

    # タイムスタンプ変換
    if "timestamp" not in df.columns:
        if "date" in df.columns:
            df["timestamp"] = pd.to_datetime(df["date"])
        else:
            return
    else:
        df["timestamp"] = pd.to_datetime(df["timestamp"])

    if "pnl" not in df.columns:
        return

    # 月別集計
    df["month"] = df["timestamp"].dt.to_period("M")
    monthly = df.groupby("month")["pnl"].sum().reset_index()
    monthly["month_str"] = monthly["month"].astype(str)

    # バーチャート
    colors = ["#22c55e" if v >= 0 else "#ef4444" for v in monthly["pnl"]]

    fig = go.Figure(
        data=go.Bar(
            x=monthly["month_str"],
            y=monthly["pnl"],
            marker_color=colors,
            text=[f"¥{v:,.0f}" for v in monthly["pnl"]],
            textposition="outside",
            hovertemplate="%{x}<br>損益: ¥%{y:,.0f}<extra></extra>",
        )
    )

    fig.update_layout(
        title={
            "text": "📆 月別パフォーマンス",
            "font": {"size": 18, "color": "#f8fafc"},
        },
        xaxis_title="月",
        yaxis_title="損益 (¥)",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#94a3b8"},
        height=400,
        showlegend=False,
    )

    fig.update_yaxes(gridcolor="rgba(148, 163, 184, 0.1)")

    st.plotly_chart(fig, use_container_width=True)


def render_win_rate_gauge(win_rate: float):
    """勝率ゲージチャート

    Args:
        win_rate: 勝率（%）
    """
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number+delta",
            value=win_rate,
            domain={"x": [0, 1], "y": [0, 1]},
            title={"text": "勝率", "font": {"size": 16, "color": "#94a3b8"}},
            number={"suffix": "%", "font": {"size": 40, "color": "#f8fafc"}},
            delta={"reference": 50, "suffix": "%"},
            gauge={
                "axis": {"range": [0, 100], "tickwidth": 1, "tickcolor": "#94a3b8"},
                "bar": {"color": "#3b82f6"},
                "bgcolor": "rgba(30, 41, 59, 0.5)",
                "borderwidth": 2,
                "bordercolor": "rgba(255, 255, 255, 0.1)",
                "steps": [
                    {"range": [0, 40], "color": "rgba(239, 68, 68, 0.3)"},
                    {"range": [40, 60], "color": "rgba(245, 158, 11, 0.3)"},
                    {"range": [60, 100], "color": "rgba(34, 197, 94, 0.3)"},
                ],
                "threshold": {
                    "line": {"color": "#f8fafc", "width": 4},
                    "thickness": 0.75,
                    "value": win_rate,
                },
            },
        )
    )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        font={"color": "#94a3b8"},
        height=300,
        margin={"l": 20, "r": 20, "t": 40, "b": 20},
    )

    st.plotly_chart(fig, use_container_width=True)


def render_sector_allocation(positions: List[dict]):
    """セクター配分ドーナツチャート

    Args:
        positions: ポジションリスト
    """
    if not positions:
        st.info("ポジションがありません")
        return

    # セクター別集計
    sector_values = {}
    for pos in positions:
        sector = pos.get("sector", "その他")
        value = pos.get("value", 0)
        sector_values[sector] = sector_values.get(sector, 0) + value

    labels = list(sector_values.keys())
    values = list(sector_values.values())

    # カラーパレット
    colors = [
        "#3b82f6",
        "#8b5cf6",
        "#ec4899",
        "#f59e0b",
        "#22c55e",
        "#06b6d4",
        "#f97316",
        "#6366f1",
    ]

    fig = go.Figure(
        data=go.Pie(
            labels=labels,
            values=values,
            hole=0.6,
            marker={"colors": colors[: len(labels)]},
            textinfo="label+percent",
            textposition="outside",
            hovertemplate="%{label}<br>¥%{value:,.0f}<br>%{percent}<extra></extra>",
        )
    )

    fig.update_layout(
        title={
            "text": "🎯 セクター配分",
            "font": {"size": 18, "color": "#f8fafc"},
        },
        paper_bgcolor="rgba(0,0,0,0)",
        font={"color": "#94a3b8"},
        height=400,
        showlegend=True,
        legend={"orientation": "h", "y": -0.1},
        annotations=[
            {
                "text": f"¥{sum(values):,.0f}",
                "x": 0.5,
                "y": 0.5,
                "font_size": 20,
                "showarrow": False,
                "font": {"color": "#f8fafc"},
            }
        ],
    )

    st.plotly_chart(fig, use_container_width=True)
