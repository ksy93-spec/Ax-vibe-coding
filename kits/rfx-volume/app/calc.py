"""물동 적정성 계산. 데이터 파일과 화면에 의존하지 않는 순수 함수만 둡니다.

예상 물동(연도) = Σ 차종별 [생산 대수(연도, 공급 지역) x 옵션율 x 자사 비중 x 대당 사용량]
수량 Gap = 예상 물동 - 고객 물동      음수 = Risk (고객 숫자가 조사기관보다 큼), 양수 = 기회
금액 Gap = 수량 Gap x 판가
"""
from __future__ import annotations

from typing import Dict, List, Optional

SENS_STEPS = (-20, -10, 0, 10, 20)


def _pct(v, default: float) -> float:
    """0~100 의 퍼센트 값을 0~1 로. 비었으면 기본값."""
    if v is None or v == "":
        return default
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(100.0, x)) / 100.0


def _pos(v, default: float) -> float:
    if v is None or v == "":
        return default
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return max(0.0, x)


def _num_map(d) -> Dict[int, float]:
    out: Dict[int, float] = {}
    for k, v in (d or {}).items():
        if v is None or v == "":
            continue
        try:
            out[int(k)] = float(v)
        except (TypeError, ValueError):
            continue
    return out


def vehicle_volume(gen: dict, year: int, regions: Optional[List[str]]) -> float:
    total = 0.0
    for reg, vols in gen["regions"].items():
        if regions and reg not in regions:
            continue
        total += vols.get(year, 0.0)
    return total


def fmt_k(v: float) -> str:
    """수량을 Kpcs 로. 1,234.5"""
    return "{:,.1f}".format(v / 1000.0)


def fmt_m(v: float) -> str:
    return "{:,.2f}".format(v / 1_000_000.0)


def compute(gens: List[dict], req: dict, years: List[int], tolerance: float = 10.0,
            currency: str = "$", contact: str = "") -> dict:
    """gens: 선택한 차종 세대 (data.build_generations 의 항목). req: 화면 입력값."""
    regions = [r for r in (req.get("regions") or []) if r]
    dual = bool(req.get("dual"))
    g_opt = _pct(req.get("option"), 1.0)
    g_share = _pct(req.get("share"), 1.0) if dual else 1.0
    g_ppv = _pos(req.get("ppv"), 1.0)
    overrides = {o.get("id"): o for o in (req.get("vehicles") or []) if isinstance(o, dict)}
    customer = _num_map(req.get("customer_qty"))
    price = _num_map(req.get("price"))
    tol = max(0.0, float(tolerance)) / 100.0

    factors = []
    for g in gens:
        o = overrides.get(g["id"], {})
        opt = _pct(o.get("option"), g_opt)
        share = _pct(o.get("share"), g_share) if dual else 1.0
        ppv = _pos(o.get("ppv"), g_ppv)
        factors.append({"gen": g, "opt": opt, "share": share, "ppv": ppv})

    rows = []
    contrib = {f["gen"]["id"]: {} for f in factors}
    warnings = []
    for y in years:
        veh = 0.0
        exp = 0.0
        base = 0.0  # 옵션율을 뺀 값. 역산 옵션율 계산용
        for f in factors:
            v = vehicle_volume(f["gen"], y, regions)
            e = v * f["opt"] * f["share"] * f["ppv"]
            veh += v
            exp += e
            base += v * f["share"] * f["ppv"]
            contrib[f["gen"]["id"]][y] = e
        row = {"year": y, "vehicles": veh, "expected": exp, "customer": None, "gap": None,
               "price": price.get(y), "gap_amt": None, "customer_amt": None, "expected_amt": None,
               "implied_option": None, "status": None, "no_production": False}
        if y in customer:
            c = customer[y]
            gap = exp - c
            row["customer"] = c
            row["gap"] = gap
            if c > 0:
                ratio = gap / c
                row["gap_ratio"] = ratio
                row["status"] = "ok" if abs(ratio) <= tol else ("risk" if gap < 0 else "opportunity")
            else:
                row["gap_ratio"] = None
                row["status"] = "opportunity" if exp > 0 else "ok"
            if base > 0:
                row["implied_option"] = c / base
            if c > 0 and veh == 0:
                row["no_production"] = True
            if y in price:
                row["gap_amt"] = gap * price[y]
                row["customer_amt"] = c * price[y]
                row["expected_amt"] = exp * price[y]
        rows.append(row)

    entered = [r for r in rows if r["customer"] is not None]
    t_cust = sum(r["customer"] for r in entered)
    t_exp = sum(r["expected"] for r in entered)
    t_gap = t_exp - t_cust
    priced = [r for r in entered if r["gap_amt"] is not None]
    t_amt = sum(r["gap_amt"] for r in priced) if priced else None
    cum = 0.0
    cum_amt = 0.0
    for r in rows:
        if r["customer"] is not None:
            cum += r["gap"]
            r["cum_gap"] = cum
            if r["gap_amt"] is not None:
                cum_amt += r["gap_amt"]
            r["cum_gap_amt"] = cum_amt if priced else None
        else:
            r["cum_gap"] = None
            r["cum_gap_amt"] = None

    if not entered:
        verdict = None
    elif t_cust > 0 and abs(t_gap) / t_cust <= tol:
        verdict = "ok"
    else:
        verdict = "risk" if t_gap < 0 else "opportunity"

    # 경고
    np_years = [r["year"] for r in entered if r["no_production"]]
    if np_years:
        warnings.append({"level": "serious", "text": "%s년: 고객 물동은 있는데 선택한 차종의 생산이 없습니다. EOP 이후이거나 SOP 이전일 수 있습니다." % _years_text(np_years)})
    over = [r["year"] for r in entered if r["implied_option"] is not None and r["implied_option"] > 1.0]
    if over:
        warnings.append({"level": "serious", "text": "%s년: 고객 물동을 맞추려면 옵션율이 100%%를 넘어야 합니다 (대당 사용량, 자사 비중 고정 시)." % _years_text(over)})
    if entered and len(priced) < len(entered):
        missing = [r["year"] for r in entered if r["gap_amt"] is None]
        if priced:
            warnings.append({"level": "info", "text": "%s년은 판가가 없어 금액 계산에서 빠졌습니다." % _years_text(missing)})
        else:
            warnings.append({"level": "info", "text": "판가를 넣지 않아 금액 Gap 은 계산하지 않았습니다."})
    demand_years = [r["year"] for r in entered if r["customer"] > 0]
    last = max(demand_years) if demand_years else None
    for f in factors:
        g = f["gen"]
        if g.get("eop") and last:
            if g["eop"][0] < last:
                warnings.append({"level": "warning", "text": "%s (SOP %s) 의 EOP 는 %d년 %d월입니다. 고객 물동은 %d년까지 있습니다."
                                 % (g["label"], g.get("sop_year") or "?", g["eop"][0], g["eop"][1], last)})

    # 지역 비중: 공급 지역 선택과 상관없이 선택 차종 전체 생산 기준
    weight_years = [r["year"] for r in entered] or list(years)
    region_tot: Dict[str, float] = {}
    region_year: Dict[str, Dict[int, float]] = {}
    for f in factors:
        w = f["opt"] * f["share"] * f["ppv"] or 1.0
        for reg, vols in f["gen"]["regions"].items():
            for y in years:
                v = vols.get(y, 0.0) * w
                region_year.setdefault(reg, {})[y] = region_year.get(reg, {}).get(y, 0.0) + v
                if y in weight_years:
                    region_tot[reg] = region_tot.get(reg, 0.0) + v
    total_w = sum(region_tot.values())
    region_mix = sorted(({"region": k, "share": (v / total_w if total_w else 0.0), "volume": v}
                         for k, v in region_tot.items() if v > 0), key=lambda x: -x["share"])

    # 민감도: 옵션율, 자사 비중을 각각 %p 만큼 바꿨을 때 누적 수량 Gap
    sens = None
    if entered:
        grid = []
        for ds in SENS_STEPS:
            line = []
            for do in SENS_STEPS:
                tot = 0.0
                for r in entered:
                    e = 0.0
                    for f in factors:
                        opt = min(1.0, max(0.0, f["opt"] + do / 100.0))
                        share = min(1.0, max(0.0, f["share"] + ds / 100.0)) if dual else 1.0
                        e += vehicle_volume(f["gen"], r["year"], regions) * opt * share * f["ppv"]
                    tot += e - r["customer"]
                line.append(tot)
            grid.append(line)
        sens = {"steps": list(SENS_STEPS), "grid": grid, "dual": dual}

    vehicles_out = []
    for f in factors:
        g = f["gen"]
        vehicles_out.append({
            "id": g["id"], "label": g["label"], "brand": g["brand"], "sop": g.get("sop"), "eop": g.get("eop"),
            "sop_year": g.get("sop_year"), "option": f["opt"], "share": f["share"], "ppv": f["ppv"],
            "by_year": contrib[g["id"]],
            "vehicles_by_year": {y: vehicle_volume(g, y, regions) for y in years},
        })

    result = {
        "years": years,
        "rows": rows,
        "totals": {"customer": t_cust, "expected": t_exp, "gap": t_gap, "gap_amt": t_amt,
                   "years": [r["year"] for r in entered], "priced_years": [r["year"] for r in priced]},
        "verdict": verdict,
        "tolerance": tol,
        "region_mix": region_mix,
        "region_by_year": region_year,
        "vehicles": vehicles_out,
        "sensitivity": sens,
        "warnings": warnings,
        "inputs": {"option": g_opt, "share": g_share, "ppv": g_ppv, "dual": dual, "regions": regions},
    }
    result["board"] = board_text(result, currency, contact)
    return result


def _years_text(ys: List[int]) -> str:
    ys = sorted(ys)
    parts = []
    start = prev = ys[0]
    for y in ys[1:] + [None]:
        if y is not None and y == prev + 1:
            prev = y
            continue
        parts.append(str(start) if start == prev else "%d~%d" % (start, prev))
        if y is not None:
            start = prev = y
    return ", ".join(parts)


def _region_text(mix: List[dict]) -> str:
    if not mix:
        return ""
    top = mix[:3]
    parts = ["%s %d%%" % (m["region"], round(m["share"] * 100)) for m in top]
    rest = sum(m["share"] for m in mix[3:])
    if rest >= 0.005:
        parts.append("기타 %d%%" % round(rest * 100))
    return ", ".join(parts)


def _vehicle_text(vehicles: List[dict]) -> str:
    names = []
    for v in vehicles:
        if v["label"] not in names:
            names.append(v["label"])
    if not names:
        return ""
    if len(names) <= 3:
        return ", ".join(names)
    return "%s 외 %d개" % (", ".join(names[:2]), len(names) - 2)


def board_text(res: dict, currency: str = "$", contact: str = "") -> dict:
    """결과 보드 문장. 같은 입력이면 같은 문장이 나와야 하므로 템플릿으로만 만듭니다."""
    regions = res["inputs"]["regions"]
    mix = _region_text(res["region_mix"])
    veh = _vehicle_text(res["vehicles"])
    first = "이 PJT는 생산 지역이 %s인 %s 차종의 PJT입니다." % (mix, veh) if mix else "이 PJT는 %s 차종의 PJT입니다." % veh
    if regions:
        first += " (공급 대상: %s 생산분)" % ", ".join(regions)
    t = res["totals"]
    who = "담당자(%s)" % contact if contact else "담당자"
    tail = "Gap이 너무 크거나 원본 데이터가 필요하면 %s에게 개별 연락 부탁드립니다." % who
    if res["verdict"] is None:
        second = "고객 물동을 입력하지 않아 Gap을 계산하지 않았습니다."
    else:
        span = _years_text(t["years"])
        if res["verdict"] == "ok":
            second = "검토 결과(%s년 누적), 고객 물동이 조사기관 기준과 ±%d%% 안에서 맞습니다 (수량 차이 %s Kpcs)." % (
                span, round(res["tolerance"] * 100), fmt_k(t["gap"]))
        else:
            kind = "Risk" if res["verdict"] == "risk" else "Opportunity"
            amt = ""
            if t["gap_amt"] is not None:
                amt = ", 금액 %s M%s" % (fmt_m(abs(t["gap_amt"])), currency)
            second = "검토 결과(%s년 누적), 수량 %s Kpcs%s의 %s가 감지됩니다." % (span, fmt_k(abs(t["gap"])), amt, kind)
    return {"lines": [first, second, tail], "text": " ".join([first, second, tail])}
