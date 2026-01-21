import requests
import json

def check_portfolio():
    url = "http://127.0.0.1:8000/api/v1/positions"
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        print(f"Positions: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_portfolio()
