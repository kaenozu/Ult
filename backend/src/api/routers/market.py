from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
import logging

from src.api.schemas import MarketDataResponse, SignalResponse, BacktestRequest, BacktestResponse, MacroIndicator
from typing import List

from datetime import datetime, timedelta

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple In-Memory Cache
MARKET_CACHE = {
    "data": None,
    "last_updated": None
}

@router.get("/market/watchlist", response_model=List[dict])
async def get_market_watchlist():
    """ウォッチリスト(JP_STOCKS)の全銘柄の価格とシグナルを取得 (Cached)"""
    try:
        from src.core.constants import JP_STOCKS, TICKER_NAMES, MARKET_SUMMARY_TTL
        from src.data_temp.data_loader import fetch_stock_data
        from src.strategies import LightGBMStrategy
        
        # 0. Check Cache
        now = datetime.now()
        if (MARKET_CACHE["data"] is not None and 
            MARKET_CACHE["last_updated"] is not None and 
            (now - MARKET_CACHE["last_updated"]).total_seconds() < MARKET_SUMMARY_TTL):
            logger.info("Serving market watchlist from cache")
            return MARKET_CACHE["data"]

        logger.info("Cache miss or expired. Fetching fresh market data...")
        
        # 1. Fetch Data for all stocks
        # period="6mo" to ensure enough for signal (though model needs more, data_loader handles cache)
        # using "1y" to be safe for lightgbm lookback
        data_map = fetch_stock_data(JP_STOCKS, period="1y")

        # 1.5 Fetch Earnings Dates (Batch, Cached by data_loader internally or just simple fetch)
        from src.data_temp.data_loader import fetch_earnings_dates
        # Note: In production, fetch_earnings_dates should be cached independently or run in background
        # For now, we call it (it uses yfinance calendar).
        # We wrap it in try-except to not block main thread too much if yfinance is slow
        earnings_map = {}
        try:
            # Check if we have cached earnings map in memory to avoid yfinance spam
            if "earnings" not in MARKET_CACHE or MARKET_CACHE["earnings"] is None:
                earnings_map = fetch_earnings_dates(JP_STOCKS)
                MARKET_CACHE["earnings"] = earnings_map
            else:
                earnings_map = MARKET_CACHE["earnings"]
        except Exception as e:
            logger.warning(f"Failed to fetch earnings dates: {e}")
        
        # 2. Strategy Init
        strat = LightGBMStrategy()
        
        results = []
        
        for ticker in JP_STOCKS:
            df = data_map.get(ticker)
            if df is None or df.empty:
                continue
                
            # Latest Price Info
            latest = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else latest
            change = float(latest["Close"] - prev["Close"])
            change_pct = float(change / prev["Close"] * 100)
            
            # Earnings Info
            earnings_date_str = earnings_map.get(ticker)
            days_to_earnings = None
            if earnings_date_str:
                try:
                    # Parse ISO string or date string from yfinance
                    # yfinance often returns datetime object or string. data_loader converts to str.
                    # Assuming YYYY-MM-DD
                    edate = datetime.strptime(earnings_date_str.split(" ")[0], "%Y-%m-%d")
                    days_to_earnings = (edate - now).days
                except:
                    pass

            # Signal Info
            try:
                sig_res = strat.analyze(df)
                signal = sig_res.get("signal", 0)
                confidence = sig_res.get("confidence", 0.0)
            except Exception:
                signal = 0
                confidence = 0.0

            # === MiniMax Safety Override ===
            # If earnings are within 5 days, force NEUTRAL to avoid volatility gamble
            safety_triggered = False
            if days_to_earnings is not None and 0 <= days_to_earnings <= 5:
                if signal != 0:
                    logger.info(f"Safety Override triggered for {ticker}: Earnings in {days_to_earnings} days. Signal {signal} -> 0")
                    signal = 0
                    confidence = 0.0
                    safety_triggered = True
            
            results.append({
                "ticker": ticker,
                "name": TICKER_NAMES.get(ticker, ticker),
                "price": float(latest["Close"]),
                "change": change,
                "change_percent": change_pct,
                "signal": signal,
                "confidence": confidence,
                "sector": "Technology" if ticker in ["8035.T", "6857.T"] else "Automotive" if ticker == "7203.T" else "Market",
                "earnings_date": earnings_date_str,
                "days_to_earnings": days_to_earnings,
                "safety_triggered": safety_triggered
            })
            
        # Update Cache
        MARKET_CACHE["data"] = results
        MARKET_CACHE["last_updated"] = now
        logger.info(f"Market watchlist cache updated. TTL: {MARKET_SUMMARY_TTL}s")
            
        return results

    except Exception as e:
        logger.error(f"Error fetching watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/{ticker}", response_model=MarketDataResponse)
async def get_market_data(ticker: str):
    """銘柄の市場データを取得"""
    try:
        from src.data_temp.data_loader import fetch_stock_data
        data_map = fetch_stock_data([ticker], period="5d")
        df = data_map.get(ticker)
        
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")
        
        latest = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else latest
        
        change = latest["Close"] - prev["Close"]
        change_pct = (change / prev["Close"]) * 100
        
        return MarketDataResponse(
            ticker=ticker,
            price=float(latest["Close"]),
            change=float(change),
            change_percent=float(change_pct),
            volume=int(latest["Volume"]),
            timestamp=str(latest.name),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/{ticker}/history")
async def get_market_history(ticker: str, period: str = "3mo"):
    """銘柄の過去データを取得 (チャート用)"""
    try:
        from src.data_temp.data_loader import fetch_stock_data
        data_map = fetch_stock_data([ticker], period=period)
        df = data_map.get(ticker)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")

        # Convert to list of dicts for frontend
        history = []
        for index, row in df.iterrows():
            history.append({
                "date": index.strftime("%Y-%m-%d"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        
        return history
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/signals/{ticker}", response_model=SignalResponse)
async def get_signal(
    ticker: str,
    strategy: str = Query(default="LightGBM"),
):
    """銘柄のシグナルを取得"""
    try:
        from src.data_temp.data_loader import fetch_stock_data
        from src.strategies import LightGBMStrategy, RSIStrategy, SMACrossoverStrategy, BollingerBandsStrategy
        
        # 戦略を選択
        strategy_map = {
            "LIGHTGBM": LightGBMStrategy,
            "RSI": RSIStrategy,
            "SMA": SMACrossoverStrategy,
            "BOLLINGER": BollingerBandsStrategy,
        }
        
        strategy_cls = strategy_map.get(strategy.upper(), LightGBMStrategy)
        strat = strategy_cls()
        
        # データ取得
        data_map = fetch_stock_data([ticker], period="5y")
        df = data_map.get(ticker)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Data not found")
        
        # シグナル生成
        result = strat.analyze(df)
        
        return SignalResponse(
            ticker=ticker,
            signal=result.get("signal", 0),
            confidence=result.get("confidence", 0.0),
            strategy=strategy,
            explanation=strat.get_signal_explanation(result.get("signal", 0)),
            target_price=result.get("target_price"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """バックテストを実行"""
    try:
        from src.data_temp.data_loader import fetch_stock_data
        from src.backtest_engine import BacktestEngine
        from src.strategies import LightGBMStrategy, RSIStrategy
        
        # 戦略を選択
        strategy_map = {
            "LightGBM": LightGBMStrategy,
            "RSI": RSIStrategy,
        }
        strategy_cls = strategy_map.get(request.strategy, LightGBMStrategy)
        
        # データ取得
        data_map = fetch_stock_data([request.ticker], period=request.period)
        df = data_map.get(request.ticker)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Data not found")
        
        # バックテスト実行
        engine = BacktestEngine(initial_capital=request.initial_capital)
        result = engine.run(df, strategy_cls())
        
        if result is None:
            raise HTTPException(status_code=400, detail="Backtest failed")
        
        return BacktestResponse(
            total_return=result.get("total_return", 0),
            sharpe_ratio=result.get("sharpe_ratio", 0),
            max_drawdown=result.get("max_drawdown", 0),
            win_rate=result.get("win_rate", 0),
            total_trades=result.get("total_trades", 0),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/macro", response_model=List[MacroIndicator])
async def get_macro_data():
    """主要マクロ経済指標の取得"""
    from src.data_temp.data_loader import fetch_external_data
    import time
    
    try:
        # Fetch data for last 5 days to calculate change
        data_map = fetch_external_data(period="5d")
        
        indicators = []
        # Mapping: API Key -> (Loader Key, Display Name)
        targets = [
            ("NIKKEI", "Nikkei 225"), 
            ("USDJPY", "USD/JPY"), 
            ("US10Y", "US 10Y Yield"),
            ("VIX", "VIX Index")
        ]

        for key, name in targets:
            df = data_map.get(key)
            if df is not None and not df.empty and len(df) >= 2:
                current = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2])
                change = (current - prev) / prev
                
                indicators.append(MacroIndicator(
                    symbol=key,
                    name=name,
                    price=round(current, 2 if key != "USDJPY" else 3),
                    change_percent=round(change * 100, 2),
                    trend="up" if change > 0 else "down" if change < 0 else "neutral",
                    timestamp=time.strftime("%Y-%m-%dT%H:%M:%S")
                ))
        return indicators
    except Exception as e:
        logger.error(f"Error fetching macro data: {e}")
        return []

@router.get("/market/earnings", response_model=List[dict])
async def get_upcoming_earnings(days: int = 14):
    """
    Get list of stocks with earnings in the next N days.
    """
    try:
        from src.data.earnings_provider import earnings_provider
        from src.core.constants import JP_STOCKS
        
        # Check cache/fetch
        results = earnings_provider.get_upcoming_earnings(JP_STOCKS, days_horizon=days)
        return results
    except Exception as e:
        logger.error(f"Error getting earnings data: {e}")
        return []
