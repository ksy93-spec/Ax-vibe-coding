# -*- coding: utf-8 -*-
"""ktable 자체 점검. 표준 라이브러리만으로 돌아갑니다.

    python src/test_ktable.py
"""

from __future__ import annotations

import os
import shutil
import sys
import tempfile
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ktable  # noqa: E402

FAILED = []


def check(label, got, want):
    if got == want:
        print("  OK   %s" % label)
    else:
        print("  실패 %s\n       받음 %r\n       기대 %r" % (label, got, want))
        FAILED.append(label)


def main():
    tmp = tempfile.mkdtemp(prefix="ktable-")
    try:
        print("인코딩 판별과 CSV 읽기")
        text = "사번,이름,부서,연봉\r\nA001,홍길동,생산1팀,\"52,000,000\"\r\nA002,김철수,\"품질보증팀, 2파트\",48000000\r\n"
        cp = os.path.join(tmp, "cp949.csv")
        with open(cp, "wb") as fh:
            fh.write(text.encode("cp949"))
        check("CP949 판별", ktable.detect_encoding(cp), "cp949")
        rows = ktable.read_csv(cp)
        check("행 수", len(rows), 2)
        check("한글 값", rows[0]["이름"], "홍길동")
        check("따옴표 안 쉼표", rows[1]["부서"], "품질보증팀, 2파트")

        u8 = os.path.join(tmp, "utf8.csv")
        with open(u8, "wb") as fh:
            fh.write(b"\xef\xbb\xbf" + text.encode("utf-8"))
        check("UTF-8 BOM 판별", ktable.detect_encoding(u8), "utf-8-sig")
        check("BOM 제거된 첫 열 이름", list(ktable.read_csv(u8)[0].keys())[0], "사번")

        tab = os.path.join(tmp, "tab.txt")
        with open(tab, "w", encoding="utf-8") as fh:
            fh.write("가\t나\t다\n1\t2\t3\n")
        check("탭 구분자", list(ktable.read_csv(tab)[0].keys()), ["가", "나", "다"])

        print("중복/빈 헤더")
        dup = os.path.join(tmp, "dup.csv")
        with open(dup, "w", encoding="utf-8") as fh:
            fh.write("이름,이름,,값\nA,B,C,D\n")
        check("헤더 정리", list(ktable.read_csv(dup)[0].keys()), ["이름", "이름_2", "col3", "값"])

        print("값 변환")
        check("쉼표 숫자", ktable.to_number("52,000,000"), 52000000.0)
        check("회계식 음수", ktable.to_number("(1,200)"), -1200.0)
        check("단위 붙은 숫자", ktable.to_number("3400원"), 3400.0)
        check("숫자 아님", ktable.to_number("해당없음"), None)
        check("빈 값", ktable.to_number(""), None)
        check("날짜 하이픈", ktable.to_date("2024-03-05"), date(2024, 3, 5))
        check("날짜 점", ktable.to_date("2024.03.05"), date(2024, 3, 5))
        check("날짜 붙임", ktable.to_date("20240305"), date(2024, 3, 5))
        check("날짜 한글", ktable.to_date("2024년 3월 5일"), date(2024, 3, 5))
        check("날짜 아님", ktable.to_date("미정"), None)

        print("표시 폭과 시트 이름")
        check("한글 폭", ktable.display_width("부서"), 4)
        check("혼합 폭", ktable.display_width("A팀"), 3)
        check("시트 금지문자", ktable.safe_sheet_name("2024/1분기[안]"), "2024_1분기_안_")
        check("시트 31자 제한", len(ktable.safe_sheet_name("가" * 40)), 31)
        check("시트 빈 이름", ktable.safe_sheet_name("   "), "Sheet1")

        print("xlsx 쓰고 다시 읽기")
        records = ktable.read_csv(cp)
        for r in records:
            r["연봉"] = ktable.to_number(r["연봉"])
        out = os.path.join(tmp, "out.xlsx")
        ktable.write_xlsx(out, {"직원명부": records},
                          number_formats={"직원명부": {"연봉": "#,##0"}})
        check("파일 생성", os.path.exists(out), True)
        back = ktable.read_xlsx(out)
        check("왕복 행 수", len(back), 2)
        check("왕복 한글", back[0]["이름"], "홍길동")
        check("왕복 숫자 타입", isinstance(back[0]["연봉"], (int, float)), True)
        check("왕복 숫자 값", back[0]["연봉"], 52000000)

        print("긴 시트 이름 충돌")
        long_a = "가" * 35 + "A"
        long_b = "가" * 35 + "B"
        out2 = os.path.join(tmp, "out2.xlsx")
        ktable.write_xlsx(out2, {long_a: records, long_b: records})
        from openpyxl import load_workbook
        names = load_workbook(out2).sheetnames
        check("시트 2개", len(names), 2)
        check("이름 중복 없음", len(set(names)), 2)

        print("CSV 내보내기 BOM")
        csv_out = os.path.join(tmp, "out.csv")
        ktable.write_csv(csv_out, ["사번", "이름"], records)
        head = open(csv_out, "rb").read(3)
        check("BOM 부착", head, b"\xef\xbb\xbf")
        check("엑셀 기본 인코딩으로 재독", ktable.detect_encoding(csv_out), "utf-8-sig")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print()
    if FAILED:
        print("실패 %d건: %s" % (len(FAILED), ", ".join(FAILED)))
        return 1
    print("전부 통과")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
