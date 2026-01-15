import logging
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd

from src.sovereign_retrospective import SovereignRetrospective

logger = logging.getLogger(__name__)


class TradingEnvironment:
    """
    強化学習用の取引環境 (Gymnasiumライクなインターフェース)

    State:
        - 保有ポジション状況 (0: なし, 1: ロング)
        - 含み損益率
        - テクニカル指標 (正規化済み)

    Action:
        - 0: HOLD (何もしない)
        - 1: BUY (買いエントリー / 買い増し)
        - 2: SELL (売り決済 / 損切り)

    Reward:
        - 実現損益 (売却時)
        - 含み益の変化 (保有時)
        - 取引コストのペナルティ
    """

    def __init__(self, df: pd.DataFrame, initial_balance: float = 1000000.0):
        self.df = df.reset_index(drop=True)
        self.initial_balance = initial_balance
        self.commission_rate = 0.001  # 0.1%

        # Sovereign Adaptive Learning integration
        self.retrospective = SovereignRetrospective()
        self.retrospective.analyze_2025_failures()

        # Action space: 0=HOLD, 1=BUY, 2=SELL
        self.action_space_size = 3

        # State space size (calculated dynamically based on features)
        # Position(1) + PnL(1) + Features
        self.feature_cols = [
            c for c in df.columns if c not in ["Date", "Open", "High", "Low", "Close", "Volume", "Target"]
        ]
        # 数値カラムのみ
        self.feature_cols = df[self.feature_cols].select_dtypes(include=[np.number]).columns.tolist()
        self.state_size = 2 + len(self.feature_cols)

        self.reset()

    def reset(self) -> np.ndarray:
        """環境を初期化し、初期状態を返す"""
        self.current_step = 0
        self.balance = self.initial_balance
        self.position = 0  # 0: No position, 1: Long
        self.entry_price = 0.0
        self.total_profit = 0.0
        self.trades = []

        return self._get_state()

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        """
        行動を実行し、次状態、報酬、終了フラグ、情報を返す

        Returns:
            next_state, reward, done, info
        """
        current_price = self.df.loc[self.current_step, "Close"]
        reward = 0.0
        done = False

        # 行動の実行
        if action == 1:  # BUY
            if self.position == 0:
                self.position = 1
                self.entry_price = current_price
                # 取引コスト
                cost = current_price * self.commission_rate
                reward -= cost  # ペナルティ

        elif action == 2:  # SELL
            if self.position == 1:
                self.position = 0
                # 実現損益
                profit = current_price - self.entry_price
                cost = current_price * self.commission_rate

                realized_pnl = profit - cost
                self.balance += realized_pnl
                self.total_profit += realized_pnl

                reward += realized_pnl
                self.trades.append(
                    {
                        "step": self.current_step,
                        "type": "SELL",
                        "price": current_price,
                        "pnl": realized_pnl,
                    }
                )

        elif action == 0:  # HOLD
            if self.position == 1:
                # 保有中の報酬（含み益の変化などを報酬にする場合）
                # ここではシンプルに、少しのペナルティ（機会損失コスト）を与えるか、0にする
                # 報酬シェイピング: 含み益が増えればプラス、減ればマイナス
                pass

        # Apply Sovereign Reward Bias (Adaptive Learning)
        # 過去の失敗パターンに基づき、報酬を動的に修正する
        pnl_ratio = 0.0
        if self.position == 1:
            pnl_ratio = (current_price - self.entry_price) / self.entry_price

        reward += self.retrospective.get_reward_bias({"pnl_ratio": pnl_ratio, "step": self.current_step})

        # ステップ進行
        self.current_step += 1

        # 終了判定
        if self.current_step >= len(self.df) - 1:
            done = True

        # 次状態
        next_state = self._get_state()

        info = {
            "balance": self.balance,
            "total_profit": self.total_profit,
            "position": self.position,
        }

        return next_state, reward, done, info

    def _get_state(self) -> np.ndarray:
        """現在の状態ベクトルを取得"""
        if self.current_step >= len(self.df):
            # 終了後のダミー状態
            return np.zeros(self.state_size)

        # 特徴量
        features = self.df.loc[self.current_step, self.feature_cols].values
        # 正規化や欠損値処理が必要だが、ここではデータローダー側で済んでいると仮定
        features = np.nan_to_num(features)

        # ポジション情報
        position_state = np.array([self.position])

        # 含み損益率
        pnl_ratio = 0.0
        if self.position == 1:
            current_price = self.df.loc[self.current_step, "Close"]
            pnl_ratio = (current_price - self.entry_price) / self.entry_price

        pnl_state = np.array([pnl_ratio])

        # 結合
        state = np.concatenate([position_state, pnl_state, features])

        return state
