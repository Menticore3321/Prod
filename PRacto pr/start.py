import http.server
import socketserver
import webbrowser
import threading
import sys
import os
import re

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class RangeRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP request handler subclassing SimpleHTTPRequestHandler 
    to support HTTP Range requests (206 Partial Content). Modern browsers 
    (Chrome, Safari) require this to load, seek, and play media files.
    """
    def send_head(self):
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
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    start_server()
