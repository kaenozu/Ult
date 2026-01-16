from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
import logging

from src.api.schemas import MarketDataResponse, SignalResponse, BacktestRequest, BacktestResponse, MacroIndicator
from typing import List

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/market/{ticker}", response_model=MarketDataResponse)
async def get_market_data(ticker: str):
    """銘柄の市場データを取得"""
    try:
        from src.data_loader import fetch_stock_data
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
        from src.data_loader import fetch_stock_data
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
        from src.data_loader import fetch_stock_data
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
        from src.data_loader import fetch_stock_data
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
    from src.data_loader import fetch_external_data
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
