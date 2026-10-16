"""로컬 웹 서버. 같은 망의 PC 가 브라우저로 http://<이 PC IP>:<port>/ 에 접속해서 씁니다.

서버는 입력값을 저장하지 않습니다. 화면에서 보낸 값으로 계산해서 돌려줄 뿐이라
여러 사람이 동시에 써도 서로 섞이지 않습니다.
"""
from __future__ import annotations

import configparser
import json
import mimetypes
import os
import socket
import sys
import threading
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

from . import calc, data, export

MAX_BODY = 2 * 1024 * 1024


def base_dir() -> str:
    """킷 폴더. exe 로 묶었을 때는 exe 가 있는 폴더입니다 (web/, config/, data/ 를 그 옆에 둠)."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Settings:
    def __init__(self, root: str):
        cp = configparser.ConfigParser(interpolation=None, inline_comment_prefixes=(";",))
        cp.read(os.path.join(root, "config", "settings.ini"), encoding="utf-8-sig")
        self.host = cp.get("server", "host", fallback="0.0.0.0").strip() or "0.0.0.0"
        self.port = cp.getint("server", "port", fallback=8765)
        self.open_browser = cp.getboolean("server", "open_browser", fallback=True)
        self.file = cp.get("data", "file", fallback="data/sample-lvp.xlsx").strip()
        self.sheet = cp.get("data", "sheet", fallback="").strip()
        self.vintage = cp.get("data", "vintage", fallback="").strip()
        self.first_year = cp.getint("review", "first_year", fallback=2027)
        self.last_year = cp.getint("review", "last_year", fallback=2037)
        self.tolerance = cp.getfloat("review", "tolerance", fallback=10.0)
        self.currency = cp.get("review", "currency", fallback="$").strip() or "$"
        self.contact = cp.get("review", "contact", fallback="").strip()

    @property
    def years(self):
        return list(range(self.first_year, self.last_year + 1))


def _gen_summary(g: dict, years) -> dict:
    total = sum(v for vols in g["regions"].values() for y, v in vols.items() if y in years)
    by_region = {reg: sum(v for y, v in vols.items() if y in years) for reg, vols in g["regions"].items()}
    return {
        "id": g["id"], "label": g["label"], "brand": g["brand"], "nameplate": g["nameplate"], "group": g["group"],
        "platforms": g["platforms"], "programs": g["programs"], "sop": g["sop"], "eop": g["eop"],
        "sop_year": g["sop_year"], "plants": g["plants"][:12], "total": total, "by_region": by_region,
        "by_year": {y: sum(vols.get(y, 0.0) for vols in g["regions"].values()) for y in years},
    }


class App:
    def __init__(self, root: str):
        self.root = root
        self.web = os.path.join(root, "web")
        self.settings = Settings(root)
        s = self.settings
        self.db = data.Database(root, s.file, s.sheet, s.vintage)

    # 각 함수는 (상태 코드, 본문 dict) 를 돌려줍니다
    def meta(self, q):
        s = self.settings
        st = self.db.current()
        return 200, {
            "file": st["file"], "vintage": st["vintage"], "loaded_at": st["loaded_at"], "rows": st["rows"],
            "generations": len(st["generations"]), "db_years": st["years"], "regions": st["regions"],
            "brands": sorted(st["brands"]), "groups": sorted(st["groups"]),
            "years": s.years, "tolerance": s.tolerance, "currency": s.currency, "contact": s.contact,
            "columns": st["columns"], "header_row": st["header_row"], "skipped": st["skipped"],
            "version": _version(self.root),
        }

    def customers(self, q):
        st = self.db.current()
        return 200, {"candidates": data.resolve_customer(st, q.get("q", [""])[0])}

    def vehicles(self, q):
        st = self.db.current()
        typ = q.get("type", ["brand"])[0]
        name = q.get("name", [""])[0]
        years = self.settings.years
        gens = data.vehicles_for(st, typ, name)
        return 200, {"vehicles": [_gen_summary(g, years) for g in gens]}

    def _calc(self, body):
        st = self.db.current()
        ids = [v.get("id") if isinstance(v, dict) else v for v in body.get("vehicles") or []]
        gens = [st["by_id"][i] for i in ids if i in st["by_id"]]
        if not gens:
            raise ValueError("선택한 차종이 없습니다. 데이터 파일이 바뀌었다면 차종을 다시 골라 주세요.")
        s = self.settings
        tol = body.get("tolerance", s.tolerance)
        try:
            tol = float(tol)
        except (TypeError, ValueError):
            tol = s.tolerance
        res = calc.compute(gens, body, s.years, tol, s.currency, s.contact)
        res["meta"] = {"file": st["file"], "vintage": st["vintage"], "currency": s.currency}
        return res, st

    def calculate(self, body):
        res, _ = self._calc(body)
        return 200, res

    def export(self, body):
        res, st = self._calc(body)
        return export.build(res, body, {"file": st["file"], "vintage": st["vintage"]})


def _version(root):
    try:
        with open(os.path.join(root, "VERSION"), encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return ""


def make_handler(app: App):
    class Handler(BaseHTTPRequestHandler):
        server_version = "rfx-volume"

        def log_message(self, fmt, *args):
            sys.stderr.write("%s - %s\n" % (self.client_address[0], fmt % args))

        def _send(self, code, body: bytes, ctype: str, extra=None):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

        def _json(self, code, obj):
            self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

        def _error(self, e: Exception):
            if isinstance(e, data.DataError):
                self._json(503, {"error": str(e), "kind": "data"})
            elif isinstance(e, ValueError):
                self._json(400, {"error": str(e)})
            else:
                traceback.print_exc()
                self._json(500, {"error": "서버 오류: %s" % e})

        def do_GET(self):
            u = urlparse(self.path)
            q = parse_qs(u.query)
            routes = {"/api/meta": app.meta, "/api/customers": app.customers, "/api/vehicles": app.vehicles}
            if u.path in routes:
                try:
                    code, obj = routes[u.path](q)
                    self._json(code, obj)
                except Exception as e:  # noqa: BLE001
                    self._error(e)
                return
            self._static(u.path)

        def do_POST(self):
            u = urlparse(self.path)
            try:
                n = int(self.headers.get("Content-Length") or 0)
                if n > MAX_BODY:
                    raise ValueError("요청이 너무 큽니다.")
                body = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
                if not isinstance(body, dict):
                    raise ValueError("요청 형식이 잘못됐습니다.")
                if u.path == "/api/calc":
                    code, obj = app.calculate(body)
                    self._json(code, obj)
                elif u.path == "/api/export":
                    blob = app.export(body)
                    name = "물동검토_%s.xlsx" % (body.get("customer", {}).get("name") or "결과")
                    self._send(200, blob, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                               {"Content-Disposition": "attachment; filename=\"rfx-volume.xlsx\"; filename*=UTF-8''%s" % quote(name)})
                else:
                    self._json(404, {"error": "없는 주소입니다."})
            except json.JSONDecodeError:
                self._json(400, {"error": "JSON 형식이 아닙니다."})
            except Exception as e:  # noqa: BLE001
                self._error(e)

        def _static(self, path):
            if path in ("", "/"):
                path = "/index.html"
            rel = os.path.normpath(path.lstrip("/")).replace("\\", "/")
            if rel.startswith("..") or os.path.isabs(rel):
                self._send(404, b"not found", "text/plain")
                return
            full = os.path.join(app.web, rel)
            if not os.path.isfile(full):
                self._send(404, b"not found", "text/plain")
                return
            ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
            if full.endswith(".js"):
                ctype = "text/javascript"
            elif full.endswith(".woff2"):
                ctype = "font/woff2"
            if ctype.startswith("text/"):
                ctype += "; charset=utf-8"
            with open(full, "rb") as f:
                self._send(200, f.read(), ctype)

    return Handler


def lan_addresses():
    out = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))  # 실제로 패킷을 보내지 않습니다. 기본 경로의 IP 만 얻습니다.
        out.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in out and not ip.startswith("127."):
                out.append(ip)
    except OSError:
        pass
    return out


def main(argv=None):
    root = base_dir()
    app = App(root)
    s = app.settings
    port = s.port
    args = list(argv if argv is not None else sys.argv[1:])
    if "--port" in args:
        port = int(args[args.index("--port") + 1])
    no_browser = "--no-browser" in args
    try:
        httpd = ThreadingHTTPServer((s.host, port), make_handler(app))
    except OSError as e:
        print("포트 %d 을 열 수 없습니다: %s" % (port, e))
        print("이미 실행 중인지 확인하거나 config/settings.ini 의 port 를 바꾸세요.")
        return 1
    httpd.daemon_threads = True
    print("차량 물동 적정성 평가 %s" % _version(root))
    print("데이터 파일: %s" % app.db.path)
    try:
        st = app.db.current()
        print("읽은 행: %d, 차종 세대: %d, 연도: %s~%s" % (st["rows"], len(st["generations"]),
                                                   st["years"][0] if st["years"] else "-", st["years"][-1] if st["years"] else "-"))
    except data.DataError as e:
        print("데이터를 읽지 못했습니다: %s" % e)
        print("화면은 열리지만 오류 안내가 나옵니다. 파일을 고치면 다시 시작하지 않아도 됩니다.")
    local = "http://127.0.0.1:%d/" % port
    print("")
    print("이 PC 에서:   %s" % local)
    if s.host in ("0.0.0.0", ""):
        for ip in lan_addresses():
            print("다른 PC 에서: http://%s:%d/" % (ip, port))
    print("끝내려면 이 창을 닫거나 Ctrl+C 를 누르세요.")
    if s.open_browser and not no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(local)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0
