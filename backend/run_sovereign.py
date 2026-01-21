import sys
import os
import logging
from datetime import datetime
import time

# Ensure backend module can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.sovereign.notifier import Notifier
from src.sovereign.scheduler import SovereignScheduler
from src.agents.consensus_engine import ConsensusEngine
from src.core.constants import JP_STOCKS
from src.data_temp.data_loader import fetch_stock_data, fetch_external_data
from src.evolution.regime_classifier import RegimeClassifier

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("sovereign.log")
    ]
)
logger = logging.getLogger("Sovereign")

def job_wakeup(notifier: Notifier):
    notifier.send_message("🌅 Morning Protocol", "Sovereign Agent Waking Up. Checking System Health...")
    # TODO: Check API connectivity, Disk space, etc.

def job_market_scan(notifier: Notifier):
    """08:50 AM: Pre-market Analysis"""
    try:
        notifier.send_message("📊 Pre-Market Scan", "Analyzing Market Regime and Macro Indicators...", 0x3498db)
        
        # 1. Macro / Regime
        # We need data to analyze regime
        data_map = fetch_stock_data(["7203.T"], period="3mo") # Proxy with Toyota
        if data_map and "7203.T" in data_map:
            df = data_map["7203.T"]
            classifier = RegimeClassifier()
            regime = classifier.detect_regime(df)
            
            notifier.send_message(
                "Market Regime Detect",
                f"**Regime:** {regime['regime']}\n"
                f"**Confidence:** {regime['confidence']:.2f}\n"
                f"**VIX:** (Check external data)",
                0x9b59b6
            )
    except Exception as e:
        logger.error(f"Market scan failed: {e}")
        notifier.send_message("❌ Error", f"Market scan failed: {e}", 0xff0000)

def job_market_open(notifier: Notifier):
    """09:00 AM"""
    notifier.send_message("🔔 Market Open", "Tokyo Stock Exchange is now OPEN.", 0x00ff00)

def job_the_hive_deliberation(notifier: Notifier, engine: ConsensusEngine):
    """14:55 PM: The Hive decides"""
    notifier.send_message("🐝 The Hive Deliberation", "Consensus Engine starting analysis on Watchlist...", 0xf1c40f)
    
    strong_signals = []
    
    try:
        # Pre-fetch data for speed (batch)
        data_map = fetch_stock_data(JP_STOCKS, period="6mo")
        external_data = fetch_external_data()
        
        for ticker in JP_STOCKS:
            df = data_map.get(ticker)
            if df is None:
                continue
                
            # Run Consensus
            # Start with News/Vision disabled or simple? 
            # Ideally we pass headlines/vision if available. 
            # For automation, we might skip heavy Vision to save cost unless triggered?
            # Let's run full power for now (it will try).
            
            # Note: We need headlines. yfinance fetch in loop might be slow.
            # Allowing ConsensusEngine to handle missing headlines (defaults to 0).
            
            result = engine.deliberate(ticker, df, external_data=external_data)
            score = result["consensus_score"]
            signal = result["signal"]
            
            logger.info(f"{ticker}: Score {score:.2f}")
            
            if abs(score) > 0.6: # Strong Conviction only for alerts
                strong_signals.append({
                    "ticker": ticker,
                    "signal": "BUY" if score > 0 else "SELL",
                    "score": score,
                    "reason": result["reason"]
                })
        
        # Report Results
        if strong_signals:
            body = "Strong Signals Detected:\n"
            for s in strong_signals:
                body += f"• **{s['ticker']}** {s['signal']} (Score: {s['score']:.2f})\n"
            notifier.send_message("🚀 Trade Alerts", body, 0xe74c3c)
        else:
            notifier.send_message("💤 No Trades", "The Hive found no strong opportunities today.", 0x95a5a6)
            
    except Exception as e:
        logger.error(f"Deliberation failed: {e}")
        notifier.send_message("❌ Error", f"Deliberation process failed: {e}", 0xff0000)

def job_daily_report(notifier: Notifier):
    """15:05 PM"""
    notifier.send_message("🌙 Daily Report", "Market Closed. Generating Portfolio Summary (Not implemented). System Sleep.", 0x34495e)

def main():
    notifier = Notifier()
    scheduler = SovereignScheduler()
    engine = ConsensusEngine()
    
    notifier.send_startup()
    
    # Schedule Routine (JST assumed, ensure server time is correct or handle TZ)
    # Ideally use TZ aware scheduling, but simple strings work if system time is JST.
    
    scheduler.register_job("08:50", job_market_scan, notifier)
    scheduler.register_job("09:00", job_market_open, notifier)
    scheduler.register_job("14:55", job_the_hive_deliberation, notifier, engine)
    scheduler.register_job("15:05", job_daily_report, notifier)
    
    # Heartbeat
    scheduler.register_interval(60, lambda: logger.info("Heartbeat: Alive"))
    
    try:
        scheduler.start()
    except KeyboardInterrupt:
        notifier.send_shutdown()

if __name__ == "__main__":
    main()
