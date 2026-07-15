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
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode('utf-8'))

    def do_POST(self):
        auth_header = self.headers.get('Authorization')
        if auth_header != 'Basic RGVlcGFrOjMzMjE=':
            self._respond(401, {'status': 'error', 'message': 'Unauthorized access.'})
            return

        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            text = data.get('text', '').strip()
            author_name = data.get('author_name', '').strip()

            if not text or not author_name:
                self._respond(400, {'status': 'error', 'message': 'text and author_name are required.'})
                return

            created_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

            firestore_doc = {
                "fields": {
                    "text": {"stringValue": text},
                    "author_name": {"stringValue": author_name},
                    "author_details": {"stringValue": data.get('author_details', '').strip()},
                    "order": {"integerValue": int(data.get('order', 99))},
                    "created_at": {"stringValue": created_at},
                }
            }

            base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
            url = f"{base_url}/reviews"
            req = urllib.request.Request(
                url,
                data=json.dumps(firestore_doc).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req) as res:
                res_body = json.loads(res.read().decode('utf-8'))
                new_id = res_body.get('name', '').split('/')[-1]

            self._respond(200, {'status': 'success', 'message': 'Review added successfully.', 'id': new_id})

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
