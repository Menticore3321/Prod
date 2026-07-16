from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

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
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode('utf-8'))

    def do_GET(self):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

        try:
            base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
            url = f"{base_url}/reviews"
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

            for doc in documents:
                fields = doc.get('fields', {})
                doc_id = doc.get('name', '').split('/')[-1]
                results.append({
                    'id': doc_id,
                    'text': fields.get('text', {}).get('stringValue', ''),
                    'author_name': fields.get('author_name', {}).get('stringValue', ''),
                    'author_details': fields.get('author_details', {}).get('stringValue', ''),
                    'order': int(fields.get('order', {}).get('integerValue')) if fields.get('order', {}).get('integerValue') is not None and str(fields.get('order', {}).get('integerValue')).strip().isdigit() else (int(fields.get('order', {}).get('stringValue')) if fields.get('order', {}).get('stringValue') is not None and str(fields.get('order', {}).get('stringValue')).strip().isdigit() else 99),
                    'created_at': fields.get('created_at', {}).get('stringValue', ''),
                })

            results.sort(key=lambda x: x.get('order', 99))
            self._respond(200, results)

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
