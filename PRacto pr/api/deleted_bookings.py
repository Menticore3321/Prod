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
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode('utf-8'))

    def do_GET(self):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

        try:
            base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
            url = f"{base_url}/deleted_bookings"
            req = urllib.request.Request(url, method='GET')

            try:
                with urllib.request.urlopen(req) as res:
                    raw = json.loads(res.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    self._respond(200, [])
                    return
                raise e

            documents = raw.get('documents', [])
            results = []
            now = datetime.utcnow()

            for doc in documents:
                fields = doc.get('fields', {})
                doc_id = doc.get('name', '').split('/')[-1]
                
                # Check for expiration (60 days auto-purge)
                expires_at_str = fields.get('expires_at', {}).get('stringValue', '')
                expired = False
                if expires_at_str:
                    try:
                        expires_dt = datetime.strptime(expires_at_str, '%Y-%m-%d %H:%M:%S')
                        if now >= expires_dt:
                            expired = True
                    except Exception:
                        pass
                
                if expired:
                    # Auto-purge expired record from Firestore
                    try:
                        del_req = urllib.request.Request(f"{base_url}/deleted_bookings/{doc_id}", method='DELETE')
                        with urllib.request.urlopen(del_req) as del_res:
                            del_res.read()
                    except Exception as del_err:
                        print(f"Failed to auto-purge expired document {doc_id}: {del_err}")
                    continue  # Skip returning this document as it is now purged
                
                results.append({
                    'id': doc_id,
                    'name': fields.get('name', {}).get('stringValue', ''),
                    'email': fields.get('email', {}).get('stringValue', ''),
                    'format': fields.get('format', {}).get('stringValue', ''),
                    'vision': fields.get('vision', {}).get('stringValue', ''),
                    'timestamp': fields.get('timestamp', {}).get('stringValue', ''),
                    'deleted_at': fields.get('deleted_at', {}).get('stringValue', ''),
                    'expires_at': expires_at_str,
                })

            # Sort by deleted_at descending
            results.sort(key=lambda x: x.get('deleted_at', ''), reverse=True)
            self._respond(200, results)

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
