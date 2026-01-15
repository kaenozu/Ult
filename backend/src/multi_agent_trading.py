#!/usr/bin/env python3
"""
Advanced AI Auto-Trading v3.0 - Multi-Agent System
複数AIエージェント連携システム
"""

import asyncio
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import queue
import time


# AIエージェントの種類
class AgentType(Enum):
    TECHNICAL = "technical"
    FUNDAMENTAL = "fundamental"
    SENTIMENT = "sentiment"
    RISK = "risk"
    PORTFOLIO = "portfolio"
    MARKET = "market"


@dataclass
class AgentSignal:
    """AIエージェントシグナル"""

    agent_id: str
    agent_type: AgentType
    signal_strength: float  # -1 to 1
    confidence: float  # 0 to 1
    reasoning: str
    timestamp: datetime
    metadata: Dict[str, Any]


@dataclass
class ConsensusDecision:
    """合議決定"""

    final_signal: float
    confidence: float
    participating_agents: List[str]
    consensus_score: float
    risk_assessment: Dict[str, Any]
    timestamp: datetime


class AIAgent:
    """基本AIエージェントクラス"""

    def __init__(self, agent_id: str, agent_type: AgentType):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.performance_history = []
        self.last_update = datetime.now()
        self.learning_rate = 0.01

    async def analyze(self, market_data: Dict[str, Any]) -> AgentSignal:
        """市場分析実行"""
        raise NotImplementedError("Subclasses must implement analyze method")

    def update_performance(self, actual_outcome: float, predicted_signal: float):
        """性能更新と学習"""
        error = abs(actual_outcome - predicted_signal)
        self.performance_history.append({"timestamp": datetime.now(), "error": error, "accuracy": 1 - error})

        # 学習率調整
        if len(self.performance_history) > 10:
            recent_errors = [p["error"] for p in self.performance_history[-10:]]
            avg_error = np.mean(recent_errors)
            if avg_error > 0.3:
                self.learning_rate = min(0.05, self.learning_rate * 1.1)
            else:
                self.learning_rate = max(0.001, self.learning_rate * 0.9)


class TechnicalAnalysisAgent(AIAgent):
    """テクニカル分析AIエージェント"""

    def __init__(self, agent_id: str):
        super().__init__(agent_id, AgentType.TECHNICAL)
        self.indicators = {
            "rsi": 14,
            "macd": (12, 26, 9),
            "bb": 20,
            "sma": [5, 10, 20, 50],
        }

    async def analyze(self, market_data: Dict[str, Any]) -> AgentSignal:
        """テクニカル分析実行"""
        df = pd.DataFrame(market_data["price_data"])

        # RSI計算
        rsi = self.calculate_rsi(df["close"], 14)
        current_rsi = rsi.iloc[-1] if len(rsi) > 0 else 50

        # MACD計算
        macd_line, signal_line = self.calculate_macd(df["close"])
        macd_signal = (macd_line.iloc[-1] - signal_line.iloc[-1]) if len(macd_line) > 0 else 0

        # ボリンジャーバンド
        bb_upper, bb_lower, bb_middle = self.calculate_bollinger_bands(df["close"])
        bb_position = (
            (df["close"].iloc[-1] - bb_lower.iloc[-1]) / (bb_upper.iloc[-1] - bb_lower.iloc[-1])
            if len(bb_upper) > 0
            else 0.5
        )

        # 移動平均線
        sma_signals = []
        for period in [5, 10, 20, 50]:
            if len(df) >= period:
                sma = df["close"].rolling(period).mean()
                current_sma = sma.iloc[-1]
                price = df["close"].iloc[-1]
                sma_signals.append((price - current_sma) / current_sma)

        avg_sma_signal = np.mean(sma_signals) if sma_signals else 0

        # 総合シグナル計算
        rsi_signal = (50 - current_rsi) / 50 if current_rsi != 50 else 0
        macd_signal = np.tanh(macd_signal * 10)  # MACDの差を-1~1に正規化
        bb_signal = (bb_position - 0.5) * 2  # BB位置を-1~1に変換

        # 重み付け総合
        final_signal = rsi_signal * 0.3 + macd_signal * 0.3 + bb_signal * 0.2 + avg_sma_signal * 0.2

        # 信頼度計算
        confidence = self.calculate_technical_confidence(current_rsi, macd_signal, bb_position, avg_sma_signal)

        reasoning = f"""
        RSI: {current_rsi:.1f} ({"買い" if current_rsi < 30 else "売り" if current_rsi > 70 else "中立"})
        MACD: {macd_signal:.3f} ({"買い" if macd_signal > 0 else "売り"})
        BBポジション: {bb_position:.2f} ({"下位" if bb_position < 0.2 else "上位" if bb_position > 0.8 else "中位"})
        SMA平均: {avg_sma_signal:.3f}
        """

        return AgentSignal(
            agent_id=self.agent_id,
            agent_type=self.agent_type,
            signal_strength=np.clip(final_signal, -1, 1),
            confidence=confidence,
            reasoning=reasoning.strip(),
            timestamp=datetime.now(),
            metadata={
                "rsi": current_rsi,
                "macd": macd_signal,
                "bb_position": bb_position,
                "sma_signals": sma_signals,
            },
        )

    def calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """RSI計算"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def calculate_macd(self, prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
        """MACD計算"""
        ema_fast = prices.ewm(span=fast).mean()
        ema_slow = prices.ewm(span=slow).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal).mean()
        return macd_line, signal_line

    def calculate_bollinger_bands(self, prices: pd.Series, period: int = 20, std: float = 2):
        """ボリンジャーバンド計算"""
        sma = prices.rolling(window=period).mean()
        std_dev = prices.rolling(window=period).std()
        upper_band = sma + (std_dev * std)
        lower_band = sma - (std_dev * std)
        return upper_band, lower_band, sma

    def calculate_technical_confidence(self, rsi: float, macd: float, bb: float, sma: float) -> float:
        """テクニカル分析の信頼度計算"""
        # 各指標の一致性を確認
        rsi_direction = 1 if rsi < 30 else -1 if rsi > 70 else 0
        macd_direction = 1 if macd > 0 else -1 if macd < 0 else 0
        bb_direction = 1 if bb < 0.2 else -1 if bb > 0.8 else 0
        sma_direction = 1 if sma > 0 else -1 if sma < 0 else 0

        directions = [rsi_direction, macd_direction, bb_direction, sma_direction]
        non_zero_directions = [d for d in directions if d != 0]

        if not non_zero_directions:
            return 0.3  # 低信頼度

        # 一致性の高いほど信頼度アップ
        consistency = len(set(non_zero_directions)) / len(non_zero_directions)
        base_confidence = 0.5 + (1 - consistency) * 0.5

        # 極端な値ほど信頼度アップ
        extremeness = 0
        if rsi < 20 or rsi > 80:
            extremeness += 0.2
        if abs(macd) > 0.01:
            extremeness += 0.1
        if bb < 0.1 or bb > 0.9:
            extremeness += 0.1

        return min(0.95, base_confidence + extremeness)


class FundamentalAnalysisAgent(AIAgent):
    """ファンダメンタル分析AIエージェント"""

    def __init__(self, agent_id: str):
        super().__init__(agent_id, AgentType.FUNDAMENTAL)
        self.financial_metrics = {
            "pe_ratio": 15,
            "pb_ratio": 1.5,
            "roe": 0.15,
            "debt_ratio": 0.3,
            "growth_rate": 0.1,
        }

    async def analyze(self, market_data: Dict[str, Any]) -> AgentSignal:
        """ファンダメンタル分析実行"""
        financial_data = market_data.get("financial_data", {})
        news_data = market_data.get("news_data", [])

        # 財務指標評価
        pe_signal = self.evaluate_pe_ratio(financial_data.get("pe_ratio", 15))
        pb_signal = self.evaluate_pb_ratio(financial_data.get("pb_ratio", 1.5))
        roe_signal = self.evaluate_roe(financial_data.get("roe", 0.15))
        debt_signal = self.evaluate_debt_ratio(financial_data.get("debt_ratio", 0.3))
        growth_signal = self.evaluate_growth_rate(financial_data.get("growth_rate", 0.1))

        # ニュースセンチメント
        news_sentiment = self.analyze_news_sentiment(news_data)

        # 総合スコア
        fundamental_score = (
            pe_signal * 0.2
            + pb_signal * 0.15
            + roe_signal * 0.2
            + debt_signal * 0.15
            + growth_signal * 0.2
            + news_sentiment * 0.1
        )

        confidence = self.calculate_fundamental_confidence(financial_data, news_data)

        reasoning = f"""
        P/E比率: {financial_data.get("pe_ratio", 15):.1f} ({"割安" if pe_signal > 0 else "割高"})
        P/B比率: {financial_data.get("pb_ratio", 1.5):.2f} ({"割安" if pb_signal > 0 else "割高"})
        ROE: {financial_data.get("roe", 0.15):.1%} ({"高い" if roe_signal > 0 else "低い"})
        負債比率: {financial_data.get("debt_ratio", 0.3):.1%} ({"低い" if debt_signal > 0 else "高い"})
        成長率: {financial_data.get("growth_rate", 0.1):.1%} ({"高い" if growth_signal > 0 else "低い"})
        ニュースセンチメント: {news_sentiment:.2f}
        """

        return AgentSignal(
            agent_id=self.agent_id,
            agent_type=self.agent_type,
            signal_strength=np.clip(fundamental_score, -1, 1),
            confidence=confidence,
            reasoning=reasoning.strip(),
            timestamp=datetime.now(),
            metadata={
                "financial_metrics": financial_data,
                "news_count": len(news_data),
                "news_sentiment": news_sentiment,
            },
        )

    def evaluate_pe_ratio(self, pe_ratio: float) -> float:
        """P/E比率評価"""
        if pe_ratio < 10:
            return 0.5  # 割安
        elif pe_ratio > 25:
            return -0.5  # 割高
        else:
            return (15 - pe_ratio) / 15  # 中間的

    def evaluate_pb_ratio(self, pb_ratio: float) -> float:
        """P/B比率評価"""
        if pb_ratio < 1.0:
            return 0.5  # 割安
        elif pb_ratio > 3.0:
            return -0.5  # 割高
        else:
            return (1.5 - pb_ratio) / 1.5

    def evaluate_roe(self, roe: float) -> float:
        """ROE評価"""
        if roe > 0.20:
            return 0.5  # 高い
        elif roe < 0.05:
            return -0.5  # 低い
        else:
            return (roe - 0.125) / 0.075

    def evaluate_debt_ratio(self, debt_ratio: float) -> float:
        """負債比率評価"""
        if debt_ratio < 0.2:
            return 0.3  # 安全
        elif debt_ratio > 0.6:
            return -0.5  # 危険
        else:
            return (0.4 - debt_ratio) / 0.4

    def evaluate_growth_rate(self, growth_rate: float) -> float:
        """成長率評価"""
        if growth_rate > 0.15:
            return 0.5  # 高成長
        elif growth_rate < 0.05:
            return -0.3  # 低成長
        else:
            return (growth_rate - 0.1) / 0.05

    def analyze_news_sentiment(self, news_data: List[Dict]) -> float:
        """ニュースセンチメント分析"""
        if not news_data:
            return 0.0

        positive_keywords = ["好調", "増収", "利益", "成長", "強気", "上昇"]
        negative_keywords = ["不振", "減収", "損失", "低迷", "弱気", "下落"]

        total_sentiment = 0
        for news in news_data:
            title = news.get("title", "").lower()
            content = news.get("content", "").lower()

            positive_count = sum(1 for word in positive_keywords if word in title or word in content)
            negative_count = sum(1 for word in negative_keywords if word in title or word in content)

            if positive_count + negative_count > 0:
                sentiment = (positive_count - negative_count) / (positive_count + negative_count)
                total_sentiment += sentiment

        return total_sentiment / len(news_data) if news_data else 0.0

    def calculate_fundamental_confidence(self, financial_data: Dict, news_data: List) -> float:
        """ファンダメンタル分析の信頼度計算"""
        # 財務データの完全性
        required_metrics = ["pe_ratio", "pb_ratio", "roe", "debt_ratio", "growth_rate"]
        available_metrics = sum(1 for metric in required_metrics if metric in financial_data)
        data_completeness = available_metrics / len(required_metrics)

        # ニュースの新鮮さ
        news_freshness = 0.5  # デフォルト
        if news_data:
            latest_news = max(news_data, key=lambda x: x.get("timestamp", datetime.min))
            if isinstance(latest_news.get("timestamp"), datetime):
                hours_old = (datetime.now() - latest_news["timestamp"]).total_seconds() / 3600
                news_freshness = max(0, 1 - hours_old / 168)  # 1週間以内を正とする

        return min(0.9, (data_completeness * 0.7 + news_freshness * 0.3))


class SentimentAnalysisAgent(AIAgent):
    """センチメント分析AIエージェント"""

    def __init__(self, agent_id: str):
        super().__init__(agent_id, AgentType.SENTIMENT)
        self.social_sources = ["twitter", "reddit", "news", "forums"]
        self.sentiment_weights = {
            "twitter": 0.3,
            "reddit": 0.2,
            "news": 0.3,
            "forums": 0.2,
        }

    async def analyze(self, market_data: Dict[str, Any]) -> AgentSignal:
        """センチメント分析実行"""
        social_data = market_data.get("social_data", {})

        # 各ソースからセンチメントを収集
        source_sentiments = {}
        for source in self.social_sources:
            source_data = social_data.get(source, [])
            source_sentiments[source] = self.analyze_source_sentiment(source_data)

        # 重み付け総合センチメント
        weighted_sentiment = sum(
            sentiment * self.sentiment_weights[source] for source, sentiment in source_sentiments.items()
        )

        # センチメント変化率
        sentiment_change = self.calculate_sentiment_change(source_sentiments)

        # 最終シグナル
        final_signal = weighted_sentiment + sentiment_change * 0.3

        confidence = self.calculate_sentiment_confidence(source_sentiments)

        reasoning = f"""
        ソーシャルメディアセンチメント:
        Twitter: {source_sentiments.get("twitter", 0):.3f}
        Reddit: {source_sentiments.get("reddit", 0):.3f}
        ニュース: {source_sentiments.get("news", 0):.3f}
        フォーラム: {source_sentiments.get("forums", 0):.3f}
        総合: {weighted_sentiment:.3f}
        変化率: {sentiment_change:.3f}
        """

        return AgentSignal(
            agent_id=self.agent_id,
            agent_type=self.agent_type,
            signal_strength=np.clip(final_signal, -1, 1),
            confidence=confidence,
            reasoning=reasoning.strip(),
            timestamp=datetime.now(),
            metadata={
                "source_sentiments": source_sentiments,
                "weighted_sentiment": weighted_sentiment,
                "sentiment_change": sentiment_change,
            },
        )

    def analyze_source_sentiment(self, source_data: List[Dict]) -> float:
        """個別ソースのセンチメント分析"""
        if not source_data:
            return 0.0

        positive_words = [
            "buy",
            "bullish",
            "up",
            "good",
            "strong",
            "growth",
            "profit",
            "買い",
            "強気",
            "上昇",
        ]
        negative_words = [
            "sell",
            "bearish",
            "down",
            "bad",
            "weak",
            "decline",
            "loss",
            "売り",
            "弱気",
            "下落",
        ]

        total_sentiment = 0
        total_posts = len(source_data)

        for post in source_data:
            text = post.get("text", "").lower()

            positive_count = sum(1 for word in positive_words if word in text)
            negative_count = sum(1 for word in negative_words if word in text)

            if positive_count + negative_count > 0:
                post_sentiment = (positive_count - negative_count) / (positive_count + negative_count)
                # 投稿の影響度を考慮（いいね数、リツイート数など）
                influence = post.get("likes", 1) + post.get("shares", 1) + post.get("comments", 1)
                total_sentiment += post_sentiment * min(influence / 100, 1)  # 影響度を正規化

        return total_sentiment / total_posts if total_posts > 0 else 0.0

    def calculate_sentiment_change(self, source_sentiments: Dict[str, float]) -> float:
        """センチメント変化率計算"""
        # 過去のセンチメントとの比較（デモではランダムな変化）
        change = np.random.normal(0, 0.1)  # 実際は過去データを保持して計算
        return np.clip(change, -0.5, 0.5)

    def calculate_sentiment_confidence(self, source_sentiments: Dict[str, float]) -> float:
        """センチメント分析の信頼度計算"""
        # データソースの多様性
        active_sources = len([s for s in source_sentiments.values() if s != 0])
        source_diversity = active_sources / len(self.social_sources)

        # センチメントの一致性
        if len(source_sentiments) > 1:
            sentiments = list(source_sentiments.values())
            non_zero_sentiments = [s for s in sentiments if s != 0]
            if non_zero_sentiments:
                consistency = 1 - np.std(non_zero_sentiments)
            else:
                consistency = 0.5
        else:
            consistency = 0.5

        return min(0.9, (source_diversity * 0.6 + consistency * 0.4))


class RiskManagementAgent(AIAgent):
    """リスク管理AIエージェント"""

    def __init__(self, agent_id: str):
        super().__init__(agent_id, AgentType.RISK)
        self.risk_thresholds = {
            "max_position_size": 0.2,
            "max_drawdown": 0.15,
            "volatility_limit": 0.05,
            "correlation_limit": 0.7,
        }

    async def analyze(self, market_data: Dict[str, Any]) -> AgentSignal:
        """リスク分析実行"""
        portfolio_data = market_data.get("portfolio_data", {})
        market_volatility = market_data.get("volatility", 0.02)

        # ポジションサイズリスク
        position_risk = self.assess_position_risk(portfolio_data)

        # ドローダウンリスク
        drawdown_risk = self.assess_drawdown_risk(portfolio_data)

        # ボラティリティリスク
        volatility_risk = self.assess_volatility_risk(market_volatility)

        # 相関リスク
        correlation_risk = self.assess_correlation_risk(portfolio_data)

        # 総合リスクスコア
        total_risk = position_risk * 0.3 + drawdown_risk * 0.3 + volatility_risk * 0.2 + correlation_risk * 0.2

        # リスクシグナル（リスクが高いほど負の値）
        risk_signal = -total_risk

        confidence = self.calculate_risk_confidence(portfolio_data, market_data)

        reasoning = f"""
        ポジションサイズリスク: {position_risk:.3f} ({"高い" if position_risk > 0.7 else "中程度" if position_risk > 0.4 else "低い"})
        ドローダウンリスク: {drawdown_risk:.3f} ({"高い" if drawdown_risk > 0.7 else "中程度" if drawdown_risk > 0.4 else "低い"})
        ボラティリティリスク: {volatility_risk:.3f} ({"高い" if volatility_risk > 0.7 else "中程度" if volatility_risk > 0.4 else "低い"})
        相関リスク: {correlation_risk:.3f} ({"高い" if correlation_risk > 0.7 else "中程度" if correlation_risk > 0.4 else "低い"})
        総合リスクスコア: {total_risk:.3f}
        """

        return AgentSignal(
            agent_id=self.agent_id,
            agent_type=self.agent_type,
            signal_strength=np.clip(risk_signal, -1, 1),
            confidence=confidence,
            reasoning=reasoning.strip(),
            timestamp=datetime.now(),
            metadata={
                "position_risk": position_risk,
                "drawdown_risk": drawdown_risk,
                "volatility_risk": volatility_risk,
                "correlation_risk": correlation_risk,
                "total_risk": total_risk,
            },
        )

    def assess_position_risk(self, portfolio_data: Dict) -> float:
        """ポジションサイズリスク評価"""
        positions = portfolio_data.get("positions", [])
        if not positions:
            return 0.0

        max_position = max(pos.get("size", 0) for pos in positions)
        return min(1.0, max_position / self.risk_thresholds["max_position_size"])

    def assess_drawdown_risk(self, portfolio_data: Dict) -> float:
        """ドローダウンリスク評価"""
        current_drawdown = portfolio_data.get("current_drawdown", 0)
        return min(1.0, current_drawdown / self.risk_thresholds["max_drawdown"])

    def assess_volatility_risk(self, market_volatility: float) -> float:
        """ボラティリティリスク評価"""
        return min(1.0, market_volatility / self.risk_thresholds["volatility_limit"])

    def assess_correlation_risk(self, portfolio_data: Dict) -> float:
        """相関リスク評価"""
        correlations = portfolio_data.get("correlations", [])
        if not correlations:
            return 0.0

        max_correlation = max(correlations) if correlations else 0
        return min(1.0, max_correlation / self.risk_thresholds["correlation_limit"])

    def calculate_risk_confidence(self, portfolio_data: Dict, market_data: Dict) -> float:
        """リスク分析の信頼度計算"""
        # ポートフォリオデータの完全性
        required_data = ["positions", "current_drawdown", "correlations"]
        available_data = sum(1 for data in required_data if data in portfolio_data)
        data_completeness = available_data / len(required_data)

        # 市場データの新鮮さ
        market_freshness = 0.8  # デモでは固定値

        return min(0.9, (data_completeness * 0.7 + market_freshness * 0.3))


class MultiAgentConsensusSystem:
    """複数AIエージェント合議システム"""

    def __init__(self):
        self.agents = {}
        self.consensus_history = []
        self.agent_weights = {
            AgentType.TECHNICAL: 0.3,
            AgentType.FUNDAMENTAL: 0.25,
            AgentType.SENTIMENT: 0.2,
            AgentType.RISK: 0.25,
        }
        self.initialize_agents()

    def initialize_agents(self):
        """AIエージェント初期化"""
        self.agents = {
            "tech_001": TechnicalAnalysisAgent("tech_001"),
            "fund_001": FundamentalAnalysisAgent("fund_001"),
            "sent_001": SentimentAnalysisAgent("sent_001"),
            "risk_001": RiskManagementAgent("risk_001"),
        }

    async def get_consensus_decision(self, market_data: Dict[str, Any]) -> ConsensusDecision:
        """合議決定取得"""
        # 全エージェントで並列分析実行
        tasks = [agent.analyze(market_data) for agent in self.agents.values()]
        signals = await asyncio.gather(*tasks)

        # 重み付けシグナル計算
        weighted_signals = []
        participating_agents = []

        for signal in signals:
            agent_type = signal.agent_type
            weight = self.agent_weights.get(agent_type, 0.25)
            weighted_signal = signal.signal_strength * weight * signal.confidence
            weighted_signals.append(weighted_signal)
            participating_agents.append(signal.agent_id)

        # 合議スコア計算
        if weighted_signals:
            consensus_signal = sum(weighted_signals) / sum(
                [w * s.confidence for w, s in zip(self.agent_weights.values(), signals)]
            )
        else:
            consensus_signal = 0.0

        # 信頼度計算
        avg_confidence = np.mean([s.confidence for s in signals]) if signals else 0.0
        consensus_score = self.calculate_consensus_score(signals)

        # リスク評価
        risk_assessment = self.assess_consensus_risk(signals)

        decision = ConsensusDecision(
            final_signal=np.clip(consensus_signal, -1, 1),
            confidence=avg_confidence * consensus_score,
            participating_agents=participating_agents,
            consensus_score=consensus_score,
            risk_assessment=risk_assessment,
            timestamp=datetime.now(),
        )

        self.consensus_history.append(decision)
        return decision

    def calculate_consensus_score(self, signals: List[AgentSignal]) -> float:
        """合議スコア計算"""
        if len(signals) < 2:
            return 0.5

        # シグナル方向の一致性
        signal_directions = [np.sign(s.signal_strength) for s in signals if s.signal_strength != 0]
        if signal_directions:
            direction_consistency = 1 - (len(set(signal_directions)) - 1) / len(signal_directions)
        else:
            direction_consistency = 0.5

        # 信頼度のばらつき
        confidences = [s.confidence for s in signals]
        confidence_consistency = 1 - np.std(confidences) if len(confidences) > 1 else 1.0

        return direction_consistency * 0.7 + confidence_consistency * 0.3

    def assess_consensus_risk(self, signals: List[AgentSignal]) -> Dict[str, Any]:
        """合議リスク評価"""
        risk_signals = [s for s in signals if s.agent_type == AgentType.RISK]
        if risk_signals:
            risk_signal = risk_signals[0]
            return {
                "risk_level": abs(risk_signal.signal_strength),
                "risk_factors": risk_signal.metadata,
                "risk_reasoning": risk_signal.reasoning,
            }
        else:
            return {
                "risk_level": 0.5,
                "risk_factors": {},
                "risk_reasoning": "リスク評価データなし",
            }

    def update_agent_performance(self, actual_outcome: float, decision: ConsensusDecision):
        """エージェント性能更新"""
        for agent_id, agent in self.agents.items():
            if agent_id in decision.participating_agents:
                # 各エージェントの予測を取得（デモでは決定値を使用）
                agent.update_performance(actual_outcome, decision.final_signal)

        # 重み調整
        self.adjust_agent_weights()

    def adjust_agent_weights(self):
        """エージェント重み調整"""
        for agent_type in AgentType:
            agents_of_type = [a for a in self.agents.values() if a.agent_type == agent_type]
            if agents_of_type:
                avg_performance = np.mean(
                    [p["accuracy"] for agent in agents_of_type for p in agent.performance_history[-5:]]
                )
                # 性能に基づいて重みを調整
                current_weight = self.agent_weights.get(agent_type, 0.25)
                adjustment = (avg_performance - 0.5) * 0.1
                self.agent_weights[agent_type] = max(0.1, min(0.4, current_weight + adjustment))

        # 重みの正規化
        total_weight = sum(self.agent_weights.values())
        for agent_type in self.agent_weights:
            self.agent_weights[agent_type] /= total_weight


# メイン実行関数
async def main():
    """メイン実行"""
    print("AI Advanced Auto-Trading v3.0 起動中...")

    # マルチエージェントシステム初期化
    consensus_system = MultiAgentConsensusSystem()

    # デモ市場データ
    market_data = {
        "price_data": {
            "timestamp": pd.date_range(start="2024-01-01", periods=100, freq="H"),
            "open": [100 + i * 0.1 + np.random.normal(0, 0.5) for i in range(100)],
            "high": [102 + i * 0.1 + np.random.normal(0, 0.5) for i in range(100)],
            "low": [98 + i * 0.1 + np.random.normal(0, 0.5) for i in range(100)],
            "close": [100 + i * 0.1 + np.random.normal(0, 0.5) for i in range(100)],
            "volume": [1000000 + i * 10000 for i in range(100)],
        },
        "financial_data": {
            "pe_ratio": 18.5,
            "pb_ratio": 1.8,
            "roe": 0.16,
            "debt_ratio": 0.25,
            "growth_rate": 0.12,
        },
        "news_data": [
            {
                "title": "企業の業績が好調",
                "content": "四半期決算で利益増",
                "timestamp": datetime.now(),
            },
            {
                "title": "市場の強気見通し",
                "content": "アナリストが買い推奨",
                "timestamp": datetime.now(),
            },
        ],
        "social_data": {
            "twitter": [
                {"text": "この株は買いだ！", "likes": 45, "shares": 12},
                {"text": "強気相場継続中", "likes": 23, "shares": 5},
            ],
            "reddit": [{"text": "テクニカル指標が買いシグナル", "likes": 67, "comments": 8}],
        },
        "portfolio_data": {
            "positions": [
                {"symbol": "AAPL", "size": 0.15},
                {"symbol": "GOOGL", "size": 0.10},
            ],
            "current_drawdown": 0.05,
            "correlations": [0.3, 0.2, 0.1],
        },
        "volatility": 0.03,
    }

    # 合議決定取得
    decision = await consensus_system.get_consensus_decision(market_data)

    print("\nAIエージェント合議決定結果:")
    print(f"最終シグナル: {decision.final_signal:.3f}")
    print(f"信頼度: {decision.confidence:.3f}")
    print(f"合議スコア: {decision.consensus_score:.3f}")
    print(f"参加エージェント: {', '.join(decision.participating_agents)}")
    print(f"リスクレベル: {decision.risk_assessment['risk_level']:.3f}")

    print("\n各エージェントの詳細:")
    for agent_id, agent in consensus_system.agents.items():
        print(f"\n{agent_id} ({agent.agent_type.value}):")
        # 各エージェントの分析結果を表示（デモ）
        print(f"  - 性能履歴: {len(agent.performance_history)} 件")
        print(f"  - 学習率: {agent.learning_rate:.4f}")

    print("\nAdvanced AI Auto-Trading v3.0 実行完了！")


if __name__ == "__main__":
    asyncio.run(main())
