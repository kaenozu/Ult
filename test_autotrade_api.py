
import requests
import json

url = 'http://localhost:8000/api/v1/config/autotrade'
headers = {'Content-Type': 'application/json'}

# 1. Check Status
r = requests.get('http://localhost:8000/api/v1/status/autotrade')
print('Initial Status:', r.json())

# 2. Turn ON
print('Turning ON...')
data = {'enabled': True}
r = requests.post(url, headers=headers, json=data)
print('Response:', r.json())

# 3. Check Status again
r = requests.get('http://localhost:8000/api/v1/status/autotrade')
final_status = r.json()
print('Final Status:', final_status)

if final_status['is_running'] == True:
    print('SUCCESS: Auto-Pilot started via API.')
    
    # Turn OFF again to clean up
    requests.post(url, headers=headers, json={'enabled': False})
else:
    print('FAILURE: Auto-Pilot did not start.')

