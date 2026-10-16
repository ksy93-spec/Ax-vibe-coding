"""조사기관 생산 전망 파일을 읽어 차종 세대 단위로 묶습니다.

행 하나 = 차종 x 공장. 같은 브랜드, 같은 Nameplate, 같은 SOP 연도의 행을 묶어 "세대" 하나로 봅니다.
세대마다 지역별, 연도별 생산 대수를 갖습니다.
"""
from __future__ import annotations

import configparser
import csv
import datetime as dt
import hashlib
import json
import os
import re
import threading
from typing import Dict, List, Optional, Tuple

from . import xlsx

REQUIRED = ("brand", "nameplate", "sop", "region")
OPTIONAL = ("strategic_group", "eop", "platform", "program", "country", "plant")
CACHE_VERSION = 3


def norm(s) -> str:
    """비교용 이름. 대소문자, 공백, 하이픈, 점을 무시합니다."""
    return re.sub(r"[\s\-_.·/]+", "", str(s or "")).lower()


# ---------------------------------------------------------------- 설정

class ColumnSpec:
    def __init__(self, path: str):
        cp = configparser.ConfigParser(interpolation=None)
        cp.read(path, encoding="utf-8-sig")
        self.candidates: Dict[str, List[str]] = {}
        for key in REQUIRED + OPTIONAL:
            raw = cp.get("columns", key, fallback="")
            self.candidates[key] = [c.strip() for c in raw.split("|") if c.strip()]
        self.year_res = []
        self.quarter_res = []
        if cp.has_section("volume"):
            items = dict(cp.items("volume"))
            for k in sorted(items):
                if re.fullmatch(r"year_\d+", k):
                    self.year_res.append(re.compile(items[k].strip(), re.I))
                m = re.fullmatch(r"quarter_(\d+)", k)
                if m:
                    order = items.get("quarter_%s_order" % m.group(1), "qy").strip().lower()
                    self.quarter_res.append((re.compile(items[k].strip(), re.I), order))
        self.scan_rows = cp.getint("header", "scan_rows", fallback=30)
        with open(path, "rb") as f:
            self.digest = hashlib.sha1(f.read()).hexdigest()[:12]


def load_regions(path: str) -> Tuple[Dict[str, str], Dict[str, int]]:
    """조사기관 지역명 -> 화면 표시 이름, 표시 이름 -> 정렬 순서"""
    labels: Dict[str, str] = {}
    order: Dict[str, int] = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                raw = (row.get("db_region") or "").strip()
                label = (row.get("label") or "").strip()
                if raw and label:
                    labels[norm(raw)] = label
                    try:
                        order[label] = int(row.get("order") or 99)
                    except ValueError:
                        order[label] = 99
    return labels, order


def load_aliases(path: str) -> List[Tuple[str, str, str]]:
    out = []
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                alias = (row.get("alias") or "").strip()
                typ = (row.get("type") or "brand").strip().lower()
                target = (row.get("target") or "").strip()
                if alias and target and typ in ("brand", "group"):
                    out.append((alias, typ, target))
    return out


# ---------------------------------------------------------------- 값 변환

_EXCEL_EPOCH = dt.date(1899, 12, 30)
_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def parse_ym(v) -> Optional[Tuple[int, int]]:
    """SOP/EOP 값을 (연, 월) 로. 엑셀 날짜 숫자, 2027-07, 7/2027, Jul 2027, 2027 등을 받습니다."""
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        n = float(v)
        if 1900 <= n <= 2100:
            return int(n), 1
        if 20000 <= n <= 80000:
            d = _EXCEL_EPOCH + dt.timedelta(days=int(n))
            return d.year, d.month
        return None
    s = str(v).strip()
    m = re.match(r"^(\d{4})[-/.](\d{1,2})", s)
    if m:
        return int(m.group(1)), max(1, min(12, int(m.group(2))))
    m = re.match(r"^(\d{1,2})[-/.](\d{4})$", s)
    if m:
        return int(m.group(2)), max(1, min(12, int(m.group(1))))
    m = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", s)  # 7/1/2027 (월/일/연)
    if m:
        return int(m.group(3)), max(1, min(12, int(m.group(1))))
    m = re.match(r"^([A-Za-z]{3})[a-z]*[\s\-']*(\d{2,4})$", s)
    if m and m.group(1).lower() in _MONTHS:
        y = int(m.group(2))
        return (y + 2000 if y < 100 else y), _MONTHS[m.group(1).lower()]
    m = re.match(r"^(\d{4})$", s)
    if m:
        return int(s), 1
    return None


def to_num(v) -> float:
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def _text(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


# ---------------------------------------------------------------- 읽기

class DataError(Exception):
    pass


def _iter_file(path: str, sheet: Optional[str]):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".xlsm"):
        return xlsx.read_rows(path, sheet or None)
    if ext == ".csv":
        def gen():
            with open(path, encoding="utf-8-sig", newline="") as f:
                for row in csv.reader(f):
                    yield [c if c != "" else None for c in row]
        return gen()
    raise DataError("지원하지 않는 파일 형식입니다: %s (xlsx, xlsm, csv 만 됩니다)" % ext)


def _match_header(header: List, spec: ColumnSpec):
    names = {norm(h): i for i, h in enumerate(header) if h not in (None, "")}
    cols: Dict[str, int] = {}
    for key, cands in spec.candidates.items():
        for c in cands:
            if norm(c) in names:
                cols[key] = names[norm(c)]
                break
    years: Dict[int, int] = {}
    quarters: Dict[Tuple[int, int], int] = {}
    for i, h in enumerate(header):
        if h is None:
            continue
        text = _text(h)
        for rx in spec.year_res:
            m = rx.match(text)
            if m:
                years.setdefault(int(m.group(1)), i)
                break
        else:
            for rx, order in spec.quarter_res:
                m = rx.match(text)
                if m:
                    a, b = int(m.group(1)), int(m.group(2))
                    y, q = (b, a) if order == "qy" else (a, b)
                    quarters.setdefault((y, q), i)
                    break
    return cols, years, quarters


def read_records(path: str, sheet: Optional[str], spec: ColumnSpec,
                 region_labels: Dict[str, str]) -> dict:
    rows = _iter_file(path, sheet)
    header = None
    header_row = 0
    cols: Dict[str, int] = {}
    years: Dict[int, int] = {}
    quarters: Dict[Tuple[int, int], int] = {}
    best_missing = list(REQUIRED)
    for i, row in enumerate(rows):
        if i >= spec.scan_rows:
            break
        c, y, q = _match_header(row, spec)
        missing = [k for k in REQUIRED if k not in c]
        if not missing and (y or q):
            header, header_row, cols, years, quarters = row, i, c, y, q
            break
        if len(missing) < len(best_missing):
            best_missing = missing
    if header is None:
        need = ", ".join("%s(%s)" % (k, " | ".join(spec.candidates[k])) for k in best_missing)
        raise DataError("머리글 행을 찾지 못했습니다. 위쪽 %d행 안에 다음 열이 있어야 합니다: %s. "
                        "config/columns.ini 에 실제 열 이름을 적어 주세요." % (spec.scan_rows, need or "연도별 생산량 열"))

    all_years = sorted(set(years) | {y for y, _ in quarters})
    records = []
    skipped = 0
    for row in rows:
        if not row:
            continue

        def get(key):
            idx = cols.get(key)
            return row[idx] if idx is not None and idx < len(row) else None

        brand = _text(get("brand"))
        nameplate = _text(get("nameplate"))
        if not brand or not nameplate:
            skipped += 1
            continue
        sop = parse_ym(get("sop"))
        vol: Dict[int, float] = {}
        for y in all_years:
            v = 0.0
            yi = years.get(y)
            if yi is not None and yi < len(row) and row[yi] not in (None, ""):
                v = to_num(row[yi])
            else:
                v = sum(to_num(row[qi]) for (qy, _), qi in quarters.items() if qy == y and qi < len(row))
            if v:
                vol[y] = v
        region_raw = _text(get("region"))
        records.append({
            "group": _text(get("strategic_group")),
            "brand": brand,
            "nameplate": nameplate,
            "platform": _text(get("platform")),
            "program": _text(get("program")),
            "sop": sop,
            "eop": parse_ym(get("eop")),
            "region_raw": region_raw,
            "region": region_labels.get(norm(region_raw), region_raw or "미상"),
            "country": _text(get("country")),
            "plant": _text(get("plant")),
            "vol": vol,
        })
    return {
        "records": records,
        "years": all_years,
        "header_row": header_row + 1,
        "columns": {k: _text(header[i]) for k, i in cols.items()},
        "skipped": skipped,
        "quarters_only_years": sorted({y for y, _ in quarters} - set(years)),
    }


def build_generations(records: List[dict]) -> List[dict]:
    gens: Dict[str, dict] = {}
    for r in records:
        sop_y = r["sop"][0] if r["sop"] else None
        key = "%s|%s|%s" % (norm(r["brand"]), norm(r["nameplate"]), sop_y)
        g = gens.get(key)
        if g is None:
            gid = hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]
            g = gens[key] = {
                "id": gid, "group": r["group"], "brand": r["brand"], "nameplate": r["nameplate"],
                "platforms": [], "programs": [], "sop": r["sop"], "eop": r["eop"],
                "regions": {}, "plants": [],
            }
        if r["platform"] and r["platform"] not in g["platforms"]:
            g["platforms"].append(r["platform"])
        if r["program"] and r["program"] not in g["programs"]:
            g["programs"].append(r["program"])
        if r["sop"] and (g["sop"] is None or r["sop"] < g["sop"]):
            g["sop"] = r["sop"]
        if r["eop"] and (g["eop"] is None or r["eop"] > g["eop"]):
            g["eop"] = r["eop"]
        if not g["group"] and r["group"]:
            g["group"] = r["group"]
        plant = " / ".join(x for x in (r["plant"], r["country"]) if x)
        if plant and plant not in g["plants"]:
            g["plants"].append(plant)
        reg = g["regions"].setdefault(r["region"], {})
        for y, v in r["vol"].items():
            reg[y] = reg.get(y, 0.0) + v
    out = list(gens.values())
    for g in out:
        g["label"] = "%s %s" % (g["brand"], g["nameplate"]) if not norm(g["nameplate"]).startswith(norm(g["brand"])) else g["nameplate"]
        g["sop_year"] = g["sop"][0] if g["sop"] else None
    out.sort(key=lambda g: (norm(g["brand"]), norm(g["nameplate"]), g["sop_year"] or 0))
    return out


# ---------------------------------------------------------------- 데이터베이스

class Database:
    """파일 하나를 읽어 메모리에 둡니다. 파일이 바뀌면 다음 요청 때 다시 읽습니다."""

    def __init__(self, base_dir: str, file: str, sheet: str = "", vintage: str = ""):
        self.base_dir = base_dir
        self.path = file if os.path.isabs(file) else os.path.join(base_dir, file)
        self.sheet = sheet
        self.vintage_setting = vintage
        self.columns_path = os.path.join(base_dir, "config", "columns.ini")
        self.regions_path = os.path.join(base_dir, "config", "regions.csv")
        self.aliases_path = os.path.join(base_dir, "config", "aliases.csv")
        self._lock = threading.Lock()
        self._stamp = None
        self.state: Optional[dict] = None
        self.error: Optional[str] = None

    def _file_stamp(self):
        parts = []
        for p in (self.path, self.columns_path, self.regions_path, self.aliases_path):
            try:
                st = os.stat(p)
                parts.append((p, st.st_mtime_ns, st.st_size))
            except OSError:
                parts.append((p, None, None))
        return tuple(parts)

    def current(self) -> dict:
        stamp = self._file_stamp()
        if stamp == self._stamp and (self.state or self.error):
            if self.error:
                raise DataError(self.error)
            return self.state
        with self._lock:
            if stamp != self._stamp:
                try:
                    self.state = self._load()
                    self.error = None
                except (DataError, OSError, ValueError, KeyError) as e:
                    self.state = None
                    self.error = str(e) if isinstance(e, DataError) else "%s: %s" % (type(e).__name__, e)
                self._stamp = stamp
        if self.error:
            raise DataError(self.error)
        return self.state

    def _cache_path(self) -> str:
        d = os.path.join(self.base_dir, "data", ".cache")
        return os.path.join(d, hashlib.sha1(os.path.abspath(self.path).encode("utf-8")).hexdigest()[:12] + ".json")

    def _load(self) -> dict:
        if not os.path.exists(self.path):
            raise DataError("데이터 파일이 없습니다: %s (config/settings.ini 의 [data] file 확인)" % self.path)
        spec = ColumnSpec(self.columns_path)
        labels, order = load_regions(self.regions_path)
        st = os.stat(self.path)
        key = {"v": CACHE_VERSION, "mtime": st.st_mtime_ns, "size": st.st_size, "cols": spec.digest,
               "sheet": self.sheet, "regions": sorted(labels.items())}
        cache = self._cache_path()
        result = None
        try:
            with open(cache, encoding="utf-8") as f:
                cached = json.load(f)
            if cached.get("key") == json.loads(json.dumps(key)):
                result = cached["data"]
                for g in result["generations"]:
                    for reg in g["regions"]:
                        g["regions"][reg] = {int(y): v for y, v in g["regions"][reg].items()}
                    g["sop"] = tuple(g["sop"]) if g["sop"] else None
                    g["eop"] = tuple(g["eop"]) if g["eop"] else None
        except (OSError, ValueError, KeyError):
            result = None
        if result is None:
            raw = read_records(self.path, self.sheet, spec, labels)
            gens = build_generations(raw["records"])
            result = {
                "generations": gens,
                "years": raw["years"],
                "rows": len(raw["records"]),
                "skipped": raw["skipped"],
                "header_row": raw["header_row"],
                "columns": raw["columns"],
                "quarters_only_years": raw["quarters_only_years"],
            }
            try:
                os.makedirs(os.path.dirname(cache), exist_ok=True)
                tmp = cache + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump({"key": key, "data": result}, f, ensure_ascii=False)
                os.replace(tmp, cache)
            except OSError:
                pass
        gens = result["generations"]
        by_id = {g["id"]: g for g in gens}
        brands: Dict[str, dict] = {}
        groups: Dict[str, dict] = {}
        for g in gens:
            b = brands.setdefault(g["brand"], {"name": g["brand"], "group": g["group"], "count": 0})
            b["count"] += 1
            if g["group"]:
                gr = groups.setdefault(g["group"], {"name": g["group"], "count": 0, "brands": []})
                gr["count"] += 1
                if g["brand"] not in gr["brands"]:
                    gr["brands"].append(g["brand"])
        region_set = sorted({r for g in gens for r in g["regions"]}, key=lambda r: (order.get(r, 99), r))
        vintage = self.vintage_setting or dt.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d 파일")
        return {
            **result,
            "by_id": by_id,
            "brands": brands,
            "groups": groups,
            "regions": region_set,
            "region_order": order,
            "aliases": load_aliases(self.aliases_path),
            "file": os.path.basename(self.path),
            "vintage": vintage,
            "loaded_at": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        }


# ---------------------------------------------------------------- 고객 찾기

def resolve_customer(state: dict, query: str) -> List[dict]:
    """입력한 고객 이름을 브랜드 또는 그룹 후보로 바꿉니다. 정확히 맞는 것이 먼저 옵니다."""
    q = norm(query)
    if not q:
        return []
    brands, groups = state["brands"], state["groups"]
    nb = {norm(k): k for k in brands}
    ng = {norm(k): k for k in groups}
    found: List[Tuple[int, str, str, str]] = []  # (순위, 종류, 이름, 근거)

    def add(rank, typ, name, why):
        if (typ == "brand" and name in brands) or (typ == "group" and name in groups):
            if not any(f[1] == typ and f[2] == name for f in found):
                found.append((rank, typ, name, why))

    for alias, typ, target in state["aliases"]:
        if norm(alias) == q:
            name = (nb if typ == "brand" else ng).get(norm(target), target)
            add(0, typ, name, "별칭 '%s'" % alias)
    if q in nb:
        add(1, "brand", nb[q], "브랜드 이름")
    if q in ng:
        add(1, "group", ng[q], "그룹 이름")
    if len(q) >= 2:
        for k, name in nb.items():
            if q in k or (len(k) >= 3 and k in q):
                add(2, "brand", name, "이름 일부")
        for k, name in ng.items():
            if q in k or (len(k) >= 3 and k in q):
                add(3, "group", name, "이름 일부")
        for alias, typ, target in state["aliases"]:
            na = norm(alias)
            if len(q) >= 2 and (q in na or (len(na) >= 3 and na in q)):
                name = (nb if typ == "brand" else ng).get(norm(target), target)
                add(4, typ, name, "별칭 '%s'" % alias)
    found.sort(key=lambda f: (f[0], f[2]))
    out = []
    for rank, typ, name, why in found[:12]:
        if typ == "brand":
            b = brands[name]
            out.append({"type": "brand", "name": name, "group": b["group"], "count": b["count"], "why": why})
        else:
            g = groups[name]
            out.append({"type": "group", "name": name, "brands": g["brands"], "count": g["count"], "why": why})
    return out


def vehicles_for(state: dict, typ: str, name: str) -> List[dict]:
    gens = state["generations"]
    if typ == "group":
        sel = [g for g in gens if g["group"] == name]
    else:
        sel = [g for g in gens if g["brand"] == name]
    return sel
