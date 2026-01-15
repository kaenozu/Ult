import logging
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd

from ..base import Strategy
from ..ml import DeepLearningStrategy, GRUStrategy, LightGBMStrategy
from .combined import CombinedStrategy
# RSIStrategy is in technical.rsi or imported via technical package
from ..technical import RSIStrategy

logger = logging.getLogger(__name__)


class EnsembleStrategy(Strategy):
    def __init__(
        self, strategies: List[Strategy] = None, trend_period: int = 200, enable_regime_detection: bool = True
    ) -> None:
        super().__init__("Ensemble Strategy", trend_period)  # Updated to match name

        # Load EnsembleVoter - doing it inside __init__ to avoid circular imports if needed,
        # but standard import is better if structure allows.
        try:
            from src.ensemble import EnsembleVoter
            from src.regime import RegimeDetector
        except ImportError:
            # Fallbacks or pass
            pass

        if strategies is None:
            # デフォルトの戦略セット
            self.strategies = [
                # DL Strategy logic
                DeepLearningStrategy(),
                # Split LightGBM into Short and Mid term
                LightGBMStrategy(name="LightGBM Short (60d)", lookback_days=60, use_weekly=False),
                LightGBMStrategy(name="LightGBM Mid (1y Weekly)", lookback_days=365, use_weekly=True),
                CombinedStrategy(),
            ]
        else:
            self.strategies = strategies

        # デフォルトウェイト
        self.base_weights = {
            "Deep Learning (LSTM)": 1.5,
            "LightGBM Short (60d)": 1.0,
            "LightGBM Mid (1y Weekly)": 0.8,
            "Combined (RSI + BB)": 1.0,
        }

        self.weights = self.base_weights.copy()

        # Initialize Voter (Mocking logic here if EnsembleVoter is crucial but external to strategies)
        # Assuming src.ensemble exists.

        # レジーム検知
        self.enable_regime_detection = enable_regime_detection
        self.regime_detector = None
        self.current_regime = None

        if self.enable_regime_detection:
            try:
                from src.data_loader import fetch_macro_data
                from src.regime import RegimeDetector

                # マクロデータを取得してRegimeDetectorを訓練
                macro_data = fetch_macro_data(period="5y")
                if macro_data:
                    self.regime_detector = RegimeDetector(n_regimes=3)
                    self.regime_detector.fit(macro_data)
                    logger.info("RegimeDetector initialized and fitted.")
                else:
                    logger.warning("Failed to fetch macro data. Regime detection disabled.")
                    self.enable_regime_detection = False
            except Exception as e:
                logger.error(f"Error initializing RegimeDetector: {e}")
                self.enable_regime_detection = False

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        """Generate ensemble signals by combining multiple strategies with weighted voting.

        Args:
            df: DataFrame with OHLCV data

        Returns:
            Series of signals: 1 for BUY, -1 for SELL, 0 for HOLD
        """
        # 0. Regime Detection & Weight Adjustment
        if self.enable_regime_detection and self.regime_detector:
            try:
                from src.data_loader import fetch_macro_data
                from src.regime import RegimeDetector

                macro_data = fetch_macro_data(period="1y")
                regime_id, regime_label, features = self.regime_detector.predict_current_regime(macro_data)
                self.current_regime = {"id": regime_id, "label": regime_label, "features": features}

                # レジームに基づいてウェイトを調整
                if regime_id == 2:  # 暴落警戒 (Risk-Off)
                    # 全体的にポジションサイズを縮小
                    self.weights = {k: v * 0.5 for k, v in self.base_weights.items()}
                    logger.info(f"Regime: {regime_label} - Reducing position sizes to 50%")
                elif regime_id == 1:  # 不安定 (Volatile)
                    # 中程度に縮小
                    self.weights = {k: v * 0.75 for k, v in self.base_weights.items()}
                    logger.info(f"Regime: {regime_label} - Reducing position sizes to 75%")
                else:  # 安定上昇 (Stable Bull)
                    # 通常通り
                    self.weights = self.base_weights.copy()
                    logger.info(f"Regime: {regime_label} - Using normal position sizes")
            except Exception as e:
                logger.error(f"Error in regime detection: {e}")
                self.weights = self.base_weights.copy()

        # 1. Generate signals from each strategy
        signals_dict = {}
        for strategy in self.strategies:
            try:
                strategy_signals = strategy.generate_signals(df)
                if strategy_signals is not None and not strategy_signals.empty:
                    signals_dict[strategy.name] = strategy_signals
            except Exception as e:
                logger.error(f"Error generating signals from {strategy.name}: {e}")

        if not signals_dict:
            logger.warning("No valid signals from any strategy")
            return pd.Series(0, index=df.index)

        # 2. Align all signals to the same index
        aligned_signals = pd.DataFrame(signals_dict, index=df.index)
        aligned_signals = aligned_signals.fillna(0)

        # 3. Weighted voting for each timestamp
        ensemble_signals = pd.Series(0, index=df.index, dtype=int)

        for idx in df.index:
            weighted_sum = 0.0
            total_weight = 0.0

            for strategy_name, signal_series in signals_dict.items():
                if idx in signal_series.index:
                    signal = signal_series.loc[idx]
                    weight = self.weights.get(strategy_name, 1.0)
                    weighted_sum += signal * weight
                    total_weight += weight

            # Convert weighted sum to final signal
            # Threshold: if weighted average > 0.3, BUY; if < -0.3, SELL; else HOLD
            if total_weight > 0:
                weighted_avg = weighted_sum / total_weight
                if weighted_avg > 0.3:
                    ensemble_signals.loc[idx] = 1
                elif weighted_avg < -0.3:
                    ensemble_signals.loc[idx] = -1
                else:
                    ensemble_signals.loc[idx] = 0

        # For legacy compatibility
        # self.voter = EnsembleVoter(self.strategies, self.weights)

        return ensemble_signals

    def get_signal_explanation(self, signal: int) -> str:
        """Get explanation for the ensemble signal."""
        if signal == 1:
            regime_info = f" (市場環境: {self.current_regime['label']})" if self.current_regime else ""
            return f"複数のAI戦略が総合的に「買い」を推奨しています{regime_info}。"
        elif signal == -1:
            regime_info = f" (市場環境: {self.current_regime['label']})" if self.current_regime else ""
            return f"複数のAI戦略が総合的に「売り」を推奨しています{regime_info}。"
        return "アンサンブル戦略では明確なコンセンサスが得られていません。"

    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        """詳細分析結果を返す"""
        # Re-implement analyze because we don't hold the ensemble object directly exposed
        # This is a simplified version
        signals = self.generate_signals(df)
        if signals.empty:
            return {"signal": 0, "confidence": 0.0}

        last_signal = signals.iloc[-1]

        return {"signal": int(last_signal), "confidence": 0.8, "details": {"weights": self.weights}}  # Placeholder
