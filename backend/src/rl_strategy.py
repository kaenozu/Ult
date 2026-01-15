"""
RL Strategy - 強化学習ベースの取引戦略
訓練済みDQNエージェントを使って売買シグナルを生成します。
"""

import logging
import os
from typing import Dict

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

MODEL_PATH = "models/dqn_trading_model.pt"


class RLStrategy:
    """
    強化学習ベースの取引戦略

    訓練済みのDQNエージェントを使用して、
    現在の市場状態から最適な行動（BUY/SELL/HOLD）を予測します。
    """

    def __init__(self):
        self.name = "RL_DQN"
        self.agent = None
        self.is_ready = False
        self._load_agent()

    def _load_agent(self) -> bool:
        """訓練済みエージェントを読み込み"""
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"RL model not found at {MODEL_PATH}. Run training first.")
            return False

        try:
            from src.rl_agent import DQNAgent

            # デフォルトのstate_sizeとaction_size
            # 実際には環境から取得すべきだが、推論時は固定で問題ない
            # features.py の特徴量数 + position(1) + pnl(1)
            state_size = 50  # 概算値
            action_size = 3  # HOLD, BUY, SELL

            self.agent = DQNAgent(state_size=state_size, action_size=action_size, hidden_size=128)
            self.agent.load(MODEL_PATH)
            self.agent.epsilon = 0.0  # 推論時は探索しない
            self.is_ready = True

            logger.info("RL Strategy loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to load RL agent: {e}")
            return False

    def predict(self, df: pd.DataFrame, current_position: int = 0) -> Dict:
        """
        現在の状態から行動を予測

        Args:
            df: 株価データ（特徴量付き）
            current_position: 現在のポジション (0: なし, 1: ロング)

        Returns:
            予測結果の辞書
        """
        if not self.is_ready:
            return {"action": "HOLD", "confidence": 0.0, "error": "Model not loaded"}

        try:
            # 状態ベクトルを構築
            state = self._build_state(df, current_position)

            # 行動を予測
            action_idx = self.agent.act(state)

            # Q値から信頼度を計算
            import torch

            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.agent.device)
            with torch.no_grad():
                q_values = self.agent.model(state_tensor).cpu().numpy()[0]

            # Softmax で確率に変換
            exp_q = np.exp(q_values - np.max(q_values))
            probs = exp_q / exp_q.sum()

            # 行動をラベルに変換
            action_map = {0: "HOLD", 1: "BUY", 2: "SELL"}
            action = action_map[action_idx]
            confidence = probs[action_idx]

            return {
                "action": action,
                "confidence": float(confidence),
                "q_values": {
                    "HOLD": float(q_values[0]),
                    "BUY": float(q_values[1]),
                    "SELL": float(q_values[2]),
                },
                "probabilities": {
                    "HOLD": float(probs[0]),
                    "BUY": float(probs[1]),
                    "SELL": float(probs[2]),
                },
            }

        except Exception as e:
            logger.error(f"RL prediction error: {e}")
            return {"action": "HOLD", "confidence": 0.0, "error": str(e)}

    def _build_state(self, df: pd.DataFrame, current_position: int) -> np.ndarray:
        """状態ベクトルを構築"""
        from src.features import add_advanced_features

        # 特徴量を追加（まだ追加されていなければ）
        if "rsi" not in df.columns:
            df = add_advanced_features(df.copy())

        # 最新の行
        latest = df.iloc[-1]

        # 特徴量カラムを抽出
        exclude_cols = ["Date", "Open", "High", "Low", "Close", "Volume", "Target"]
        feature_cols = [c for c in df.columns if c not in exclude_cols]
        feature_cols = df[feature_cols].select_dtypes(include=[np.number]).columns.tolist()

        # 特徴量値
        features = latest[feature_cols].values
        features = np.nan_to_num(features)

        # ポジション情報
        position_state = np.array([current_position])

        # 含み損益率（ポジションがないなら0）
        pnl_state = np.array([0.0])

        # 状態ベクトル
        state = np.concatenate([position_state, pnl_state, features])

        # サイズを調整（エージェントが期待するサイズに合わせる）
        if len(state) < self.agent.state_size:
            state = np.pad(state, (0, self.agent.state_size - len(state)))
        elif len(state) > self.agent.state_size:
            state = state[: self.agent.state_size]

        return state.astype(np.float32)

    def get_signal_for_ensemble(self, df: pd.DataFrame) -> Dict:
        """
        アンサンブル予測器用のシグナルを取得

        Returns:
            trend: "UP", "DOWN", "FLAT"
            confidence: 0.0 ~ 1.0
        """
        result = self.predict(df, current_position=0)

        action = result.get("action", "HOLD")
        confidence = result.get("confidence", 0.0)

        if action == "BUY":
            trend = "UP"
        elif action == "SELL":
            trend = "DOWN"
        else:
            trend = "FLAT"

        return {
            "trend": trend,
            "confidence": confidence,
            "action": action,
            "details": result,
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    from src.data_loader import fetch_stock_data

    # テスト
    strategy = RLStrategy()

    if strategy.is_ready:
        data_map = fetch_stock_data(["7203.T"], period="3mo")
        df = data_map.get("7203.T")

        if df is not None:
            result = strategy.predict(df)
            print(f"Action: {result['action']}")
            print(f"Confidence: {result['confidence']:.2%}")
            print(f"Q-Values: {result.get('q_values', {})}")
    else:
        print("RL Strategy not ready. Please train the model first.")
