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
            if not video_id:
                self._respond(400, {'status': 'error', 'message': 'Missing video id.'})
                return

            base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
            del_req = urllib.request.Request(
                f"{base_url}/videos/{video_id}",
                method='DELETE'
            )
            with urllib.request.urlopen(del_req) as res:
                res.read()

            self._respond(200, {'status': 'success', 'message': 'Video deleted successfully.'})

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
