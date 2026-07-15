from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
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
            # URL to list documents in 'bookings' collection
            url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/bookings"

            req = urllib.request.Request(url, method='GET')

            # Perform call
            with urllib.request.urlopen(req) as res:
                res_body = res.read().decode('utf-8')
                data = json.loads(res_body)
            
            documents = data.get('documents', [])
            
            bookings_list = []
            for doc in documents:
                fields = doc.get('fields', {})
                doc_name_parts = doc.get('name', '').split('/')
                doc_id = doc_name_parts[-1] if doc_name_parts else 'unknown'
                
                bookings_list.append({
                    'id': doc_id,
                    'name': fields.get('name', {}).get('stringValue', ''),
                    'email': fields.get('email', {}).get('stringValue', ''),
                    'format': fields.get('format', {}).get('stringValue', ''),
                    'vision': fields.get('vision', {}).get('stringValue', ''),
                    'timestamp': fields.get('timestamp', {}).get('stringValue', '')
                })
            
            # Sort bookings_list by timestamp descending (newest first)
            bookings_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

            # Send JSON success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(bookings_list).encode('utf-8'))

        except urllib.error.HTTPError as e:
            # Handle if the collection does not exist yet (returns 404), which is normal for a fresh database
            if e.code == 404:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps([]).encode('utf-8'))
                return

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
