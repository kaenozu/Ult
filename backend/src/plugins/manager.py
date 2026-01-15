"""
プラグインマネージャー

プラグインの動的読み込み・管理を行う。
"""

import importlib.util
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Type

from .base import StrategyPlugin, PluginMetadata

logger = logging.getLogger(__name__)


class PluginManager:
    """プラグインマネージャー"""
    
    def __init__(self, plugin_dir: str = "plugins"):
        self.plugin_dir = Path(plugin_dir)
        self._plugins: Dict[str, StrategyPlugin] = {}
        self._plugin_classes: Dict[str, Type[StrategyPlugin]] = {}
    
    def discover_plugins(self) -> List[str]:
        """プラグインディレクトリからプラグインを検出"""
        if not self.plugin_dir.exists():
            logger.warning(f"Plugin directory not found: {self.plugin_dir}")
            return []
        
        discovered = []
        for file_path in self.plugin_dir.glob("*.py"):
            if file_path.name.startswith("_"):
                continue
            
            try:
                plugin_name = file_path.stem
                plugin_class = self._load_plugin_class(file_path)
                if plugin_class:
                    self._plugin_classes[plugin_name] = plugin_class
                    discovered.append(plugin_name)
                    logger.info(f"Discovered plugin: {plugin_name}")
            except Exception as e:
                logger.error(f"Failed to load plugin {file_path}: {e}")
        
        return discovered
    
    def _load_plugin_class(self, file_path: Path) -> Optional[Type[StrategyPlugin]]:
        """ファイルからプラグインクラスを読み込む"""
        spec = importlib.util.spec_from_file_location(file_path.stem, file_path)
        if spec is None or spec.loader is None:
            return None
        
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # StrategyPluginのサブクラスを探す
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (
                isinstance(attr, type) and
                issubclass(attr, StrategyPlugin) and
                attr is not StrategyPlugin
            ):
                return attr
        
        return None
    
    def load_plugin(self, name: str, config: Optional[Dict] = None) -> Optional[StrategyPlugin]:
        """プラグインをインスタンス化して読み込む"""
        if name in self._plugins:
            return self._plugins[name]
        
        if name not in self._plugin_classes:
            logger.error(f"Plugin not found: {name}")
            return None
        
        try:
            plugin_class = self._plugin_classes[name]
            plugin = plugin_class(config)
            plugin.initialize()
            self._plugins[name] = plugin
            logger.info(f"Loaded plugin: {name}")
            return plugin
        except Exception as e:
            logger.error(f"Failed to instantiate plugin {name}: {e}")
            return None
    
    def unload_plugin(self, name: str) -> bool:
        """プラグインをアンロード"""
        if name not in self._plugins:
            return False
        
        try:
            self._plugins[name].cleanup()
            del self._plugins[name]
            logger.info(f"Unloaded plugin: {name}")
            return True
        except Exception as e:
            logger.error(f"Failed to unload plugin {name}: {e}")
            return False
    
    def get_plugin(self, name: str) -> Optional[StrategyPlugin]:
        """読み込み済みプラグインを取得"""
        return self._plugins.get(name)
    
    def list_plugins(self) -> List[Dict]:
        """利用可能なプラグインをリスト"""
        result = []
        for name, plugin_class in self._plugin_classes.items():
            metadata = plugin_class.metadata
            result.append({
                "name": name,
                "version": metadata.version,
                "author": metadata.author,
                "description": metadata.description,
                "loaded": name in self._plugins,
            })
        return result
    
    def get_all_loaded(self) -> Dict[str, StrategyPlugin]:
        """読み込み済みの全プラグインを取得"""
        return self._plugins.copy()


# サンプルプラグインテンプレート
SAMPLE_PLUGIN_TEMPLATE = '''"""
サンプル戦略プラグイン

このファイルを plugins/ ディレクトリに配置してカスタム戦略を追加できます。
"""

import pandas as pd
from src.plugins.base import StrategyPlugin, PluginMetadata


class MyCustomStrategy(StrategyPlugin):
    """カスタム戦略の例"""
    
    metadata = PluginMetadata(
        name="MyCustomStrategy",
        version="1.0.0",
        author="Your Name",
        description="カスタム戦略の説明",
        tags=["custom", "example"],
    )
    
    def __init__(self, config=None):
        super().__init__(config)
        self.threshold = self.config.get("threshold", 0.5)
    
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """シグナル生成ロジック"""
        signals = pd.Series(0, index=data.index)
        
        # 例: 単純な移動平均クロス
        short_ma = data["Close"].rolling(10).mean()
        long_ma = data["Close"].rolling(30).mean()
        
        signals[short_ma > long_ma] = 1   # 買い
        signals[short_ma < long_ma] = -1  # 売り
        
        return signals
    
    @classmethod
    def get_config_schema(cls):
        return {
            "threshold": {"type": "float", "default": 0.5, "description": "シグナル閾値"},
        }
'''


def create_sample_plugin(plugin_dir: str = "plugins"):
    """サンプルプラグインを作成"""
    plugin_path = Path(plugin_dir)
    plugin_path.mkdir(exist_ok=True)
    
    sample_file = plugin_path / "sample_strategy.py"
    if not sample_file.exists():
        sample_file.write_text(SAMPLE_PLUGIN_TEMPLATE)
        logger.info(f"Created sample plugin: {sample_file}")
