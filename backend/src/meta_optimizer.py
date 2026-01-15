"""
Meta Learning Optimizer Wrapper
Optunaを使用したハイパーパラメータ自動最適化
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, Optional

import pandas as pd

logger = logging.getLogger(__name__)

BEST_PARAMS_PATH = "models/best_params.json"


class MetaOptimizer:
    """メタ学習オプティマイザー"""

    def __init__(self):
        self.meta_learner = None
        self.best_params = self._load_best_params()
        self.last_optimization = None
        self.optimization_interval_days = 30  # 月次最適化
        self._initialize()

    def _initialize(self):
        """初期化"""
        try:
            from src.meta_learner import MetaLearner

            self.meta_learner = MetaLearner(n_trials=20, cv_folds=3)
            logger.info("Meta Learner initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Meta Learner: {e}")

    def _load_best_params(self) -> Dict:
        """保存済みのベストパラメータをロード"""
        if os.path.exists(BEST_PARAMS_PATH):
            try:
                with open(BEST_PARAMS_PATH, "r") as f:
                    return json.load(f)
            except Exception as e:
                logging.getLogger(__name__).debug(f"Non-critical exception: {e}")
        return {}

    def _save_best_params(self, params: Dict):
        """ベストパラメータを保存"""
        os.makedirs(os.path.dirname(BEST_PARAMS_PATH), exist_ok=True)
        with open(BEST_PARAMS_PATH, "w") as f:
            json.dump(params, f, indent=2)

    def optimize_if_needed(self, df: pd.DataFrame) -> Optional[Dict]:
        """必要に応じてハイパーパラメータを最適化"""
        if self.meta_learner is None:
            return None

        # 最適化間隔チェック
        if self.last_optimization:
            days_since = (datetime.now() - self.last_optimization).days
            if days_since < self.optimization_interval_days:
                return self.best_params

        try:
            # 特徴量生成
            X = self.meta_learner.generate_features(df)

            if X.empty or len(X) < 100:
                logger.warning("Insufficient data for meta optimization")
                return self.best_params

            # ターゲット作成
            y = (df["Close"].shift(-1) > df["Close"]).astype(int)
            y = y.loc[X.index]

            # 欠損除去
            valid_idx = X.dropna().index.intersection(y.dropna().index)
            X = X.loc[valid_idx]
            y = y.loc[valid_idx]

            if len(X) < 100:
                return self.best_params

            # 最適化実行
            logger.info("Running meta optimization...")
            result = self.meta_learner.auto_optimize(X, y)

            if result and "best_params" in result:
                self.best_params = result
                self._save_best_params(result)
                self.last_optimization = datetime.now()
                logger.info(f"Meta optimization complete: {result['best_model_name']}")
                return result

        except Exception as e:
            logger.error(f"Meta optimization error: {e}")

        return self.best_params

    def discover_new_strategies(self, df: pd.DataFrame) -> list:
        """新しい戦略を自動発見"""
        if self.meta_learner is None:
            return []

        try:
            strategies = self.meta_learner.discover_strategies(df, min_sharpe=0.5)
            logger.info(f"Discovered {len(strategies)} strategies")
            return strategies
        except Exception as e:
            logger.error(f"Strategy discovery error: {e}")
            return []

    def get_best_params(self) -> Dict:
        """ベストパラメータを取得"""
        return self.best_params


# シングルトンインスタンス
_meta_optimizer = None


def get_meta_optimizer() -> MetaOptimizer:
    global _meta_optimizer
    if _meta_optimizer is None:
        _meta_optimizer = MetaOptimizer()
    return _meta_optimizer


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    from src.data_loader import fetch_stock_data

    data_map = fetch_stock_data(["7203.T"], period="2y")
    df = data_map.get("7203.T")

    if df is not None:
        optimizer = get_meta_optimizer()
        result = optimizer.optimize_if_needed(df)
        print(f"Best params: {result}")