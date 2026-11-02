/* 숫자 표기와 공용 화면 조각 (로고, 빈 상태, 칩). 전역 App.f. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var C = App.ea.core;

  var nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /** 백만 달러. 100 이상은 정수, 그 아래는 소수 한 자리 */
  function musd(v) {
    if (v === null || v === undefined || !isFinite(v)) return '-';
    return Math.abs(v) >= 100 ? nf0.format(v) : nf1.format(v);
  }
  function num(v, digits) {
    if (v === null || v === undefined || !isFinite(v)) return '-';
    return digits ? nf1.format(v) : nf0.format(v);
  }
  /** 퍼센트. signed 면 + 를 붙입니다. */
  function pct(v, signed) {
    if (v === null || v === undefined || !isFinite(v)) return '-';
    return (signed && v > 0 ? '+' : '') + nf1.format(v) + '%';
  }
  /** 퍼센트 포인트 차이 */
  function pp(v) {
    if (v === null || v === undefined || !isFinite(v)) return '-';
    return (v > 0 ? '+' : '') + nf1.format(v) + '%p';
  }
  /** 환율 */
  function rate(v) {
    if (!v) return '-';
    return v >= 100 ? nf1.format(v) : String(+v.toPrecision(4));
  }

  function initials(c) {
    var name = (c && c.name) || '?';
    if (/^[A-Z]{2,4}$/.test(name)) return name;
    var words = name.split(/[\s-]+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  /** 회사 CI 마크. 로고가 없으면 글자 마크. 다크 모드에서도 보이게 늘 밝은 타일 위에 그립니다. */
  function logo(c, size) {
    var cls = 'logo logo--' + (size || 'md');
    if (c && c.logo) {
      return h('span', { class: cls }, h('img', { src: c.logo, alt: c.name + ' 로고', loading: 'lazy' }));
    }
    var mono = h('span', { class: cls + ' logo--mono', 'aria-label': (c && c.name) + ' (로고 없음)', text: initials(c) });
    if (c && c.color) mono.style.color = c.color;
    return mono;
  }

  function companyName(c) {
    return h('span', { class: 'cname' }, [
      h('span', { class: 'cname__ko', text: c.nameKo || c.name }),
      c.nameKo ? h('span', { class: 'cname__en', text: c.name }) : null,
    ]);
  }

  function empty(title, body, actions) {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty__title', text: title }),
      body ? h('p', { class: 'empty__body', text: body }) : null,
      actions && actions.length ? h('div', { class: 'row empty__actions' }, actions) : null,
    ]);
  }

  function chip(text, kind) {
    return h('span', { class: 'chip' + (kind ? ' chip--' + kind : ''), text: text });
  }

  function statusBadge(status) {
    return h('span', { class: 'badge ' + (status === '확인' ? 'badge--ok' : 'badge--warn'), text: status || '검증 필요' });
  }

  function btn(label, onClick, kind, extra) {
    return h('button', Object.assign({
      class: 'btn' + (kind ? ' btn--' + kind.split(' ').join(' btn--') : ''),
      type: 'button',
      text: label,
      onclick: onClick,
    }, extra || {}));
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' }, [
      h('span', { class: 'field__label', text: label }),
      control,
      hint ? h('span', { class: 'field__hint', text: hint }) : null,
    ]);
  }

  /** 검색어를 <mark> 로 감싼 조각들 */
  function marked(text, q) {
    var s = String(text || '');
    if (!q) return [s];
    var out = [];
    var low = s.toLowerCase();
    var k = q.toLowerCase();
    var i = 0;
    var at;
    while ((at = low.indexOf(k, i)) >= 0) {
      if (at > i) out.push(s.slice(i, at));
      out.push(h('mark', { text: s.slice(at, at + k.length) }));
      i = at + k.length;
    }
    if (i < s.length) out.push(s.slice(i));
    return out;
  }

  /** 모든 회사 자료에 나온 분기 (최근부터) */
  function allPeriods(reports) {
    var set = {};
    Object.keys(reports).forEach(function (id) {
      (reports[id].quarters || []).forEach(function (q) {
        set[q.period] = 1;
      });
    });
    return Object.keys(set).sort().reverse();
  }

  /** 분기 고르기 목록: 자료에 있는 분기 + 최근 8분기 */
  function periodChoices(reports) {
    var last = C.lastClosedPeriod();
    var set = {};
    C.periodRange(C.periodAdd(last, -7), last).forEach(function (p) {
      set[p] = 1;
    });
    allPeriods(reports || {}).forEach(function (p) {
      set[p] = 1;
    });
    return Object.keys(set).sort().reverse();
  }

  /* ---------- 센티먼트 ---------- */
  var SE = App.ea.sentiment;

  /** 점수 칸. 색은 악화(빨강)~중립(회색)~개선(파랑) 다섯 단계, 숫자를 늘 같이 씁니다. */
  function sentCell(score, opts) {
    var o = opts || {};
    var b = SE.band(score);
    return h(o.tag || 'span', {
      class: 'sent sent--' + b + (o.manual ? ' sent--manual' : '') + (o.cls ? ' ' + o.cls : ''),
      title: o.title || (score === null || score === undefined ? '언급 없음' : score + '점' + (o.manual ? ' (사람이 고친 점수)' : '')),
      text: score === null || score === undefined ? '-' : (Math.round(score * 10) / 10).toString(),
    });
  }

  function sentLegend() {
    return h('div', { class: 'sent-legend' }, [
      h('span', { class: 'muted small', text: '점수' }),
      sentCell(1, { title: '0~2 크게 악화' }), h('span', { class: 'small', text: '크게 악화' }),
      sentCell(3, { title: '3~4 악화' }), h('span', { class: 'small', text: '악화' }),
      sentCell(5, { title: '5 중립' }), h('span', { class: 'small', text: '중립' }),
      sentCell(7, { title: '6~7 개선' }), h('span', { class: 'small', text: '개선' }),
      sentCell(9, { title: '8~10 크게 개선' }), h('span', { class: 'small', text: '크게 개선' }),
      sentCell(null), h('span', { class: 'small', text: '언급 없음' }),
      h('span', { class: 'muted small', text: '밑줄 = 사람이 고친 점수' }),
    ]);
  }

  /** 한 분기의 요인별 점수 표 (요인, 점수, 방향, 근거) */
  function sentTable(sent) {
    var e = SE.effective(sent);
    var idx = SE.index(sent);
    return [
      h('div', { class: 'row sent-head' }, [
        h('span', { class: 'sub__title', text: '센티먼트 종합' }), sentCell(idx, { cls: 'sent--big' }),
        sent.summary ? h('span', { class: 'muted', text: sent.summary }) : null,
      ]),
      h('table', { class: 'table table--sent' }, [
        h('thead', null, h('tr', null, ['요인', '점수', '방향', '근거'].map(function (t) { return h('th', { class: 'th', text: t }); }))),
        h('tbody', null, SE.FACTORS.map(function (fct) {
          var m = (sent.model && sent.model[fct.key]) || {};
          var ef = e[fct.key];
          return h('tr', null, [
            h('td', { text: fct.label }),
            h('td', null, [sentCell(ef.score, { manual: ef.source === 'manual' }),
              ef.source === 'manual' && m.score !== null && m.score !== undefined ? h('span', { class: 'muted small', text: ' 모델 ' + m.score }) : null]),
            h('td', { text: m.direction || '언급 없음' }),
            h('td', { class: 'td--wrap' }, [m.reason || '', m.quote ? h('span', { class: 'muted small', text: ' "' + m.quote + '"' }) : null]),
          ]);
        })),
      ]),
    ];
  }

  App.f = {
    sentCell: sentCell,
    sentLegend: sentLegend,
    sentTable: sentTable,
    musd: musd,
    num: num,
    pct: pct,
    pp: pp,
    rate: rate,
    logo: logo,
    companyName: companyName,
    empty: empty,
    chip: chip,
    statusBadge: statusBadge,
    btn: btn,
    field: field,
    marked: marked,
    allPeriods: allPeriods,
    periodChoices: periodChoices,
  };
})(window);
