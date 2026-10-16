"""계산 결과를 엑셀 파일로 만듭니다."""
from __future__ import annotations

import io

from . import xlsx
from .xlsx import STYLE_HEADER, STYLE_INT, STYLE_DEC, STYLE_PCT

STATUS = {"risk": "Risk", "opportunity": "Opportunity", "ok": "적정", None: ""}


def _ym(v):
    return "%d-%02d" % (v[0], v[1]) if v else ""


def build(res: dict, req: dict, meta: dict) -> bytes:
    wb = xlsx.Workbook()

    s = wb.add_sheet("요약")
    s.widths = {0: 18, 1: 100}
    s.append(["차량 물동 적정성 평가"], style=STYLE_HEADER)
    s.append([])
    s.append(["결과", res["board"]["text"]])
    s.append(["판정", STATUS.get(res["verdict"], "")])
    t = res["totals"]
    s.append(["누적 고객 물동 (pcs)", t["customer"]], [0, STYLE_INT])
    s.append(["누적 예상 물동 (pcs)", t["expected"]], [0, STYLE_INT])
    s.append(["누적 수량 Gap (pcs)", t["gap"]], [0, STYLE_INT])
    s.append(["누적 금액 Gap", t["gap_amt"] if t["gap_amt"] is not None else "판가 없음"], [0, STYLE_INT])
    s.append([])
    s.append(["고객", "%s (%s)" % (req.get("customer", {}).get("name", ""),
                                 "그룹" if req.get("customer", {}).get("type") == "group" else "브랜드")])
    s.append(["공급 지역", ", ".join(res["inputs"]["regions"]) or "전체"])
    s.append(["옵션율 (기본)", res["inputs"]["option"]], [0, STYLE_PCT])
    s.append(["이원화", "예, 자사 비중 %d%%" % round(res["inputs"]["share"] * 100) if res["inputs"]["dual"] else "아니오"])
    s.append(["대당 사용량 (기본)", res["inputs"]["ppv"]], [0, STYLE_DEC])
    s.append(["허용 범위", res["tolerance"]], [0, STYLE_PCT])
    s.append(["데이터", "%s (기준 %s)" % (meta.get("file", ""), meta.get("vintage", ""))])
    s.append([])
    s.append(["경고"], style=STYLE_HEADER)
    for w in res["warnings"]:
        s.append(["", w["text"]])

    y = wb.add_sheet("연도별")
    y.widths = {i: 16 for i in range(11)}
    y.append(["연도", "DB 생산 대수", "예상 물동(pcs)", "고객 물동(pcs)", "수량 Gap(pcs)", "Gap 비율",
              "판가", "금액 Gap", "누적 수량 Gap", "역산 옵션율", "판정"], style=STYLE_HEADER)
    for r in res["rows"]:
        y.append([r["year"], r["vehicles"], r["expected"], r["customer"], r["gap"], r.get("gap_ratio"),
                  r["price"], r["gap_amt"], r["cum_gap"], r["implied_option"], STATUS.get(r["status"], "")],
                 [0, STYLE_INT, STYLE_INT, STYLE_INT, STYLE_INT, STYLE_PCT, STYLE_DEC, STYLE_INT, STYLE_INT, STYLE_PCT, 0])

    v = wb.add_sheet("차종별")
    years = res["years"]
    v.widths = {0: 32, 1: 10, 2: 10, 3: 10, 4: 10, 5: 10}
    v.append(["차종", "SOP", "EOP", "옵션율", "자사 비중", "대당 사용량"] + ["%d 예상(pcs)" % yy for yy in years],
             style=STYLE_HEADER)
    for veh in res["vehicles"]:
        v.append([veh["label"], _ym(veh["sop"]), _ym(veh["eop"]), veh["option"], veh["share"], veh["ppv"]]
                 + [veh["by_year"].get(yy, 0.0) for yy in years],
                 [0, 0, 0, STYLE_PCT, STYLE_PCT, STYLE_DEC] + [STYLE_INT] * len(years))
    v.append([])
    v.append(["차종", "", "", "", "", ""] + ["%d 생산 대수" % yy for yy in years], style=STYLE_HEADER)
    for veh in res["vehicles"]:
        v.append([veh["label"], "", "", "", "", ""] + [veh["vehicles_by_year"].get(yy, 0.0) for yy in years],
                 [0] * 6 + [STYLE_INT] * len(years))

    rg = wb.add_sheet("지역별")
    rg.widths = {0: 16}
    rg.append(["지역", "비중"] + [str(yy) for yy in years], style=STYLE_HEADER)
    mix = {m["region"]: m["share"] for m in res["region_mix"]}
    for reg, vals in sorted(res["region_by_year"].items(), key=lambda kv: -mix.get(kv[0], 0)):
        rg.append([reg, mix.get(reg, 0.0)] + [vals.get(yy, 0.0) for yy in years],
                  [0, STYLE_PCT] + [STYLE_INT] * len(years))

    if res["sensitivity"]:
        se = wb.add_sheet("민감도")
        se.widths = {0: 24}
        steps = res["sensitivity"]["steps"]
        se.append(["누적 수량 Gap (pcs)", "옵션율 변화 →"], style=STYLE_HEADER)
        se.append(["자사 비중 변화 ↓"] + ["%+d%%p" % d for d in steps], style=STYLE_HEADER)
        for ds, line in zip(steps, res["sensitivity"]["grid"]):
            se.append(["%+d%%p" % ds] + line, [0] + [STYLE_INT] * len(line))

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
