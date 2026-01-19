import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def buy_stock(ticker, quantity):
    print(f"Buying {quantity} shares of {ticker}...")
    headers = {'Content-Type': 'application/json'}
    payload = {
        "ticker": ticker,
        "action": "BUY",
        "quantity": quantity,
        "order_type": "MARKET"
    }
    try:
        response = requests.post(f"{BASE_URL}/trade", json=payload, headers=headers)
        if response.status_code == 200:
            print(f"Success: {response.json()}")
        else:
            print(f"Failed ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Buy the stocks that were in the mock data
    buy_stock("7203.T", 100) # Toyota
    time.sleep(1)
    buy_stock("6758.T", 50)  # Sony
    time.sleep(1)
    buy_stock("9984.T", 200) # SoftBank
    
    # Check positions
    print("\nVerifying positions...")
    res = requests.get(f"{BASE_URL}/positions")
    print(json.dumps(res.json(), indent=2, ensure_ascii=False))
