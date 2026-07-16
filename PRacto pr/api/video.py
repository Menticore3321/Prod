from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
import urllib.parse
import re
import html as html_lib
from datetime import datetime

def safe_int(val, default=99):
    if val is None:
        return default
    try:
        return int(str(val).strip())
    except (ValueError, TypeError):
        return default

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode('utf-8'))

    def _check_auth(self):
        auth_header = self.headers.get('Authorization')
        if auth_header != 'Basic RGVlcGFrOjMzMjE=':
            self._respond(401, {'status': 'error', 'message': 'Unauthorized access.'})
            return False
        return True

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        params = urllib.parse.parse_qs(parsed.query)
        action = params.get('action', [None])[0]

        # ── Route: /api/youtube_info ───────────────────────────
        if action == 'youtube_info' or path == '/api/youtube_info':
            if not self._check_auth():
                return
            youtube_id = params.get('id', [None])[0]
            if not youtube_id:
                self._respond(400, {'status': 'error', 'message': 'youtube_id query parameter is required.'})
                return
            self._handle_youtube_info(youtube_id)
            return

        # ── Route: /api/videos ─────────────────────────────────
        elif action == 'list' or path == '/api/videos':
            video_type = params.get('type', [None])[0]
            self._handle_list_videos(video_type)
            return

        else:
            self._respond(404, {'status': 'error', 'message': 'Not Found'})

    def do_POST(self):
        if not self._check_auth():
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        params = urllib.parse.parse_qs(parsed.query)
        action = params.get('action', [None])[0]

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception as e:
            self._respond(400, {'status': 'error', 'message': 'Invalid JSON: ' + str(e)})
            return

        # ── Route: /api/add_video ──────────────────────────────
        if action == 'add' or path == '/api/add_video':
            self._handle_add_video(data)

        # ── Route: /api/delete_video ───────────────────────────
        elif action == 'delete' or path == '/api/delete_video':
            self._handle_delete_video(data)

        # ── Route: /api/update_video ───────────────────────────
        elif action == 'update' or path == '/api/update_video':
            self._handle_update_video(data)

        # ── Route: /api/update_order ───────────────────────────
        elif action == 'update_order' or path == '/api/update_order':
            self._handle_update_order(data)

        else:
            self._respond(404, {'status': 'error', 'message': 'Not Found'})

    # ── Operations Handlers ─────────────────────────────────────────

    def _handle_list_videos(self, video_type):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

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
                    'order': safe_int(fields.get('order', {}).get('integerValue') or fields.get('order', {}).get('stringValue'), 99),
                    'created_at': fields.get('created_at', {}).get('stringValue', ''),
                })

            results.sort(key=lambda x: x.get('order', 99))
            self._respond(200, results)

        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})

    def _handle_youtube_info(self, youtube_id):
        title = ""
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={youtube_id}&format=json"
        try:
            req_oe = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_oe, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                title = data.get('title', '')
        except Exception:
            pass

        desc = ""
        watch_url = f"https://www.youtube.com/watch?v={youtube_id}"
        try:
            req_w = urllib.request.Request(
                watch_url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req_w, timeout=5) as response:
                html = response.read().decode('utf-8')
                if not title:
                    title_match = re.search(r'<meta property="og:title" content="([^"]+)">', html)
                    if title_match:
                        title = title_match.group(1)
                desc_match = re.search(r'<meta property="og:description" content="([^"]*)">', html)
                if desc_match:
                    desc = desc_match.group(1)
                    if "Enjoy the videos and music you love" in desc:
                        desc = ""
        except Exception:
            pass

        if title: title = html_lib.unescape(title)
        if desc: desc = html_lib.unescape(desc)

        self._respond(200, {
            'status': 'success',
            'title': title,
            'description': desc
        })

    def _handle_add_video(self, data):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

        video_type = data.get('type', '').strip()
        youtube_id = data.get('youtube_id', '').strip()
        title = data.get('title', '').strip()

        if not video_type or not youtube_id or not title:
            self._respond(400, {'status': 'error', 'message': 'type, youtube_id, and title are required.'})
            return

        created_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

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
                "order": {"integerValue": str(safe_int(data.get('order'), 99))},
                "created_at": {"stringValue": created_at},
            }
        }

        try:
            base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
            url = f"{base_url}/videos"
            req = urllib.request.Request(
                url,
                data=json.dumps(firestore_doc).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req) as res:
                res_body = json.loads(res.read().decode('utf-8'))
                new_id = res_body.get('name', '').split('/')[-1]

            self._respond(200, {'status': 'success', 'message': 'Video added successfully.', 'id': new_id})
        except urllib.error.HTTPError as e:
            self._respond(e.code, {'status': 'error', 'message': e.read().decode('utf-8')})
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': str(e)})

    def _handle_delete_video(self, data):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

        video_id = data.get('id', '').strip()
        if not video_id:
            self._respond(400, {'status': 'error', 'message': 'Missing video id.'})
            return

        try:
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

    def _handle_update_video(self, data):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

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
                "order": {"integerValue": str(safe_int(data.get('order'), 99))},
            }
        }

        try:
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

    def _handle_update_order(self, data):
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            self._respond(500, {'status': 'error', 'message': 'FIREBASE_PROJECT_ID not configured.'})
            return

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
                            "order": {"integerValue": str(safe_int(order, 99))}
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

        try:
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
