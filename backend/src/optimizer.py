import optuna

from src.backtester import Backtester
from src.strategies import BollingerBandsStrategy, CombinedStrategy, RSIStrategy, SMACrossoverStrategy


class Optimizer:
    def __init__(self, df, strategy_name):
        self.df = df
        self.strategy_name = strategy_name
        self.backtester = Backtester()  # Use default costs

    def objective(self, trial):
        # Define search space based on strategy
        if self.strategy_name == "SMA Crossover":
            short_window = trial.suggest_int("short_window", 3, 20)
            long_window = trial.suggest_int("long_window", 20, 100)
            trend_period = trial.suggest_int("trend_period", 100, 300)

            if short_window >= long_window:
                return -1.0  # Invalid

            strategy = SMACrossoverStrategy(short_window, long_window, trend_period)

        elif self.strategy_name == "RSI Reversal":
            period = trial.suggest_int("period", 5, 30)
            lower = trial.suggest_int("lower", 20, 40)
            upper = trial.suggest_int("upper", 60, 80)
            trend_period = trial.suggest_int("trend_period", 100, 300)

            strategy = RSIStrategy(period, lower, upper, trend_period)

        elif self.strategy_name == "Bollinger Bands":
            length = trial.suggest_int("length", 10, 50)
            std = trial.suggest_float("std", 1.5, 3.0, step=0.1)
            trend_period = trial.suggest_int("trend_period", 100, 300)

            strategy = BollingerBandsStrategy(length, std, trend_period)

        elif self.strategy_name == "Combined":
            rsi_period = trial.suggest_int("rsi_period", 5, 30)
            bb_length = trial.suggest_int("bb_length", 10, 50)
            bb_std = trial.suggest_float("bb_std", 1.5, 3.0, step=0.1)
            trend_period = trial.suggest_int("trend_period", 100, 300)

            strategy = CombinedStrategy(rsi_period, bb_length, bb_std, trend_period)

        else:
            return -1.0

        # Risk Management Parameters
        stop_loss = trial.suggest_float("stop_loss", 0.02, 0.10, step=0.01)
        take_profit = trial.suggest_float("take_profit", 0.05, 0.30, step=0.01)

        # Run Backtest
        # We use the first 80% of data for optimization (In-Sample)
        train_size = int(len(self.df) * 0.8)
        train_df = self.df.iloc[:train_size]

        res = self.backtester.run(train_df, strategy, stop_loss=stop_loss, take_profit=take_profit)

        if not res or res["total_trades"] < 3:  # Penalize inactivity
            return -1.0

        # Metric to maximize: Total Return
        # But we can also penalize huge drawdowns
        return res["total_return"]

    def optimize(self, n_trials=50):
        # Suppress Optuna logging
        optuna.logging.set_verbosity(optuna.logging.WARNING)

        study = optuna.create_study(direction="maximize")
        study.optimize(self.objective, n_trials=n_trials)
        return study.best_params, study.best_value
