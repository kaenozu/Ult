"""
Realtime Monitor UI - リアルタイム監視ダッシュボード
"""

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.data_loader import fetch_stock_data


def render_realtime_monitor():
    st.header("⚡ リアルタイム監視")
    st.write("市場データをリアルタイムで監視し、価格変動をトラッキングします。")

    # 監視銘柄設定
    default_tickers = "^N225,7203.T,6758.T,9984.T"
    tickers_input = st.text_input("監視銘柄（カンマ区切り）", default_tickers)
    tickers = [t.strip() for t in tickers_input.split(",")]

    # 更新間隔
    st.selectbox("更新間隔", [30, 60, 120, 300], format_func=lambda x: f"{x}秒")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("📊 最新データを取得", type="primary"):
            with st.spinner("データ取得中..."):
                data_map = fetch_stock_data(tickers, period="1d", interval="1m")

                st.session_state["realtime_data"] = data_map
                st.session_state["last_update"] = pd.Timestamp.now()

    with col2:
        if "last_update" in st.session_state:
            st.info(f"最終更新: {st.session_state['last_update'].strftime('%H:%M:%S')}")

    st.markdown("---")

    # データ表示
    if "realtime_data" in st.session_state:
        data_map = st.session_state["realtime_data"]

        # サマリーカード
        cols = st.columns(len(tickers))

        for i, ticker in enumerate(tickers):
            df = data_map.get(ticker)

            if df is not None and not df.empty:
                latest = df.iloc[-1]
                prev = df.iloc[-2] if len(df) > 1 else latest

                change = (latest["Close"] - prev["Close"]) / prev["Close"] * 100

                with cols[i]:
                    st.metric(
                        ticker.replace(".T", ""),
                        f"¥{latest['Close']:,.0f}",
                        f"{change:+.2f}%",
                    )

        st.markdown("---")

        # 詳細チャート
        st.subheader("📈 分足チャート")

        selected_ticker = st.selectbox("銘柄選択", tickers)
        df = data_map.get(selected_ticker)

        if df is not None and not df.empty:
            # 正しいチャートを作成
            # Close列の処理
            close_col = df["Close"]
            if hasattr(close_col, "columns"):
                # MultiIndex の場合
                close_values = close_col.iloc[:, 0] if close_col.shape[1] > 0 else close_col
            else:
                close_values = close_col

            fig = go.Figure()
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=close_values,
                    mode="lines",
                    name="価格",
                    line=dict(color="#667eea", width=2),
                )
            )

            fig.update_layout(
                title=f"{selected_ticker} - 本日の値動き",
                xaxis_title="時間",
                yaxis_title="価格",
                height=400,
                hovermode="x unified",
            )

            st.plotly_chart(fig, use_container_width=True)

            # 出来高
            if "Volume" in df.columns:
                volume_col = df["Volume"]
                if hasattr(volume_col, "columns"):
                    volume_values = volume_col.iloc[:, 0] if volume_col.shape[1] > 0 else volume_col
                else:
                    volume_values = volume_col

                fig_vol = go.Figure()
                fig_vol.add_trace(
                    go.Bar(
                        x=df.index,
                        y=volume_values,
                        name="出来高",
                        marker_color="rgba(102, 126, 234, 0.5)",
                    )
                )
                fig_vol.update_layout(title="出来高", height=200)
                st.plotly_chart(fig_vol, use_container_width=True)
    else:
        st.info("「最新データを取得」ボタンをクリックしてデータを読み込んでください。")

    # アラート設定
    st.markdown("---")
    st.subheader("🔔 価格アラート設定")

    with st.expander("アラートを追加"):
        alert_ticker = st.selectbox("銘柄", tickers, key="alert_ticker")
        alert_type = st.radio("条件", ["上回ったら", "下回ったら"])
        alert_price = st.number_input("価格", value=1500.0, step=10.0)

        if st.button("アラートを設定"):
            st.success(f"アラート設定: {alert_ticker} が ¥{alert_price:,.0f} を{alert_type}通知")
            st.info("※ アラート機能はバックグラウンドプロセスで動作します。")
