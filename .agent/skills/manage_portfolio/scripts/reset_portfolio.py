import sys
import json
import argparse
import requests

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--capital", type=float, default=1000000.0)
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()

    api_url = f"{args.url}/api/v1/settings/reset-portfolio"
    
    try:
        response = requests.post(api_url, json={"initial_capital": args.capital}, timeout=10)
        
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        else:
            try:
                err = response.json()
            except:
                err = {"detail": response.text}
            print(json.dumps({"error": f"Failed with status {response.status_code}", "details": err}))
            sys.exit(1)
            
    except requests.exceptions.ConnectionError:
        print(json.dumps({"error": "Could not connect to API server. Is it running?"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
