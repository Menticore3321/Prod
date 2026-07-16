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

            # Expecting list of {id: video_id, order: integer}
            updates = data.get('updates', [])
            if not isinstance(updates, list):
                self._respond(400, {'status': 'error', 'message': 'updates list is required.'})
                return

            writes = []
            for item in updates:
                video_id = item.get('id')
                order = item.get('order')
                if video_id is not None and order is not None:
                    writes.append({
                        "update": {
                            "name": f"projects/{project_id}/databases/(default)/documents/videos/{video_id}",
                            "fields": {
                                "order": {"integerValue": int(order)}
                            }
                        },
                        "updateMask": {
                            "fieldPaths": ["order"]
                        }
                    })

            if not writes:
                self._respond(200, {'status': 'success', 'message': 'No updates to perform.'})
                return

            commit_body = {
                "writes": writes
            }

            url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:commit"
            req = urllib.request.Request(
                url,
                data=json.dumps(commit_body).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req) as res:
                res.read()

            self._respond(200, {'status': 'success', 'message': 'Order updated successfully.'})

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})
