"""
AI投資アシスタント：ポートフォリオ分析機能
ポートフォリオの詳細分析と改善提案を生成
"""

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import streamlit as st


class PortfolioAnalyzer:
    """
    ポートフォリオ分析クラス
    """

    def __init__(self):
        self.analysis_methods = [
            "performance_analysis",
            "risk_analysis",
            "diversification_analysis",
            "correlation_analysis",
            "sector_analysis",
        ]

    def analyze_portfolio(self, portfolio_data: Dict) -> Dict:
        """
        ポートフォリオ包括的分析を実行

        Args:
            portfolio_data: ポートフォリオデータ

        Returns:
            分析結果
        """
        analysis_result = {
            "timestamp": datetime.now(),
            "portfolio_value": self._calculate_total_value(portfolio_data),
            "performance": self.analyze_performance(portfolio_data),
            "risk": self.analyze_risk(portfolio_data),
            "diversification": self.analyze_diversification(portfolio_data),
            "correlation": self.analyze_correlation(portfolio_data),
            "recommendations": self._generate_recommendations(portfolio_data),
        }

        return analysis_result

    def analyze_performance(self, portfolio_data: Dict) -> Dict:
        """
        パフォーマンス分析

        Args:
            portfolio_data: ポートフォリオデータ

        Returns:
            パフォーマンス指標
        """
        # サンプルデータ（実際は履歴データから計算）
        performance_metrics = {
            "total_return": 12.5,
            "annual_return": 8.3,
            "monthly_return": {
                "current_month": 2.1,
                "last_month": -1.5,
                "three_months_avg": 0.8,
            },
            "volatility": {"daily": 1.2, "monthly": 3.5, "annual": 12.1},
            "sharpe_ratio": 0.68,
            "max_drawdown": -8.3,
            "win_rate": 0.65,
            "profit_factor": 1.8,
            "calmar_ratio": 0.99,
            "sortino_ratio": 0.92,
        }

        # 相対パフォーマンス（ベンチマーク比較）
        benchmark_return = 6.2  # TOPIXやS&P500など
        performance_metrics["alpha"] = performance_metrics["annual_return"] - benchmark_return
        performance_metrics["beta"] = 1.05
        performance_metrics["information_ratio"] = performance_metrics["alpha"] / 4.5  # トラッキングエラー

        return performance_metrics

    def analyze_risk(self, portfolio_data: Dict) -> Dict:
        """
        リスク分析

        Args:
            portfolio_data: ポートフォリオデータ

        Returns:
            リスク指標
        """
        risk_metrics = {
            "value_at_risk": {
                "var_95": -35000,  # 95% VaR
                "var_99": -55000,  # 99% VaR
            },
            "expected_shortfall": {
                "es_95": -45000,  # 95% Expected Shortfall
                "es_99": -75000,  # 99% Expected Shortfall
            },
            "downside_deviation": 0.8,
            "upside_deviation": 1.1,
            "skewness": -0.3,  # 歪度
            "kurtosis": 3.2,  # 尖度
            "tracking_error": 4.5,  # ベンチマークとの追跡誤差
            "beta": 1.05,  # 市場感応度
            "concentration_risk": {
                "top_5_holdings_pct": 65.2,
                "top_10_holdings_pct": 82.3,
            },
            "sector_concentration": {"top_sector_pct": 35.8, "sector_count": 8},
        }

        # リスクレベル評価
        var_ratio = abs(risk_metrics["value_at_risk"]["var_95"]) / self._calculate_total_value(portfolio_data)
        if var_ratio > 0.05:
            risk_level = "高"
        elif var_ratio > 0.03:
            risk_level = "中"
        else:
            risk_level = "低"

        risk_metrics["overall_risk_level"] = risk_level

        return risk_metrics

    def analyze_diversification(self, portfolio_data: Dict) -> Dict:
        """
        分散分析

        Args:
            portfolio_data: ポートフォリオデータ

        Returns:
            分散指標
        """
        diversification_metrics = {
            "herfindahl_index": 0.18,  # にーフィンダル指数（0に近いほど分散）
            "entropy_index": 2.1,  # エントロピー指数（高いほど分散）
            "effective_number_of_stocks": 12.5,  # 実質的な保有銘柄数
            "concentration_ratio": {
                "cr3": 0.42,  # 上位3銘柄の集中度
                "cr5": 0.65,  # 上位5銘柄の集中度
                "cr10": 0.82,  # 上位10銘柄の集中度
            },
            "diversification_ratio": 0.68,  # 分散化率
            "global_diversification": {
                "domestic_pct": 75.2,
                "foreign_pct": 24.8,
                "emerging_markets_pct": 8.5,
                "developed_markets_pct": 91.5,
            },
            "asset_allocation": {
                "equity_pct": 68.5,
                "bond_pct": 20.0,
                "cash_pct": 8.3,
                "alternative_pct": 3.2,
            },
        }

        return diversification_metrics

    def analyze_correlation(self, portfolio_data: Dict) -> Dict:
        """
        相関分析

        Args:
            portfolio_data: ポートフォリオデータ

        Returns:
            相関指標
        """
        correlation_metrics = {
            "average_correlation": 0.35,
            "maximum_correlation": 0.78,
            "minimum_correlation": -0.15,
            "correlation_matrix_summary": {
                "positive_correlations": 0.68,
                "negative_correlations": 0.12,
                "neutral_correlations": 0.20,
            },
            "market_correlation": {
                "nikkei_correlation": 0.72,
                "sp500_correlation": 0.58,
                "topix_correlation": 0.75,
            },
            "sector_correlations": {
                "technology": 0.65,
                "finance": 0.48,
                "consumer": 0.52,
                "industrial": 0.41,
            },
        }

        return correlation_metrics

    def analyze_sector_allocation(self, portfolio_data: Dict) -> Dict:
        """
        セクター配分析

        Args:
            portfolio_data: ポートフォリオデータ

        Returns:
            セクター配指標
        """
        sector_allocation = {
            "technology": 25.3,
            "finance": 18.7,
            "consumer_discretionary": 15.2,
            "healthcare": 12.1,
            "industrial": 10.5,
            "energy": 8.3,
            "materials": 5.1,
            "utilities": 3.2,
            "real_estate": 1.6,
        }

        # セクター配のバランス評価
        target_weights = {
            "technology": 20.0,
            "finance": 15.0,
            "consumer_discretionary": 15.0,
            "healthcare": 12.0,
            "industrial": 10.0,
            "energy": 8.0,
            "materials": 5.0,
            "utilities": 5.0,
            "real_estate": 5.0,
        }

        deviations = {}
        total_deviation = 0
        for sector, actual in sector_allocation.items():
            target = target_weights.get(sector, 0)
            deviation = actual - target
            deviations[sector] = deviation
            total_deviation += abs(deviation)

        return {
            "current_allocation": sector_allocation,
            "target_allocation": target_weights,
            "deviations": deviations,
            "total_deviation": total_deviation,
            "balance_score": max(0, 100 - total_deviation * 2),  # バランススコア
        }

    def _generate_recommendations(self, portfolio_data: Dict) -> List[Dict]:
        """
        改善提案を生成

        Args:
            portfolio_data: ポートフォリオデータ

        Returns:
            提案リスト
        """
        recommendations = []

        # リスク関連提案
        risk_analysis = self.analyze_risk(portfolio_data)
        if risk_analysis["overall_risk_level"] == "高":
            recommendations.append(
                {
                    "category": "risk_management",
                    "priority": "high",
                    "title": "リスクを低減することを推奨",
                    "description": "現在のリスクレベルが高です。分散投資や損切設定の見直しをお勧めします。",
                    "action_items": [
                        "海外資産の比率を増やす",
                        "成長株から配当株へ一部シフト",
                        "損切りルールを厳格化する",
                    ],
                }
            )

        # 分散化関連提案
        diversification = self.analyze_diversification(portfolio_data)
        if diversification["effective_number_of_stocks"] < 10:
            recommendations.append(
                {
                    "category": "diversification",
                    "priority": "medium",
                    "title": "分散化を検討",
                    "description": "保有銘柄が集中しています。リスク分散のため分散投資をお勧めします。",
                    "action_items": [
                        "ETFによる分散投資を検討",
                        "異なる業種の銘柄を追加",
                        "海外株の比率を20%程度に",
                    ],
                }
            )

        # セクター配提案
        sector_analysis = self.analyze_sector_allocation(portfolio_data)
        if sector_analysis["balance_score"] < 70:
            recommendations.append(
                {
                    "category": "sector_balance",
                    "priority": "medium",
                    "title": "セクター配の見直し",
                    "description": "特定セクターに偏りがあります。バランスの取れた配分を推奨します。",
                    "action_items": [
                        "過熱セクターの比率を調整",
                        "割安セクターの候補を検討",
                        "定期的なリバランスを検討",
                    ],
                }
            )

        # パフォーマンス改善提案
        performance = self.analyze_performance(portfolio_data)
        if performance["sharpe_ratio"] < 0.8:
            recommendations.append(
                {
                    "category": "performance",
                    "priority": "low",
                    "title": "リスク調整リターンの改善",
                    "description": "シャープレシオが低めです。より効率的なポートフォリオを目指せます。",
                    "action_items": [
                        "低コストETFの導入を検討",
                        "資産配分の最適化",
                        "定期的なリバランスの実施",
                    ],
                }
            )

        return recommendations

    def _calculate_total_value(self, portfolio_data: Dict) -> float:
        """総資産価値を計算"""
        # 実際の計算ロジックに置き換え
        return sum(position.get("market_value", 0) for position in portfolio_data.values())

    def create_analysis_charts(self, analysis_result: Dict) -> Dict[str, go.Figure]:
        """
        分析結果の可視化チャートを作成

        Args:
            analysis_result: 分析結果

        Returns:
            チャート辞書
        """
        charts = {}

        # パフォーマンスチャート
        charts["performance"] = self._create_performance_chart(analysis_result["performance"])

        # リスクチャート
        charts["risk"] = self._create_risk_chart(analysis_result["risk"])

        # 分散化チャート
        charts["diversification"] = self._create_diversification_chart(analysis_result["diversification"])

        # セクター配チャート
        sector_analysis = self.analyze_sector_allocation({})
        charts["sector_allocation"] = self._create_sector_chart(sector_analysis)

        return charts

    def _create_performance_chart(self, performance_data: Dict) -> go.Figure:
        """パフォーマンスチャートを作成"""
        fig = go.Figure()

        # 稼利とリスクの散布図
        fig.add_trace(
            go.Scatter(
                x=[performance_data["volatility"]["annual"]],
                y=[performance_data["annual_return"]],
                mode="markers",
                marker=dict(size=20, color="blue"),
                name="ポートフォリオ",
                text=["現在のポートフォリオ"],
                textposition="top center",
            )
        )

        # 参考点（平均）
        fig.add_trace(
            go.Scatter(
                x=[10.0],  # 平均ボラティリティ
                y=[6.0],  # 平均リターン
                mode="markers",
                marker=dict(size=15, color="red", symbol="x"),
                name="市場平均",
            )
        )

        fig.update_layout(
            title="リスク・リターン分析",
            xaxis_title="リスク（年間ボラティリティ）",
            yaxis_title="リターン（年間）",
            height=400,
        )

        return fig

    def _create_risk_chart(self, risk_data: Dict) -> go.Figure:
        """リスクチャートを作成"""
        metrics = ["VaR95", "VaR99", "ES95", "ES99"]
        values = [
            abs(risk_data["value_at_risk"]["var_95"]),
            abs(risk_data["value_at_risk"]["var_99"]),
            abs(risk_data["expected_shortfall"]["es_95"]),
            abs(risk_data["expected_shortfall"]["es_99"]),
        ]

        fig = go.Figure(data=[go.Bar(x=metrics, y=values, name="リスク指標")])

        fig.update_layout(
            title="リスク指標比較",
            xaxis_title="指標",
            yaxis_title="損失額（円）",
            height=400,
        )

        return fig

    def _create_diversification_chart(self, diversification_data: Dict) -> go.Figure:
        """分散化チャートを作成"""
        fig = go.Figure()

        # 集中度の推移
        cr_values = [
            diversification_data["concentration_ratio"]["cr3"],
            diversification_data["concentration_ratio"]["cr5"],
            diversification_data["concentration_ratio"]["cr10"],
        ]

        fig.add_trace(
            go.Bar(
                x=["上位3銘柄", "上位5銘柄", "上位10銘柄"],
                y=cr_values,
                name="集中度",
                marker_color=["red", "orange", "yellow"],
            )
        )

        fig.update_layout(
            title="集中度分析",
            xaxis_title="銘柄範囲",
            yaxis_title="集中度（比率）",
            height=400,
        )

        return fig

    def _create_sector_chart(self, sector_data: Dict) -> go.Figure:
        """セクター配チャートを作成"""
        allocation = sector_data["current_allocation"]

        fig = go.Figure(
            data=[
                go.Pie(
                    labels=list(allocation.keys()),
                    values=list(allocation.values()),
                    hole=0.3,
                )
            ]
        )

        fig.update_layout(title="セクター別配", height=400)

        return fig


def show_portfolio_analysis():
    """ポートフォリオ分析ページを表示"""
    st.title("📊 ポートフォリオ分析")
    st.markdown("AIによるポートフォリオ包括的分析と改善提案")

    # サンプルポートフォリオデータ
    portfolio_data = {
        "7203": {
            "name": "トヨタ自動車",
            "quantity": 100,
            "price": 2800,
            "market_value": 280000,
        },
        "6758": {
            "name": "ソニーグループ",
            "quantity": 50,
            "price": 12000,
            "market_value": 600000,
        },
        "9984": {
            "name": "ソフトバンク",
            "quantity": 30,
            "price": 8000,
            "market_value": 240000,
        },
        "8035": {
            "name": "東京エレクトロン",
            "quantity": 200,
            "price": 900,
            "market_value": 180000,
        },
    }

    analyzer = PortfolioAnalyzer()

    # 分析実行
    if st.button("🔍 分析を実行", type="primary"):
        with st.spinner("分析中..."):
            analysis_result = analyzer.analyze_portfolio(portfolio_data)
            charts = analyzer.create_analysis_charts(analysis_result)

            st.session_state.analysis_result = analysis_result
            st.session_state.analysis_charts = charts

    # 結果表示
    if "analysis_result" in st.session_state:
        result = st.session_state.analysis_result
        charts = st.session_state.analysis_charts

        # 基本情報
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("総資産価値", f"¥{result['portfolio_value']:,}")

        with col2:
            st.metric("年間リターン", f"{result['performance']['annual_return']:+.1f}%")

        with col3:
            st.metric("リスクレベル", result["risk"]["overall_risk_level"])

        # 詳細分析
        tab1, tab2, tab3, tab4 = st.tabs(["📈 パフォーマンス", "⚠️ リスク", "🔄 分散化", "💡 改善提案"])

        with tab1:
            st.plotly_chart(charts["performance"], use_container_width=True)
            st.subheader("詳細指標")
            st.json(result["performance"])

        with tab2:
            st.plotly_chart(charts["risk"], use_container_width=True)
            st.subheader("リスク指標")
            st.json(result["risk"])

        with tab3:
            st.plotly_chart(charts["diversification"], use_container_width=True)
            st.plotly_chart(charts["sector_allocation"], use_container_width=True)
            st.subheader("分散化指標")
            st.json(result["diversification"])

        with tab4:
            st.subheader("改善提案")

            for i, rec in enumerate(result["recommendations"], 1):
                priority_color = {"high": "🔴", "medium": "🟡", "low": "🟢"}[rec["priority"]]

                st.markdown(f"### {priority_color} 提案 {i}: {rec['title']}")
                st.markdown(f"**説明**: {rec['description']}")
                st.markdown("**実行項目**:")
                for item in rec["action_items"]:
                    st.markdown(f"- {item}")
                st.markdown("---")


if __name__ == "__main__":
    show_portfolio_analysis()
