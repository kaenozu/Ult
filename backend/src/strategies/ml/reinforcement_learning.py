import logging
import os

import numpy as np
import pandas as pd

from ..base import Strategy

logger = logging.getLogger(__name__)


class RLStrategy(Strategy):
    """強化学習戦略"""

    def __init__(self, name: str = "DQN Agent", trend_period: int = 200):
        super().__init__(name, trend_period)
        self.agent = None
        self.is_trained = False
        self.model_path = "models/rl_dqn.pth"

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        """
        DQNエージェントを使用してシグナルを生成
        """
        if df is None or len(df) < 100:
            return pd.Series(0, index=df.index)

        signals = pd.Series(0, index=df.index)

        try:
            from ...features import add_advanced_features
            from ...rl.agent import DQNAgent
            from ...rl.environment import TradingEnvironment

            # 特徴量追加
            df_features = add_advanced_features(df.copy())

            # 環境初期化 (State determination needs care usually, here we just use what we have)
            # Ensure we have numeric types
            numeric_cols = df_features.select_dtypes(include=[np.number]).columns
            df_numeric = df_features[numeric_cols].fillna(0)

            env = TradingEnvironment(df_numeric)
            state_size = env.state_size
            action_size = env.action_space_size

            # エージェント初期化
            if self.agent is None:
                try:
                    self.agent = DQNAgent(state_size, action_size)
                    self.agent.load(self.model_path)  # Try loading existing model
                    logger.info("Loaded RL agent model.")
                except Exception as e:
                    logger.warning(f"Failed to load/init RL Agent (training might be needed): {e}")
                    # Initialize fresh if load fails
                    self.agent = DQNAgent(state_size, action_size)

            # 未学習かつトレーニング期間が指定されていれば学習 (簡易的なオンライン学習)
            if not self.is_trained and not os.path.exists(self.model_path):
                logger.info("Model not found, training new agent...")
                self._train_agent(env, episodes=3)  # Training a bit
                self.is_trained = True

            # 推論: 全期間に対してアクション決定
            state = env.reset()
            done = False

            while not done:
                step = env.current_step
                action = self.agent.act(state)

                # シグナル変換
                # 0: HOLD -> 0
                # 1: BUY -> 1
                # 2: SELL -> -1
                signal_val = 0
                if action == 1:
                    signal_val = 1
                elif action == 2:
                    signal_val = -1

                # env.df index maps to our df index
                signals.iloc[step] = signal_val

                next_state, _, done, _ = env.step(action)
                state = next_state

            return self.apply_trend_filter(df, signals)

        except ImportError:
            logger.error("RL dependencies not met/installed (torch).")
            return signals
        except Exception as e:
            logger.error(f"RL Strategy Error: {e}")
            return pd.Series(0, index=df.index)

    def _train_agent(self, env, episodes: int = 10):
        """エージェントを学習させる"""
        logger.info(f"Training RL agent for {episodes} episodes...")

        for e in range(episodes):
            state = env.reset()
            done = False
            total_reward = 0

            while not done:
                action = self.agent.act(state)
                next_state, reward, done, _ = env.step(action)

                self.agent.remember(state, action, reward, next_state, done)
                state = next_state
                total_reward += reward

                self.agent.replay()

            self.agent.update_target_model()
            logger.info(
                f"Episode {e + 1}/{episodes} - Total Reward: {total_reward:.2f}, Epsilon: {self.agent.epsilon:.2f}"
            )

        try:
            self.agent.save(self.model_path)
        except Exception as e:
            logger.error(f"Failed to save model: {e}")

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "強化学習エージェントが「買い」と判断しました。"
        elif signal == -1:
            return "強化学習エージェントが「売り」と判断しました。"
        return "強化学習エージェントは「様子見」と判断しました。"
