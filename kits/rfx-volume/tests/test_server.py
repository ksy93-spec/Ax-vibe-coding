"""서버 주소별 응답. python -m unittest discover -s tests"""
import io
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from app import server, xlsx  # noqa: E402


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app = server.App(ROOT)
        cls.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.make_handler(app))
        cls.base = "http://127.0.0.1:%d" % cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def get(self, path):
        with urllib.request.urlopen(self.base + path) as r:
            return r.status, r.headers, r.read()

    def post(self, path, body):
        req = urllib.request.Request(self.base + path, data=json.dumps(body).encode("utf-8"),
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            return r.status, r.headers, r.read()

    def test_index_and_static(self):
        code, h, body = self.get("/")
        self.assertEqual(code, 200)
        self.assertIn("text/html", h["Content-Type"])
        self.assertIn("물동".encode("utf-8"), body)

    def test_no_traversal(self):
        for p in ("/../config/settings.ini", "/..%2fconfig/settings.ini", "/web/../../main.py"):
            with self.assertRaises(urllib.error.HTTPError) as cm:
                self.get(p)
            self.assertEqual(cm.exception.code, 404)

    def test_meta(self):
        meta = json.loads(self.get("/api/meta")[2])
        self.assertIn("Audi", meta["brands"])
        self.assertEqual(meta["years"][0], 2027)

    def test_flow(self):
        q = urllib.parse.quote("아우디")
        cands = json.loads(self.get("/api/customers?q=" + q)[2])["candidates"]
        self.assertEqual(cands[0]["name"], "Audi")
        vehicles = json.loads(self.get("/api/vehicles?type=brand&name=Audi")[2])["vehicles"]
        a5 = [v for v in vehicles if v["nameplate"] == "A5" and v["sop_year"] == 2024][0]
        body = {"customer": {"type": "brand", "name": "Audi"}, "vehicles": [{"id": a5["id"]}],
                "option": 30, "dual": True, "share": 50, "ppv": 1,
                "customer_qty": {"2027": 30000, "2028": 30000}, "price": {"2027": 20, "2028": 19.4}}
        res = json.loads(self.post("/api/calc", body)[2])
        self.assertEqual(len(res["rows"]), 11)
        self.assertIn(res["verdict"], ("risk", "opportunity", "ok"))
        self.assertTrue(res["board"]["text"].startswith("이 PJT는"))
        code, h, blob = self.post("/api/export", body)
        self.assertIn("spreadsheetml", h["Content-Type"])
        tmp = os.path.join(ROOT, "data", ".cache", "export-test.xlsx")
        os.makedirs(os.path.dirname(tmp), exist_ok=True)
        with open(tmp, "wb") as f:
            f.write(blob)
        try:
            names = xlsx.sheet_names(tmp)
            self.assertEqual(names, ["요약", "연도별", "차종별", "지역별", "민감도"])
            rows = list(xlsx.read_rows(tmp, "연도별"))
            self.assertEqual(rows[1][0], 2027)
        finally:
            os.remove(tmp)

    def test_bad_requests(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            self.post("/api/calc", {"vehicles": ["nope"]})
        self.assertEqual(cm.exception.code, 400)
        self.assertIn("차종", json.loads(cm.exception.read())["error"])
        req = urllib.request.Request(self.base + "/api/calc", data=b"{not json")
        with self.assertRaises(urllib.error.HTTPError) as cm:
            urllib.request.urlopen(req)
        self.assertEqual(cm.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
