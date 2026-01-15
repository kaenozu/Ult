"""
プラグイン基底クラス

カスタム戦略をプラグインとして実装するためのインターフェース。
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import pandas as pd


@dataclass
class PluginMetadata:
    """プラグインメタデータ"""
    name: str
    version: str
    author: str = "Unknown"
    description: str = ""
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []


class StrategyPlugin(ABC):
    """戦略プラグイン基底クラス"""
    
    # サブクラスで定義
    metadata: PluginMetadata = PluginMetadata(name="BasePlugin", version="0.0.0")
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._initialized = False
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """シグナルを生成"""
        pass
    
    def analyze(self, data: pd.DataFrame) -> Dict[str, Any]:
        """分析結果を返す"""
        signals = self.generate_signals(data)
        if signals.empty:
            return {"signal": 0, "confidence": 0.0}
        
        last_signal = signals.iloc[-1]
        return {
            "signal": int(last_signal),
            "confidence": 1.0 if last_signal != 0 else 0.0,
        }
    
    def get_signal_explanation(self, signal: int) -> str:
        """シグナルの説明を返す"""
        if signal == 1:
            return f"{self.metadata.name}: 買いシグナル"
        elif signal == -1:
            return f"{self.metadata.name}: 売りシグナル"
        return f"{self.metadata.name}: 様子見"
    
    @classmethod
    def get_config_schema(cls) -> Dict[str, Any]:
        """設定スキーマを返す（オプション）"""
        return {}
    
    def initialize(self) -> None:
        """プラグイン初期化（オプション）"""
        self._initialized = True
    
    def cleanup(self) -> None:
        """クリーンアップ（オプション）"""
        pass
    
    @property
    def name(self) -> str:
        return self.metadata.name


class IndicatorPlugin(ABC):
    """インディケータープラグイン基底クラス"""
    
    metadata: PluginMetadata = PluginMetadata(name="BaseIndicator", version="0.0.0")
    
    @abstractmethod
    def calculate(self, data: pd.DataFrame) -> pd.Series:
        """インディケーターを計算"""
        pass
    
    @property
    def name(self) -> str:
        return self.metadata.name
