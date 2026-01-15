"""
AGStock FastAPI Server

内部APIを提供し、UI/外部システムとの連携を実現。
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# グローバルアプリインスタンス
_app: Optional[FastAPI] = None


# === Pydantic Models ===

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"


class PortfolioSummary(BaseModel):
    total_equity: float
    cash: float
    invested_amount: float
    unrealized_pnl: float
    position_count: int


class Position(BaseModel):
    ticker: str
    quantity: int
    avg_price: float
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None


class TradeRequest(BaseModel):
    ticker: str
    action: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: int = Field(..., gt=0)
    price: Optional[float] = None
    strategy: Optional[str] = None


class TradeResponse(BaseModel):
    success: bool
    message: str
    order_id: Optional[str] = None


class SignalResponse(BaseModel):
    ticker: str
    signal: int  # 1: BUY, -1: SELL, 0: HOLD
    confidence: float
    strategy: str
    explanation: str
    target_price: Optional[float] = None


class MarketDataResponse(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: str


class BacktestRequest(BaseModel):
    ticker: str
    strategy: str
    period: str = "1y"
    initial_capital: float = 1000000


class BacktestResponse(BaseModel):
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    total_trades: int


class ResetPortfolioRequest(BaseModel):
    initial_capital: float = Field(default=1000000, gt=0, description="初期資金（円）")


# === Lifespan ===

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    logger.info("AGStock API starting...")
    # 起動時の初期化
    yield
    # シャットダウン時のクリーンアップ
    logger.info("AGStock API shutting down...")


# === App Factory ===

def create_app() -> FastAPI:
    """FastAPIアプリケーションを作成"""
    app = FastAPI(
        title="AGStock API",
        description="AI-Powered Stock Trading System API",
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # CORS設定
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 本番環境では制限すること
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # ルーターを登録
    register_routes(app)
    register_autotrade_routes(app)
    
    return app


def get_app() -> FastAPI:
    """シングルトンアプリインスタンスを取得"""
    global _app
    if _app is None:
        _app = create_app()
    return _app


# === Dependencies ===

# Global PaperTrader instance
_paper_trader = None

def get_paper_trader():
    """PaperTraderの依存性注入 (Singleton)"""
    global _paper_trader
    if _paper_trader is None:
        from src.paper_trader import PaperTrader
        _paper_trader = PaperTrader()
    return _paper_trader


def get_data_loader():
    """DataLoaderの依存性注入"""
    from src.data_loader import DataLoader
    return DataLoader()


# === Routes ===

def register_routes(app: FastAPI):
    """ルートを登録"""
    
    @app.get("/", response_model=HealthResponse)
    async def root():
        """ヘルスチェック"""
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
        )
    
    @app.get("/api/v1/health", response_model=HealthResponse)
    async def health_check():
        """詳細ヘルスチェック"""
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
        )
    
    # === Portfolio ===
    
    @app.get("/api/v1/portfolio", response_model=PortfolioSummary)
    async def get_portfolio(pt = Depends(get_paper_trader)):
        """ポートフォリオサマリーを取得"""
        try:
            balance = pt.get_current_balance()
            positions = pt.get_positions()
            return PortfolioSummary(
                total_equity=balance.get("total_equity", 0),
                cash=balance.get("cash", 0),
                invested_amount=balance.get("invested_amount", 0),
                unrealized_pnl=balance.get("unrealized_pnl", 0),
                position_count=len(positions) if not positions.empty else 0,
            )
        except Exception as e:
            logger.error(f"Error getting portfolio: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/v1/settings/reset-portfolio")
    async def reset_portfolio(request: ResetPortfolioRequest):
        """ポートフォリオをリセットして新しい初期資金で開始"""
        try:
            import sqlite3
            db_path = "ult_trading.db"
            
            global _paper_trader
            global _auto_trader

            # 1. Stop AutoTrader if exists and running
            if _auto_trader:
                _auto_trader.stop()
                _auto_trader = None

            # 2. Close existing PaperTrader connection to release lock
            if _paper_trader:
                _paper_trader.close()
                _paper_trader = None
            
            # 3. Clear existing data using SQL instead of deleting file (avoids WinError 32)
            try:
                # Use a temporary connection to clear data
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                
                # Disable foreign keys temporarily if needed, though we don't have strict ones
                cursor.execute("PRAGMA foreign_keys = OFF")
                
                # Get list of tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall() if row[0] != 'sqlite_sequence']
                
                for table in tables:
                    cursor.execute(f"DELETE FROM {table}")
                
                # Reset sequences if exists
                try:
                    cursor.execute("DELETE FROM sqlite_sequence")
                except Exception:
                    pass # Ignore if table doesn't exist
                
                conn.commit()
                # VACUUM to shrink file
                try:
                    conn.execute("VACUUM")
                except Exception as ve:
                    logger.warning(f"VACUUM failed (ignored): {ve}")
                
                conn.close()
                logger.info(f"Cleared database tables: {db_path}")
                
            except Exception as e:
                logger.error(f"Error clearing database: {e}")
                raise HTTPException(status_code=500, detail=f"Database reset failed: {e}")
            
            # 4. Re-initialize PaperTrader with new capital
            from src.paper_trader import PaperTrader
            pt = PaperTrader(db_path=db_path, initial_capital=request.initial_capital)
            
            # Update global singleton
            _paper_trader = pt
            
            return {
                "success": True,
                "message": f"ポートフォリオをリセットしました。初期資金: ¥{request.initial_capital:,.0f}",
                "initial_capital": request.initial_capital
            }
        except Exception as e:
            logger.error(f"Error resetting portfolio: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/v1/positions", response_model=List[Position])
    async def get_positions(pt = Depends(get_paper_trader)):
        """保有ポジション一覧を取得"""
        try:
            positions_df = pt.get_positions()
            if positions_df.empty:
                return []
            
            return [
                Position(
                    ticker=row["ticker"],
                    quantity=int(row["quantity"]),
                    avg_price=float(row["avg_price"]),
                )
                for _, row in positions_df.iterrows()
            ]
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # === Trading ===
    
    @app.post("/api/v1/trade", response_model=TradeResponse)
    async def execute_trade(
        request: TradeRequest,
        pt = Depends(get_paper_trader)
    ):
        """取引を実行"""
        try:
            # 価格を取得（指定がなければ最新価格）
            price = request.price
            if price is None:
                from src.data_loader import fetch_stock_data, get_latest_price
                # Fetch recent data to get the latest price
                data_map = fetch_stock_data([request.ticker], period="5d")
                df = data_map.get(request.ticker)
                price = get_latest_price(df)
                
                if price <= 0:
                    raise HTTPException(status_code=400, detail="Could not fetch price")
            
            success = pt.execute_trade(
                ticker=request.ticker,
                action=request.action,
                quantity=request.quantity,
                price=price,
                strategy=request.strategy,
            )
            
            return TradeResponse(
                success=success,
                message="Trade executed" if success else "Trade failed",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error executing trade: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # === Market Data ===
    
    @app.get("/api/v1/market/{ticker}", response_model=MarketDataResponse)
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

    @app.get("/api/v1/market/{ticker}/history")
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
    
    # === Signals ===
    
    @app.get("/api/v1/signals/{ticker}", response_model=SignalResponse)
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
            # LightGBM requires lookback_days(365) + buffer, so 1y (250 days) is insufficient.
            # Using 5y to ensure enough training data.
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
    
    # === Backtest ===
    
    @app.post("/api/v1/backtest", response_model=BacktestResponse)
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


# === AutoTrader ===

# Global AutoTrader instance
_auto_trader = None

def get_auto_trader():
    """AutoTraderの依存性注入"""
    global _auto_trader
    if _auto_trader is None:
        from src.auto_trader import AutoTrader
        # Use the singleton paper trader to share DB connection
        pt = get_paper_trader()
        _auto_trader = AutoTrader(pt)
    return _auto_trader

def register_autotrade_routes(app: FastAPI):
    """自動売買APIの登録"""
    from src.auto_trader import AutoTrader

    class AutoTradeConfig(BaseModel):
        max_budget_per_trade: Optional[float] = None
        stop_loss_pct: Optional[float] = None
        enabled: Optional[bool] = None

    @app.get("/api/v1/status/autotrade")
    async def get_autotrade_status(at: AutoTrader = Depends(get_auto_trader)):
        """自動売買の状態を取得"""
        return at.get_status()

    @app.post("/api/v1/config/autotrade")
    async def configure_autotrade(config: AutoTradeConfig, at: AutoTrader = Depends(get_auto_trader)):
        """自動売買の設定変更 / ON-OFF切り替え"""
        if config.enabled is not None:
            if config.enabled:
                at.start()
            else:
                at.stop()
        
        if config.max_budget_per_trade:
            at.max_budget_per_trade = config.max_budget_per_trade
        if config.stop_loss_pct:
            at.stop_loss_pct = config.stop_loss_pct
            
        return at.get_status()

# === Main ===

if __name__ == "__main__":
    import uvicorn
    # Make sure to register routes before running
    # This is slightly hacked for single-file structure. 
    # Better to move registration inside create_app.
    uvicorn.run(create_app(), host="0.0.0.0", port=8000)
