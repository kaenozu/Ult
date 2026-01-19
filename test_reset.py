import requests
import json

try:
    url = "http://localhost:8000/api/v1/settings/reset-portfolio"
    payload = {"initial_capital": 1000000}
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
