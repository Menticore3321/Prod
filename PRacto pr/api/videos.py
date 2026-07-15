from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
import urllib.parse

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

        # Parse query string for ?type=cinematic or ?type=shorts
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        video_type = params.get('type', [None])[0]

        try:
            base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
            url = f"{base_url}/videos"
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
                v_type = fields.get('type', {}).get('stringValue', '')

                # Filter by type if specified
                if video_type and v_type != video_type:
                    continue

                results.append({
                    'id': doc_id,
                    'type': v_type,
                    'youtube_id': fields.get('youtube_id', {}).get('stringValue', ''),
                    'genre': fields.get('genre', {}).get('stringValue', ''),
                    'title': fields.get('title', {}).get('stringValue', ''),
                    'description': fields.get('description', {}).get('stringValue', ''),
                    'views': fields.get('views', {}).get('stringValue', ''),
                    'retention': fields.get('retention', {}).get('stringValue', ''),
                    'tags': fields.get('tags', {}).get('stringValue', ''),
                    'order': int(fields.get('order', {}).get('integerValue', 99)),
                    'created_at': fields.get('created_at', {}).get('stringValue', ''),
                })

            # Sort by order ascending
            results.sort(key=lambda x: x.get('order', 99))
            self._respond(200, results)

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
