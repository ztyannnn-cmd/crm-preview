#!/usr/bin/env python3
"""Serve the authoritative CRM checkout at its fixed browser origin."""
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST, PORT = '127.0.0.1', 8897
KEY = 'solbridge-video-v06-preview-only'


def build_info():
    digest = hashlib.sha256()
    for name in ('index.html', 'app.mjs', 'model.mjs', 'preview-bootstrap.mjs', 'design-system/drawer.css'):
        digest.update((ROOT / name).read_bytes())
    return {'source': str(ROOT), 'version': digest.hexdigest()[:12], 'storageKey': KEY,
            'url': f'http://{HOST}:{PORT}', 'workflow': 'unified-main'}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/__preview__':
            body = json.dumps(build_info(), ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


if __name__ == '__main__':
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as error:
        raise SystemExit(f'8897 已被占用，未另开端口。请先核对 http://{HOST}:{PORT}/__preview__ 的来源。\n{error}')
    print(json.dumps(build_info(), ensure_ascii=False), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
