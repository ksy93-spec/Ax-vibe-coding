"""파일 읽기와 고객 찾기. python -m unittest discover -s tests"""
import io
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from app import data, xlsx  # noqa: E402


def make_kit(tmp, rows, columns_ini=None):
    os.makedirs(os.path.join(tmp, "config"))
    os.makedirs(os.path.join(tmp, "data"))
    for name in ("columns.ini", "regions.csv", "aliases.csv"):
        shutil.copy(os.path.join(ROOT, "config", name), os.path.join(tmp, "config", name))
    if columns_ini:
        with open(os.path.join(tmp, "config", "columns.ini"), "w", encoding="utf-8") as f:
            f.write(columns_ini)
    wb = xlsx.Workbook()
    sh = wb.add_sheet("Data")
    for r in rows:
        sh.append(r)
    path = os.path.join(tmp, "data", "lvp.xlsx")
    wb.save(path)
    return path


class ParseTest(unittest.TestCase):
    def test_parse_ym(self):
        self.assertEqual(data.parse_ym(46569.0), (2027, 7))  # 2027-07-01 엑셀 날짜
        self.assertEqual(data.parse_ym("2027-07"), (2027, 7))
        self.assertEqual(data.parse_ym("7/2027"), (2027, 7))
        self.assertEqual(data.parse_ym("07/01/2027"), (2027, 7))
        self.assertEqual(data.parse_ym("Jul 2027"), (2027, 7))
        self.assertEqual(data.parse_ym("Jul-27"), (2027, 7))
        self.assertEqual(data.parse_ym(2027), (2027, 1))
        self.assertIsNone(data.parse_ym(""))
        self.assertIsNone(data.parse_ym("TBD"))

    def test_norm(self):
        self.assertEqual(data.norm(" Q4 e-tron "), "q4etron")


class XlsxTest(unittest.TestCase):
    def test_roundtrip(self):
        wb = xlsx.Workbook()
        sh = wb.add_sheet("시트")
        sh.append(["가", None, 3.5, "<&>"])
        sh.append([])
        sh.append([None, None, None, 7])
        buf = io.BytesIO()
        wb.save(buf)
        tmp = tempfile.mkdtemp()
        try:
            p = os.path.join(tmp, "t.xlsx")
            with open(p, "wb") as f:
                f.write(buf.getvalue())
            rows = list(xlsx.read_rows(p))
            self.assertEqual(rows[0], ["가", None, 3.5, "<&>"])
            self.assertEqual(rows[1], [])
            self.assertEqual(rows[2], [None, None, None, 7.0])
            self.assertEqual(xlsx.sheet_names(p), ["시트"])
        finally:
            shutil.rmtree(tmp)


class DatabaseTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_header_detection_and_grouping(self):
        rows = [
            ["제목 줄"],
            [],
            ["Strategic Group", "Production Brand", "Production Nameplate", "Region", "SOP (Start of Production)",
             "EOP (End of Production)", "CY 2027", "CY 2028", "Q1 2029", "Q2 2029"],
            ["Volkswagen Group", "Audi", "A5", "West Europe", 46569.0, "2033-12", 100, 200, 10, 20],
            ["Volkswagen Group", "Audi", "A5", "Greater China", "2027-03", "2034-06", 50, 60, 1, 2],
            ["Volkswagen Group", "Audi", "A5", "Europe", "2020-01", "2027-06", 70, None, None, None],
            ["", "", "", "", "", "", 1, 1, 1, 1],
        ]
        make_kit(self.tmp, rows)
        db = data.Database(self.tmp, "data/lvp.xlsx")
        st = db.current()
        self.assertEqual(st["rows"], 3)
        self.assertEqual(st["skipped"], 1)
        self.assertEqual(st["header_row"], 3)
        self.assertEqual(st["years"], [2027, 2028, 2029])
        self.assertEqual(st["quarters_only_years"], [2029])
        self.assertEqual(len(st["generations"]), 2)  # SOP 2027 세대 하나 + 2020 세대 하나
        g27 = [g for g in st["generations"] if g["sop_year"] == 2027][0]
        self.assertEqual(g27["sop"], (2027, 3))  # 공장 중 가장 이른 SOP
        self.assertEqual(g27["eop"], (2034, 6))
        self.assertEqual(g27["regions"]["유럽"][2027], 100)
        self.assertEqual(g27["regions"]["중국"][2029], 3)  # 분기 합
        self.assertEqual(g27["label"], "Audi A5")

    def test_cache_and_reload(self):
        rows = [["Production Brand", "Production Nameplate", "Region", "SOP", "CY 2027"],
                ["Kia", "EV6", "Japan/Korea", "2021-07", 5]]
        path = make_kit(self.tmp, rows)
        db = data.Database(self.tmp, "data/lvp.xlsx")
        self.assertEqual(db.current()["rows"], 1)
        db2 = data.Database(self.tmp, "data/lvp.xlsx")  # 캐시에서 읽음
        g = db2.current()["generations"][0]
        self.assertEqual(g["regions"]["한국/일본"][2027], 5)
        self.assertEqual(g["sop"], (2021, 7))
        # 파일을 바꾸면 다시 읽음
        wb = xlsx.Workbook()
        sh = wb.add_sheet("Data")
        for r in rows + [["Kia", "EV9", "North America", "2023-05", 7]]:
            sh.append(r)
        wb.save(path)
        os.utime(path, (1, 1))
        self.assertEqual(db.current()["rows"], 2)

    def test_missing_column_message(self):
        make_kit(self.tmp, [["Brand X", "Model", "CY 2027"], ["a", "b", 1]])
        db = data.Database(self.tmp, "data/lvp.xlsx")
        with self.assertRaises(data.DataError) as cm:
            db.current()
        self.assertIn("columns.ini", str(cm.exception))

    def test_custom_column_names(self):
        with open(os.path.join(ROOT, "config", "columns.ini"), encoding="utf-8") as f:
            ini = f.read()
        ini = ini.replace("brand = Production Brand | Brand", "brand = 브랜드")
        make_kit(self.tmp, [["브랜드", "Nameplate", "Region", "SOP", "2027"], ["BMW", "X3", "North America", "2024-10", 9]], ini)
        st = data.Database(self.tmp, "data/lvp.xlsx").current()
        self.assertEqual(st["generations"][0]["regions"]["북미"][2027], 9)


class ResolveTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.st = data.Database(ROOT, "data/sample-lvp.xlsx").current()

    def test_alias_korean(self):
        c = data.resolve_customer(self.st, "아우디")
        self.assertEqual((c[0]["type"], c[0]["name"]), ("brand", "Audi"))

    def test_case_and_spaces(self):
        for q in ("audi", "Audi", " AUDI ", "Volkswagen audi", "AU"):
            self.assertEqual(data.resolve_customer(self.st, q)[0]["name"], "Audi", q)

    def test_group(self):
        c = data.resolve_customer(self.st, "volkswagen group")
        self.assertEqual((c[0]["type"], c[0]["name"]), ("group", "Volkswagen Group"))

    def test_partial(self):
        names = [x["name"] for x in data.resolve_customer(self.st, "merc")]
        self.assertIn("Mercedes-Benz", names)

    def test_unknown(self):
        self.assertEqual(data.resolve_customer(self.st, "zzzz"), [])


if __name__ == "__main__":
    unittest.main()
