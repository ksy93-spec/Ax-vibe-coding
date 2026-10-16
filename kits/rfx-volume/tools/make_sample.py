"""가짜 생산 전망 파일을 만듭니다. 조사기관 파일과 열 구성만 비슷하고 숫자는 모두 지어낸 값입니다.

python tools/make_sample.py  ->  data/sample-lvp.xlsx
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import xlsx  # noqa: E402

YEARS = list(range(2020, 2038))
Q_YEARS = list(range(2025, 2030))

# (그룹, 제조사, 브랜드, 차종, 플랫폼, [(SOP 연,월, EOP 연,월, 최대 연간 대수, {지역: 비중})])
EU, NA, CN, JK, SA, LA = "Europe", "North America", "Greater China", "Japan/Korea", "South Asia", "South America"
CARS = [
    ("Volkswagen Group", "Audi", "Audi", "A3", "MQB Evo", [((2020, 3), (2027, 12), 210, {EU: .8, CN: .2}), ((2028, 2), (2035, 6), 190, {EU: .75, CN: .25})]),
    ("Volkswagen Group", "Audi", "Audi", "A5", "PPC", [((2016, 6), (2024, 9), 120, {EU: .9, CN: .1}), ((2024, 7), (2031, 12), 150, {EU: .65, CN: .35}), ((2031, 9), (2038, 12), 140, {EU: .6, CN: .4})]),
    ("Volkswagen Group", "Audi", "Audi", "A6", "PPC", [((2018, 2), (2025, 6), 160, {EU: .55, CN: .45}), ((2025, 1), (2032, 6), 170, {EU: .45, CN: .55})]),
    ("Volkswagen Group", "Audi", "Audi", "A6 e-tron", "PPE", [((2024, 9), (2031, 12), 70, {EU: .6, CN: .4})]),
    ("Volkswagen Group", "Audi", "Audi", "Q3", "MQB Evo", [((2018, 7), (2025, 9), 230, {EU: .55, CN: .35, LA: .1}), ((2025, 8), (2032, 12), 240, {EU: .55, CN: .35, LA: .1})]),
    ("Volkswagen Group", "Audi", "Audi", "Q4 e-tron", "MEB", [((2021, 2), (2028, 9), 110, {EU: .8, CN: .2}), ((2028, 7), (2035, 12), 120, {EU: .75, CN: .25})]),
    ("Volkswagen Group", "Audi", "Audi", "Q5", "PPC", [((2016, 10), (2024, 9), 290, {EU: .4, CN: .45, NA: .15}), ((2024, 9), (2031, 12), 300, {EU: .35, CN: .4, NA: .25}), ((2031, 10), (2038, 12), 280, {EU: .35, CN: .4, NA: .25})]),
    ("Volkswagen Group", "Audi", "Audi", "Q6 e-tron", "PPE", [((2024, 3), (2031, 6), 90, {EU: .55, CN: .45})]),
    ("Volkswagen Group", "Audi", "Audi", "Q7", "MLB Evo", [((2015, 4), (2026, 6), 100, {EU: .7, NA: .3}), ((2026, 5), (2033, 12), 105, {EU: .5, NA: .5})]),
    ("Volkswagen Group", "Audi", "Audi", "Q8", "MLB Evo", [((2018, 6), (2027, 12), 60, {EU: 1.0}), ((2027, 9), (2034, 12), 55, {EU: 1.0})]),
    ("Volkswagen Group", "Volkswagen", "Volkswagen", "Golf", "MQB Evo", [((2019, 10), (2027, 6), 480, {EU: .9, LA: .1}), ((2027, 4), (2035, 12), 420, {EU: .85, LA: .15})]),
    ("Volkswagen Group", "Volkswagen", "Volkswagen", "Tiguan", "MQB Evo", [((2016, 3), (2024, 1), 650, {EU: .35, CN: .5, NA: .15}), ((2024, 1), (2031, 12), 600, {EU: .35, CN: .5, NA: .15})]),
    ("Volkswagen Group", "Volkswagen", "Volkswagen", "ID.4", "MEB", [((2020, 8), (2027, 12), 260, {EU: .45, CN: .4, NA: .15}), ((2027, 9), (2034, 12), 280, {EU: .4, CN: .4, NA: .2})]),
    ("Volkswagen Group", "Volkswagen", "Volkswagen", "ID.7", "MEB", [((2023, 9), (2030, 12), 140, {EU: .6, CN: .4})]),
    ("Volkswagen Group", "Porsche", "Porsche", "Macan", "PPE", [((2024, 1), (2031, 12), 85, {EU: 1.0})]),
    ("Volkswagen Group", "Porsche", "Porsche", "Cayenne", "PPC", [((2017, 8), (2026, 12), 95, {EU: 1.0}), ((2026, 9), (2034, 12), 90, {EU: 1.0})]),
    ("Volkswagen Group", "Skoda", "Skoda", "Octavia", "MQB Evo", [((2019, 11), (2027, 12), 380, {EU: .7, CN: .2, SA: .1}), ((2028, 3), (2035, 12), 360, {EU: .7, CN: .2, SA: .1})]),
    ("Hyundai Group", "Hyundai", "Hyundai", "Tucson", "N3", [((2020, 9), (2027, 6), 620, {JK: .35, NA: .25, EU: .2, CN: .1, SA: .1}), ((2027, 5), (2034, 12), 600, {JK: .35, NA: .3, EU: .2, SA: .15})]),
    ("Hyundai Group", "Hyundai", "Hyundai", "Ioniq 5", "E-GMP", [((2021, 2), (2028, 6), 170, {JK: .55, NA: .35, EU: .1}), ((2028, 3), (2035, 12), 190, {JK: .5, NA: .4, EU: .1})]),
    ("Hyundai Group", "Hyundai", "Hyundai", "Santa Fe", "N3", [((2023, 7), (2030, 12), 260, {JK: .6, NA: .4})]),
    ("Hyundai Group", "Kia", "Kia", "Sportage", "N3", [((2021, 6), (2028, 3), 560, {JK: .45, EU: .3, CN: .1, NA: .15}), ((2028, 1), (2035, 12), 540, {JK: .45, EU: .3, NA: .25})]),
    ("Hyundai Group", "Kia", "Kia", "EV6", "E-GMP", [((2021, 7), (2028, 12), 90, {JK: .8, NA: .2})]),
    ("Hyundai Group", "Kia", "Kia", "EV9", "E-GMP", [((2023, 5), (2030, 12), 85, {JK: .6, NA: .4})]),
    ("BMW Group", "BMW", "BMW", "3 Series", "CLAR", [((2018, 11), (2026, 9), 380, {EU: .45, CN: .4, NA: .15}), ((2026, 6), (2034, 12), 360, {EU: .4, CN: .45, NA: .15})]),
    ("BMW Group", "BMW", "BMW", "iX3", "Neue Klasse", [((2025, 10), (2032, 12), 150, {EU: .6, CN: .4})]),
    ("BMW Group", "BMW", "BMW", "X3", "CLAR", [((2017, 9), (2024, 9), 340, {NA: .55, CN: .3, LA: .15}), ((2024, 10), (2031, 12), 360, {NA: .5, CN: .35, LA: .15})]),
    ("BMW Group", "BMW", "MINI", "Countryman", "UKL", [((2023, 11), (2030, 12), 110, {EU: 1.0})]),
    ("Mercedes-Benz Group", "Mercedes-Benz", "Mercedes-Benz", "C-Class", "MRA2", [((2021, 3), (2028, 9), 410, {EU: .5, CN: .35, NA: .15}), ((2028, 6), (2035, 12), 390, {EU: .45, CN: .4, NA: .15})]),
    ("Mercedes-Benz Group", "Mercedes-Benz", "Mercedes-Benz", "GLC", "MRA2", [((2022, 6), (2029, 12), 380, {EU: .45, CN: .4, NA: .15})]),
]
COUNTRY = {EU: ["Germany", "Czech Republic", "Hungary", "Spain", "Slovakia"], NA: ["United States", "Mexico"],
           CN: ["China"], JK: ["South Korea"], SA: ["India"], LA: ["Brazil"]}


def curve(sop, eop, peak, year):
    """연간 대수(천 대 단위 peak). SOP 해와 EOP 해는 달 수만큼 잘리고, 램프업/램프다운."""
    sy, sm = sop
    ey, em = eop
    if year < sy or year > ey:
        return 0.0
    months = 12
    if year == sy:
        months -= sm - 1
    if year == ey:
        months -= 12 - em
    life = year - sy
    left = ey - year
    shape = 1.0
    if life == 1:
        shape = 0.85
    if left <= 1:
        shape *= 0.7
    return peak * 1000 * shape * months / 12.0


def excel_serial(y, m):
    import datetime as dt
    return float((dt.date(y, m, 1) - dt.date(1899, 12, 30)).days)


def main():
    rnd = random.Random(20261016)
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    wb = xlsx.Workbook()
    sh = wb.add_sheet("LVP Forecast")
    sh.append(["Light Vehicle Production Forecast - synthetic sample (not real data)"])
    sh.append(["All figures are invented for testing. Column layout only resembles commercial forecasts."])
    sh.append([])
    head = ["Strategic Group", "Manufacturer", "Production Brand", "Production Nameplate", "Platform", "Program",
            "Region", "Country/Territory", "Production Plant", "SOP (Start of Production)", "EOP (End of Production)"]
    head += ["CY %d" % y for y in YEARS]
    head += ["Q%d %d" % (q, y) for y in Q_YEARS for q in (1, 2, 3, 4)]
    sh.append(head, style=xlsx.STYLE_HEADER)
    plant_no = {}
    for group, maker, brand, name, platform, gens in CARS:
        for gi, (sop, eop, peak, regions) in enumerate(gens):
            program = "%s%s%d" % (brand[:2].upper(), "".join(ch for ch in name if ch.isalnum())[:3].upper(), gi + 1)
            for region, share in regions.items():
                country = rnd.choice(COUNTRY[region])
                plant_no[country] = plant_no.get(country, 0) + 1
                plant = "%s Plant %d" % (country.split()[0], (plant_no[country] - 1) % 3 + 1)
                noise = [rnd.uniform(0.92, 1.08) for _ in YEARS]
                vols = [round(curve(sop, eop, peak, y) * share * n) for y, n in zip(YEARS, noise)]
                row = [group, maker, brand, name, platform, program, region, country, plant,
                       excel_serial(*sop), excel_serial(*eop)] + vols
                qs = []
                for y in Q_YEARS:
                    total = vols[YEARS.index(y)]
                    parts = []
                    for q in (1, 2, 3, 4):
                        start_m = (q - 1) * 3 + 1
                        active = sum(1 for m in range(start_m, start_m + 3)
                                     if (y, m) >= sop and (y, m) <= eop)
                        parts.append(active)
                    tot_m = sum(parts) or 1
                    qs += [round(total * p / tot_m) for p in parts]
                row += qs
                styles = [0] * 9 + [xlsx.STYLE_DATE, xlsx.STYLE_DATE] + [xlsx.STYLE_INT] * (len(row) - 11)
                sh.append(row, styles)
    sh.widths = {0: 20, 1: 16, 2: 16, 3: 20, 4: 12, 5: 10, 6: 16, 7: 16, 8: 18, 9: 12, 10: 12}
    out = os.path.join(root, "data", "sample-lvp.xlsx")
    wb.save(out)
    print(out)


if __name__ == "__main__":
    main()
