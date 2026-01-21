import requests
import json

def verify():
    url = "http://localhost:8000/api/v1/market/earnings?days=30"
    print(f"Fetching from {url}...")
    try:
        res = requests.get(url)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
        data = res.json()
        print(f"Type of data: {type(data)}")
        if isinstance(data, list):
            print("Response is a list (As expected).")
        else:
            print("WARNING: Response is NOT a list!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify()
