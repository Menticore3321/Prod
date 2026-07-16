from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import re
import html as html_lib

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode('utf-8'))

    def do_GET(self):
        auth_header = self.headers.get('Authorization')
        if auth_header != 'Basic RGVlcGFrOjMzMjE=':
            self._respond(401, {'status': 'error', 'message': 'Unauthorized access.'})
            return

        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        youtube_id = params.get('id', [None])[0]

        if not youtube_id:
            self._respond(400, {'status': 'error', 'message': 'youtube_id query parameter is required.'})
            return

        # Fetch from YouTube watch page
        url = f"https://www.youtube.com/watch?v={youtube_id}"
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8')
                
                # Title parsing
                title = None
                title_match = re.search(r'<meta property="og:title" content="([^"]+)">', html)
                if title_match:
                    title = title_match.group(1)
                else:
                    title_match2 = re.search(r'<title>([^<]+)</title>', html)
                    if title_match2:
                        title = title_match2.group(1).replace(" - YouTube", "")
                
                # Description parsing
                desc = None
                desc_match = re.search(r'<meta property="og:description" content="([^"]*)">', html)
                if desc_match:
                    desc = desc_match.group(1)
                else:
                    desc_match2 = re.search(r'<meta name="description" content="([^"]*)">', html)
                    if desc_match2:
                        desc = desc_match2.group(1)
                
                if title: title = html_lib.unescape(title)
                if desc: desc = html_lib.unescape(desc)
                
                self._respond(200, {
                    'status': 'success',
                    'title': title or '',
                    'description': desc or ''
                })
        except Exception as e:
            self._respond(500, {'status': 'error', 'message': f"Failed to fetch from YouTube: {str(e)}"})
