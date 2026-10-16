"""xlsx 읽기/쓰기. 표준 라이브러리만 씁니다 (zipfile + xml).

읽기: 시트 하나를 행 단위로 돌려줍니다. 서식, 수식은 무시하고 저장된 값만 읽습니다.
쓰기: 문자열과 숫자로 된 단순한 표만 씁니다. 결과 내보내기와 예제 데이터 생성에 씁니다.
"""
from __future__ import annotations

import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Iterator, List, Optional, Sequence
from xml.sax.saxutils import escape

_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_CELL_RE = re.compile(r"([A-Z]+)(\d+)")


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _col_index(letters: str) -> int:
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def col_letter(idx: int) -> str:
    s = ""
    idx += 1
    while idx:
        idx, r = divmod(idx - 1, 26)
        s = chr(65 + r) + s
    return s


def sheet_names(path: str) -> List[str]:
    with zipfile.ZipFile(path) as z:
        return [name for name, _ in _sheets(z)]


def _sheets(z: zipfile.ZipFile):
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    targets = {}
    for rel in rels:
        target = rel.get("Target", "")
        if target.startswith("/"):
            target = target[1:]
        elif not target.startswith("xl/"):
            target = "xl/" + target
        targets[rel.get("Id")] = target
    out = []
    for el in wb.iter():
        if _local(el.tag) == "sheet":
            rid = el.get("{%s}id" % _REL_NS) or el.get("id")
            out.append((el.get("name"), targets.get(rid)))
    return out


def _shared_strings(z: zipfile.ZipFile) -> List[str]:
    try:
        data = z.open("xl/sharedStrings.xml")
    except KeyError:
        return []
    out: List[str] = []
    with data:
        for _, el in ET.iterparse(data, events=("end",)):
            if _local(el.tag) == "si":
                parts = []
                for child in el:
                    name = _local(child.tag)
                    if name == "t":
                        parts.append(child.text or "")
                    elif name == "r":
                        for t in child:
                            if _local(t.tag) == "t":
                                parts.append(t.text or "")
                    # rPh(후리가나)는 건너뜁니다
                out.append("".join(parts))
                el.clear()
    return out


def read_rows(path: str, sheet: Optional[str] = None) -> Iterator[list]:
    """시트의 행을 리스트로 돌려줍니다. 빈 칸은 None. 숫자는 float, 문자열은 str."""
    with zipfile.ZipFile(path) as z:
        sheets = _sheets(z)
        if not sheets:
            return
        target = sheets[0][1]
        if sheet:
            match = [t for n, t in sheets if n == sheet]
            if not match:
                raise ValueError("시트를 찾지 못했습니다: %s (있는 시트: %s)"
                                 % (sheet, ", ".join(n for n, _ in sheets)))
            target = match[0]
        strings = _shared_strings(z)
        with z.open(target) as f:
            next_row = 0
            for _, el in ET.iterparse(f, events=("end",)):
                if _local(el.tag) != "row":
                    continue
                r = el.get("r")
                row_idx = int(r) - 1 if r else next_row
                while next_row < row_idx:  # 비어 있어 생략된 행
                    yield []
                    next_row += 1
                values: list = []
                col = 0
                for c in el:
                    if _local(c.tag) != "c":
                        continue
                    ref = c.get("r")
                    if ref:
                        m = _CELL_RE.match(ref)
                        if m:
                            col = _col_index(m.group(1))
                    t = c.get("t", "n")
                    v = None
                    raw = None
                    for child in c:
                        name = _local(child.tag)
                        if name == "v":
                            raw = child.text
                        elif name == "is":
                            raw = "".join(x.text or "" for x in child.iter() if _local(x.tag) == "t")
                    if raw is not None:
                        if t == "s":
                            v = strings[int(raw)]
                        elif t in ("str", "inlineStr"):
                            v = raw
                        elif t == "b":
                            v = raw == "1"
                        elif t == "e":
                            v = None
                        else:
                            try:
                                v = float(raw)
                            except ValueError:
                                v = raw
                    while len(values) < col:
                        values.append(None)
                    values.append(v)
                    col += 1
                yield values
                next_row = row_idx + 1
                el.clear()


# ---------------------------------------------------------------- 쓰기

def _cell_xml(ref: str, value, style: int = 0) -> str:
    s = ' s="%d"' % style if style else ""
    if value is None or value == "":
        return '<c r="%s"%s/>' % (ref, s) if style else ""
    if isinstance(value, bool):
        return '<c r="%s" t="b"%s><v>%d</v></c>' % (ref, s, int(value))
    if isinstance(value, (int, float)):
        return '<c r="%s"%s><v>%s</v></c>' % (ref, s, repr(float(value)) if isinstance(value, float) else value)
    text = escape(str(value))
    return '<c r="%s" t="inlineStr"%s><is><t xml:space="preserve">%s</t></is></c>' % (ref, s, text)


# 스타일 번호: 0 기본, 1 굵게(머리글), 2 날짜(yyyy-mm), 3 천 단위 숫자, 4 소수 둘째 자리, 5 백분율
STYLE_HEADER, STYLE_DATE, STYLE_INT, STYLE_DEC, STYLE_PCT = 1, 2, 3, 4, 5

_STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Malgun Gothic"/></font><font><b/><sz val="11"/><name val="Malgun Gothic"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>"""


class Sheet:
    def __init__(self, name: str):
        self.name = name[:31]
        self.rows: List[list] = []
        self.styles: List[list] = []
        self.widths: dict = {}

    def append(self, values: Sequence, styles: Optional[Sequence[int]] = None, style: int = 0):
        self.rows.append(list(values))
        if styles is None:
            styles = [style] * len(values)
        self.styles.append(list(styles))

    def _xml(self) -> str:
        out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
               '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">']
        if self.widths:
            out.append("<cols>")
            for idx in sorted(self.widths):
                out.append('<col min="%d" max="%d" width="%s" customWidth="1"/>' % (idx + 1, idx + 1, self.widths[idx]))
            out.append("</cols>")
        out.append("<sheetData>")
        for r, (row, styles) in enumerate(zip(self.rows, self.styles), start=1):
            cells = "".join(_cell_xml("%s%d" % (col_letter(c), r), v, styles[c] if c < len(styles) else 0)
                            for c, v in enumerate(row))
            out.append('<row r="%d">%s</row>' % (r, cells))
        out.append("</sheetData></worksheet>")
        return "".join(out)


class Workbook:
    def __init__(self):
        self.sheets: List[Sheet] = []

    def add_sheet(self, name: str) -> Sheet:
        sh = Sheet(name)
        self.sheets.append(sh)
        return sh

    def save(self, target) -> None:
        """target 은 파일 경로 또는 쓰기 가능한 바이너리 객체."""
        n = len(self.sheets)
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("[Content_Types].xml",
                       '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                       '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                       '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                       '<Default Extension="xml" ContentType="application/xml"/>'
                       '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                       '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                       + "".join('<Override PartName="/xl/worksheets/sheet%d.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' % (i + 1) for i in range(n))
                       + "</Types>")
            z.writestr("_rels/.rels",
                       '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                       '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                       '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                       "</Relationships>")
            z.writestr("xl/workbook.xml",
                       '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                       '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                       'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
                       + "".join('<sheet name="%s" sheetId="%d" r:id="rId%d"/>' % (escape(s.name, {'"': "&quot;"}), i + 1, i + 1)
                                 for i, s in enumerate(self.sheets))
                       + "</sheets></workbook>")
            z.writestr("xl/_rels/workbook.xml.rels",
                       '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                       '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                       + "".join('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet%d.xml"/>' % (i + 1, i + 1) for i in range(n))
                       + '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' % (n + 1)
                       + "</Relationships>")
            z.writestr("xl/styles.xml", _STYLES)
            for i, s in enumerate(self.sheets):
                z.writestr("xl/worksheets/sheet%d.xml" % (i + 1), s._xml())
