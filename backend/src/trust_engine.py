"""
AI信頼性エンジン - AI判断の可視化と根拠提示システム
日本の投資家のAI不信感を解消し、信頼性を最大化する
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import numpy as np


@dataclass
class AIDecision:
    """AI判断データモデル"""

    action: str  # BUY/SELL/HOLD
    ticker: str
    confidence: float  # 0-100
    reasoning: List[str]  # 判断根拠
    risk_factors: List[str]  # リスク要因
    similar_cases: List[Dict]  # 過去の類似ケース
    time_horizon: str  # 短期/中期/長期
    expected_return: float  # 期待リターン
    risk_level: str  # 低/中/高


@dataclass
class TrustMetrics:
    """信頼性指標"""

    weekly_accuracy: float
    monthly_accuracy: float
    yearly_accuracy: float
    benchmark_comparison: float
    improvement_trend: str
    total_decisions: int
    successful_decisions: int


class TrustEngine:
    """AI信頼性エンジン本体"""

    def __init__(self):
        self.decision_history = []
        self.trust_metrics = self._load_trust_metrics()

    def explain_ai_decision(self, decision: AIDecision) -> Dict[str, Any]:
        """AI判断の可視化と根拠提示"""
        return {
            "基本判断": {
                "銘柄": decision.ticker,
                "アクション": decision.action,
                "信頼度": f"{decision.confidence}%",
                "時間軸": decision.time_horizon,
                "期待リターン": f"{decision.expected_return:+.2f}%",
                "リスクレベル": self._get_risk_level_emoji(decision.risk_level),
            },
            "判断根拠": decision.reasoning,
            "リスク要因": decision.risk_factors,
            "過去の類似ケース": decision.similar_cases,
            "決定プロセス": self._create_decision_tree(decision),
            "信頼性指標": self.trust_metrics.__dict__,
        }

    def create_decision_visualization(self, decision: AIDecision) -> None:
        """Streamlitでの判断可視化表示"""
        st.markdown("## 🤖 AI判断の詳細分析")

        # 基本情報カード
        self._render_basic_info(decision)

        # 根拠表示
        self._render_reasoning(decision)

        # 決定ツリー
        self._render_decision_tree(decision)

        # 類似ケース
        self._render_similar_cases(decision)

        # 信頼性指標
        self._render_trust_metrics()

    def _render_basic_info(self, decision: AIDecision):
        """基本情報の表示"""
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric(
                label="アクション",
                value=self._get_action_emoji(decision.action),
                delta=None,
                delta_color="normal",
            )

        with col2:
            color = "green" if decision.confidence > 70 else "orange" if decision.confidence > 50 else "red"
            st.metric(label="信頼度", value=f"{decision.confidence}%", delta=None)

        with col3:
            st.metric(
                label="期待リターン",
                value=f"{decision.expected_return:+.2f}%",
                delta=None,
            )

        with col4:
            st.metric(
                label="リスク",
                value=self._get_risk_level_emoji(decision.risk_level),
                delta=None,
            )

        # 銘柄詳細
        with st.expander(f"📊 {decision.ticker} 詳細情報", expanded=True):
            self._render_ticker_details(decision.ticker)

    def _render_reasoning(self, decision: AIDecision):
        """判断根拠の表示"""
        st.markdown("### 💡 AI判断根拠")

        for i, reason in enumerate(decision.reasoning, 1):
            st.markdown(f"{i}. {reason}")

        # 根拠の可視化
        if decision.reasoning:
            reason_df = pd.DataFrame(
                {
                    "根拠": decision.reasoning,
                    "重要度": np.random.uniform(0.6, 1.0, len(decision.reasoning)),  # 実際はAIから取得
                }
            )

            fig = px.bar(
                reason_df,
                x="根拠",
                y="重要度",
                title="判断根拠の重要度",
                color="重要度",
                color_continuous_scale="viridis",
            )
            st.plotly_chart(fig, use_container_width=True)

    def _render_decision_tree(self, decision: AIDecision):
        """決定ツリーの表示"""
        st.markdown("### 🌳 AI決定プロセス")

        # 決定フローチャート
        fig = go.Figure()

        # ノードの定義
        nodes = [
            dict(label="市場データ入力", x=0, y=2),
            dict(label="技術分析", x=-1, y=1),
            dict(label="ファンダメンタル分析", x=0, y=1),
            dict(label="センチメント分析", x=1, y=1),
            dict(label=f"AI判断: {decision.action}", x=0, y=0),
        ]

        # エッジの定義
        edges = [
            dict(source=0, target=1),
            dict(source=0, target=2),
            dict(source=0, target=3),
            dict(source=1, target=4),
            dict(source=2, target=4),
            dict(source=3, target=4),
        ]

        # ノードの描画
        for node in nodes:
            fig.add_trace(
                go.Scatter(
                    x=[node["x"]],
                    y=[node["y"]],
                    mode="markers+text",
                    text=[node["label"]],
                    textposition="middle center",
                    marker=dict(size=30, color="lightblue"),
                    name=node["label"],
                )
            )

        # エッジの描画
        for edge in edges:
            source_node = nodes[edge["source"]]
            target_node = nodes[edge["target"]]
            fig.add_trace(
                go.Scatter(
                    x=[source_node["x"], target_node["x"]],
                    y=[source_node["y"], target_node["y"]],
                    mode="lines",
                    line=dict(width=2, color="gray"),
                    showlegend=False,
                )
            )

        fig.update_layout(
            title="AI決定フロー",
            showlegend=False,
            xaxis=dict(visible=False),
            yaxis=dict(visible=False),
            height=300,
        )

        st.plotly_chart(fig, use_container_width=True)

    def _render_similar_cases(self, decision: AIDecision):
        """過去の類似ケース表示"""
        if not decision.similar_cases:
            return

        st.markdown("### 📚 過去の類似ケース")

        # 成功率の可視化
        success_rates = [case["success_rate"] for case in decision.similar_cases]
        case_labels = [f"{case['date']} ({case['action']})" for case in decision.similar_cases]

        fig = go.Figure()
        fig.add_trace(
            go.Bar(
                x=case_labels,
                y=success_rates,
                marker_color=["green" if rate >= 70 else "orange" if rate >= 50 else "red" for rate in success_rates],
                name="成功率",
            )
        )

        fig.update_layout(
            title="類似ケースの成功率",
            xaxis_title="ケース",
            yaxis_title="成功率 (%)",
            yaxis=dict(range=[0, 100]),
        )

        st.plotly_chart(fig, use_container_width=True)

        # 詳細テーブル
        df = pd.DataFrame(decision.similar_cases)
        st.dataframe(df, use_container_width=True)

    def _render_trust_metrics(self):
        """信頼性指標の表示"""
        st.markdown("### 📊 AI信頼性指標")

        col1, col2, col3 = st.columns(3)

        with col1:
            # 週間精度
            fig = self._create_gauge_chart(self.trust_metrics.weekly_accuracy, "週間精度", "green")
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            # 月間精度
            fig = self._create_gauge_chart(self.trust_metrics.monthly_accuracy, "月間精度", "blue")
            st.plotly_chart(fig, use_container_width=True)

        with col3:
            # 年間精度
            fig = self._create_gauge_chart(self.trust_metrics.yearly_accuracy, "年間精度", "purple")
            st.plotly_chart(fig, use_container_width=True)

        # 詳細指標
        col1, col2 = st.columns(2)

        with col1:
            st.metric(
                label="ベンチマーク比較",
                value=f"+{self.trust_metrics.benchmark_comparison:.1f}%",
                delta="市場平均より優位",
            )

        with col2:
            st.metric(
                label="総判断数",
                value=self.trust_metrics.total_decisions,
                delta=f"成功: {self.trust_metrics.successful_decisions}件",
            )

    def _render_ticker_details(self, ticker: str):
        """銘柄詳細情報の表示"""
        # サンプルデータ（実際はAPIから取得）
        details = {
            "現在価格": "¥15,230",
            "前日比": "+1.2%",
            "出来高": "12.3M株",
            "時価総額": "¥2.8T",
            "PER": "18.5",
            "PBR": "1.2",
            "配当利回り": "2.1%",
        }

        for key, value in details.items():
            st.write(f"**{key}**: {value}")

    def _create_gauge_chart(self, value: float, title: str, color: str) -> go.Figure:
        """ゲージチャート作成"""
        fig = go.Figure(
            go.Indicator(
                mode="gauge+number+delta",
                value=value,
                domain={"x": [0, 1], "y": [0, 1]},
                title={"text": title},
                delta={"reference": 80},
                gauge={
                    "axis": {"range": [None, 100]},
                    "bar": {"color": color},
                    "steps": [
                        {"range": [0, 50], "color": "lightgray"},
                        {"range": [50, 80], "color": "gray"},
                    ],
                    "threshold": {
                        "line": {"color": "red", "width": 4},
                        "thickness": 0.75,
                        "value": 90,
                    },
                },
            )
        )

        fig.update_layout(height=200)
        return fig

    def _get_action_emoji(self, action: str) -> str:
        """アクションに応じた絵文字を返す"""
        return {"BUY": "🟢 買い", "SELL": "🔴 売り", "HOLD": "🟡 保有"}.get(action, action)

    def _get_risk_level_emoji(self, risk_level: str) -> str:
        """リスクレベルに応じた絵文字を返す"""
        return {"低": "🟢 低リスク", "中": "🟡 中リスク", "高": "🔴 高リスク"}.get(risk_level, risk_level)

    def _create_decision_tree(self, decision: AIDecision) -> Dict:
        """決定ツリーデータを作成"""
        return {
            "level_1": "市場データ入力",
            "level_2": ["技術分析", "ファンダメンタル分析", "センチメント分析"],
            "level_3": f"AI判断: {decision.action}",
            "confidence": decision.confidence,
            "reasoning": decision.reasoning,
        }

    def _load_trust_metrics(self) -> TrustMetrics:
        """信頼性指標を読み込む（サンプルデータ）"""
        return TrustMetrics(
            weekly_accuracy=87.3,
            monthly_accuracy=82.1,
            yearly_accuracy=79.8,
            benchmark_comparison=15.2,
            improvement_trend="上昇中",
            total_decisions=1256,
            successful_decisions=1003,
        )


def create_sample_decision() -> AIDecision:
    """サンプルAI判断データを作成"""
    return AIDecision(
        action="BUY",
        ticker="7203.T",
        confidence=85,
        reasoning=[
            "移動平均線が黄金交叉（25日線が75日線を上回る）",
            "RSIが30を下回り、買いすぎの水準から回復",
            "決算発表で予想以上の業績を確認",
            "業界全体のセンチメントが改善",
            "外国人投資家の買い越し傾向が継続",
        ],
        risk_factors=[
            "金利上昇による輸出企業への圧力",
            "原材料価格の上昇リスク",
            "中国経済減速の影響",
        ],
        similar_cases=[
            {
                "date": "2023-11-15",
                "action": "BUY",
                "success_rate": 85,
                "return": "+12.3%",
            },
            {
                "date": "2023-08-20",
                "action": "BUY",
                "success_rate": 75,
                "return": "+8.7%",
            },
            {
                "date": "2023-05-10",
                "action": "BUY",
                "success_rate": 90,
                "return": "+15.2%",
            },
        ],
        time_horizon="中期",
        expected_return=12.5,
        risk_level="中",
    )


def render_trust_engine():
    """信頼性エンジンのメインUI"""
    st.title("🤖 AI信頼性エンジン")
    st.markdown("AIの判断プロセスを完全透明化し、信頼性を最大化します")

    # 信頼性エンジン初期化
    trust_engine = TrustEngine()

    # サンプルAI判断
    sample_decision = create_sample_decision()

    # タブ構成
    tab1, tab2, tab3 = st.tabs(["🎯 最新判断", "📊 信頼性履歴", "⚙️ 設定"])

    with tab1:
        # 最新判断の詳細分析
        trust_engine.create_decision_visualization(sample_decision)

        # 人間の判断オプション
        st.markdown("---")
        st.subheader("👤 人間の最終決定権")

        col1, col2, col3 = st.columns(3)

        with col1:
            if st.button("✅ AI提案を承認", type="primary", use_container_width=True):
                st.success("AIの提案を承認しました。取引を実行します。")
                # 実際の取引ロジックを呼び出し

        with col2:
            if st.button("❌ AI提案を拒否", use_container_width=True):
                st.warning("AIの提案を拒否しました。")
                # 拒否理由の入力欄を表示
                reason = st.text_area("拒否理由を入力してください:", key="rejection_reason")

        with col3:
            if st.button("🔄 判断を保留", use_container_width=True):
                st.info("判断を保留しました。追加の分析を行います。")

    with tab2:
        # 信頼性履歴
        st.subheader("📈 AI信頼性の推移")

        # 精度の推移グラフ
        dates = pd.date_range(start="2023-01-01", end="2024-01-01", freq="M")
        accuracy = np.random.uniform(70, 90, len(dates))

        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=dates,
                y=accuracy,
                mode="lines+markers",
                name="予測精度",
                line=dict(color="green", width=3),
            )
        )

        fig.update_layout(
            title="AI予測精度の推移",
            xaxis_title="日付",
            yaxis_title="精度 (%)",
            yaxis=dict(range=[60, 100]),
        )

        st.plotly_chart(fig, use_container_width=True)

        # 詳細統計
        st.markdown("### 📋 詳細統計")

        stats_data = {
            "指標": [
                "週間精度",
                "月間精度",
                "年間精度",
                "ベンチマーク比較",
                "総判断数",
            ],
            "値": ["87.3%", "82.1%", "79.8%", "+15.2%", "1,256件"],
        }

        df_stats = pd.DataFrame(stats_data)
        st.dataframe(df_stats, use_container_width=True)

    with tab3:
        # 設定
        st.subheader("⚙️ 信頼性エンジン設定")

        # 信頼性閾値設定
        st.markdown("#### 🔔 信頼性通知設定")

        accuracy_threshold = st.slider(
            "精度警告閾値 (%)",
            min_value=50,
            max_value=95,
            value=75,
            help="AI精度がこの値を下回った場合に警告",
        )

        confidence_threshold = st.slider(
            "判断実行閾値 (%)",
            min_value=60,
            max_value=95,
            value=80,
            help="AIの信頼度がこの値以上の場合のみ自動実行",
        )

        # 人間確認設定
        st.markdown("#### 👤 人間確認設定")

        require_human_approval = st.checkbox(
            "高リスク取引で人間の承認を必須にする",
            value=True,
            help="リスクレベル「高」の判断では必ず人間の承認を求める",
        )

        auto_stop_enabled = st.checkbox(
            "連続損失で自動停止を有効にする",
            value=True,
            help="連続で損失が続いた場合にAI判断を自動停止",
        )

        if st.button("設定を保存", type="primary"):
            st.success("設定を保存しました")


if __name__ == "__main__":
    render_trust_engine()
