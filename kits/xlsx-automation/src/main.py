# -*- coding: utf-8 -*-
"""input/ 안의 CSV 와 XLSX 를 모아 report.xlsx 로 만드는 예제.

이 파일이 사내에서 고치는 자리입니다. src/ktable.py 는 건드리지 마세요.

실행:
    python src/main.py                      # input/ -> output/report.xlsx
    python src/main.py --input 자료 --group 부서
"""

from __future__ import annotations

import argparse
import glob
import os
import sys
from collections import Counter
from datetime import datetime
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ktable  # noqa: E402

SUPPORTED = ("*.csv", "*.txt", "*.tsv", "*.xlsx", "*.xlsm")


def collect(input_dir: str) -> List[ktable.Record]:
    """input_dir 안의 표 파일을 전부 읽어 한 리스트로 합칩니다.

    어느 파일에서 왔는지 추적할 수 있게 '원본파일' 열을 붙입니다.
    """
    paths: List[str] = []
    for pattern in SUPPORTED:
        paths.extend(sorted(glob.glob(os.path.join(input_dir, pattern))))

    if not paths:
        raise SystemExit("%s 안에 읽을 파일이 없습니다. CSV 나 XLSX 를 넣어 주세요." % input_dir)

    merged: List[ktable.Record] = []
    for path in paths:
        name = os.path.basename(path)
        try:
            rows = ktable.read_table(path)
        except Exception as exc:  # 한 파일이 깨져도 나머지는 처리합니다
            print("  건너뜀 %s: %s" % (name, exc))
            continue
        for rec in rows:
            rec["원본파일"] = name
        merged.extend(rows)
        print("  읽음 %s: %d행" % (name, len(rows)))
    return merged


def summarize(records: List[ktable.Record], group_by: str) -> List[ktable.Record]:
    """group_by 열의 값별 건수를 셉니다. 해당 열이 없으면 빈 결과."""
    if not records or group_by not in records[0]:
        return []
    counter = Counter(str(r.get(group_by, "")).strip() or "(빈 값)" for r in records)
    total = sum(counter.values())
    return [
        {"구분": key, "건수": count, "비율": count / total}
        for key, count in counter.most_common()
    ]


def union_columns(records: List[ktable.Record]) -> List[str]:
    """모든 레코드의 열을 합칩니다. 처음 나온 순서를 지킵니다.

    파일마다 열 구성이 다를 때 첫 파일 기준으로만 열을 잡으면 나머지 열이 조용히 사라집니다.
    """
    columns: List[str] = []
    seen = set()
    for rec in records:
        for key in rec:
            if key not in seen:
                seen.add(key)
                columns.append(key)
    return columns


def build_report(records: List[ktable.Record], out_path: str,
                 group_by: str) -> str:
    columns = union_columns(records)

    # 숫자처럼 보이는 열은 실제 숫자로 바꿔서 넣습니다. 엑셀에서 합계가 먹습니다.
    numeric_cols = []
    for col in columns:
        sample = [r.get(col) for r in records[:100] if str(r.get(col, "")).strip()]
        if sample and all(ktable.to_number(v) is not None for v in sample):
            numeric_cols.append(col)
    for rec in records:
        for col in numeric_cols:
            n = ktable.to_number(rec.get(col))
            if n is not None:
                rec[col] = int(n) if n == int(n) else n

    sheets: Dict[str, List[ktable.Record]] = {}
    formats: Dict[str, Dict[str, str]] = {}

    summary = summarize(records, group_by)
    if summary:
        sheets["요약"] = summary
        formats["요약"] = {"건수": "#,##0", "비율": "0.0%"}

    sheets["데이터"] = records
    formats["데이터"] = {col: "#,##0" for col in numeric_cols}

    return ktable.write_xlsx(
        out_path, sheets,
        columns_by_sheet={"데이터": columns},
        number_formats=formats,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="표 파일을 모아 엑셀 보고서로 만듭니다.")
    parser.add_argument("--input", default="input", help="원본 파일이 있는 폴더 (기본: input)")
    parser.add_argument("--output", default="output", help="결과를 넣을 폴더 (기본: output)")
    parser.add_argument("--group", default="부서", help="요약 시트의 기준 열 (기본: 부서)")
    args = parser.parse_args()

    print("1. 파일 읽는 중: %s" % args.input)
    records = collect(args.input)
    print("   합계 %d행" % len(records))

    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    out_path = os.path.join(args.output, "report_%s.xlsx" % stamp)

    print("2. 보고서 만드는 중")
    saved = build_report(records, out_path, args.group)
    print("3. 완료: %s" % os.path.abspath(saved))

    # TODO(사내): 여기에 실제 업무 규칙을 넣습니다.
    #   예) 부서별로 시트를 나눈다, 특정 조건 행만 남긴다, 사내 시스템 양식에 맞춘다
    #   손대기 전에 specs/ 에 입력과 출력을 먼저 적으세요.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
