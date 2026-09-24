# -*- coding: utf-8 -*-
"""한국 사내 데이터에서 실제로 문제가 되는 부분을 처리하는 표 읽기/쓰기 모듈.

여기 담긴 것은 폐쇄망 안에서 직접 부딪히면 시간을 잡아먹는 것들입니다.

- CP949(EUC-KR) 로 저장된 CSV 자동 판별
- 엑셀이 읽을 수 있는 CSV 쓰기 (UTF-8 BOM)
- 한글이 섞인 열 너비 계산 (한글 한 글자는 영문 두 글자 폭)
- "1,234" 같은 문자열 숫자 변환
- 시트 이름 제약 (31자, 금지 문자)
- 큰 파일 읽기 (read_only 모드)

표준 라이브러리와 openpyxl 만 씁니다.
"""

from __future__ import annotations

import csv
import io
import os
import re
import unicodedata
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

Record = Dict[str, Any]

# CSV 인코딩 후보. 앞에서부터 시도합니다.
_ENCODINGS = ("utf-8-sig", "utf-8", "cp949")

# 엑셀 시트 이름에 쓸 수 없는 문자
_BAD_SHEET_CHARS = re.compile(r"[\[\]:*?/\\]")


# ---------------------------------------------------------------- 읽기


def detect_encoding(path: str) -> str:
    """파일을 실제로 디코딩해 보고 성공하는 인코딩을 돌려줍니다.

    바이트 패턴 추측이 아니라 전체 디코딩을 시도하므로 판별이 어긋나지 않습니다.
    파일이 아주 크면 앞 1MB 만 봅니다.
    """
    with open(path, "rb") as fh:
        head = fh.read(1024 * 1024)
    for enc in _ENCODINGS:
        try:
            head.decode(enc)
            return enc
        except UnicodeDecodeError:
            continue
    # 전부 실패하면 손실을 감수하고 cp949 로 읽습니다.
    return "cp949"


def sniff_delimiter(sample: str) -> str:
    """구분자를 추정합니다. 쉼표, 탭, 세미콜론, 파이프 중 가장 일관된 것."""
    lines = [ln for ln in sample.splitlines()[:5] if ln]
    if not lines:
        return ","
    best, best_score = ",", -1
    for d in (",", "\t", ";", "|"):
        counts = [ln.count(d) for ln in lines]
        if counts[0] == 0:
            continue
        consistent = all(c == counts[0] for c in counts)
        score = counts[0] * (10 if consistent else 1)
        if score > best_score:
            best, best_score = d, score
    return best


def read_csv(path: str, encoding: Optional[str] = None,
             delimiter: Optional[str] = None) -> List[Record]:
    """CSV 를 객체 리스트로 읽습니다. 첫 줄이 헤더입니다.

    encoding 을 주지 않으면 UTF-8 과 CP949 중에서 자동으로 고릅니다.
    """
    enc = encoding or detect_encoding(path)
    with open(path, "r", encoding=enc, newline="") as fh:
        text = fh.read()
    d = delimiter or sniff_delimiter(text[:4000])
    reader = csv.reader(io.StringIO(text), delimiter=d)
    rows = list(reader)
    if not rows:
        return []
    columns = _dedupe_headers(rows[0])
    out: List[Record] = []
    for raw in rows[1:]:
        if not any(str(c).strip() for c in raw):
            continue  # 빈 줄 건너뜀
        rec = {col: (raw[i] if i < len(raw) else "") for i, col in enumerate(columns)}
        out.append(rec)
    return out


def read_xlsx(path: str, sheet: Optional[str] = None,
              header_row: int = 1) -> List[Record]:
    """xlsx 를 객체 리스트로 읽습니다.

    read_only 모드라 수만 행도 메모리를 덜 씁니다. 수식은 마지막 계산값으로 읽힙니다.
    """
    wb = load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb[sheet] if sheet else wb[wb.sheetnames[0]]
        rows = ws.iter_rows(values_only=True)
        columns: Optional[List[str]] = None
        out: List[Record] = []
        for idx, raw in enumerate(rows, start=1):
            if idx < header_row:
                continue
            if columns is None:
                columns = _dedupe_headers(["" if c is None else str(c) for c in raw])
                continue
            if all(c is None or str(c).strip() == "" for c in raw):
                continue
            rec = {col: (raw[i] if i < len(raw) else None) for i, col in enumerate(columns)}
            out.append(rec)
        return out
    finally:
        wb.close()


def read_table(path: str, **kwargs: Any) -> List[Record]:
    """확장자를 보고 read_csv 또는 read_xlsx 로 보냅니다."""
    ext = os.path.splitext(path)[1].lower()
    if ext in (".csv", ".txt", ".tsv"):
        return read_csv(path, **kwargs)
    if ext in (".xlsx", ".xlsm"):
        return read_xlsx(path, **kwargs)
    raise ValueError(
        "지원하지 않는 확장자입니다: %s (csv, txt, tsv, xlsx, xlsm 만 됩니다)" % ext
    )


def _dedupe_headers(raw: Sequence[Any]) -> List[str]:
    """빈 헤더와 중복 헤더를 정리합니다."""
    seen: Dict[str, int] = {}
    out: List[str] = []
    for i, name in enumerate(raw):
        key = str(name).strip() or "col%d" % (i + 1)
        if key in seen:
            seen[key] += 1
            key = "%s_%d" % (key, seen[key])
        else:
            seen[key] = 1
        out.append(key)
    return out


# ---------------------------------------------------------------- 값 정리


def to_number(value: Any) -> Optional[float]:
    """문자열 숫자를 float 로 바꿉니다. 숫자가 아니면 None.

    "1,234", " 1234 ", "(1234)" (회계식 음수), "1234원" 을 처리합니다.
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return None
    negative = s.startswith("(") and s.endswith(")")
    if negative:
        s = s[1:-1]
    s = s.replace(",", "").replace(" ", "")
    s = re.sub(r"(원|개|건|명|%)$", "", s)
    try:
        n = float(s)
    except ValueError:
        return None
    return -n if negative else n


def to_date(value: Any) -> Optional[date]:
    """흔한 한국식 날짜 표기를 date 로 바꿉니다. 실패하면 None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    if not s:
        return None
    s = s.replace(".", "-").replace("/", "-")
    s = re.sub(r"\s*년\s*", "-", s)
    s = re.sub(r"\s*월\s*", "-", s)
    s = re.sub(r"\s*일\s*$", "", s).strip("-")
    for fmt in ("%Y-%m-%d", "%Y%m%d", "%y-%m-%d", "%Y-%m"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def display_width(text: str) -> int:
    """화면에 차지하는 폭. 한글, 한자, 전각 기호는 2로 셉니다.

    엑셀의 열 너비 단위가 영문 기준이라 한글 열은 이렇게 세지 않으면 잘립니다.
    """
    width = 0
    for ch in str(text):
        width += 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
    return width


def safe_sheet_name(name: str, fallback: str = "Sheet1") -> str:
    """엑셀 시트 이름 제약에 맞춥니다. 31자 제한과 금지 문자 []:*?/\\ ."""
    cleaned = _BAD_SHEET_CHARS.sub("_", str(name)).strip().strip("'")
    if not cleaned:
        return fallback
    return cleaned[:31]


# ---------------------------------------------------------------- 쓰기


def write_csv(path: str, columns: Sequence[str], records: Iterable[Record]) -> None:
    """엑셀에서 바로 열리는 CSV 를 씁니다.

    utf-8-sig(BOM) 로 씁니다. BOM 이 없으면 엑셀이 CP949 로 읽어 한글이 전부 깨집니다.
    줄바꿈은 CRLF 입니다.
    """
    with open(path, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(columns), extrasaction="ignore",
                                lineterminator="\r\n")
        writer.writeheader()
        for rec in records:
            writer.writerow(rec)


def write_sheet(ws: Worksheet, columns: Sequence[str], records: Sequence[Record],
                number_formats: Optional[Dict[str, str]] = None,
                max_width: int = 50) -> None:
    """워크시트 하나에 표를 씁니다.

    머리글 스타일, 틀 고정, 자동 필터, 한글을 고려한 열 너비까지 적용합니다.

    number_formats 예: {"연봉": "#,##0", "입사일": "yyyy-mm-dd", "비율": "0.0%"}
    """
    number_formats = number_formats or {}

    header_fill = PatternFill("solid", fgColor="EAEEF3")
    header_font = Font(bold=True, color="16191D")
    thin = Side(style="thin", color="D4DAE1")
    border = Border(bottom=thin)

    for c, name in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=c, value=name)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = border
        cell.alignment = Alignment(vertical="center")

    for r, rec in enumerate(records, start=2):
        for c, name in enumerate(columns, start=1):
            cell = ws.cell(row=r, column=c, value=rec.get(name))
            fmt = number_formats.get(name)
            if fmt:
                cell.number_format = fmt

    # 열 너비: 머리글과 앞 200행만 보고 정합니다. 전체를 보면 큰 파일에서 느려집니다.
    sample = records[:200]
    for c, name in enumerate(columns, start=1):
        widest = display_width(name)
        for rec in sample:
            v = rec.get(name)
            if v is None:
                continue
            widest = max(widest, display_width(v))
        ws.column_dimensions[get_column_letter(c)].width = min(widest + 3, max_width)

    ws.freeze_panes = "A2"
    if records:
        ws.auto_filter.ref = "A1:%s%d" % (get_column_letter(len(columns)), len(records) + 1)


def write_xlsx(path: str, sheets: Dict[str, Sequence[Record]],
               columns_by_sheet: Optional[Dict[str, Sequence[str]]] = None,
               number_formats: Optional[Dict[str, Dict[str, str]]] = None) -> str:
    """여러 시트를 가진 xlsx 를 씁니다. 실제로 저장된 경로를 돌려줍니다.

    columns_by_sheet 를 주지 않으면 각 시트 첫 레코드의 키 순서를 씁니다.
    """
    columns_by_sheet = columns_by_sheet or {}
    number_formats = number_formats or {}

    wb = Workbook()
    wb.remove(wb.active)
    used: set = set()
    for name, records in sheets.items():
        sheet_name = safe_sheet_name(name)
        base = sheet_name
        n = 2
        while sheet_name in used:  # 잘린 이름이 겹칠 수 있습니다
            suffix = "_%d" % n
            sheet_name = base[: 31 - len(suffix)] + suffix
            n += 1
        used.add(sheet_name)

        ws = wb.create_sheet(sheet_name)
        cols = list(columns_by_sheet.get(name) or (list(records[0].keys()) if records else []))
        write_sheet(ws, cols, list(records), number_formats.get(name))

    if not wb.sheetnames:
        wb.create_sheet("Sheet1")

    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    wb.save(path)
    return path
