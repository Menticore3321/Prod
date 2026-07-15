from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timedelta

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode('utf-8'))

    def do_POST(self):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            booking_id = data.get('id', '').strip()
            if not booking_id:
                self._respond(400, {'status': 'error', 'message': 'Missing booking id.'})
                return

            base = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"

            # 1. Fetch original booking document
            get_req = urllib.request.Request(f"{base}/bookings/{booking_id}", method='GET')
            with urllib.request.urlopen(get_req) as res:
                booking_doc = json.loads(res.read().decode('utf-8'))

            # 2. Copy fields and add deletion metadata
            fields = booking_doc.get('fields', {})
            deleted_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            expires_at = (datetime.utcnow() + timedelta(days=60)).strftime('%Y-%m-%d %H:%M:%S')

            fields['deleted_at'] = {'stringValue': deleted_at}
            fields['expires_at'] = {'stringValue': expires_at}

            new_doc = {'fields': fields}

            # 3. Write to deleted_bookings collection (using same id)
            put_url = f"{base}/deleted_bookings/{booking_id}"
            put_req = urllib.request.Request(
                put_url,
                data=json.dumps(new_doc).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='PATCH'
            )
            with urllib.request.urlopen(put_req) as res:
                res.read()

            # 4. Delete original from bookings collection
            del_req = urllib.request.Request(f"{base}/bookings/{booking_id}", method='DELETE')
            with urllib.request.urlopen(del_req) as res:
                res.read()

            self._respond(200, {'status': 'success', 'message': 'Booking moved to Recently Deleted.'})

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
