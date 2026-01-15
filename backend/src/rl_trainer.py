"""
RL Trainer - 強化学習エージェントの訓練モジュール
DQNエージェントを過去データで訓練し、最適な売買タイミングを学習させます。
"""

import logging
import os
from typing import Optional

import numpy as np
import pandas as pd

from src.data_loader import fetch_stock_data
from src.features import add_advanced_features
from src.rl_agent import DQNAgent
from src.rl_environment import TradingEnvironment

logger = logging.getLogger(__name__)

MODEL_PATH = "models/dqn_trading_model.pt"


class RLTrainer:
    """強化学習トレーナー"""

    def __init__(self, ticker: str = "7203.T", period: str = "2y"):
        self.ticker = ticker
        self.period = period
        self.agent: Optional[DQNAgent] = None
        self.env: Optional[TradingEnvironment] = None

    def prepare_data(self) -> pd.DataFrame:
        """訓練用データを準備"""
        logger.info(f"Fetching data for {self.ticker}...")
        data_map = fetch_stock_data([self.ticker], period=self.period)
        df = data_map.get(self.ticker)

        if df is None or df.empty:
            raise ValueError(f"データ取得失敗: {self.ticker}")

        # 高度な特徴量を追加
        df = add_advanced_features(df)
        df = df.dropna()

        logger.info(f"Data prepared: {len(df)} samples, {len(df.columns)} features")
        return df

    def train(self, episodes: int = 100, verbose: bool = True) -> dict:
        """
        DQNエージェントを訓練

        Args:
            episodes: 訓練エピソード数
            verbose: 詳細ログ出力

        Returns:
            訓練結果の辞書
        """
        logger.info(f"Starting RL training for {episodes} episodes...")

        # データ準備
        df = self.prepare_data()

        # 環境とエージェントの初期化
        self.env = TradingEnvironment(df)
        self.agent = DQNAgent(
            state_size=self.env.state_size,
            action_size=self.env.action_space_size,
            hidden_size=128,
            learning_rate=0.001,
        )

        # 訓練ループ
        rewards_history = []
        profits_history = []

        for episode in range(episodes):
            state = self.env.reset()
            total_reward = 0
            done = False

            while not done:
                # 行動選択
                action = self.agent.act(state)

                # 環境ステップ
                next_state, reward, done, info = self.env.step(action)

                # 経験保存
                self.agent.remember(state, action, reward, next_state, done)

                # 学習
                self.agent.replay()

                state = next_state
                total_reward += reward

            # エピソード結果記録
            rewards_history.append(total_reward)
            profits_history.append(info["total_profit"])

            # ターゲットネットワーク更新（10エピソードごと）
            if episode % 10 == 0:
                self.agent.update_target_model()

            if verbose and episode % 10 == 0:
                avg_reward = np.mean(rewards_history[-10:])
                avg_profit = np.mean(profits_history[-10:])
                logger.info(
                    f"Episode {episode}/{episodes} | "
                    f"Avg Reward: {avg_reward:.2f} | "
                    f"Avg Profit: {avg_profit:.2f} | "
                    f"Epsilon: {self.agent.epsilon:.3f}"
                )

        # モデル保存
        self._save_model()

        # 結果
        results = {
            "episodes": episodes,
            "final_epsilon": self.agent.epsilon,
            "avg_reward_last_10": np.mean(rewards_history[-10:]),
            "avg_profit_last_10": np.mean(profits_history[-10:]),
            "total_trades": len(self.env.trades),
            "rewards_history": rewards_history,
            "profits_history": profits_history,
        }

        logger.info(f"Training completed. Model saved to {MODEL_PATH}")
        return results

    def _save_model(self):
        """モデルをファイルに保存"""
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        self.agent.save(MODEL_PATH)
        logger.info(f"Model saved to {MODEL_PATH}")

    def load_model(self) -> bool:
        """保存されたモデルを読み込み"""
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"Model file not found: {MODEL_PATH}")
            return False

        # ダミーデータで環境を初期化（state_sizeを取得するため）
        df = self.prepare_data()
        self.env = TradingEnvironment(df)

        self.agent = DQNAgent(state_size=self.env.state_size, action_size=self.env.action_space_size)
        self.agent.load(MODEL_PATH)
        self.agent.epsilon = 0.0  # 推論時は探索しない

        logger.info(f"Model loaded from {MODEL_PATH}")
        return True


def train_rl_agent(ticker: str = "7203.T", episodes: int = 50):
    """
    RLエージェントを訓練するヘルパー関数

    Args:
        ticker: 訓練に使用する銘柄
        episodes: 訓練エピソード数
    """
    trainer = RLTrainer(ticker=ticker, period="2y")
    results = trainer.train(episodes=episodes, verbose=True)

    print("=" * 50)
    print("RL Training Results")
    print("=" * 50)
    print(f"Episodes: {results['episodes']}")
    print(f"Final Epsilon: {results['final_epsilon']:.3f}")
    print(f"Avg Reward (Last 10): {results['avg_reward_last_10']:.2f}")
    print(f"Avg Profit (Last 10): ¥{results['avg_profit_last_10']:,.0f}")
    print(f"Total Trades: {results['total_trades']}")

    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_rl_agent(ticker="7203.T", episodes=50)
