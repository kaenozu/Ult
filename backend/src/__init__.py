"""
AGStock AI予測システムの統合エントリーポイント

このモジュールは、すべての高度なAI予測機能を統合し、
一貫性のあるAPIを通して利用可能にします。
"""

import importlib
from typing import Any

# バージョン情報
__version__ = "2.0.0"
__author__ = "AGStock Development Team"

# 遅延インポートの定義
_component_map = {
    # 補助機能
    "ContinualLearningSystem": ".continual_learning",
    # 主要予測器
    "EnsemblePredictor": ".enhanced_ensemble_predictor",
    "MLopsManager": ".mlops_manager",
    "MultiAssetPredictor": ".multi_asset_analytics",
    "RealTimeAnalyticsPipeline": ".realtime_analytics",
    "RiskAdjustedPredictor": ".risk_adjusted_prediction",
    "ScenarioBasedPredictor": ".scenario_analyzer",
    "SentimentEnhancedPredictor": ".sentiment_analytics",
    "XAIFramework": ".xai_explainer",
}

# 互換性のためのエイリアスマップ
_alias_map = {
    "Predictor": "EnsemblePredictor",
    "AIAnalyzer": "XAIFramework",
    "RiskManager": "RiskAdjustedPredictor",
}


def __getattr__(name: str) -> Any:
    # エイリアスの解決
    if name in _alias_map:
        return getattr(importlib.import_module(__name__), _alias_map[name])

    # コンポーネントの遅延ロード
    if name in _component_map:
        module_path = _component_map[name]
        module = importlib.import_module(module_path, __package__)
        
        # enhanced_ensemble_predictor の場合はクラス名が異なる
        if name == "EnsemblePredictor":
            return getattr(module, "EnhancedEnsemblePredictor")
            
        return getattr(module, name)

    raise AttributeError(f"module {__name__} has no attribute {name}")


def __dir__():
    return sorted(list(set(list(_component_map.keys()) + list(_alias_map.keys()) + ["__version__", "__author__"])))
