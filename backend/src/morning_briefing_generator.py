"""
AI投資アシスタント：毎朝ブリーフィング機能
毎日の市場状況と戦略を自動生成
"""

import pandas as pd
import numpy as np
import streamlit as st
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import plotly.graph_objects as go
import plotly.express as px


class MorningBriefingGenerator:
    """
    毎朝ブリーフィング生成クラス
    """

    def __init__(self):
        self.briefing_sections = [
            "market_summary",
            "portfolio_status",
            "daily_strategy",
            "risk_alerts",
            "market_opportunities",
            "economic_calendar",
        ]

    def generate_morning_briefing(self, user_preferences: Dict = None) -> Dict:
        """
        毎朝ブリーフィングを生成

        Args:
            user_preferences: ユーザー設定

        Returns:
            ブリーフィングデータ
        """
        briefing = {"timestamp": datetime.now(), "date": datetime.now().strftime("%Y年%m月%d日"), "sections": {}}

        # 各セクションを生成
        briefing["sections"]["market_summary"] = self._generate_market_summary()
        briefing["sections"]["portfolio_status"] = self._generate_portfolio_status()
        briefing["sections"]["daily_strategy"] = self._generate_daily_strategy()
        briefing["sections"]["risk_alerts"] = self._generate_risk_alerts()
        briefing["sections"]["market_opportunities"] = self._generate_market_opportunities()
        briefing["sections"]["economic_calendar"] = self._generate_economic_calendar()

        # 総合的な提案
        briefing["overall_recommendation"] = self._generate_overall_recommendation(briefing)

        return briefing

    def _generate_market_summary(self) -> Dict:
        """市場概要を生成"""
        market_data = {
            "japanese_markets": {
                "nikkei": {"current": 32000, "change": +180, "change_pct": +0.57, "trend": "上昇"},
                "topix": {"current": 2200, "change": +15, "change_pct": +0.68, "trend": "上昇"},
            },
            "us_markets": {
                "sp500": {"current": 4500, "change": -20, "change_pct": -0.44, "trend": "下落"},
                "nasdaq": {"current": 14000, "change": -50, "change_pct": -0.35, "trend": "下落"},
            },
            "forex": {"usdjpy": {"current": 150.50, "change": +0.20, "change_pct": +0.13, "trend": "上昇"}},
            "commodities": {
                "oil": {"current": 85.20, "change": +1.50, "change_pct": +1.79, "trend": "上昇"},
                "gold": {"current": 2050, "change": -10, "change_pct": -0.49, "trend": "下落"},
            },
        }

        # 市場センチメント分析
        market_sentiment = self._analyze_market_sentiment(market_data)

        return {
            "data": market_data,
            "sentiment": market_sentiment,
            "summary": self._create_market_summary_text(market_data, market_sentiment),
        }

    def _generate_portfolio_status(self) -> Dict:
        """ポートフォリオ状況を生成"""
        portfolio_data = {
            "total_value": 1050000,
            "daily_change": +8500,
            "daily_change_pct": +0.81,
            "total_return": +5.0,
            "monthly_return": +2.3,
            "positions": [
                {
                    "ticker": "7203",
                    "name": "トヨタ自動車",
                    "quantity": 100,
                    "current_price": 2800,
                    "market_value": 280000,
                    "daily_change": +1400,
                    "daily_change_pct": +0.50,
                    "unrealized_pnl": +12000,
                    "pnl_pct": +4.5,
                },
                {
                    "ticker": "6758",
                    "name": "ソニーグループ",
                    "quantity": 50,
                    "current_price": 12000,
                    "market_value": 600000,
                    "daily_change": -1000,
                    "daily_change_pct": -0.17,
                    "unrealized_pnl": +15000,
                    "pnl_pct": +2.6,
                },
            ],
            "performance_metrics": {"sharpe_ratio": 0.72, "max_drawdown": -6.8, "win_rate": 0.68, "volatility": 12.5},
        }

        return {
            "data": portfolio_data,
            "analysis": self._analyze_portfolio_performance(portfolio_data),
            "recommendations": self._generate_portfolio_recommendations(portfolio_data),
        }

    def _generate_daily_strategy(self) -> Dict:
        """日中戦略を生成"""
        strategy = {
            "overall_tone": "慎重楽観",
            "key_themes": [
                "自動車セクターの材料を注目",
                "半導体関連の下落は買い場と判断",
                "為替の安定を前提とした戦略",
            ],
            "position_adjustments": [
                {"ticker": "6758", "action": "注視", "reason": "下落を拾うチャンスあり", "target_price": 11800},
                {"ticker": "7203", "action": "維持", "reason": "業績好調で上昇継続予想", "stop_loss": 2650},
            ],
            "sector_focus": [
                {"sector": "自動車", "outlook": "強気", "reason": "EV転換の加速と海外需要回復"},
                {"sector": "半導体", "outlook": "慎重", "reason": "世界的な在庫調整の影響"},
            ],
            "risk_management": {
                "max_position_size": 0.25,
                "overall_exposure": 0.85,
                "cash_buffer": 0.15,
                "stop_loss_tightening": True,
            },
        }

        return strategy

    def _generate_risk_alerts(self) -> Dict:
        """リスク警告を生成"""
        alerts = [
            {
                "level": "medium",
                "title": "半導体セクターの下落リスク",
                "description": "世界的な半導体需要の減速懸念から関連銘柄の下落リスクあり",
                "impact": {"portfolio_value": -0.8},
                "recommendation": "ポジションサイズの縮小を検討",
            },
            {
                "level": "low",
                "title": "為替変動の注意",
                "description": "ドル円の小康状態が続くも、米国の金利政策変更に注意",
                "impact": {"export_companies": -0.3},
                "recommendation": "輸出銘柄の感応度を監視",
            },
        ]

        return {
            "alerts": alerts,
            "overall_risk_level": "medium",
            "risk_factors": ["海外市場の下落", "為替変動の不確実性", "企業決算前のボラティリティ上昇"],
        }

    def _generate_market_opportunities(self) -> Dict:
        """市場機会を生成"""
        opportunities = [
            {
                "type": "sector_rotation",
                "title": "内需関連へのシフト",
                "description": "輸出依存度の低い内需セクターの相対的優位性",
                "sectors": ["小売", "サービス", "不動産"],
                "candidates": ["8233", "9657", "8804"],
                "timeframe": "3ヶ月",
            },
            {
                "type": "value_reversal",
                "title": "割安バリュー株の回復期待",
                "description": "過度な売り込みからの反発期待",
                "criteria": "PBR < 1.0, 配当利回り > 3%",
                "candidates": ["6758", "4755", "6861"],
                "timeframe": "6ヶ月",
            },
        ]

        return {
            "opportunities": opportunities,
            "market_cycle": "中期的な調整局面",
            "investment_style": "バリュー重視への一時的シフト",
        }

    def _generate_economic_calendar(self) -> Dict:
        """経済カレンダーを生成"""
        today = datetime.now().date()
        week_ahead = today + timedelta(days=7)

        events = [
            {
                "date": (today + timedelta(days=1)).strftime("%m/%d"),
                "time": "08:50",
                "event": "日銀短観",
                "impact": "high",
                "expected": "景況判断：改善方向で維持",
            },
            {
                "date": (today + timedelta(days=3)).strftime("%m/%d"),
                "time": "21:30",
                "event": "米FOMC議事録",
                "impact": "high",
                "expected": "ハト派的姿勢の継続",
            },
            {
                "date": (today + timedelta(days=5)).strftime("%m/%d"),
                "time": "23:30",
                "event": "米雇用統計",
                "impact": "high",
                "expected": "非農業部門雇用者数: +15万人",
            },
        ]

        return {
            "events": events,
            "high_impact_events": [e for e in events if e["impact"] == "high"],
            "key_points": self._summarize_key_events(events),
        }

    def _analyze_market_sentiment(self, market_data: Dict) -> str:
        """市場センチメントを分析"""
        # 日米市場の動きからセンチメントを判断
        jp_positive = market_data["japanese_markets"]["nikkei"]["change_pct"] > 0
        us_positive = market_data["us_markets"]["sp500"]["change_pct"] > 0

        if jp_positive and us_positive:
            return "強気"
        elif jp_positive and not us_positive:
            return "慎重楽観"
        elif not jp_positive and us_positive:
            return "中立"
        else:
            return "弱気"

    def _create_market_summary_text(self, market_data: Dict, sentiment: str) -> str:
        """市場概要テキストを作成"""
        nikkei = market_data["japanese_markets"]["nikkei"]
        sp500 = market_data["us_markets"]["sp500"]

        summary = f"""
        本日の市場概要：
        
        ・日経平均は{nikkei['change']:+,}円（{nikkei['change_pct']:+.2f}%）の{nikkei['trend']}スタート
        ・米S&P500は{sp500['change']:+,}ドル（{sp500['change_pct']:+.2f}%）と{sp500['trend']}
        ・ドル円は{market_data['forex']['usdjpy']['change']:+.2f}円の{market_data['forex']['usdjpy']['trend']}
        
        全体の市場センチメント：{sentiment}
        """

        return summary.strip()

    def _analyze_portfolio_performance(self, portfolio_data: Dict) -> Dict:
        """ポートフォリオパフォーマンスを分析"""
        analysis = {"strengths": [], "weaknesses": [], "key_metrics": portfolio_data["performance_metrics"]}

        # 強み分析
        if portfolio_data["performance_metrics"]["win_rate"] > 0.6:
            analysis["strengths"].append("勝率が高い（60%以上）")

        if portfolio_data["performance_metrics"]["sharpe_ratio"] > 0.7:
            analysis["strengths"].append("リスク調整リターンが良好")

        # 弱み分析
        if portfolio_data["performance_metrics"]["max_drawdown"] < -8:
            analysis["weaknesses"].append("ドローダウンが大きい")

        if portfolio_data["performance_metrics"]["volatility"] > 15:
            analysis["weaknesses"].append("ボラティリティが高い")

        return analysis

    def _generate_portfolio_recommendations(self, portfolio_data: Dict) -> List[Dict]:
        """ポートフォリオ改善提案を生成"""
        recommendations = []

        # 勝敗に基づく提案
        winners = [p for p in portfolio_data["positions"] if p["pnl_pct"] > 0]
        losers = [p for p in portfolio_data["positions"] if p["pnl_pct"] <= 0]

        if losers:
            recommendations.append(
                {
                    "type": "loss_cutting",
                    "title": "損切りルールの強化",
                    "description": f"{len(losers)}銘柄が含損中。損切りルールの見直しを推奨",
                    "priority": "high",
                }
            )

        if portfolio_data["total_return"] > 10:
            recommendations.append(
                {
                    "type": "profit_taking",
                    "title": "一部利益確定",
                    "description": "リターンが10%超過。一部利益確定を検討",
                    "priority": "medium",
                }
            )

        return recommendations

    def _generate_overall_recommendation(self, briefing: Dict) -> Dict:
        """総合的な提案を生成"""
        market_trend = briefing["sections"]["market_summary"]["sentiment"]
        portfolio_strength = len(briefing["sections"]["portfolio_status"]["analysis"]["strengths"])
        risk_alerts = briefing["sections"]["risk_alerts"]["alerts"]

        recommendation = {
            "action_level": "HOLD",  # BUY, SELL, HOLD
            "confidence": 0.7,
            "reasoning": [],
            "key_points": [],
        }

        # 市場状況に基づく判断
        if market_trend == "強気":
            recommendation["action_level"] = "BUY"
            recommendation["reasoning"].append("市場は上昇トレンド、徐々に増額を検討")
        elif market_trend == "弱気":
            recommendation["action_level"] = "SELL"
            recommendation["reasoning"].append("市場は下落トレンド、防御的な姿勢へ")

        # リスク警告の考慮
        if len(risk_alerts) >= 2:
            recommendation["action_level"] = "SELL" if recommendation["action_level"] == "BUY" else "HOLD"
            recommendation["reasoning"].append("複数のリスク警告あり、慎重な対応を推奨")

        # ポートフォリオ状況の考慮
        if portfolio_strength >= 2:
            recommendation["confidence"] += 0.1
            recommendation["key_points"].append("現在の戦略が有効")

        return recommendation


def create_briefing_charts(briefing: Dict) -> Dict[str, go.Figure]:
    """ブリーフィング用チャートを作成"""
    charts = {}

    # 市場概要チャート
    market_data = briefing["sections"]["market_summary"]["data"]
    charts["market_overview"] = create_market_overview_chart(market_data)

    # ポートフォリオチャート
    portfolio_data = briefing["sections"]["portfolio_status"]["data"]
    charts["portfolio_allocation"] = create_portfolio_allocation_chart(portfolio_data)

    # リスク警告チャート
    risk_data = briefing["sections"]["risk_alerts"]
    charts["risk_dashboard"] = create_risk_dashboard_chart(risk_data)

    return charts


def create_market_overview_chart(market_data: Dict) -> go.Figure:
    """市場概要チャートを作成"""
    fig = go.Figure()

    markets = ["日経平均", "TOPIX", "S&P500", "NASDAQ"]
    changes = [
        market_data["japanese_markets"]["nikkei"]["change_pct"],
        market_data["japanese_markets"]["topix"]["change_pct"],
        market_data["us_markets"]["sp500"]["change_pct"],
        market_data["us_markets"]["nasdaq"]["change_pct"],
    ]

    colors = ["green" if c > 0 else "red" for c in changes]

    fig.add_trace(go.Bar(x=markets, y=changes, marker_color=colors, name="変化率（%）"))

    fig.update_layout(title="主要市場の変化率", yaxis_title="変化率（%）", height=400)

    return fig


def create_portfolio_allocation_chart(portfolio_data: Dict) -> go.Figure:
    """ポートフォリオ配チャートを作成"""
    positions = portfolio_data["positions"]

    fig = go.Figure(
        data=[go.Pie(labels=[p["name"] for p in positions], values=[p["market_value"] for p in positions], hole=0.3)]
    )

    fig.update_layout(title="ポートフォリオ配分", height=400)

    return fig


def create_risk_dashboard_chart(risk_data: Dict) -> go.Figure:
    """リスクダッシュボードチャートを作成"""
    alerts = risk_data["alerts"]

    levels = [a["level"] for a in alerts]
    level_counts = {"low": 0, "medium": 0, "high": 0}

    for level in levels:
        level_counts[level] += 1

    fig = go.Figure(
        data=[
            go.Bar(
                x=["低リスク", "中リスク", "高リスク"],
                y=[level_counts["low"], level_counts["medium"], level_counts["high"]],
                marker_color=["green", "orange", "red"],
            )
        ]
    )

    fig.update_layout(title="リスク警告レベル分布", yaxis_title="警告数", height=400)

    return fig


def show_morning_briefing():
    """毎朝ブリーフィングページを表示"""
    st.title("🌅 毎朝ブリーフィング")
    st.markdown("AIによる今日の投資戦略と市場分析")

    # ブリーフィング生成
    if st.button("🔄 ブリーフィングを更新", type="primary"):
        generator = MorningBriefingGenerator()
        briefing = generator.generate_morning_briefing()
        charts = create_briefing_charts(briefing)

        st.session_state.briefing = briefing
        st.session_state.briefing_charts = charts

    # ブリーフィング表示
    if "briefing" in st.session_state:
        briefing = st.session_state.briefing
        charts = st.session_state.briefing_charts

        # ヘッダー情報
        st.markdown(f"## 📅 {briefing['date']}")
        st.markdown(f"**総合的な提案**: {briefing['overall_recommendation']['action_level']}")
        st.markdown(f"**信頼度**: {briefing['overall_recommendation']['confidence']:.1f}")

        # セクション表示
        tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs(
            ["📊 市場概要", "💰 ポートフォリオ", "📈 戦略", "⚠️ リスク", "🎯 機会", "📅 経済"]
        )

        with tab1:
            market_summary = briefing["sections"]["market_summary"]
            st.plotly_chart(charts["market_overview"], use_container_width=True)
            st.markdown("### 市場センチメント分析")
            st.write(market_summary["summary"])

        with tab2:
            portfolio_status = briefing["sections"]["portfolio_status"]
            st.plotly_chart(charts["portfolio_allocation"], use_container_width=True)
            st.markdown("### ポートフォリオ分析")
            st.write(portfolio_status["analysis"])

            if portfolio_status["recommendations"]:
                st.markdown("### 改善提案")
                for rec in portfolio_status["recommendations"]:
                    st.markdown(f"- **{rec['title']}**: {rec['description']}")

        with tab3:
            strategy = briefing["sections"]["daily_strategy"]
            st.markdown(f"### 本日の戦略トーン: {strategy['overall_tone']}")

            st.markdown("### 主要テーマ")
            for theme in strategy["key_themes"]:
                st.markdown(f"- {theme}")

            st.markdown("### ポジション調整")
            for adj in strategy["position_adjustments"]:
                st.markdown(f"- **{adj['ticker']}**: {adj['action']} - {adj['reason']}")

        with tab4:
            risk_alerts = briefing["sections"]["risk_alerts"]
            st.plotly_chart(charts["risk_dashboard"], use_container_width=True)
            st.markdown("### リスクレベル")
            st.markdown(f"**全体**: {risk_alerts['overall_risk_level']}")

            st.markdown("### 詳細な警告")
            for alert in risk_alerts["alerts"]:
                level_emoji = {"low": "🟡", "medium": "🟠", "high": "🔴"}[alert["level"]]
                st.markdown(f"{level_emoji} **{alert['title']}**")
                st.write(alert["description"])

        with tab5:
            opportunities = briefing["sections"]["market_opportunities"]
            st.markdown("### 投資機会")

            for opp in opportunities["opportunities"]:
                st.markdown(f"#### {opp['title']}")
                st.write(opp["description"])
                if opp.get("candidates"):
                    st.write(f"候補銘柄: {', '.join(opp['candidates'])}")

        with tab6:
            calendar = briefing["sections"]["economic_calendar"]
            st.markdown("### 今後の重要経済イベント")

            for event in calendar["events"]:
                impact_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}[event["impact"]]
                st.markdown(f"**{event['date']} {event['time']}** {impact_emoji}")
                st.markdown(f"- {event['event']}")
                if event.get("expected"):
                    st.markdown(f"  予想: {event['expected']}")

        # 総合提案
        st.markdown("---")
        st.markdown("## 🎯 総合的な提案")
        rec = briefing["overall_recommendation"]

        for reason in rec["reasoning"]:
            st.markdown(f"- {reason}")

        st.markdown(f"**推奨アクション**: {rec['action_level']}")


if __name__ == "__main__":
    show_morning_briefing()
