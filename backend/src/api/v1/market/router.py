"""
Market Data API Routes v1
市場データ関連のAPIエンドポイント v1
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..dependencies import get_market_data_provider
from ...core.constants import DEFAULT_VOLATILITY_SYMBOL
from ...utils.validators import validate_ticker

router = APIRouter()


class MarketDataResponse(BaseModel):
    """市場データレスポンスモデル"""

    ticker: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: str
    market_cap: Optional[float] = None


class TechnicalIndicatorResponse(BaseModel):
    """テクニカル指標レスポンス"""

    ticker: str
    indicators: Dict[str, float]
    timestamp: str


class MarketSummaryResponse(BaseModel):
    """市場サマリーレスポンス"""

    market_status: str
    index_price: float
    index_change: float
    index_change_percent: float
    volatility_index: float
    sector_performance: Dict[str, float]
    timestamp: str


@router.get("/quote/{ticker}", response_model=MarketDataResponse)
async def get_quote(ticker: str, provider=Depends(get_market_data_provider)):
    """
    銘柄のリアルタイム価格を取得
    """
    try:
        validated_ticker = validate_ticker(ticker)
        quote_data = await provider.get_quote(validated_ticker)

        if not quote_data:
            raise HTTPException(
                status_code=404,
                detail=f"Quote not found for ticker: {validated_ticker}",
            )

        return MarketDataResponse(**quote_data)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch quote data")


@router.get("/history/{ticker}")
async def get_price_history(
    ticker: str,
    period: str = Query("1d", description="期間: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y"),
    interval: str = Query("1h", description="間隔: 1m, 5m, 15m, 1h, 1d"),
    provider=Depends(get_market_data_provider),
):
    """
    価格履歴データを取得
    """
    try:
        validated_ticker = validate_ticker(ticker)

        # 期間と間隔の検証
        valid_periods = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"]
        valid_intervals = ["1m", "5m", "15m", "1h", "1d"]

        if period not in valid_periods:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid period. Valid options: {valid_periods}",
            )

        if interval not in valid_intervals:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid interval. Valid options: {valid_intervals}",
            )

        history_data = await provider.get_price_history(
            ticker=validated_ticker, period=period, interval=interval
        )

        return {
            "ticker": validated_ticker,
            "period": period,
            "interval": interval,
            "data": history_data,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch price history")


@router.get("/indicators/{ticker}", response_model=TechnicalIndicatorResponse)
async def get_technical_indicators(
    ticker: str,
    indicators: str = Query("sma,rsi,macd", description="カンマ区切りの指標リスト"),
    provider=Depends(get_market_data_provider),
):
    """
    テクニカル指標を取得
    """
    try:
        validated_ticker = validate_ticker(ticker)

        # 指標リストを検証
        indicator_list = indicators.split(",")
        valid_indicators = ["sma", "ema", "rsi", "macd", "bollinger", "volume", "vwap"]

        for ind in indicator_list:
            if ind.strip() not in valid_indicators:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid indicator: {ind}. Valid options: {valid_indicators}",
                )

        indicator_data = await provider.get_technical_indicators(
            ticker=validated_ticker, indicators=[ind.strip() for ind in indicator_list]
        )

        return TechnicalIndicatorResponse(
            ticker=validated_ticker,
            indicators=indicator_data,
            timestamp=provider.get_current_timestamp(),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch technical indicators"
        )


@router.get("/market/summary", response_model=MarketSummaryResponse)
async def get_market_summary(provider=Depends(get_market_data_provider)):
    """
    市場サマリー情報を取得
    """
    try:
        summary_data = await provider.get_market_summary()

        return MarketSummaryResponse(**summary_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch market summary")


@router.get("/market/sectors")
async def get_sector_performance(provider=Depends(get_market_data_provider)):
    """
    セクター別パフォーマンスを取得
    """
    try:
        sectors_data = await provider.get_sector_performance()

        return {"sectors": sectors_data, "timestamp": provider.get_current_timestamp()}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch sector performance"
        )


@router.get("/market/volatility")
async def get_market_volatility(
    symbol: str = Query(
        DEFAULT_VOLATILITY_SYMBOL, description="ボラティリティ指標のシンボル"
    ),
    provider=Depends(get_market_data_provider),
):
    """
    市場ボラティリティを取得
    """
    try:
        validated_symbol = validate_ticker(symbol)
        volatility_data = await provider.get_quote(validated_symbol)

        return {
            "symbol": validated_symbol,
            "volatility_index": volatility_data.get("price", 0),
            "change": volatility_data.get("change", 0),
            "change_percent": volatility_data.get("change_percent", 0),
            "timestamp": volatility_data.get("timestamp", ""),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch market volatility")


@router.get("/search")
async def search_tickers(
    query: str = Query(..., min_length=1, description="検索クエリ"),
    limit: int = Query(10, ge=1, le=50, description="結果の最大数"),
    provider=Depends(get_market_data_provider),
):
    """
    銘柄を検索
    """
    try:
        if len(query.strip()) < 1:
            raise HTTPException(
                status_code=400, detail="Query must be at least 1 character long"
            )

        search_results = await provider.search_tickers(query=query.strip(), limit=limit)

        return {
            "query": query.strip(),
            "results": search_results,
            "count": len(search_results),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to search tickers")


@router.get("/market/holidays")
async def get_market_holidays(
    year: int = Query(..., ge=2020, le=2030, description="年"),
    market: str = Query("US", description="市場: US, JP"),
    provider=Depends(get_market_data_provider),
):
    """
    市場休業日を取得
    """
    try:
        holidays_data = await provider.get_market_holidays(year, market)

        return {"year": year, "market": market, "holidays": holidays_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch market holidays")
