#!/usr/bin/env python3
"""Serve the authoritative CRM checkout at its fixed browser origin."""
import argparse
import errno
import hashlib
from http.client import HTTPConnection, HTTPException
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
HOST, PORT = '127.0.0.1', 8897
KEY = 'solbridge-video-v06-preview-only'
PREVIEW_ORIGIN = f'http://{HOST}:{PORT}'
BACKEND_ORIGIN = 'http://127.0.0.1:4104'
BACKEND_HOST = '127.0.0.1:4104'
INTEGRATION_FILES = frozenset(('/integration/crm-api.mjs',
                               '/integration/original-form-adapter.mjs'))
MAX_BODY_BYTES = 1024 * 1024
PROXY_TIMEOUT = 15
HOP_HEADERS = frozenset(('connection', 'keep-alive', 'proxy-authenticate',
                         'proxy-authorization', 'te', 'trailer',
                         'transfer-encoding', 'upgrade'))


def build_info(backend=None):
    digest = hashlib.sha256()
    for name in ('index.html', 'app.mjs', 'model.mjs', 'preview-bootstrap.mjs',
                 'preview-entry.mjs', 'creator-backend.mjs',
                 'design-system/creator-backend.css', 'design-system/drawer.css'):
        path = ROOT / name
        if path.exists():
            digest.update(path.read_bytes())
    return {'source': str(ROOT), 'version': digest.hexdigest()[:12], 'storageKey': KEY,
            'url': PREVIEW_ORIGIN, 'workflow': 'unified-main',
            'backend': {'enabled': backend is not None, 'origin': backend,
                        'apiBase': '/api/' if backend else None}}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def json_response(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.close_connection = True
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def proxy_error(self, status, code, message):
        self.json_response(status, {'error': {'code': code, 'message': message}})

    def route(self):
        # Only origin-form paths can reach the fixed upstream. Decode solely for
        # validation; preserve the original encoded path and query when forwarding.
        try:
            parsed = urlsplit(self.path)
        except ValueError:
            self.proxy_error(400, 'INVALID_PATH', '仅支持本站的有效请求路径。')
            return
        decoded = unquote(parsed.path)
        if (parsed.scheme or parsed.netloc or parsed.fragment or
                not self.path.startswith('/') or self.path.startswith('//') or
                '\\' in decoded or '..' in decoded.split('/') or
                any(ord(char) < 32 or ord(char) == 127 for char in decoded)):
            self.proxy_error(400, 'INVALID_PATH', '仅支持本站的有效请求路径。')
            return
        if decoded == '/api' or decoded.startswith('/api/') or decoded == '/integration' or decoded.startswith('/integration/'):
            if not (parsed.path.startswith('/api/') or parsed.path in INTEGRATION_FILES):
                self.proxy_error(404, 'NOT_FOUND', '未开放此联调资源。')
                return
            self.proxy(parsed.path)
        elif self.command not in ('GET', 'HEAD'):
            self.proxy_error(405, 'METHOD_NOT_ALLOWED', '该路径不接受写入请求。')
        elif parsed.path == '/__preview__':
            self.json_response(200, build_info(getattr(self.server, 'backend_origin', None)))
        elif self.command == 'HEAD':
            super().do_HEAD()
        else:
            super().do_GET()

    def proxy(self, path):
        # Never turn cross-site requests into trusted backend requests merely by
        # rewriting Origin. Check the browser-facing authority first, including
        # duplicate headers, then rewrite only a validated request.
        if self.headers.get_all('Host', []) != [f'{HOST}:{PORT}']:
            self.proxy_error(403, 'HOST_DENIED', '联调接口仅允许 127.0.0.1:8897。')
            return
        origins = self.headers.get_all('Origin', [])
        writing = self.command not in ('GET', 'HEAD')
        if (writing and origins != [PREVIEW_ORIGIN]) or (origins and origins != [PREVIEW_ORIGIN]):
            self.proxy_error(403, 'ORIGIN_DENIED', '仅允许从当前 CRM 页面发起同源请求。')
            return
        if self.command not in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE') or (path in INTEGRATION_FILES and writing):
            self.proxy_error(405, 'METHOD_NOT_ALLOWED', '此联调资源不接受该请求方法。')
            return
        if getattr(self.server, 'backend_origin', None) != BACKEND_ORIGIN:
            self.proxy_error(503, 'BACKEND_DISABLED', '后端连接未启用，请使用 --backend http://127.0.0.1:4104 启动预览。')
            return
        lengths = self.headers.get_all('Content-Length', [])
        if self.headers.get_all('Transfer-Encoding') or len(lengths) > 1 or (lengths and not lengths[0].isdigit()):
            self.proxy_error(400, 'INVALID_BODY', '请求正文长度无效。')
            return
        length = int(lengths[0]) if lengths else 0
        if length > MAX_BODY_BYTES:
            self.proxy_error(413, 'BODY_TOO_LARGE', '请求正文超过 1 MiB。')
            return
        if not writing and length:
            self.proxy_error(400, 'INVALID_BODY', '读取请求不能携带正文。')
            return
        connection = None
        try:
            self.connection.settimeout(PROXY_TIMEOUT)
            body = self.rfile.read(length) if length else None
            if body is not None and len(body) != length:
                self.proxy_error(400, 'INVALID_BODY', '请求正文不完整。')
                return
            connection_tokens = {part.strip().lower() for value in self.headers.get_all('Connection', []) for part in value.split(',')}
            blocked = HOP_HEADERS | connection_tokens | {'host', 'origin', 'content-length', 'expect', 'forwarded'}
            headers = {key: value for key, value in self.headers.items()
                       if key.lower() not in blocked and not key.lower().startswith('x-forwarded-')}
            headers['Host'] = BACKEND_HOST
            if origins:
                headers['Origin'] = BACKEND_ORIGIN
            if writing:
                headers['Content-Length'] = str(length)
            connection = HTTPConnection('127.0.0.1', 4104, timeout=PROXY_TIMEOUT)
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            response_body = response.read()
            self.send_response(response.status)
            response_headers = response.getheaders()
            response_connection_tokens = {part.strip().lower() for key, value in response_headers
                                          if key.lower() == 'connection' for part in value.split(',')}
            blocked_response = HOP_HEADERS | response_connection_tokens | {'content-length', 'cache-control', 'server', 'date'}
            for key, value in response_headers:
                if key.lower() not in blocked_response and not key.lower().startswith('access-control-'):
                    # Keep separate Set-Cookie headers, plus auth/error metadata.
                    self.send_header(key, value)
            if response.status not in (204, 304):
                response_length = response.getheader('Content-Length') if self.command == 'HEAD' else str(len(response_body))
                if response_length is not None:
                    self.send_header('Content-Length', response_length)
            self.send_header('Connection', 'close')
            self.close_connection = True
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(response_body)
        except (OSError, HTTPException):
            self.proxy_error(502, 'BACKEND_UNAVAILABLE', '无法连接联调后端；请确认 127.0.0.1:4104 已启动，保留输入后重试。')
        finally:
            if connection is not None:
                connection.close()

    do_GET = route
    do_HEAD = route
    do_POST = route
    do_PUT = route
    do_PATCH = route
    do_DELETE = route
    do_OPTIONS = route


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend', choices=(BACKEND_ORIGIN,), default=None,
                        help='可选：启用固定本机后端的同源 API 代理；默认关闭')
    return parser.parse_args(argv)


if __name__ == '__main__':
    args = parse_args()
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as error:
        if error.errno == errno.EADDRINUSE:
            raise SystemExit(f'8897 已被占用，未另开端口。请先核对 http://{HOST}:{PORT}/__preview__ 的来源。\n{error}')
        raise SystemExit(f'无法启动本地预览，请检查监听权限。\n{error}')
    server.backend_origin = args.backend
    print(json.dumps(build_info(args.backend), ensure_ascii=False), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
