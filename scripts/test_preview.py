"""Isolated preview proxy checks; no live backend or browser storage is used."""
import contextlib
import http.client
import importlib.util
import io
import json
from pathlib import Path
import threading
import unittest
from unittest.mock import MagicMock, patch


spec = importlib.util.spec_from_file_location('crm_preview', Path(__file__).with_name('preview.py'))
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class QuietHandler(preview.Handler):
    def log_message(self, *args):
        pass


class PreviewProxyTests(unittest.TestCase):
    def setUp(self):
        self.server = preview.ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
        self.server.backend_origin = preview.BACKEND_ORIGIN
        self.thread = threading.Thread(target=lambda: self.server.serve_forever(poll_interval=0.01), daemon=True)
        self.thread.start()
        self.upstream = MagicMock()
        self.response = MagicMock()
        self.upstream.getresponse.return_value = self.response
        self.respond()
        self.factory_patch = patch.object(preview, 'HTTPConnection', return_value=self.upstream)
        self.factory = self.factory_patch.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.factory_patch.stop()

    def respond(self, status=200, body=b'{"data":[]}', headers=None):
        headers = headers or [('Content-Type', 'application/json')]
        self.response.status = status
        self.response.read.return_value = body
        self.response.getheaders.return_value = headers
        self.response.getheader.side_effect = lambda key: next((v for k, v in headers if k.lower() == key.lower()), None)

    def request(self, path='/api/v1/creators', method='GET', headers=None, body=None, host='127.0.0.1:8897'):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        try:
            connection.putrequest(method, path, skip_host=True, skip_accept_encoding=True)
            if host is not None:
                connection.putheader('Host', host)
            for name, value in (headers or []):
                connection.putheader(name, value)
            connection.endheaders(body)
            response = connection.getresponse()
            return response.status, response.getheaders(), response.read()
        finally:
            connection.close()

    def error_code(self, result):
        return json.loads(result[2])['error']['code']

    def test_default_is_disabled_and_metadata_keeps_authoritative_source(self):
        self.assertIsNone(preview.parse_args([]).backend)
        self.server.backend_origin = None
        result = self.request()
        self.assertEqual(result[0], 503)
        self.assertEqual(self.error_code(result), 'BACKEND_DISABLED')
        self.factory.assert_not_called()
        status, _, body = self.request('/__preview__')
        info = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(info['source'], str(preview.ROOT))
        self.assertEqual(info['storageKey'], 'solbridge-video-v06-preview-only')
        self.assertEqual(info['url'], 'http://127.0.0.1:8897')
        self.assertEqual(info['backend'], {'enabled': False, 'origin': None, 'apiBase': None})

    def test_only_explicit_fixed_backend_is_allowed(self):
        self.assertEqual(preview.parse_args(['--backend', preview.BACKEND_ORIGIN]).backend, preview.BACKEND_ORIGIN)
        for invalid in ('http://localhost:4104', 'https://example.com', 'http://127.0.0.1:4103',
                        'http://127.0.0.1:4104/other', 'http://user@127.0.0.1:4104'):
            with self.subTest(invalid=invalid), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                preview.parse_args(['--backend', invalid])
        status, _, body = self.request('/__preview__')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)['backend'], {'enabled': True, 'origin': preview.BACKEND_ORIGIN, 'apiBase': '/api/'})

    def test_reads_forward_cookie_and_preserve_query_without_adding_origin(self):
        result = self.request('/api/v1/creators?name=test%20creator', headers=[('Cookie', 'crm_frontend_dev=session')])
        self.assertEqual(result[0], 200)
        self.factory.assert_called_once_with('127.0.0.1', 4104, timeout=preview.PROXY_TIMEOUT)
        args, kwargs = self.upstream.request.call_args
        self.assertEqual(args, ('GET', '/api/v1/creators?name=test%20creator'))
        self.assertEqual(kwargs['headers']['Host'], '127.0.0.1:4104')
        self.assertEqual(kwargs['headers']['Cookie'], 'crm_frontend_dev=session')
        self.assertNotIn('Origin', kwargs['headers'])
        self.upstream.close.assert_called_once()

    def test_writes_validate_then_rewrite_origin_and_preserve_auth_contract(self):
        body = b'{"employeeId":"mock-ops-a"}'
        self.respond(201, b'{"data":{"id":"test"}}', [
            ('Content-Type', 'application/json'), ('Set-Cookie', 'first=one; Path=/; HttpOnly; SameSite=Lax'),
            ('Set-Cookie', 'second=two; Path=/'), ('Access-Control-Allow-Origin', '*'),
            ('Connection', 'keep-alive, X-Internal'), ('X-Internal', 'hidden')])
        result = self.request('/api/dev/login', 'POST', [
            ('Origin', preview.PREVIEW_ORIGIN), ('Content-Length', str(len(body))),
            ('Cookie', 'crm_frontend_dev=session'), ('X-CSRF-Token', 'csrf'),
            ('Idempotency-Key', 'operation'), ('If-Match', '"1"'),
            ('X-Development-Sign-In', '1'), ('Content-Type', 'application/json'),
            ('Forwarded', 'host=evil.test'), ('X-Forwarded-Host', 'evil.test'),
            ('Connection', 'X-Untrusted'), ('X-Untrusted', 'hidden')], body)
        self.assertEqual(result[0], 201)
        headers = self.upstream.request.call_args.kwargs['headers']
        self.assertEqual(headers['Host'], preview.BACKEND_HOST)
        self.assertEqual(headers['Origin'], preview.BACKEND_ORIGIN)
        for key, expected in [('Cookie', 'crm_frontend_dev=session'), ('X-CSRF-Token', 'csrf'),
                              ('Idempotency-Key', 'operation'), ('If-Match', '"1"'), ('X-Development-Sign-In', '1')]:
            self.assertEqual(headers[key], expected)
        self.assertFalse({'forwarded', 'x-forwarded-host', 'connection', 'x-untrusted'} & {key.lower() for key in headers})
        self.assertEqual(self.upstream.request.call_args.kwargs['body'], body)
        self.assertEqual([v for k, v in result[1] if k.lower() == 'set-cookie'],
                         ['first=one; Path=/; HttpOnly; SameSite=Lax', 'second=two; Path=/'])
        self.assertNotIn('access-control-allow-origin', dict((k.lower(), v) for k, v in result[1]))
        self.assertNotIn('x-internal', dict((k.lower(), v) for k, v in result[1]))

    def test_missing_null_cross_site_and_duplicate_origins_never_forward(self):
        cases = [[], [('Origin', 'null')], [('Origin', 'https://evil.test')],
                 [('Origin', 'http://localhost:8897')],
                 [('Origin', preview.PREVIEW_ORIGIN), ('Origin', preview.PREVIEW_ORIGIN)]]
        for origins in cases:
            with self.subTest(origins=origins):
                result = self.request(method='POST', headers=origins)
                self.assertEqual(result[0], 403)
                self.assertEqual(self.error_code(result), 'ORIGIN_DENIED')
        self.factory.assert_not_called()
        self.assertEqual(self.request(headers=[('Origin', 'https://evil.test')])[0], 403)
        self.factory.assert_not_called()

    def test_missing_foreign_and_duplicate_host_never_forward(self):
        for host in (None, 'localhost:8897', '127.0.0.1:4104', 'evil.test:8897'):
            with self.subTest(host=host):
                result = self.request(host=host)
                self.assertEqual(result[0], 403)
                self.assertEqual(self.error_code(result), 'HOST_DENIED')
        self.assertEqual(self.request(headers=[('Host', '127.0.0.1:8897')])[0], 403)
        self.factory.assert_not_called()

    def test_only_two_integration_clients_are_proxied(self):
        for path in sorted(preview.INTEGRATION_FILES):
            self.assertEqual(self.request(path)[0], 200)
        self.assertEqual(self.factory.call_count, 2)
        self.factory.reset_mock()
        for path in ('/integration/', '/integration/secret.txt', '/integration/preview.html', '/api'):
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)
        result = self.request('/integration/crm-api.mjs', 'POST', [('Origin', preview.PREVIEW_ORIGIN)])
        self.assertEqual(result[0], 405)
        self.factory.assert_not_called()

    def test_invalid_paths_cannot_escape_the_allowlist(self):
        for path in ('http://evil.test/api/v1/creators', 'http://[/api/', '/api/../preview/', '/api/%2e%2e/preview/',
                     '/api/%5cpreview', '/api/%00invalid', '/api/v1/creators#fragment'):
            with self.subTest(path=path):
                result = self.request(path)
                self.assertEqual(result[0], 400)
                self.assertEqual(self.error_code(result), 'INVALID_PATH')
        self.factory.assert_not_called()

    def test_bad_framing_and_oversized_bodies_never_forward(self):
        for headers in ([('Transfer-Encoding', 'chunked')], [('Content-Length', '-1')],
                        [('Content-Length', '0'), ('Content-Length', '0')]):
            with self.subTest(headers=headers):
                result = self.request(method='POST', headers=[('Origin', preview.PREVIEW_ORIGIN), *headers])
                self.assertEqual(result[0], 400)
        oversized = self.request(method='POST', headers=[('Origin', preview.PREVIEW_ORIGIN),
                                                       ('Content-Length', str(preview.MAX_BODY_BYTES + 1))])
        self.assertEqual(oversized[0], 413)
        self.assertEqual(self.request(headers=[('Content-Length', '1')], body=b'x')[0], 400)
        self.factory.assert_not_called()

    def test_error_status_and_clear_network_failure_are_preserved(self):
        self.respond(403, b'{"error":{"code":"CSRF_INVALID","message":"retry"}}')
        result = self.request()
        self.assertEqual(result[0], 403)
        self.assertEqual(self.error_code(result), 'CSRF_INVALID')
        self.upstream.request.side_effect = ConnectionRefusedError()
        result = self.request()
        self.assertEqual(result[0], 502)
        self.assertEqual(self.error_code(result), 'BACKEND_UNAVAILABLE')

    def test_head_and_no_content_responses_have_correct_framing(self):
        self.respond(200, b'', [('Content-Type', 'text/javascript'), ('Content-Length', '123')])
        status, headers, body = self.request('/integration/crm-api.mjs', 'HEAD')
        self.assertEqual((status, body), (200, b''))
        self.assertEqual(dict(headers)['Content-Length'], '123')
        self.respond(204, b'')
        status, headers, body = self.request('/api/auth/logout', 'POST', [('Origin', preview.PREVIEW_ORIGIN)])
        self.assertEqual((status, body), (204, b''))
        self.assertNotIn('Content-Length', dict(headers))

    def test_static_preview_remains_local_and_does_not_accept_writes(self):
        status, _, body = self.request('/index.html')
        self.assertEqual(status, 200)
        self.assertIn(b'crm-preview', body)
        self.assertEqual(self.request('/index.html', 'POST', [('Origin', preview.PREVIEW_ORIGIN)])[0], 405)
        self.assertEqual(self.request(method='OPTIONS', headers=[('Origin', preview.PREVIEW_ORIGIN)])[0], 405)
        self.factory.assert_not_called()


if __name__ == '__main__':
    unittest.main()
