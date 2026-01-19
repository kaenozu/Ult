"""
AI Market Report UI Renderer
"""

import streamlit as st

from src.ai_analyst import AIAnalyst
from src.data_loader import fetch_stock_data
from src.paper_trader import PaperTrader
from src.prompts import MARKET_REPORT_SYSTEM_PROMPT
from src.regime_detector import MarketRegimeDetector


def render_ai_report_tab():
    st.header("📰 AI投資委員会レポート")
    st.write("AIアナリストが現在の市場環境とポートフォリオを分析し、日次レポートを生成します。")

    analyst = AIAnalyst()

    if not analyst.enabled:
        st.warning("⚠️ OpenAI APIキーが設定されていません。`config.json` を確認してください。")
        st.info('設定例: `"openai": { "api_key": "sk-..." }`')
        return

    # Generate Report Button
    if st.button("📝 レポートを生成する (AI Analyst)", type="primary"):
        with st.spinner("AIアナリストが市場データを分析中..."):
            try:
                # 1. Gather Context Data
                # Market Data
                indices = ["^N225", "^GSPC"]
                data_map = fetch_stock_data(indices, period="1mo")

                market_context = "## Market Data (Last 5 days)\n"
                regime_detector = MarketRegimeDetector()

                for ticker in indices:
                    df = data_map.get(ticker)
                    if df is not None and not df.empty:
                        latest = df.iloc[-1]
                        prev = df.iloc[-2]
                        change = (latest["Close"] - prev["Close"]) / prev["Close"]

                        regime = regime_detector.detect_regime(df)

                        market_context += f"- {ticker}: Close={latest['Close']:.2f} ({change:+.2%})\n"
                        market_context += f"  - Trend: {regime['trend']}, Volatility: {regime['volatility']}, ADX: {regime['adx']:.1f}\n"

                # Portfolio Data
                pt = PaperTrader()
                balance = pt.get_current_balance()
                positions = pt.get_positions()

                portfolio_context = "\n## Portfolio Status\n"
                portfolio_context += f"- Total Equity: ¥{balance['total_equity']:,.0f}\n"
                portfolio_context += f"- Cash: ¥{balance['cash']:,.0f}\n"
                portfolio_context += f"- Positions: {len(positions)}\n"

                if not positions.empty:
                    for _, row in positions.iterrows():
                        portfolio_context += (
                            f"  - {row['ticker']}: {row['quantity']} shares, PnL: {row['unrealized_pnl']:+.1%}\n"
                        )

                # Full Context
                full_context = market_context + portfolio_context

                # 2. Generate Report
                report = analyst.generate_response(
                    system_prompt=MARKET_REPORT_SYSTEM_PROMPT,
                    user_prompt=f"Please generate a daily market report based on the following data:\n\n{full_context}",
                )

                # 3. Display Report
                st.markdown("---")
                st.markdown(report)

                # Save to session state to persist across reruns (optional, for now just display)

            except Exception as e:
                st.error(f"レポート生成中にエラーが発生しました: {e}")

    # History (Placeholder for future)
    with st.expander("過去のレポート履歴"):
        st.write("まだ履歴はありません。")
