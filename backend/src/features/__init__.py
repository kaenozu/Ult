"""AGStock features module (maintains backward compatibility)"""

# 既存のエクスポート（future_predictorやLightGBMStrategy等が依存）
try:
    from .enhanced_features import add_enhanced_technical_indicators as add_technical_indicators
    from .time_series_features import generate_phase29_features as add_advanced_features

    def add_macro_features(df, macro_data):
        """マクロ経済指標をデータフレームにマージする（後方互換性用）"""
        if not macro_data:
            return df
        df_out = df.copy()
        for name, m_df in macro_data.items():
            if m_df is not None and not m_df.empty and "Close" in m_df.columns:
                if m_df.index.tz is not None:
                    m_df = m_df.copy()
                    m_df.index = m_df.index.tz_localize(None)
                m_ret = m_df["Close"].pct_change()
                df_out[f"{name}_Ret"] = m_ret.reindex(df_out.index, method="ffill")
                # 相関係数
                if len(df_out) > 20:
                    df_out[f"{name}_Corr"] = df_out["Close"].pct_change().rolling(20).corr(df_out[f"{name}_Ret"])
        return df_out

except ImportError:
    import logging

    logging.warning("Failed to import some legacy features; check for missing files.")

    def add_technical_indicators(df):
        return df

    def add_advanced_features(df):
        return df

    def add_macro_features(df, macro_data):
        return df


# 新機能
try:
    from .earnings_calendar import (
        EarningsCalendar,
        get_earnings_calendar,
    )
    from .sentiment_indicators import (
        SentimentIndicators,
        SentimentData,
        MarketSentiment,
        get_sentiment_indicators,
    )
    from .drip import (
        DRIPManager,
        DRIPStrategy,
        get_drip_manager,
    )
    from .tax_optimizer import (
        TaxOptimizer,
        HarvestingStrategy,
        get_tax_optimizer,
    )
    from .sector_rotation import (
        SectorRotation,
        EconomicCycle,
        get_sector_rotation,
    )

    NEW_FEATURES_AVAILABLE = True
except ImportError:
    NEW_FEATURES_AVAILABLE = False

__all__ = [
    "add_technical_indicators",
    # 新機能
    "EarningsCalendar",
    "get_earnings_calendar",
    "SentimentIndicators",
    "SentimentData",
    "MarketSentiment",
    "get_sentiment_indicators",
    "DRIPManager",
    "DRIPStrategy",
    "get_drip_manager",
    "TaxOptimizer",
    "HarvestingStrategy",
    "get_tax_optimizer",
    "SectorRotation",
    "EconomicCycle",
    "get_sector_rotation",
]
