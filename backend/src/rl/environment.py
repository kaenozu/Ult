import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class TradingEnvironment:
    """
    Advanced Stock Trading Environment with normalized states and risk-adjusted rewards.
    State: [Features (Normalized), Position Status, Unrealized PnL %]
    Action: 0 (HOLD), 1 (BUY), 2 (SELL)
    """

    def __init__(
        self,
        df: pd.DataFrame,
        initial_balance: float = 1000000.0,
        transaction_cost_pct: float = 0.001,
        lookback_window: int = 20,
    ):
        # Numeric columns only for the observation state
        self.raw_df = df.copy()
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        self.df = df[numeric_cols].reset_index(drop=True)

        self.initial_balance = initial_balance
        self.transaction_cost_pct = transaction_cost_pct
        self.lookback_window = lookback_window

        # Pre-calculate rolling normalization parameters to keep step() fast
        self.means = self.df.rolling(window=lookback_window, min_periods=1).mean()
        self.stds = self.df.rolling(window=lookback_window, min_periods=1).std().replace(0, 1)  # Avoid div by zero

        self.state_size = self.df.shape[1] + 2
        self.action_space_size = 3

        self.reset()

    def reset(self):
        self.balance = self.initial_balance
        self.shares_held = 0
        self.entry_price = 0.0
        self.current_step = self.lookback_window  # Start where normalization is stable
        self.max_steps = len(self.df) - 1

        self.portfolio_value_history = [self.initial_balance]
        self.portfolio_value = self.initial_balance
        self.prev_portfolio_value = self.initial_balance

        return self._get_observation()

    def _get_observation(self):
        # Z-score normalization of current features
        # (val - mean) / std
        current_data = self.df.iloc[self.current_step]
        m = self.means.iloc[self.current_step]
        s = self.stds.iloc[self.current_step]

        normalized_frame = (current_data - m) / s

        # Position features
        position_flag = 1.0 if self.shares_held > 0 else 0.0
        current_price = self.df.iloc[self.current_step]["Close"]

        if self.shares_held > 0 and self.entry_price > 0:
            unrealized_pnl = (current_price - self.entry_price) / self.entry_price
        else:
            unrealized_pnl = 0.0

        return np.append(normalized_frame.values, [position_flag, unrealized_pnl])

    def step(self, action):
        current_price = self.df.iloc[self.current_step]["Close"]

        # Transaction Logic
        if action == 1:  # BUY
            if self.shares_held == 0:
                max_shares = int(self.balance / (current_price * (1 + self.transaction_cost_pct)))
                if max_shares > 0:
                    cost = max_shares * current_price * (1 + self.transaction_cost_pct)
                    self.balance -= cost
                    self.shares_held = max_shares
                    self.entry_price = current_price

        elif action == 2:  # SELL
            if self.shares_held > 0:
                revenue = self.shares_held * current_price * (1 - self.transaction_cost_pct)
                self.balance += revenue
                self.shares_held = 0
                self.entry_price = 0.0

        self.current_step += 1
        done = self.current_step >= self.max_steps

        # Portfolio Calculation
        next_price = self.df.iloc[self.current_step]["Close"] if not done else current_price
        new_val = self.balance + (self.shares_held * next_price)
        self.portfolio_value_history.append(new_val)

        # Reward Function: Risk-Adjusted Profit
        # 1. Delta change
        step_return = (new_val - self.prev_portfolio_value) / self.prev_portfolio_value

        # 2. Volatility Penalty (reward consistency)
        # Use simple lookback for volatility if possible
        if len(self.portfolio_value_history) > 5:
            recent_values = self.portfolio_value_history[-6:]
            rets = np.diff(recent_values) / np.array(recent_values[:-1])
            vol_penalty = np.std(rets) * 0.1
        else:
            vol_penalty = 0.0

        reward = (step_return * 100) - vol_penalty

        # Oracle 2026 Risk Shaping
        # If Oracle is in safety mode, penalize BUY actions
        try:
            from src.oracle.oracle_2026 import Oracle2026

            oracle = Oracle2026()
            guidance = oracle.get_risk_guidance()

            if guidance.get("safety_mode", False):
                if action == 1:  # BUY during crisis
                    reward -= 1.0  # Heavy penalty for buying during storm
            elif guidance.get("var_buffer", 0.0) > 0:
                if action == 1:  # BUY during caution
                    reward -= 0.3  # Mild deterrent
        except Exception:
            pass  # Oracle unavailable, skip

        # Additional penalty for holding -5% drawdown to encourage stop-losses
        if self.shares_held > 0:
            drawdown = (next_price - self.entry_price) / self.entry_price
            if drawdown < -0.05:
                reward -= 0.5  # Sharp penalty for holding heavy losses

        self.prev_portfolio_value = new_val
        self.portfolio_value = new_val

        next_state = self._get_observation() if not done else np.zeros(self.state_size)

        info = {"step": self.current_step, "value": self.portfolio_value, "shares": self.shares_held}

        return next_state, reward, done, info
