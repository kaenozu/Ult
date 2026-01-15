"""
Health Check CLI
Checks the status of the AGStock API.
"""
import argparse
import sys
import urllib.request
import json
import logging

def check_health(url: str = "http://localhost:8000/api/v1/health"):
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print(f"Status: {data.get('status', 'Unknown')}")
                print(f"Uptime: {data.get('uptime_seconds', 0)}s")
                components = data.get("components", {})
                for k, v in components.items():
                    print(f"  - {k}: {v}")
                return True
            else:
                print(f"Error: API returned status {response.status}")
                return False
    except urllib.error.URLError as e:
        print(f"Error connecting to API: {e}")
        print("Hint: Is the backend server running?")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check System Health")
    parser.add_argument("--url", default="http://localhost:8000/health", help="Health endpoint URL")
    args = parser.parse_args()
    
    success = check_health(args.url)
    if not success:
        sys.exit(1)
