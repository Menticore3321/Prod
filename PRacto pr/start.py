import http.server
import socketserver
import webbrowser
import threading
import sys
import os
import re
import sqlite3
import json

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
# Database is created in the same folder as the server code files
DB_PATH = os.path.join(DIRECTORY, 'bookings.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            format TEXT NOT NULL,
            vision TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

class RangeRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP request handler subclassing SimpleHTTPRequestHandler 
    to support HTTP Range requests (206 Partial Content). Modern browsers 
    (Chrome, Safari) require this to load, seek, and play media files.
    """
    def send_head(self):
        # Security Block: Reject requests for sensitive project files
        path_lower = self.path.lower().split('?')[0]
        if any(path_lower.endswith(ext) for ext in ['.db', '.py', '.md', '.log', '.git']) or '/.git/' in path_lower:
            self.send_error(403, "Forbidden: Access to this resource is restricted.")
            return None

        path = self.translate_path(self.path)
        f = None
        if os.path.isdir(path):
            return super().send_head()
        
        ctype = self.guess_type(path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        range_header = self.headers.get('Range')
        if not range_header:
            return super().send_head()

        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not match:
            self.send_error(400, "Bad Request")
            f.close()
            return None

        start = int(match.group(1))
        end_str = match.group(2)
        
        fs = os.fstat(f.fileno())
        file_size = fs[6]

        if end_str:
            end = int(end_str)
        else:
            end = file_size - 1

        if start >= file_size or end >= file_size or start > end:
            self.send_error(416, "Requested Range Not Satisfiable")
            self.send_header('Content-Range', f'bytes */{file_size}')
            self.end_headers()
            f.close()
            return None

        self.send_response(206)
        self.send_header('Content-Type', ctype)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Last-Modified', self.date_time_string(fs.st_mtime))
        self.end_headers()
        
        f.seek(start)
        return f

    def copyfile(self, source, outputfile):
        range_header = self.headers.get('Range')
        if not range_header:
            super().copyfile(source, outputfile)
            return

        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not match:
            super().copyfile(source, outputfile)
            return

        start = int(match.group(1))
        end_str = match.group(2)
        
        source.seek(0, 2)
        file_size = source.tell()
        source.seek(start)

        if end_str:
            end = int(end_str)
        else:
            end = file_size - 1

        length = end - start + 1
        buffer_size = 64 * 1024
        while length > 0:
            chunk = source.read(min(length, buffer_size))
            if not chunk:
                break
            outputfile.write(chunk)
            length -= len(chunk)

    def do_GET(self):
        # Clean path to check endpoints
        path_clean = self.path.split('?')[0].rstrip('/')
        if path_clean == '/api/bookings':
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, email, format, vision, timestamp FROM bookings ORDER BY id DESC")
                rows = cursor.fetchall()
                conn.close()
                
                # Convert rows to list of dicts
                bookings_list = []
                for row in rows:
                    bookings_list.append({
                        'id': row[0],
                        'name': row[1],
                        'email': row[2],
                        'format': row[3],
                        'vision': row[4],
                        'timestamp': row[5]
                    })
                
                # Send JSON headers and content
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(bookings_list).encode('utf-8'))
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        path_clean = self.path.split('?')[0].rstrip('/')
        if path_clean == '/api/booking':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                name = data.get('name', '').strip()
                email = data.get('email', '').strip()
                project_format = data.get('format', '').strip()
                vision = data.get('vision', '').strip()
                
                if not name or not email or not project_format:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response = {'status': 'error', 'message': 'Missing required fields'}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    return
                
                # Save to database using parameterized query (prevents SQL injection)
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO bookings (name, email, format, vision) VALUES (?, ?, ?, ?)",
                    (name, email, project_format, vision)
                )
                conn.commit()
                conn.close()
                
                # Send JSON success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'status': 'success', 'message': 'Booking recorded successfully.'}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_error(404, "Not Found")

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), RangeRequestHandler) as httpd:
        print(f"Serving HTTP on port {PORT} (http://localhost:{PORT}/) with Range Request support...")
        print("Press Ctrl+C to stop the server.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.shutdown()
            sys.exit(0)

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    init_db()
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    start_server()
