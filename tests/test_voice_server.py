import json
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from workers.voice_server import make_handler, parse_upload
from workers.spec import ValidationError


def upload(task='voice_cover'):
    boundary = 'musiccraft-worker-contract'
    fields = {'source': b'RIFF-source-audio', 'reference': b'RIFF-reference-audio',
              'spec': json.dumps({'task': task, 'duration': 10, 'clip_start': 2}).encode()}
    body = b''
    for name, data in fields.items():
        body += ('--' + boundary + '\r\nContent-Disposition: form-data; name="' + name + '"\r\n\r\n').encode()
        body += data + b'\r\n'
    return body + ('--' + boundary + '--\r\n').encode(), 'multipart/form-data; boundary=' + boundary


class UploadContractTest(unittest.TestCase):
    def test_task_spec_is_serialized_without_requiring_nonexistent_attributes(self):
        body, content_type = upload()
        spec, source, reference = parse_upload(body, content_type)
        self.assertEqual(spec, {'task': 'voice_cover', 'duration': 10, 'clip_start': 2, 'vocal_gain_db': 0})
        self.assertEqual(source, b'RIFF-source-audio')
        self.assertEqual(reference, b'RIFF-reference-audio')

    def test_wrong_task_is_rejected(self):
        body, content_type = upload('cover')
        with self.assertRaises(ValidationError):
            parse_upload(body, content_type)

    def test_real_http_upload_returns_202_and_passes_audio_to_service(self):
        captured = []

        class Service:
            def submit(self, spec, source, reference):
                captured.append((spec, source, reference))
                return {'id': 'a' * 32, 'status': 'queued', 'artifacts': {}}

        server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(Service(), 'fixture-key'))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        body, content_type = upload()
        request = urllib.request.Request(
            'http://127.0.0.1:' + str(server.server_port) + '/v1/jobs', data=body,
            headers={'Content-Type': content_type, 'Authorization': 'Bearer fixture-key'}, method='POST')
        with urllib.request.urlopen(request, timeout=5) as response:
            self.assertEqual(response.status, 202)
            self.assertEqual(json.load(response)['status'], 'queued')
        self.assertEqual(captured[0][0]['task'], 'voice_cover')
        self.assertEqual(captured[0][1:], (b'RIFF-source-audio', b'RIFF-reference-audio'))


if __name__ == '__main__':
    unittest.main()
