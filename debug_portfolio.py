
import asyncio
import logging
import sys
import os

# Setup Import Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
sys.path.insert(0, backend_dir)

# Configure Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_portfolio():
    print("--- Starting Portfolio Diagnosis ---")
    try:
        from src.portfolio_manager import portfolio_manager
        print("PortfolioManager imported.")
        
        print("Calling calculate_portfolio()...")
        data = portfolio_manager.calculate_portfolio()
        print("Data received:")
        print(data)
        
    except Exception as e:
        print(f"CRASHED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # PortfolioManager.calculate_portfolio is sync (not async def), but uses async logic internally?
    # No, it looks sync in source: def calculate_portfolio(self) -> Dict
    # But it calls fetch_stock_data which might be async wrapper?
    # fetch_stock_data is decorated with retry_with_backoff.
    
    test_portfolio()
