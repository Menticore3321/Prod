import urllib.request
import urllib.error
import json
import time

print("--- STARTING LIVE VERCEL INTEGRATION TEST (deej1.vercel.app) ---")

# Step 1: Submit a new booking
payload = {
    "name": "Deej1 Integration Checker",
    "email": "deej1@test.com",
    "format": "shorts",
    "vision": "Verifying new Vercel domain deej1.vercel.app + Firestore REST!"
}

req_post = urllib.request.Request(
    'https://deej1.vercel.app/api/booking',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req_post) as res:
        print("1. POST Request: Status Code =", res.status)
        print("   POST Response Body =", res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("1. POST Request FAILED: Code =", e.code)
    print("   Body =", e.read().decode('utf-8'))
    exit(1)

# Wait a brief moment
time.sleep(1)

# Step 2: Fetch the bookings list
try:
    with urllib.request.urlopen('https://deej1.vercel.app/api/bookings') as res:
        print("2. GET Request: Status Code =", res.status)
        records = json.loads(res.read().decode('utf-8'))
        print(f"   Total Records Found in Firestore = {len(records)}")
        
        # Verify the new record is at the top (since we sort newest first!)
        if len(records) > 0:
            latest = records[0]
            print("3. Latest Record Details:")
            print(f"   Name: {latest.get('name')}")
            print(f"   Email: {latest.get('email')}")
            print(f"   Format: {latest.get('format')}")
            print(f"   Vision: {latest.get('vision')}")
            print(f"   Timestamp: {latest.get('timestamp')}")
            
            if latest.get('name') == "Deej1 Integration Checker":
                print("\n--- INTEGRATION TEST STATUS: SUCCESS (deej1.vercel.app fully live!) ---")
            else:
                print("\n--- INTEGRATION TEST STATUS: FAILED (Latest record is not ours!) ---")
        else:
            print("\n--- INTEGRATION TEST STATUS: FAILED (No records found!) ---")

except urllib.error.HTTPError as e:
    print("2. GET Request FAILED: Code =", e.code)
    print("   Body =", e.read().decode('utf-8'))
    exit(1)
