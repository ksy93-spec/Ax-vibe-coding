# -*- coding: utf-8 -*-
"""폐쇄망 안의 기존 자산이 어떤 구조인지만 뽑아내는 도구.

통합 포탈을 설계하려면 지금 무엇이 있는지 알아야 합니다. 그런데 소스 코드나 데이터를
밖으로 내보낼 수는 없습니다. 이 스크립트는 구조만 뽑습니다.

뽑는 것:
  - 파일 종류와 개수, 크기, 수정일
  - 파이썬: import 목록, 함수/클래스 이름과 인자 (본문 제외)
  - 엑셀: 시트 이름, 머리글 행, 크기, 수식/매크로/외부연결 사용 여부 (셀 값 제외)
  - CSV: 인코딩, 머리글, 행 수 (값 제외)
  - HTML/JS: 스크립트 참조, 외부 URL, 함수 이름
  - 의존성 파일 목록
  - 여러 사람이 중복으로 만든 것으로 보이는 함수와 파일

뽑지 않는 것:
  - 코드 본문, 셀 값, 데이터 행, 주석 내용, 비밀번호나 연결 문자열

설치할 것이 없습니다. 파이썬 3.8 이상이면 그대로 돌아갑니다.

사용법:
    python inventory.py --root C:\\작업폴더
    python inventory.py --root . --redact          이름을 해시로 가림
    python inventory.py --root . --out 결과폴더

내보내기 전에 결과 파일을 직접 열어서 확인하세요.
함수 이름이나 시트 이름에 사내 용어가 들어 있을 수 있습니다.
"""

from __future__ import annotations

import argparse
import ast
import csv
import hashlib
import io
import json
import os
import platform
import re
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from xml.etree import ElementTree

SKIP_DIRS = {
    ".git", ".svn", "node_modules", "__pycache__", ".venv", "venv", "env",
    ".idea", ".vscode", "dist", "build", ".mypy_cache", ".pytest_cache",
}

TEXT_EXT = {
    ".py", ".js", ".mjs", ".ts", ".jsx", ".tsx", ".html", ".htm", ".css",
    ".json", ".md", ".txt", ".csv", ".tsv", ".yml", ".yaml", ".xml",
    ".sql", ".r", ".bat", ".cmd", ".ps1", ".sh", ".vbs", ".ipynb", ".vue", ".svelte",
}

# 외부 URL 을 검사할 텍스트 파일. 실행 중에 무언가를 불러올 수 있는 종류만 봅니다.
# README 의 링크나 lockfile 의 레지스트리 주소는 실행 시 로드가 아니라 경고 대상이 아닙니다.
URL_SCAN_EXT = {".css", ".json", ".vue", ".svelte", ".sql", ".r", ".ipynb",
                ".bat", ".cmd", ".ps1", ".sh", ".vbs"}
LOCKFILES = {"package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml",
             "bun.lockb", "Pipfile.lock", "poetry.lock", "composer.lock"}

EXCEL_EXT = {".xlsx", ".xlsm", ".xltx", ".xltm"}
LEGACY_OFFICE_EXT = {".xls", ".doc", ".ppt", ".mdb", ".accdb"}

ENCODINGS = ("utf-8-sig", "utf-8", "cp949")

# 폐쇄망에서 깨지는 것들. 통합 전에 반드시 걷어내야 합니다.
REMOTE_URL = re.compile(r"""https?://[^\s'"<>)\]]+""")
LOCALHOST = re.compile(r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])([:/]|$)", re.I)

JS_FUNC = re.compile(
    r"""(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)"""
    r"""|(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)"""
)
JS_IMPORT = re.compile(r"""(?:import\s.*?from\s*['"]([^'"]+)['"])|(?:require\(\s*['"]([^'"]+)['"]\s*\))""")

HTML_SRC = re.compile(r"""<(?:script|link|img|iframe)\b[^>]*?(?:src|href)\s*=\s*['"]([^'"]+)['"]""", re.I)

XL_NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

_redact_on = False


def label(text: str) -> str:
    """이름을 그대로 쓰거나, --redact 일 때 짧은 해시로 바꿉니다.

    해시는 같은 이름이면 같은 값이라 중복 탐지는 그대로 동작합니다.
    """
    if not _redact_on or not text:
        return text
    digest = hashlib.sha256(str(text).encode("utf-8")).hexdigest()[:8]
    return "#" + digest


# ---------------------------------------------------------------- 공통


def read_text(path: str, limit: int = 2 * 1024 * 1024) -> Tuple[str, str]:
    """텍스트 파일을 읽습니다. (내용, 인코딩) 을 돌려줍니다. 실패하면 ('', '')."""
    try:
        with open(path, "rb") as fh:
            raw = fh.read(limit)
    except OSError:
        return "", ""
    if b"\x00" in raw[:4096]:
        return "", "binary"
    for enc in ENCODINGS:
        try:
            return raw.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return raw.decode("cp949", errors="replace"), "cp949?"


def find_remote_urls(text: str) -> List[str]:
    """외부 URL 을 찾습니다. localhost 는 뺍니다."""
    out = []
    for url in REMOTE_URL.findall(text):
        url = url.rstrip(".,;")
        if LOCALHOST.match(url):
            continue
        out.append(url)
    # 같은 호스트는 한 번만
    seen, uniq = set(), []
    for url in out:
        host = url.split("/")[2] if url.count("/") >= 2 else url
        if host in seen:
            continue
        seen.add(host)
        uniq.append(url)
    return uniq[:20]


# ---------------------------------------------------------------- 파이썬


def scan_python(path: str) -> Dict[str, Any]:
    text, enc = read_text(path)
    info: Dict[str, Any] = {"encoding": enc, "imports": [], "functions": [],
                            "classes": [], "parse_error": None}
    if not text:
        return info
    try:
        tree = ast.parse(text)
    except SyntaxError as exc:
        info["parse_error"] = "%s 줄 %s" % (type(exc).__name__, exc.lineno)
        return info

    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.level == 0:
                imports.add(node.module.split(".")[0])
    info["imports"] = sorted(imports)

    def signature(fn: ast.AST) -> str:
        args = fn.args
        names = [a.arg for a in getattr(args, "posonlyargs", [])] + [a.arg for a in args.args]
        if args.vararg:
            names.append("*" + args.vararg.arg)
        names += [a.arg for a in args.kwonlyargs]
        if args.kwarg:
            names.append("**" + args.kwarg.arg)
        return "%s(%s)" % (label(fn.name), ", ".join(names))

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            info["functions"].append({"name": label(node.name), "sig": signature(node),
                                      "line": node.lineno})
        elif isinstance(node, ast.ClassDef):
            methods = [label(n.name) for n in node.body
                       if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            info["classes"].append({"name": label(node.name), "methods": methods,
                                    "line": node.lineno})
    info["remote_urls"] = find_remote_urls(text)
    return info


# ---------------------------------------------------------------- 엑셀


def _xl_col_index(ref: str) -> int:
    """'B3' -> 1 (0부터)."""
    letters = "".join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def _cell_text(c: ElementTree.Element, shared: List[str]) -> str:
    """셀 하나의 표시 문자열. 값 타입 세 가지를 모두 다룹니다.

    - t="s"          공유 문자열 표에서 찾습니다
    - t="inlineStr"  <is><t> 안에 직접 들어 있습니다 (openpyxl 기본)
    - 그 외          <v> 텍스트 그대로
    """
    kind = c.get("t")
    if kind == "inlineStr":
        parts = [t.text or "" for t in c.iter("{%s}t" % XL_NS["m"])]
        return "".join(parts)
    v = c.find("m:v", XL_NS)
    if v is None or v.text is None:
        return ""
    if kind == "s":
        try:
            return shared[int(v.text)]
        except (ValueError, IndexError):
            return ""
    return v.text


def _read_row(row: ElementTree.Element, shared: List[str]) -> List[str]:
    """한 행을 열 위치에 맞춰 읽습니다.

    빈 셀은 XML 에서 통째로 빠지므로, 순서대로 담으면 머리글이 왼쪽으로 밀립니다.
    셀의 r 속성(A1, C1 ...)에서 실제 열 번호를 구해 그 자리에 넣습니다.
    """
    cells: Dict[int, str] = {}
    for idx, c in enumerate(row.findall("m:c", XL_NS)):
        ref = c.get("r")
        col = _xl_col_index(ref) if ref else idx
        if col < 0 or col > 16383:
            col = idx
        cells[col] = _cell_text(c, shared)
    if not cells:
        return []
    return [cells.get(i, "") for i in range(max(cells) + 1)]


def scan_excel(path: str) -> Dict[str, Any]:
    """xlsx/xlsm 의 구조만 읽습니다. openpyxl 없이 zip + XML 로 처리합니다."""
    info: Dict[str, Any] = {"sheets": [], "has_macro": False, "has_formula": False,
                            "external_links": 0, "defined_names": 0, "error": None}
    try:
        zf = zipfile.ZipFile(path)
    except (zipfile.BadZipFile, OSError) as exc:
        info["error"] = "열 수 없음: %s" % type(exc).__name__
        return info

    with zf:
        names = set(zf.namelist())
        info["has_macro"] = any(n.endswith("vbaProject.bin") for n in names)
        info["external_links"] = sum(1 for n in names
                                     if n.startswith("xl/externalLinks/externalLink"))

        shared: List[str] = []
        if "xl/sharedStrings.xml" in names:
            try:
                root = ElementTree.fromstring(zf.read("xl/sharedStrings.xml"))
                for si in root.findall("m:si", XL_NS):
                    shared.append("".join(t.text or "" for t in si.iter(
                        "{%s}t" % XL_NS["m"])))
            except ElementTree.ParseError:
                pass

        sheet_files: List[Tuple[str, str]] = []  # (표시이름, zip 경로)
        if "xl/workbook.xml" in names:
            try:
                wb = ElementTree.fromstring(zf.read("xl/workbook.xml"))
                info["defined_names"] = len(wb.findall(".//m:definedName", XL_NS))
                rels = {}
                if "xl/_rels/workbook.xml.rels" in names:
                    rroot = ElementTree.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
                    for rel in rroot:
                        rels[rel.get("Id")] = rel.get("Target")
                for idx, sheet in enumerate(wb.findall(".//m:sheets/m:sheet", XL_NS), start=1):
                    rid = sheet.get("{%s}id" % XL_NS["r"])
                    target = rels.get(rid, "worksheets/sheet%d.xml" % idx)
                    target = target.lstrip("/")
                    zpath = target if target.startswith("xl/") else "xl/" + target
                    sheet_files.append((sheet.get("name") or "", zpath))
            except ElementTree.ParseError as exc:
                info["error"] = "workbook.xml 파싱 실패"

        for sheet_name, zpath in sheet_files:
            entry = {"name": label(sheet_name), "rows": 0, "cols": 0,
                     "headers": [], "has_formula": False}
            if zpath not in names:
                info["sheets"].append(entry)
                continue
            try:
                sroot = ElementTree.fromstring(zf.read(zpath))
            except (ElementTree.ParseError, KeyError):
                info["sheets"].append(entry)
                continue

            dim = sroot.find("m:dimension", XL_NS)
            if dim is not None and dim.get("ref"):
                ref = dim.get("ref")
                end = ref.split(":")[-1]
                entry["rows"] = int("".join(ch for ch in end if ch.isdigit()) or 0)
                entry["cols"] = _xl_col_index(end) + 1

            entry["has_formula"] = sroot.find(".//m:f", XL_NS) is not None
            if entry["has_formula"]:
                info["has_formula"] = True

            # 첫 행만 머리글로 읽습니다. 데이터 행은 읽지 않습니다.
            first_row = sroot.find(".//m:sheetData/m:row", XL_NS)
            if first_row is not None:
                entry["headers"] = [label(x) for x in _read_row(first_row, shared)[:40]]
            info["sheets"].append(entry)

    return info


# ---------------------------------------------------------------- CSV / 웹


CSV_SAMPLE_BYTES = 512 * 1024


def scan_csv(path: str) -> Dict[str, Any]:
    text, enc = read_text(path, limit=CSV_SAMPLE_BYTES)
    truncated = os.path.getsize(path) > CSV_SAMPLE_BYTES
    info = {"encoding": enc, "headers": [], "sampled_rows": 0,
            "delimiter": ",", "truncated": truncated}
    if not text:
        return info
    head = text[:8000]
    best, best_score = ",", -1
    lines = [ln for ln in head.splitlines()[:5] if ln]
    for d in (",", "\t", ";", "|"):
        counts = [ln.count(d) for ln in lines]
        if not counts or counts[0] == 0:
            continue
        score = counts[0] * (10 if all(c == counts[0] for c in counts) else 1)
        if score > best_score:
            best, best_score = d, score
    info["delimiter"] = {",": "쉼표", "\t": "탭", ";": "세미콜론", "|": "파이프"}.get(best, best)
    try:
        reader = csv.reader(io.StringIO(text), delimiter=best)
        rows = list(reader)
    except csv.Error:
        return info
    if rows:
        info["headers"] = [label(h) for h in rows[0][:40]]
    info["sampled_rows"] = max(0, len(rows) - 1)
    return info


def scan_web(path: str, ext: str) -> Dict[str, Any]:
    text, enc = read_text(path)
    info: Dict[str, Any] = {"encoding": enc, "remote_urls": find_remote_urls(text),
                            "refs": [], "functions": [], "imports": [],
                            "uses_es_module": False}
    if not text:
        return info
    if ext in (".html", ".htm"):
        info["refs"] = [r for r in HTML_SRC.findall(text)][:30]
        info["uses_es_module"] = 'type="module"' in text or "type='module'" in text
    else:
        names = [a or b for a, b in JS_FUNC.findall(text)]
        info["functions"] = [label(n) for n in names][:60]
        mods = [a or b for a, b in JS_IMPORT.findall(text)]
        info["imports"] = sorted({m for m in mods})[:40]
        info["uses_es_module"] = bool(re.search(r"^\s*(import|export)\s", text, re.M))
    return info


BUILD_TOOLS = [
    ("vite", "Vite"), ("react-scripts", "Create React App"), ("next", "Next.js"),
    ("@angular/cli", "Angular CLI"), ("@vue/cli-service", "Vue CLI"), ("parcel", "Parcel"),
    ("webpack", "Webpack"), ("esbuild", "esbuild"), ("rollup", "Rollup"),
]
FRAMEWORKS = [("react", "React"), ("vue", "Vue"), ("svelte", "Svelte"),
              ("@angular/core", "Angular"), ("preact", "Preact"), ("solid-js", "Solid")]
SERVER_DEPS = ("express", "fastify", "koa", "@nestjs/core", "hapi", "@hapi/hapi",
               "socket.io", "next", "nuxt", "remix", "@remix-run/node")
# OS 마다 다른 바이너리가 설치되는 패키지. node_modules 를 다른 OS 로 옮기면 여기서 깨집니다.
NATIVE_PATTERNS = [
    ("@esbuild", re.compile(r"^(?P<plat>(?:win32|linux|darwin|freebsd|android|netbsd|openbsd|sunos|aix)-[a-z0-9]+)$")),
    ("@rollup", re.compile(r"^rollup-(?P<plat>(?:win32|linux|darwin|freebsd|android)-[a-z0-9]+)")),
    ("@rolldown", re.compile(r"^binding-(?P<plat>(?:win32|linux|darwin|freebsd|android|wasm32)-[a-z0-9]+)")),
    ("@swc", re.compile(r"^core-(?P<plat>(?:win32|linux|darwin|freebsd|android)-[a-z0-9]+)")),
    ("@tailwindcss", re.compile(r"^oxide-(?P<plat>(?:win32|linux|darwin|freebsd|android|wasm32)-[a-z0-9]+)")),
    ("@parcel", re.compile(r"^watcher-(?P<plat>(?:win32|linux|darwin|freebsd|android)-[a-z0-9]+)")),
    ("", re.compile(r"^lightningcss-(?P<plat>(?:win32|linux|darwin|freebsd|android)-[a-z0-9]+)")),
]


def current_platform() -> str:
    """이 도구가 도는 PC 의 플랫폼 표기. node_modules 안의 바이너리 이름과 같은 형식."""
    osname = {"win32": "win32", "linux": "linux", "darwin": "darwin"}.get(sys.platform, sys.platform)
    mach = platform.machine().lower()
    arch = {"amd64": "x64", "x86_64": "x64", "arm64": "arm64", "aarch64": "arm64",
            "x86": "ia32", "i386": "ia32", "i686": "ia32"}.get(mach, mach)
    return "%s-%s" % (osname, arch)


def _installed_version(node_modules: str, pkg: str) -> Optional[str]:
    try:
        with open(os.path.join(node_modules, *pkg.split("/"), "package.json"), encoding="utf-8") as fh:
            return json.load(fh).get("version")
    except (OSError, ValueError):
        return None


def scan_js_project(pkg_path: str) -> Dict[str, Any]:
    """package.json 이 있는 폴더를 앱 프로젝트로 보고, 포탈에 붙이는 방법을 판정합니다.

    node_modules 와 dist 는 파일 목록 조사에서 건너뛰므로 여기서 따로 들여다봅니다.
    내용은 읽지 않고 이름, 버전, 설정 유무만 봅니다.
    """
    root = os.path.dirname(pkg_path)
    text, _ = read_text(pkg_path)
    try:
        pkg = json.loads(text)
    except ValueError:
        return {"error": "package.json 을 읽지 못했습니다"}
    deps: Dict[str, str] = {}
    for key in ("dependencies", "devDependencies"):
        deps.update(pkg.get(key) or {})

    nm = os.path.join(root, "node_modules")
    has_nm = os.path.isdir(nm)
    info: Dict[str, Any] = {
        "name": label(pkg.get("name") or os.path.basename(root)),
        "scripts": sorted((pkg.get("scripts") or {}).keys())[:12],
        "build_tool": next((name for key, name in BUILD_TOOLS if key in deps), None),
        "framework": next((name for key, name in FRAMEWORKS if key in deps), None),
        "server_deps": sorted(d for d in SERVER_DEPS if d in deps),
        "dep_count": len(deps),
        "node_modules": has_nm,
        "installed": {},
        "native_platforms": [],
        "dist": None,
        "vite_single_file": None,
    }
    for key in ("vite", "react", "react-scripts", "next", "webpack"):
        if key in deps:
            ver = _installed_version(nm, key) if has_nm else None
            info["installed"][key] = ver or ("선언만 " + str(deps[key]))

    if has_nm:
        plats = set()
        for scope, pattern in NATIVE_PATTERNS:
            base = os.path.join(nm, scope) if scope else nm
            try:
                names = os.listdir(base)
            except OSError:
                continue
            for n in names:
                m = pattern.match(n)
                if m:
                    plats.add(m.group("plat").replace("-gnu", "").replace("-musl", "").replace("-msvc", ""))
        info["native_platforms"] = sorted(plats)
        try:
            info["top_level_packages"] = sum(
                len(os.listdir(os.path.join(nm, d))) if d.startswith("@") else 1
                for d in os.listdir(nm) if not d.startswith("."))
        except OSError:
            pass

    for out in ("dist", "build", "out"):
        idx = os.path.join(root, out, "index.html")
        if os.path.isfile(idx):
            html, _ = read_text(idx)
            info["dist"] = {
                "folder": out,
                "module_script": bool(re.search(r"<script[^>]+type=[\"']module[\"'][^>]+src=", html)),
                "absolute_paths": bool(re.search(r"(?:src|href)=[\"']/(?!/)", html)),
                "chunks": 0,
            }
            assets = os.path.join(root, out, "assets")
            if os.path.isdir(assets):
                info["dist"]["chunks"] = sum(1 for f in os.listdir(assets) if f.endswith(".js"))
            break

    for cfg in ("vite.config.js", "vite.config.ts", "vite.config.mjs", "vite.config.mts"):
        cpath = os.path.join(root, cfg)
        if os.path.isfile(cpath):
            ctext, _ = read_text(cpath)
            info["vite_single_file"] = bool(re.search(r"inlineDynamicImports\s*:\s*true|codeSplitting\s*:\s*false", ctext))
            break

    info["verdict"], info["notes"] = _verdict(info)
    return info


def _verdict(info: Dict[str, Any]) -> Tuple[str, List[str]]:
    """포탈에 어떤 방식으로 붙일지와 그 이유."""
    notes: List[str] = []
    here = current_platform()
    plats = info.get("native_platforms") or []
    if plats and here not in plats:
        notes.append("node_modules 가 다른 OS 에서 설치됐습니다 (%s, 지금 PC 는 %s). "
                     "이 상태로는 빌드가 실패합니다. 빌드는 설치한 PC 에서 하세요." % (", ".join(plats), here))
    if info["server_deps"]:
        notes.append("서버가 도는 앱입니다 (%s). file:// 로는 열리지 않습니다." % ", ".join(info["server_deps"]))
        return "링크 연결 (서버 필요)", notes
    if not info["framework"] and not info["build_tool"]:
        return "데이터 모듈 또는 도구 스크립트", notes
    d = info.get("dist")
    if d and d["module_script"]:
        notes.append("현재 빌드 결과는 ES 모듈이라 file:// 에서 빈 화면이 됩니다. inline-build 로 합쳐야 합니다.")
    if d and d["chunks"] > 1:
        notes.append("빌드 결과가 JS %d조각으로 나뉘어 있습니다. 한 파일 설정이 필요합니다." % d["chunks"])
    if info["build_tool"] == "Vite" and not info["vite_single_file"]:
        notes.append("vite.config 에 한 파일 설정(inlineDynamicImports)이 없습니다.")
    if info["build_tool"] == "Create React App":
        notes.append("CRA 는 package.json 에 \"homepage\": \".\" 가 있어야 상대 경로로 빌드됩니다.")
    if not info["node_modules"]:
        notes.append("node_modules 가 없습니다. 이 PC 에서는 다시 빌드할 수 없습니다.")
    return "앱 모듈 (빌드 후 inline-build)", notes


def scan_deps(path: str, name: str) -> Dict[str, Any]:
    text, _ = read_text(path)
    out: Dict[str, Any] = {"packages": []}
    if name == "package.json":
        try:
            data = json.loads(text)
        except ValueError:
            return out
        for key in ("dependencies", "devDependencies"):
            for pkg, ver in (data.get(key) or {}).items():
                out["packages"].append("%s %s" % (pkg, ver))
    else:
        for line in text.splitlines():
            line = line.split("#")[0].strip()
            if line and not line.startswith("-"):
                out["packages"].append(line)
    out["packages"] = out["packages"][:200]
    return out


# ---------------------------------------------------------------- 수집


def walk(root: str, max_files: int) -> List[str]:
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            found.append(os.path.join(dirpath, fn))
            if len(found) >= max_files:
                return found
    return found


def collect(root: str, max_files: int) -> Dict[str, Any]:
    root = os.path.abspath(root)
    files = walk(root, max_files)

    result: Dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M"),
        "root_name": label(os.path.basename(root) or root),
        "redacted": _redact_on,
        "file_count": len(files),
        "by_extension": {},
        "entries": [],
        "remote_urls": [],
        "warnings": [],
    }

    ext_counter: Counter = Counter()
    url_hosts: Counter = Counter()
    func_owner: Dict[str, List[str]] = defaultdict(list)
    stem_owner: Dict[str, List[str]] = defaultdict(list)

    for path in files:
        rel = os.path.relpath(path, root).replace("\\", "/")
        ext = os.path.splitext(path)[1].lower()
        base = os.path.basename(path)
        try:
            st = os.stat(path)
        except OSError:
            continue
        ext_counter[ext or "(없음)"] += 1

        entry: Dict[str, Any] = {
            "path": "/".join(label(p) for p in rel.split("/")) if _redact_on else rel,
            "ext": ext,
            "size_kb": round(st.st_size / 1024, 1),
            "modified": datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d"),
            "kind": "기타",
        }

        stem_owner[os.path.splitext(base)[0].lower()].append(entry["path"])

        if ext == ".py":
            entry["kind"] = "파이썬"
            entry["detail"] = scan_python(path)
            for fn in entry["detail"]["functions"]:
                func_owner[fn["name"]].append(entry["path"])
        elif ext in EXCEL_EXT:
            entry["kind"] = "엑셀"
            entry["detail"] = scan_excel(path)
        elif ext in LEGACY_OFFICE_EXT:
            entry["kind"] = "구형 오피스"
            entry["detail"] = {"note": "구형 형식이라 구조를 읽지 못했습니다. 내용 확인이 필요합니다."}
        elif ext in (".csv", ".tsv"):
            entry["kind"] = "CSV"
            entry["detail"] = scan_csv(path)
        elif ext in (".html", ".htm", ".js", ".mjs", ".ts", ".jsx", ".tsx"):
            entry["kind"] = "웹"
            entry["detail"] = scan_web(path, ext)
            for fn in entry["detail"].get("functions", []):
                func_owner[fn].append(entry["path"])
        elif base == "package.json":
            entry["kind"] = "JS 프로젝트"
            entry["detail"] = scan_deps(path, base)
            entry["detail"]["project"] = scan_js_project(path)
        elif base in ("requirements.txt", "Pipfile", "pyproject.toml"):
            entry["kind"] = "의존성"
            entry["detail"] = scan_deps(path, base)
        elif base in LOCKFILES:
            entry["kind"] = "잠금 파일"
            entry["detail"] = {}
        elif ext in TEXT_EXT:
            text, enc = read_text(path)
            entry["detail"] = {"encoding": enc,
                               "remote_urls": find_remote_urls(text) if ext in URL_SCAN_EXT else []}
        else:
            entry["detail"] = {}

        for url in (entry.get("detail") or {}).get("remote_urls", []) or []:
            host = url.split("/")[2] if url.count("/") >= 2 else url
            url_hosts[host] += 1

        result["entries"].append(entry)

    result["by_extension"] = dict(ext_counter.most_common())
    result["remote_urls"] = [{"host": h, "count": c} for h, c in url_hosts.most_common(30)]

    result["duplicate_functions"] = [
        {"name": name, "files": sorted(set(paths))}
        for name, paths in sorted(func_owner.items())
        if len(set(paths)) > 1 and name not in ("main", "run", "init", "setup", "__init__")
    ][:60]
    result["duplicate_filenames"] = [
        {"stem": label(stem) if _redact_on else stem, "files": sorted(set(paths))}
        for stem, paths in sorted(stem_owner.items())
        if len(set(paths)) > 1
    ][:40]

    if url_hosts:
        result["warnings"].append(
            "외부 URL 을 참조하는 파일이 있습니다. 폐쇄망에서는 로드에 실패합니다. "
            "통합 전에 걷어내야 합니다."
        )
    if any(e["kind"] == "구형 오피스" for e in result["entries"]):
        result["warnings"].append(
            "xls, doc, mdb 같은 구형 형식이 있습니다. 구조를 읽지 못했으니 직접 확인하세요."
        )
    if any((e.get("detail") or {}).get("has_macro") for e in result["entries"]):
        result["warnings"].append(
            "매크로가 든 엑셀(xlsm)이 있습니다. 매크로 로직은 이 도구로 보이지 않습니다."
        )
    # 빌드 도구가 있는 프로젝트의 소스는 빌드를 거치므로 ES 모듈이어도 문제가 아닙니다.
    built_roots = []
    for e in result["entries"]:
        pj = (e.get("detail") or {}).get("project") or {}
        if e["kind"] == "JS 프로젝트" and (pj.get("build_tool") or pj.get("framework")):
            folder = e["path"].rsplit("/", 1)[0] if "/" in e["path"] else ""
            built_roots.append(folder + "/" if folder else "")
    def _in_built_project(p: str) -> bool:
        return any(root == "" or p.startswith(root) for root in built_roots)
    if any((e.get("detail") or {}).get("uses_es_module") and not _in_built_project(e["path"])
           for e in result["entries"]):
        result["warnings"].append(
            "ES 모듈을 쓰는 웹 파일이 있습니다. file:// 로 열면 CORS 로 막힙니다."
        )
    projects = [e for e in result["entries"] if e["kind"] == "JS 프로젝트"]
    if any(any("다른 OS" in n for n in e["detail"]["project"].get("notes", [])) for e in projects):
        result["warnings"].append(
            "다른 OS 에서 설치된 node_modules 가 있습니다. 그대로 옮긴 폴더는 빌드가 실패합니다."
        )
    if any(e["detail"]["project"].get("verdict", "").startswith("앱 모듈") for e in projects):
        result["warnings"].append(
            "빌드가 필요한 앱이 있습니다. 포탈에 붙이려면 docs/app-integration.md 의 절차를 따르세요."
        )
    result["platform"] = current_platform()
    if len(files) >= max_files:
        result["warnings"].append(
            "파일 수 상한(%d)에 걸렸습니다. --max-files 를 올리거나 --root 를 좁히세요." % max_files
        )

    return result


# ---------------------------------------------------------------- 보고서


def to_markdown(data: Dict[str, Any]) -> str:
    lines: List[str] = []
    w = lines.append

    w("# 자산 목록: %s" % data["root_name"])
    w("")
    w("생성 %s, 파일 %d개%s" % (data["generated_at"], data["file_count"],
                              ", 이름 가림 적용" if data["redacted"] else ""))
    w("")

    if data["warnings"]:
        w("## 먼저 볼 것")
        w("")
        for msg in data["warnings"]:
            w("- %s" % msg)
        w("")

    w("## 파일 종류")
    w("")
    w("| 확장자 | 개수 |")
    w("| --- | --- |")
    for ext, n in list(data["by_extension"].items())[:25]:
        w("| %s | %d |" % (ext, n))
    w("")

    if data["remote_urls"]:
        w("## 외부 URL 을 쓰는 곳")
        w("")
        w("폐쇄망에서 전부 실패합니다. 통합 대상이면 로컬 파일로 바꿔야 합니다.")
        w("")
        w("| 호스트 | 참조 횟수 |")
        w("| --- | --- |")
        for item in data["remote_urls"]:
            w("| %s | %d |" % (item["host"], item["count"]))
        w("")

    py = [e for e in data["entries"] if e["kind"] == "파이썬"]
    if py:
        w("## 파이썬 (%d개)" % len(py))
        w("")
        third_party = Counter()
        for e in py:
            for mod in e["detail"]["imports"]:
                third_party[mod] += 1
        w("사용 중인 import 상위:")
        w("")
        w(", ".join("%s(%d)" % (m, c) for m, c in third_party.most_common(20)) or "없음")
        w("")
        for e in sorted(py, key=lambda x: -len(x["detail"]["functions"]))[:25]:
            d = e["detail"]
            w("### `%s`" % e["path"])
            w("")
            w("%.1fKB, %s 수정, 인코딩 %s" % (e["size_kb"], e["modified"], d["encoding"]))
            if d["parse_error"]:
                w("")
                w("구문 오류로 분석 실패: %s" % d["parse_error"])
            if d["imports"]:
                w("")
                w("import: %s" % ", ".join(d["imports"]))
            if d["functions"]:
                w("")
                w("함수:")
                w("")
                for fn in d["functions"][:30]:
                    w("- `%s`" % fn["sig"])
            if d["classes"]:
                w("")
                w("클래스:")
                w("")
                for cl in d["classes"][:15]:
                    w("- `%s` (메서드 %d개)" % (cl["name"], len(cl["methods"])))
            w("")

    xl = [e for e in data["entries"] if e["kind"] == "엑셀"]
    if xl:
        w("## 엑셀 (%d개)" % len(xl))
        w("")
        for e in xl[:30]:
            d = e["detail"]
            flags = []
            if d.get("has_macro"):
                flags.append("매크로")
            if d.get("has_formula"):
                flags.append("수식")
            if d.get("external_links"):
                flags.append("외부연결 %d" % d["external_links"])
            if d.get("defined_names"):
                flags.append("이름정의 %d" % d["defined_names"])
            w("### `%s`" % e["path"])
            w("")
            w("%.1fKB, %s 수정%s" % (e["size_kb"], e["modified"],
                                    ", " + " / ".join(flags) if flags else ""))
            if d.get("error"):
                w("")
                w("읽기 실패: %s" % d["error"])
            for sh in d.get("sheets", [])[:12]:
                w("")
                w("- 시트 `%s` (%d행 x %d열)%s" % (
                    sh["name"], sh["rows"], sh["cols"],
                    ", 수식 있음" if sh["has_formula"] else ""))
                if any(sh["headers"]):
                    w("  - 머리글: %s" % ", ".join(h or "(빈칸)" for h in sh["headers"]))
            w("")

    web = [e for e in data["entries"] if e["kind"] == "웹"]
    if web:
        w("## 웹 (%d개)" % len(web))
        w("")
        for e in web[:30]:
            d = e["detail"]
            extras = []
            if d.get("uses_es_module"):
                extras.append("ES 모듈")
            if d.get("remote_urls"):
                extras.append("외부 URL %d" % len(d["remote_urls"]))
            w("- `%s` %.1fKB%s%s" % (
                e["path"], e["size_kb"],
                " / " + ", ".join(extras) if extras else "",
                " / 함수 %d개" % len(d["functions"]) if d.get("functions") else ""))
        w("")

    csvs = [e for e in data["entries"] if e["kind"] == "CSV"]
    if csvs:
        w("## CSV (%d개)" % len(csvs))
        w("")
        for e in csvs[:25]:
            d = e["detail"]
            w("- `%s` %s, 구분자 %s, %s" % (
                e["path"], d["encoding"], d["delimiter"],
                ("%s행 이상 (앞 512KB 만 셈)" % format(d["sampled_rows"], ","))
                if d.get("truncated") else "%s행" % format(d["sampled_rows"], ",")))
            if any(d["headers"]):
                w("  - 머리글: %s" % ", ".join(h or "(빈칸)" for h in d["headers"]))
        w("")

    projects = [e for e in data["entries"] if e["kind"] == "JS 프로젝트"]
    if projects:
        w("## JS 앱 프로젝트 (%d개)" % len(projects))
        w("")
        w("조사한 PC: %s" % data.get("platform", "?"))
        w("")
        w("| 프로젝트 | 빌드 도구 | 프레임워크 | 포탈 연결 방식 |")
        w("| --- | --- | --- | --- |")
        for e in projects:
            pj = e["detail"]["project"]
            w("| `%s` | %s | %s | %s |" % (
                e["path"].rsplit("/", 1)[0] if "/" in e["path"] else ".",
                pj.get("build_tool") or "-", pj.get("framework") or "-", pj.get("verdict", "-")))
        w("")
        for e in projects:
            pj = e["detail"]["project"]
            w("### `%s`" % e["path"])
            w("")
            facts = []
            if pj.get("installed"):
                facts.append("설치 버전 " + ", ".join("%s %s" % kv for kv in pj["installed"].items()))
            facts.append("의존성 %d개" % pj.get("dep_count", 0))
            facts.append("node_modules " + ("있음" if pj.get("node_modules") else "없음"))
            if pj.get("native_platforms"):
                facts.append("바이너리 플랫폼 " + ", ".join(pj["native_platforms"]))
            if pj.get("scripts"):
                facts.append("scripts: " + ", ".join(pj["scripts"]))
            for f in facts:
                w("- %s" % f)
            for n in pj.get("notes", []):
                w("- **%s**" % n)
            w("")

    deps = [e for e in data["entries"] if e["kind"] == "의존성"]
    if deps:
        w("## 의존성 선언")
        w("")
        for e in deps:
            w("- `%s`: %s" % (e["path"], ", ".join(e["detail"]["packages"][:30]) or "비어 있음"))
        w("")

    if data["duplicate_functions"]:
        w("## 중복으로 보이는 함수")
        w("")
        w("같은 이름의 함수가 여러 파일에 있습니다. 통합할 때 하나로 합칠 후보입니다.")
        w("")
        for item in data["duplicate_functions"][:30]:
            w("- `%s`: %s" % (item["name"], ", ".join("`%s`" % f for f in item["files"][:6])))
        w("")

    if data["duplicate_filenames"]:
        w("## 이름이 겹치는 파일")
        w("")
        for item in data["duplicate_filenames"][:20]:
            w("- `%s`: %s" % (item["stem"], ", ".join("`%s`" % f for f in item["files"][:6])))
        w("")

    legacy = [e for e in data["entries"] if e["kind"] == "구형 오피스"]
    if legacy:
        w("## 직접 확인이 필요한 파일")
        w("")
        for e in legacy[:30]:
            w("- `%s` (%.1fKB)" % (e["path"], e["size_kb"]))
        w("")

    return "\n".join(lines) + "\n"


def main() -> int:
    global _redact_on

    parser = argparse.ArgumentParser(
        description="폐쇄망 기존 자산의 구조만 뽑습니다. 코드 본문과 데이터는 담지 않습니다.")
    parser.add_argument("--root", default=".", help="조사할 폴더 (기본: 현재 폴더)")
    parser.add_argument("--out", default="inventory_out", help="결과를 넣을 폴더")
    parser.add_argument("--redact", action="store_true",
                        help="파일명, 함수명, 시트명, 머리글을 해시로 가립니다")
    parser.add_argument("--max-files", type=int, default=20000, help="파일 수 상한")
    args = parser.parse_args()

    _redact_on = args.redact

    if not os.path.isdir(args.root):
        print("폴더를 찾을 수 없습니다: %s" % args.root)
        return 1

    print("조사 중: %s" % os.path.abspath(args.root))
    data = collect(args.root, args.max_files)
    print("  파일 %d개" % data["file_count"])

    os.makedirs(args.out, exist_ok=True)
    json_path = os.path.join(args.out, "inventory.json")
    md_path = os.path.join(args.out, "inventory.md")

    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write(to_markdown(data))

    print("  %s" % os.path.abspath(md_path))
    print("  %s" % os.path.abspath(json_path))
    print()
    for msg in data["warnings"]:
        print("  주의: %s" % msg)
    print()
    print("내보내기 전에 inventory.md 를 직접 열어서 확인하세요.")
    print("사내 용어가 함수 이름이나 시트 이름에 들어 있으면 --redact 로 다시 뽑으세요.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
