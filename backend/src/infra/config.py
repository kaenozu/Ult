"""
Legacy config wrapper - redirects to core.config for backward compatibility
"""

from src.core.config import (
    Config,
    settings,
    get_config,
    load_config,
    config,
)

# Re-export for backward compatibility
__all__ = ["Config", "settings", "get_config", "load_config", "config"]
