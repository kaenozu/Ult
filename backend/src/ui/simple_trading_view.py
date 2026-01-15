"""
シンプル売買サポート画面

株の予測に基づいて「いつ買うか・いつ売るか」を一画面で表示
"""

import os
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.constants import NIKKEI_225_TICKERS, TICKER_NAMES
from src.data_loader import DataLoader
from src.paper_trader import PaperTrader


def format_currency_jp(amount: float) -> str:
    """日本円を万円形式で表示"""
    if amount >= 100000000:
        return f"¥{amount/100000000:.2f}億"
    elif amount >= 10000:
        return f"¥{amount/10000:.1f}万"
    else:
        return f"¥{amount:,.0f}"


def _get_prediction_for_ticker(ticker: str, strategies):
    """
    指定された銘柄の予測を取得
    
    Returns:
        dict: {
            'signal': 'BUY' | 'SELL' | 'HOLD',
            'confidence': float (0-100),
            'predicted_price': float,
            'predicted_change_pct': float,
            'current_price': float,
            'reasoning': str
        }
    """
    try:
        # データ取得
        loader = DataLoader()
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        df = loader.load_data(
            ticker,
            start_date.strftime("%Y-%m-%d"),
            end_date.strftime("%Y-%m-%d")
        )
        
        if df.empty:
            return {
                'signal': 'HOLD',
                'confidence': 0,
                'predicted_price': 0,
                'predicted_change_pct': 0,
                'current_price': 0,
                'reasoning': 'データ取得失敗'
            }
        
        current_price = float(df['Close'].iloc[-1])
        
        # アンサンブル予測（複数戦略の平均）
        signals = []
        for strategy in strategies:
            try:
                strategy_signals = strategy.generate_signals(df)
                if not strategy_signals.empty:
                    latest_signal = strategy_signals.iloc[-1]
                    signals.append(latest_signal)
            except Exception as e:
                import logging
                logging.getLogger(__name__).debug(f"Strategy {strategy.name} failed: {e}")
                continue
        
        if not signals:
            return {
                'signal': 'HOLD',
                'confidence': 0,
                'predicted_price': current_price,
                'predicted_change_pct': 0,
                'current_price': current_price,
                'reasoning': '予測データなし'
            }
        
        # シグナル集計
        buy_count = sum(1 for s in signals if s > 0)
        sell_count = sum(1 for s in signals if s < 0)
        total = len(signals)
        
        # 予測変動率の推定（簡易版）
        avg_signal = sum(signals) / total
        predicted_change_pct = avg_signal * 2.0  # シグナル強度を変動率に変換
        predicted_price = current_price * (1 + predicted_change_pct / 100)
        
        # シグナル決定
        if buy_count > sell_count and buy_count / total >= 0.6:
            signal = 'BUY'
            confidence = (buy_count / total) * 100
            reasoning = f'{buy_count}/{total}の戦略が買いシグナル'
        elif sell_count > buy_count and sell_count / total >= 0.6:
            signal = 'SELL'
            confidence = (sell_count / total) * 100
            reasoning = f'{sell_count}/{total}の戦略が売りシグナル'
        else:
            signal = 'HOLD'
            confidence = 50
            reasoning = 'シグナルが混在、様子見推奨'
        
        return {
            'signal': signal,
            'confidence': confidence,
            'predicted_price': predicted_price,
            'predicted_change_pct': predicted_change_pct,
            'current_price': current_price,
            'reasoning': reasoning
        }
        
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Prediction failed for {ticker}: {e}")
        return {
            'signal': 'HOLD',
            'confidence': 0,
            'predicted_price': 0,
            'predicted_change_pct': 0,
            'current_price': 0,
            'reasoning': f'エラー: {str(e)}'
        }


def _render_prediction_card(prediction: dict, ticker: str):
    """予測結果カードを表示"""
    signal = prediction['signal']
    confidence = prediction['confidence']
    
    # シグナルに応じた色とアイコン
    if signal == 'BUY':
        color = '#28a745'
        icon = '📈'
        action_text = '買い推奨'
    elif signal == 'SELL':
        color = '#dc3545'
        icon = '📉'
        action_text = '売り推奨'
    else:
        color = '#6c757d'
        icon = '⏸️'
        action_text = 'ホールド'
    
    # カード表示
    st.markdown(f"""
    <div style="
        background: linear-gradient(135deg, {color}22 0%, {color}11 100%);
        border-left: 4px solid {color};
        padding: 20px;
        border-radius: 8px;
        margin: 10px 0;
    ">
        <h2 style="margin: 0; color: {color};">{icon} {action_text}</h2>
        <p style="font-size: 1.2em; margin: 10px 0;">
            <strong>{TICKER_NAMES.get(ticker, ticker)}</strong> ({ticker})
        </p>
        <div style="display: flex; gap: 20px; margin-top: 15px;">
            <div>
                <div style="color: #666; font-size: 0.9em;">現在価格</div>
                <div style="font-size: 1.5em; font-weight: bold;">¥{prediction['current_price']:,.2f}</div>
            </div>
            <div>
                <div style="color: #666; font-size: 0.9em;">予測価格</div>
                <div style="font-size: 1.5em; font-weight: bold;">¥{prediction['predicted_price']:,.2f}</div>
            </div>
            <div>
                <div style="color: #666; font-size: 0.9em;">予測変動</div>
                <div style="font-size: 1.5em; font-weight: bold; color: {color};">
                    {prediction['predicted_change_pct']:+.2f}%
                </div>
            </div>
            <div>
                <div style="color: #666; font-size: 0.9em;">信頼度</div>
                <div style="font-size: 1.5em; font-weight: bold;">{confidence:.0f}%</div>
            </div>
        </div>
        <p style="margin-top: 15px; color: #666; font-size: 0.95em;">
            💡 {prediction['reasoning']}
        </p>
    </div>
    """, unsafe_allow_html=True)


def _render_chart(ticker: str, prediction: dict):
    """株価チャートと予測ポイントを表示"""
    try:
        loader = DataLoader()
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        df = loader.load_data(
            ticker,
            start_date.strftime("%Y-%m-%d"),
            end_date.strftime("%Y-%m-%d")
        )
        
        if df.empty:
            st.warning("チャートデータを取得できませんでした")
            return
        
        # ローソク足チャート
        fig = go.Figure(data=[
            go.Candlestick(
                x=df.index,
                open=df['Open'],
                high=df['High'],
                low=df['Low'],
                close=df['Close'],
                name='株価'
            )
        ])
        
        # 予測ポイントを追加
        signal = prediction['signal']
        if signal != 'HOLD':
            marker_color = 'green' if signal == 'BUY' else 'red'
            marker_symbol = 'triangle-up' if signal == 'BUY' else 'triangle-down'
            
            fig.add_trace(go.Scatter(
                x=[df.index[-1]],
                y=[prediction['current_price']],
                mode='markers',
                marker=dict(
                    color=marker_color,
                    size=15,
                    symbol=marker_symbol,
                    line=dict(color='white', width=2)
                ),
                name=f'{signal}シグナル',
                showlegend=True
            ))
        
        fig.update_layout(
            title=f'{TICKER_NAMES.get(ticker, ticker)} 株価チャート（90日）',
            xaxis_title='日付',
            yaxis_title='価格 (円)',
            height=500,
            xaxis_rangeslider_visible=False,
            hovermode='x unified'
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
    except Exception as e:
        st.error(f"チャート表示エラー: {e}")


def _render_portfolio_summary():
    """ポートフォリオ概要を表示"""
    try:
        pt = PaperTrader()
        balance = pt.get_current_balance()
        positions = pt.get_positions()
        pt.close()
        
        # メトリクス表示
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("総資産", format_currency_jp(balance['total_equity']))
        with col2:
            st.metric("現金", format_currency_jp(balance['cash']))
        with col3:
            st.metric(
                "評価損益",
                format_currency_jp(balance['unrealized_pnl']),
                delta=format_currency_jp(balance.get('daily_pnl', 0))
            )
        with col4:
            st.metric("保有銘柄数", len(positions))
        
        # 保有銘柄リスト（簡易版）
        if not positions.empty:
            st.subheader("保有銘柄")
            
            # 表示用データフレーム作成
            display_df = positions.copy()
            display_df['銘柄名'] = display_df['ticker'].map(TICKER_NAMES).fillna(display_df['ticker'])
            display_df['保有額'] = display_df['current_price'] * display_df['quantity']
            display_df['損益率'] = display_df['unrealized_pnl_pct']
            
            # 列選択
            display_df = display_df[['ticker', '銘柄名', 'quantity', 'current_price', '保有額', 'unrealized_pnl', '損益率']]
            display_df.columns = ['コード', '銘柄名', '数量', '現在価格', '保有額', '評価損益', '損益率']
            
            # フォーマット
            display_df['現在価格'] = display_df['現在価格'].apply(lambda x: f"¥{x:,.0f}")
            display_df['保有額'] = display_df['保有額'].apply(format_currency_jp)
            display_df['評価損益'] = display_df['評価損益'].apply(format_currency_jp)
            display_df['損益率'] = display_df['損益率'].apply(lambda x: f"{x:.2%}")
            
            st.dataframe(display_df, use_container_width=True, hide_index=True)
        else:
            st.info("現在保有銘柄はありません")
            
    except Exception as e:
        st.error(f"ポートフォリオ表示エラー: {e}")


def render_simple_trading_view(strategies):
    """
    シンプル売買サポート画面のメインレンダリング関数
    """
    st.title("📊 AGStock - 売買サポート")
    st.markdown("株の予測に基づいて、いつ買うか・いつ売るかをサポートします")
    st.markdown("---")
    
    # 銘柄選択
    st.subheader("🎯 銘柄選択")
    
    col1, col2 = st.columns([3, 1])
    with col1:
        # 銘柄リスト作成
        ticker_options = {f"{TICKER_NAMES.get(t, t)} ({t})": t for t in NIKKEI_225_TICKERS[:50]}
        selected_display = st.selectbox(
            "分析する銘柄を選択",
            options=list(ticker_options.keys()),
            index=0
        )
        selected_ticker = ticker_options[selected_display]
    
    with col2:
        if st.button("🔄 予測を更新", type="primary", use_container_width=True):
            st.cache_data.clear()
            st.rerun()
    
    st.markdown("---")
    
    # 予測結果取得
    with st.spinner("予測を計算中..."):
        prediction = _get_prediction_for_ticker(selected_ticker, strategies)
    
    # 予測結果カード
    st.subheader("📈 予測結果")
    _render_prediction_card(prediction, selected_ticker)
    
    st.markdown("---")
    
    # チャート表示
    st.subheader("📊 株価チャート")
    _render_chart(selected_ticker, prediction)
    
    st.markdown("---")
    
    # ポートフォリオ概要
    st.subheader("💼 ポートフォリオ")
    _render_portfolio_summary()
