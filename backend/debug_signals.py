import sys
import asyncio
import traceback
from pathlib import Path

# Setup Path
current_file = Path(__file__).resolve()
backend_root = current_file.parents[1]
sys.path.insert(0, str(backend_root))

from src.api.routers.market import get_signal

async def main():
    print("--- Starting Debug ---")
    try:
        # Mocking or calling directly. get_signal is an async route handler.
        # It expects params: ticker, strategy.
        print("Calling get_signal('7203.T', strategy='RSI')...")
        result = await get_signal("7203.T", strategy="RSI")
        print("Success:", result)
        print("Testing Serialization...")
        json_output = result.model_dump_json()
        print("Serialization Success:", json_output)
    except Exception:
        print("--- Exception Caught ---")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
