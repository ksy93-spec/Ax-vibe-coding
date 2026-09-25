# -*- coding: utf-8 -*-
"""파이썬에서 포탈 모듈 data.js 를 내보내는 헬퍼.

각 담당자는 지금 쓰던 수집/가공 코드를 그대로 두고, 마지막에 이 함수만 부르면 됩니다.

    import sys; sys.path.insert(0, r"C:\\portal\\tools")
    from portal_export import export_module

    export_module(
        portal_dir=r"C:\\portal",
        module_id="price_monitor",
        title="원자재 가격 모니터",
        owner="박과장",
        kpis=[{"label": "열연강판", "value": 1200000, "unit": "/톤"}],
        charts=[{"type": "line", "title": "월별 단가", "x": months,
                 "series": [{"name": "열연강판", "values": steel}]}],
        table={"columns": ["기준월", "단가"], "rows": rows},
        format="won",
    )

JSON 이 아니라 JS 파일로 내보내는 이유는 file:// 로 연 페이지가 로컬 JSON 을
fetch 로 읽지 못하기 때문입니다. <script> 로 읽히는 형태여야 합니다.

표준 라이브러리만 씁니다.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

MODULE_ID = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
MAX_SERIES = 8   # 계열 색 슬롯 수. 더 필요하면 "기타"로 묶거나 차트를 나눕니다.


class ContractError(ValueError):
    """모듈 계약을 어겼을 때. 포탈에서 화면이 비기 전에 여기서 막습니다."""


def _check(data: Dict[str, Any]) -> List[str]:
    problems: List[str] = []
    if not data.get("title"):
        problems.append("title 이 비었습니다.")
    for i, c in enumerate(data.get("charts") or []):
        where = "charts[%d]" % i
        x = c.get("x")
        series = c.get("series")
        if not isinstance(x, (list, tuple)):
            problems.append("%s.x 가 리스트가 아닙니다." % where)
            continue
        if not series:
            problems.append("%s.series 가 비었습니다." % where)
            continue
        if len(series) > MAX_SERIES:
            problems.append(
                "%s 의 계열이 %d개입니다. 최대 %d개까지만 색이 준비되어 있습니다. "
                "'기타'로 묶거나 차트를 나누세요." % (where, len(series), MAX_SERIES))
        for j, s in enumerate(series):
            if not s.get("name"):
                problems.append("%s.series[%d].name 이 비었습니다." % (where, j))
            values = s.get("values")
            if not isinstance(values, (list, tuple)):
                problems.append("%s.series[%d].values 가 리스트가 아닙니다." % (where, j))
            elif len(values) != len(x):
                problems.append(
                    "%s.series[%d] 의 값 %d개가 x %d개와 맞지 않습니다."
                    % (where, j, len(values), len(x)))
        if c.get("type") not in (None, "line", "bar"):
            problems.append("%s.type 은 line 또는 bar 여야 합니다." % where)
    table = data.get("table")
    if table:
        cols = table.get("columns")
        rows = table.get("rows")
        if not isinstance(cols, (list, tuple)):
            problems.append("table.columns 가 리스트가 아닙니다.")
        if not isinstance(rows, (list, tuple)):
            problems.append("table.rows 가 리스트가 아닙니다.")
        elif isinstance(cols, (list, tuple)):
            for k, row in enumerate(rows[:200]):
                if len(row) != len(cols):
                    problems.append(
                        "table.rows[%d] 의 칸 %d개가 columns %d개와 맞지 않습니다."
                        % (k, len(row), len(cols)))
                    break
    return problems


def _jsonable(value: Any) -> Any:
    """date, Decimal 등을 JSON 으로 옮길 수 있는 형태로 바꿉니다."""
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def export_module(portal_dir: str, module_id: str, title: str,
                  kpis: Optional[Sequence[Dict[str, Any]]] = None,
                  charts: Optional[Sequence[Dict[str, Any]]] = None,
                  table: Optional[Dict[str, Any]] = None,
                  owner: str = "", description: str = "", notes: str = "",
                  format: str = "number",
                  updated_at: Optional[str] = None,
                  register: bool = True) -> str:
    """모듈 하나를 data/<module_id>/data.js 로 내보냅니다.

    register 가 True 면 data/modules.js 에 이 모듈을 자동으로 등록합니다.
    계약을 어기면 파일을 쓰지 않고 ContractError 를 냅니다.
    실제로 쓴 파일 경로를 돌려줍니다.
    """
    if not MODULE_ID.match(module_id):
        raise ContractError(
            "module_id 는 영소문자로 시작하고 영소문자, 숫자, 밑줄만 씁니다: %r" % module_id)

    data: Dict[str, Any] = {
        "title": title,
        "owner": owner,
        "updated_at": updated_at or datetime.now().strftime("%Y-%m-%d %H:%M"),
        "description": description,
        "format": format,
        "kpis": list(kpis or []),
        "charts": list(charts or []),
    }
    if table:
        data["table"] = table
    if notes:
        data["notes"] = notes

    data = _jsonable(data)
    problems = _check(data)
    if problems:
        raise ContractError("모듈 계약 위반:\n  - " + "\n  - ".join(problems))

    out_dir = os.path.join(portal_dir, "data", module_id)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "data.js")

    body = json.dumps(data, ensure_ascii=False, indent=2)
    # </script> 가 문자열 안에 있으면 HTML 파서가 스크립트를 거기서 끊습니다.
    body = body.replace("</", "<\\/")

    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("/* 자동 생성 파일. 직접 고치지 말고 만들어 낸 스크립트를 고치세요. */\n")
        fh.write("window.__PORTAL__ = window.__PORTAL__ || {};\n")
        fh.write('window.__PORTAL__["%s"] = %s;\n' % (module_id, body))

    if register:
        register_module(portal_dir, module_id)
    return out_path


def register_module(portal_dir: str, module_id: str) -> List[str]:
    """data/modules.js 에 모듈을 추가합니다. 이미 있으면 그대로 둡니다."""
    path = os.path.join(portal_dir, "data", "modules.js")
    ids: List[str] = []
    if os.path.exists(path):
        text = open(path, encoding="utf-8").read()
        match = re.search(r"window\.__MODULES__\s*=\s*(\[[^\]]*\])", text, re.S)
        if match:
            try:
                ids = json.loads(match.group(1))
            except ValueError:
                ids = re.findall(r'"([a-z][a-z0-9_]*)"', match.group(1))
    if module_id not in ids:
        ids.append(module_id)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("/* 포탈에 띄울 모듈 목록. 순서가 곧 사이드바 순서입니다. */\n")
        fh.write("window.__MODULES__ = %s;\n"
                 % json.dumps(ids, ensure_ascii=False, indent=2))
    return ids
