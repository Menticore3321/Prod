from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

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

            video_id = data.get('id', '').strip()
            video_type = data.get('type', '').strip()
            youtube_id = data.get('youtube_id', '').strip()
            title = data.get('title', '').strip()

            if not video_id or not video_type or not youtube_id or not title:
                self._respond(400, {'status': 'error', 'message': 'id, type, youtube_id, and title are required.'})
                return

            firestore_doc = {
                "fields": {
                    "type": {"stringValue": video_type},
                    "youtube_id": {"stringValue": youtube_id},
                    "genre": {"stringValue": data.get('genre', '').strip()},
                    "title": {"stringValue": title},
                    "description": {"stringValue": data.get('description', '').strip()},
                    "views": {"stringValue": data.get('views', '').strip()},
                    "retention": {"stringValue": data.get('retention', '').strip()},
                    "tags": {"stringValue": data.get('tags', '').strip()},
                    "order": {"integerValue": int(data.get('order', 99))},
                }
            }

            # Construct update mask for all video fields except created_at
            mask_fields = ["type", "youtube_id", "genre", "title", "description", "views", "retention", "tags", "order"]
            mask_params = "&".join([f"updateMask.fieldPaths={f}" for f in mask_fields])

            base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
            url = f"{base_url}/videos/{video_id}?{mask_params}"

            req = urllib.request.Request(
                url,
                data=json.dumps(firestore_doc).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='PATCH'
            )
            with urllib.request.urlopen(req) as res:
                res.read()

            self._respond(200, {'status': 'success', 'message': 'Video updated successfully.'})

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
