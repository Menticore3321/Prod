from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'status': 'error', 'message': 'FIREBASE_PROJECT_ID environment variable is not configured.'}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            name = data.get('name', '').strip()
            email = data.get('email', '').strip()
            project_format = data.get('format', '').strip()
            vision = data.get('vision', '').strip()
            
            if not name or not email or not project_format:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'status': 'error', 'message': 'Missing required fields'}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return
            
            timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

            firestore_doc = {
                "fields": {
                    "name": {"stringValue": name},
                    "email": {"stringValue": email},
                    "format": {"stringValue": project_format},
                    "vision": {"stringValue": vision},
                    "timestamp": {"stringValue": timestamp}
                }
            }

            url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/bookings"

            req = urllib.request.Request(
                url,
                data=json.dumps(firestore_doc).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )

            with urllib.request.urlopen(req) as res:
                res.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'status': 'success', 'message': 'Booking recorded in Firestore successfully.'}
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_msg = e.read().decode('utf-8')
            response = {'status': 'error', 'message': f"Firestore error: {error_msg}"}
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'status': 'error', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode('utf-8'))
