"""계산 합격 기준. python -m unittest discover -s tests"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import calc  # noqa: E402


def gen(gid, label, regions, sop=(2027, 1), eop=(2033, 12)):
    return {"id": gid, "label": label, "brand": "Audi", "nameplate": label, "sop": sop, "eop": eop,
            "sop_year": sop[0], "regions": regions}


A = gen("a", "Audi A5", {"유럽": {2027: 100000, 2028: 200000}, "중국": {2027: 100000, 2028: 0}})
B = gen("b", "Audi Q5", {"유럽": {2027: 50000, 2028: 50000}})
YEARS = [2027, 2028, 2029]


class CalcTest(unittest.TestCase):
    def test_option_and_dual_multiply(self):
        # 옵션 30%, 이원화 50% -> 차량의 15%
        r = calc.compute([A], {"option": 30, "dual": True, "share": 50, "customer_qty": {"2027": 30000}}, YEARS)
        self.assertAlmostEqual(r["rows"][0]["expected"], 200000 * 0.15)
        self.assertAlmostEqual(r["rows"][0]["gap"], 0)
        self.assertEqual(r["rows"][0]["status"], "ok")

    def test_share_ignored_when_not_dual(self):
        r = calc.compute([A], {"option": 100, "dual": False, "share": 50}, YEARS)
        self.assertAlmostEqual(r["rows"][0]["expected"], 200000)

    def test_pieces_per_vehicle(self):
        r = calc.compute([A], {"option": 100, "ppv": 2}, YEARS)
        self.assertAlmostEqual(r["rows"][1]["expected"], 400000)

    def test_risk_when_customer_bigger(self):
        # 조사기관 숫자가 고객보다 작으면 Risk
        r = calc.compute([B], {"option": 100, "customer_qty": {2027: 80000, 2028: 80000}}, YEARS)
        self.assertEqual(r["verdict"], "risk")
        self.assertAlmostEqual(r["totals"]["gap"], 100000 - 160000)
        self.assertEqual(r["rows"][0]["status"], "risk")

    def test_opportunity_when_customer_smaller(self):
        r = calc.compute([B], {"option": 100, "customer_qty": {2027: 20000}}, YEARS)
        self.assertEqual(r["verdict"], "opportunity")
        self.assertIn("Opportunity", r["board"]["text"])

    def test_tolerance_band(self):
        r = calc.compute([B], {"option": 100, "customer_qty": {2027: 54000}}, YEARS, tolerance=10)
        self.assertEqual(r["verdict"], "ok")
        r = calc.compute([B], {"option": 100, "customer_qty": {2027: 54000}}, YEARS, tolerance=5)
        self.assertEqual(r["verdict"], "risk")

    def test_supply_region_filter(self):
        r = calc.compute([A], {"option": 100, "regions": ["중국"]}, YEARS)
        self.assertAlmostEqual(r["rows"][0]["expected"], 100000)
        self.assertAlmostEqual(r["rows"][1]["expected"], 0)
        # 지역 비중 문장은 공급 지역과 상관없이 차종 전체 기준
        self.assertIn("유럽", r["board"]["lines"][0])
        self.assertIn("공급 대상: 중국", r["board"]["lines"][0])

    def test_vehicle_override(self):
        req = {"option": 50, "vehicles": [{"id": "b", "option": 100, "ppv": 2}]}
        r = calc.compute([A, B], req, YEARS)
        self.assertAlmostEqual(r["rows"][0]["expected"], 200000 * 0.5 + 50000 * 2)

    def test_amount_and_missing_price(self):
        r = calc.compute([B], {"option": 100, "customer_qty": {2027: 60000, 2028: 60000}, "price": {2027: 10}}, YEARS)
        self.assertAlmostEqual(r["totals"]["gap_amt"], -10000 * 10)
        self.assertTrue(any("2028년은 판가가 없어" in w["text"] for w in r["warnings"]))

    def test_no_price_no_amount(self):
        r = calc.compute([B], {"option": 100, "customer_qty": {2027: 60000}}, YEARS)
        self.assertIsNone(r["totals"]["gap_amt"])
        self.assertNotIn("M$", r["board"]["text"])

    def test_implied_option(self):
        r = calc.compute([B], {"option": 30, "dual": True, "share": 50, "customer_qty": {2027: 50000}}, YEARS)
        # 50000 / (50000 x 0.5) = 200%
        self.assertAlmostEqual(r["rows"][0]["implied_option"], 2.0)
        self.assertTrue(any("100%를 넘어야" in w["text"] for w in r["warnings"]))

    def test_no_production_years(self):
        r = calc.compute([B], {"option": 100, "customer_qty": {2029: 1000}}, YEARS)
        self.assertTrue(r["rows"][2]["no_production"])
        self.assertTrue(any("2029년" in w["text"] for w in r["warnings"]))

    def test_eop_warning(self):
        short = gen("c", "Audi Q8", {"유럽": {2027: 1000}}, eop=(2027, 12))
        r = calc.compute([short], {"option": 100, "customer_qty": {2027: 1000, 2028: 1000}}, YEARS)
        self.assertTrue(any("EOP" in w["text"] for w in r["warnings"]))

    def test_cumulative_and_sensitivity(self):
        r = calc.compute([B], {"option": 50, "customer_qty": {2027: 25000, 2028: 30000}}, YEARS)
        self.assertAlmostEqual(r["rows"][1]["cum_gap"], (25000 - 25000) + (25000 - 30000))
        grid = r["sensitivity"]["grid"]
        mid = len(grid) // 2
        self.assertAlmostEqual(grid[mid][mid], r["totals"]["gap"])
        # 옵션율 +10%p -> 두 해에 걸쳐 10000 늘어남
        self.assertAlmostEqual(grid[mid][mid + 1] - grid[mid][mid], 10000)

    def test_no_input_no_verdict(self):
        r = calc.compute([B], {"option": 100}, YEARS)
        self.assertIsNone(r["verdict"])
        self.assertIsNone(r["sensitivity"])

    def test_years_text(self):
        self.assertEqual(calc._years_text([2027, 2028, 2029, 2031]), "2027~2029, 2031")

    def test_board_format(self):
        r = calc.compute([A, B], {"option": 100, "customer_qty": {2027: 400000}, "price": {2027: 25}}, YEARS,
                         contact="홍길동")
        text = r["board"]["text"]
        self.assertIn("유럽 ", text)
        self.assertIn("150.0 Kpcs", text)
        self.assertIn("3.75 M$", text)
        self.assertIn("Risk", text)
        self.assertIn("담당자(홍길동)", text)


if __name__ == "__main__":
    unittest.main()
