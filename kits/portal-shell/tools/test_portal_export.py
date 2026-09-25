# -*- coding: utf-8 -*-
"""portal_export 자체 점검.  python tools/test_portal_export.py"""
from __future__ import annotations
import os, re, shutil, sys, tempfile
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from portal_export import export_module, register_module, ContractError  # noqa: E402

FAILED = []


def check(label, got, want):
    if got == want:
        print("  OK   %s" % label)
    else:
        print("  실패 %s\n       받음 %r\n       기대 %r" % (label, got, want))
        FAILED.append(label)


def expect_error(label, fn, needle):
    try:
        fn()
    except ContractError as exc:
        if needle in str(exc):
            print("  OK   %s" % label)
        else:
            print("  실패 %s: 메시지에 %r 가 없음\n       %s" % (label, needle, exc))
            FAILED.append(label)
    else:
        print("  실패 %s: 예외가 나지 않음" % label)
        FAILED.append(label)


def main():
    tmp = tempfile.mkdtemp(prefix="portal-")
    try:
        print("정상 내보내기")
        p = export_module(
            portal_dir=tmp, module_id="price_monitor", title="원자재 가격",
            owner="박과장", format="won",
            kpis=[{"label": "열연강판", "value": 1200000, "unit": "/톤"}],
            charts=[{"type": "line", "title": "월별", "x": ["1월", "2월"],
                     "series": [{"name": "강판", "values": [1, 2]}]}],
            table={"columns": ["월", "값"], "rows": [["1월", 1], ["2월", 2]]},
        )
        check("파일 생성", os.path.exists(p), True)
        text = open(p, encoding="utf-8").read()
        check("전역 대입", 'window.__PORTAL__["price_monitor"]' in text, True)
        check("한글 유지", "원자재 가격" in text, True)
        check("modules.js 등록", "price_monitor" in open(
            os.path.join(tmp, "data", "modules.js"), encoding="utf-8").read(), True)

        print("두 번째 모듈 등록")
        export_module(portal_dir=tmp, module_id="competitor_news", title="경쟁사",
                      charts=[{"type": "bar", "x": ["1월"],
                               "series": [{"name": "A사", "values": [3]}]}])
        mods = open(os.path.join(tmp, "data", "modules.js"), encoding="utf-8").read()
        check("둘 다 등록", ("price_monitor" in mods and "competitor_news" in mods), True)
        check("중복 등록 안 함", register_module(tmp, "price_monitor").count("price_monitor"), 1)

        print("날짜 객체 변환")
        p3 = export_module(portal_dir=tmp, module_id="dated", title="날짜",
                           table={"columns": ["일자"], "rows": [[date(2026, 9, 25)]]})
        check("date 직렬화", '"2026-09-25"' in open(p3, encoding="utf-8").read(), True)

        print("스크립트 조기 종료 방지")
        p4 = export_module(portal_dir=tmp, module_id="escaped", title="탈출",
                           notes="문자열 안에 </script> 가 들어간 경우")
        raw = open(p4, encoding="utf-8").read()
        check("</script> 이스케이프", "</script>" in raw, False)
        check("복원 가능한 형태", "<\\/script>" in raw, True)

        print("계약 위반 차단")
        expect_error("길이 불일치", lambda: export_module(
            portal_dir=tmp, module_id="bad1", title="x",
            charts=[{"x": ["1월", "2월"], "series": [{"name": "A", "values": [1]}]}]),
            "맞지 않습니다")
        expect_error("계열 9개", lambda: export_module(
            portal_dir=tmp, module_id="bad2", title="x",
            charts=[{"x": ["1월"], "series": [{"name": str(i), "values": [1]} for i in range(9)]}]),
            "최대 8개")
        expect_error("제목 없음", lambda: export_module(
            portal_dir=tmp, module_id="bad3", title=""), "title")
        expect_error("잘못된 id", lambda: export_module(
            portal_dir=tmp, module_id="Bad-Id", title="x"), "module_id")
        expect_error("표 칸 수 불일치", lambda: export_module(
            portal_dir=tmp, module_id="bad4", title="x",
            table={"columns": ["a", "b"], "rows": [["1"]]}), "맞지 않습니다")
        check("위반 시 파일 안 생김", os.path.exists(os.path.join(tmp, "data", "bad1")), False)
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
