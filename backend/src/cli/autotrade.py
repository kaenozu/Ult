import argparse
import json
import urllib.request
import urllib.error
import sys

STATUS_URL = "http://localhost:8000/api/v1/status/autotrade"
CONFIG_URL = "http://localhost:8000/api/v1/config/autotrade"

def get_status():
    try:
        with urllib.request.urlopen(STATUS_URL) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except urllib.error.URLError as e:
        print(f"Error connecting to API: {e}", file=sys.stderr)
        sys.exit(1)

def configure_autotrade(enable: bool = None, disable: bool = None, budget: float = None):
    payload = {}
    if enable:
        payload["enabled"] = True
    elif disable:
        payload["enabled"] = False
        
    if budget is not None:
        payload["max_budget_per_trade"] = budget
        
    if not payload:
        print("No configuration changes specified.", file=sys.stderr)
        return

    try:
        req = urllib.request.Request(
            CONFIG_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print("Configuration updated successfully.")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
    except urllib.error.URLError as e:
        print(f"Error connecting to API: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Manage AutoTrader via AGStock API")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Status command
    subparsers.add_parser("status", help="Get current AutoTrader status")
    
    # Config command
    config_parser = subparsers.add_parser("config", help="Configure AutoTrader")
    status_group = config_parser.add_mutually_exclusive_group()
    status_group.add_argument("--enable", action="store_true", help="Enable AutoTrader")
    status_group.add_argument("--disable", action="store_true", help="Disable AutoTrader")
    config_parser.add_argument("--budget", type=float, help="Max budget per trade")
    
    args = parser.parse_args()
    
    if args.command == "status":
        get_status()
    elif args.command == "config":
        configure_autotrade(enable=args.enable, disable=args.disable, budget=args.budget)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
