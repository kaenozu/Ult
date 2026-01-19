import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os

# パス設定の修正（テスト実行用）
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from src.enhanced_ensemble_predictor import EnhancedEnsemblePredictor

@pytest.fixture
def sample_data():
    """ダミーの株価データを生成"""
    dates = pd.date_range(start="2023-01-01", periods=100, freq="D")
    df = pd.DataFrame({
        "Open": np.random.uniform(100, 200, 100),
        "High": np.random.uniform(100, 200, 100),
        "Low": np.random.uniform(100, 200, 100),
        "Close": np.random.uniform(100, 200, 100),
        "Volume": np.random.randint(1000, 10000, 100)
    }, index=dates)
    # 単純なトレンドを追加
    df["Close"] = df["Close"] + np.linspace(0, 50, 100)
    return df

class TestEnhancedPredictor:
    
    def test_initialization(self):
        """初期化テスト"""
        predictor = EnhancedEnsemblePredictor()
        assert predictor is not None
        assert predictor.is_fitted is False

    def test_fit_predict_flow(self, sample_data):
        """学習と予測のフローテスト"""
        predictor = EnhancedEnsemblePredictor()
        
        # 学習
        # 注意: 内部で特徴量生成などが行われるため、データフレームにはOHLCVが必要
        predictor.fit(sample_data, ticker="TEST_TICKER")
        
        assert predictor.is_fitted is True
        
        # 予測
        prediction = predictor.predict_trajectory(sample_data, days_ahead=1, ticker="TEST_TICKER")
        
        # 結果の検証
        assert isinstance(prediction, dict)
        assert "predicted_price" in prediction
        assert "trend" in prediction
        assert "confidence" in prediction
        assert prediction["trend"] in ["UP", "DOWN", "FLAT"]
        
        print(f"\nPrediction Result: {prediction}")

    def test_prediction_without_fit(self, sample_data):
        """未学習状態での予測テスト（自動学習が走るか）"""
        predictor = EnhancedEnsemblePredictor()
        
        # fitを呼ばずにpredict
        prediction = predictor.predict_trajectory(sample_data, ticker="TEST_TICKER")
        
        assert predictor.is_fitted is True
        assert prediction["predicted_price"] > 0

if __name__ == "__main__":
    # 手動実行用
    df = pd.DataFrame({
        "Open": np.random.uniform(100, 200, 100),
        "High": np.random.uniform(100, 200, 100),
        "Low": np.random.uniform(100, 200, 100),
        "Close": np.random.uniform(100, 200, 100) + np.linspace(0, 50, 100),
        "Volume": np.random.randint(1000, 10000, 100)
    }, index=pd.date_range(start="2023-01-01", periods=100, freq="D"))
    
    predictor = EnhancedEnsemblePredictor()
    predictor.fit(df, "MANUAL_TEST")
    res = predictor.predict_trajectory(df, ticker="MANUAL_TEST")
    print(res)
