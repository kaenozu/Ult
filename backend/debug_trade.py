import requests
import json

def test_trade():
    url = "http://127.0.0.1:8000/api/v1/trade"
    payload = {
        "ticker": "7203.T",
        "action": "BUY",
        "quantity": 100,
        "price": 2500,
        "strategy": "MANUAL_TEST"
    }
    print(f"Sending Trade to {url}...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_trade()
