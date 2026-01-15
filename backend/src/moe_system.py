"""
Mixture of Experts (MoE) System - 賢人会議システム
市場環境（レジーム）に応じて最適な「専門家（Expert）」に取引権限を委譲する
"""

import logging
from typing import Any, Dict

import pandas as pd

from src.evolved_strategy import EvolvedStrategy
from src.regime_detector import MarketRegimeDetector

logger = logging.getLogger(__name__)


class MixtureOfExperts:
    """MoE システム"""

    def __init__(self):
        self.gating_network = MarketRegimeDetector()

        # 専門家（リソース節約のため遅延初期化推奨だが、シンプルさ優先でここで初期化）
        self.bull_expert = EvolvedStrategy()  # 進化型（トレンドフォロー最強）
        self.bear_expert = BearExpert()  # 下落相場用
        self.range_expert = RangeExpert()  # レンジ相場用
        self.crisis_expert = CrisisExpert()  # 暴落時避難用

        logger.info("🏛️ Mixture of Experts (MoE) System Initialized")

    def get_expert_signal(self, df: pd.DataFrame, ticker: str) -> Dict[str, Any]:
        """
        現在の市場環境に最適な専門家のシグナルを取得

        Args:
            df: 価格データ
            ticker: 銘柄コード

        Returns:
            Signal Dict
        """
        try:
            # 1. 司令塔判定 (Gating)
            regime = self.gating_network.detect_regime(df)

            # 2. 専門家指名 (Routing)
            expert = None
            expert_name = "Unknown"

            if regime == "trending_up":
                expert = self.bull_expert
                expert_name = "🐂 Bull Expert (Evolved)"
            elif regime == "trending_down":
                expert = self.bear_expert
                expert_name = "🐻 Bear Expert (Counter)"
            elif regime == "ranging" or regime == "low_volatility":
                expert = self.range_expert
                expert_name = "🦀 Range Expert (Reversion)"
            elif regime == "high_volatility" or regime == "volatility_breakout":
                expert = self.crisis_expert
                expert_name = "🛡️ Crisis Expert (Hedging)"
            else:
                # デフォルトはBull（強気）
                expert = self.bull_expert
                expert_name = "🐂 Bull Expert (Default)"

            # 3. 専門家の意見を聞く (Inference)
            # EvolvedStrategyなどは pd.Series を返すが、ここでは直近の1点だけ欲しい
            signals = expert.generate_signals(df)

            if signals.empty:
                return {
                    "action": "HOLD",
                    "confidence": 0.0,
                    "reason": f"{expert_name}: データ不足",
                    "regime": regime,
                }

            last_signal = signals.iloc[-1]
            latest_price = df["Close"].iloc[-1]

            action = "HOLD"
            if last_signal == 1:
                action = "BUY"
            elif last_signal == -1:
                action = "SELL"

            result = {
                "action": action,
                "confidence": 0.85,  # 専門家の自信 (固定だが本来はモデルから取得)
                "reason": f"{expert_name}の判断 (Regime: {regime})",
                "regime": regime,
                "expert": expert_name,
                "price": latest_price,
            }

            # ログ
            # logger.info(f"MoE Decision ({ticker}): {result['reason']} -> {action}")
            return result

        except Exception as e:
            logger.error(f"MoE Error ({ticker}): {e}")
            return {
                "action": "HOLD",
                "confidence": 0.0,
                "reason": f"MoE エラー: {e}",
                "regime": "error",
            }


# --- 個別専門家クラス定義 ---


class BearExpert:
    """下落相場専門家: 戻り売り / 空売り"""

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        # 簡易ロジック: 短期MAが長期MAを下回っている間、RSIが50以上で戻り売り
        sma_s = df["Close"].rolling(20).mean()
        sma_l = df["Close"].rolling(50).mean()
        rsi = self._calc_rsi(df)

        signals = pd.Series(0, index=df.index)
        # Sell condition: Downtrend AND Rally (RSI > 50)
        sell_cond = (sma_s < sma_l) & (rsi > 50)
        # Buy condition (Cover): RSI < 30 (Oversold)
        buy_cond = rsi < 30

        signals[sell_cond] = -1  # 空売りシグナル
        signals[buy_cond] = 1  # 買戻しシグナル
        return signals

    def _calc_rsi(self, df, period=14):
        delta = df["Close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))


class RangeExpert:
    """レンジ相場専門家: 逆張り"""

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        # ボリンジャーバンド逆張り
        sma = df["Close"].rolling(20).mean()
        std = df["Close"].rolling(20).std()
        upper = sma + (std * 2)
        lower = sma - (std * 2)

        signals = pd.Series(0, index=df.index)

        # Lower Band Touch -> Buy
        signals[df["Close"] < lower] = 1
        # Upper Band Touch -> Sell
        signals[df["Close"] > upper] = -1

        return signals


class CrisisExpert:
    """危機管理専門家: キャッシュポジション確保"""

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        # 常にSELL（ポジション解消）またはHOLD
        # ただし、極端な売られすぎ(RSI < 15)でのみリバウンド狙いのBUYを許容
        # 基本はシグナル -1 (逃げろ)
        signals = pd.Series(-1, index=df.index)
        return signals
