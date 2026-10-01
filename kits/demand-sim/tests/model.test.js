/* 계산 엔진 합격 기준. tests/index.html 을 브라우저로 열면 돌아갑니다.
 * 사내에서 엔진을 고치면 이 파일이 전부 통과해야 합니다. 테스트를 지우거나 기대값을 바꾸지 마세요.
 */
(function (global) {
  'use strict';
  var App = global.App;
  var sim = App.sim;
  var U = sim.util;
  var tests = (App.tests = App.tests || []);

  function test(name, fn) {
    tests.push({ name: name, fn: fn });
  }
  function ok(cond, msg) {
    if (!cond) throw new Error(msg || '조건이 거짓입니다');
  }
  function near(a, b, tol, msg) {
    if (!(Math.abs(a - b) <= tol)) throw new Error((msg || '값이 다릅니다') + ': ' + a + ' vs ' + b + ' (허용 ' + tol + ')');
  }
  function eq(a, b, msg) {
    if (a !== b) throw new Error((msg || '값이 다릅니다') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
  }

  var cache = null;
  function fixture() {
    if (cache) return cache;
    var raw = sim.sample.make();
    var brands = sim.prep.rankBrands(raw.sales).slice(0, 12).map(function (x) { return x.brand; });
    var ds = sim.prep.buildDataset(raw.sales, raw.powertrain, { brands: brands });
    var bl = sim.baseline.build(ds, sim.baseline.defaults());
    var base = sim.engine.simulate(ds, bl, []);
    cache = { raw: raw, ds: ds, bl: bl, base: base };
    return cache;
  }
  function card(patch) {
    var f = fixture();
    return Object.assign(sim.shocks.blank(patch.layer || 'TIV', f.ds), { name: 'test' }, patch);
  }
  function fullMonths(c, months) {
    var cv = sim.shocks.curve(c, months);
    return cv.map(function (v, i) { return v === 1 ? i : -1; }).filter(function (i) { return i >= 0; });
  }

  // ---------- 입력 정리 ----------

  test('월 표기 여러 가지를 YYYY-MM 으로 읽는다', function () {
    eq(U.parseMonth('2026-09'), '2026-09');
    eq(U.parseMonth('2026/9'), '2026-09');
    eq(U.parseMonth('202609'), '2026-09');
    eq(U.parseMonth('2026.09'), '2026-09');
    eq(U.parseMonth('2026-09-01'), '2026-09');
    eq(U.parseMonth('2026-13'), null);
    eq(U.parseMonth('abc'), null);
  });

  test('분기 표기 여러 가지를 YYYY-Qn 으로 읽는다', function () {
    eq(U.parseQuarter('2026-Q3'), '2026-Q3');
    eq(U.parseQuarter('2026Q3'), '2026-Q3');
    eq(U.parseQuarter('2026 q3'), '2026-Q3');
    eq(U.parseQuarter('2026-3Q'), '2026-Q3');
    eq(U.parseQuarter('3Q26'), '2026-Q3');
    eq(U.parseQuarter('2026-08'), '2026-Q3');
  });

  test("열 이름 'Sales Region', 'Sales Brand' 를 알아본다", function () {
    var m = sim.prep.detectColumns(['Month', 'Sales Region', 'Sales Country', 'Sales Brand', 'Volume'], 'sales');
    eq(m.missing.length, 0, '빠진 필드');
    eq(m.mapping.region, 'Sales Region');
    eq(m.mapping.brand, 'Sales Brand');
    eq(m.mapping.country, 'Sales Country');
    eq(m.mapping.units, 'Volume');
  });

  test('분기 비중 분해: 월 합계와 분기 파워트레인 합계를 둘 다 지킨다', function () {
    var months = U.monthRange('2025-01', '2025-09');
    var monthly = [100, 80, 120, 90, 110, 100, 130, 70, 100];
    var mix = { '2025-Q1': [0.2, 0.8], '2025-Q2': [0.4, 0.6], '2025-Q3': [0.1, 0.9] };
    var out = sim.prep.splitByMix(monthly, months, mix, 2);
    monthly.forEach(function (v, t) { near(out[0][t] + out[1][t], v, 1e-6, t + '번째 달 합계'); });
    ['2025-Q1', '2025-Q2', '2025-Q3'].forEach(function (q, qi) {
      var tot = 0, bev = 0;
      for (var t = qi * 3; t < qi * 3 + 3; t++) { tot += monthly[t]; bev += out[0][t]; }
      near(bev / tot, mix[q][0], 1e-6, q + ' 비중');
    });
  });

  test('데이터셋: 지역 x 브랜드 월 합계가 입력 CSV 합계와 같고 기타로 빠짐없이 묶인다', function () {
    var f = fixture();
    var T = f.ds.months.length;
    var want = {};
    f.raw.sales.forEach(function (r) { want[r.region] = (want[r.region] || 0) + r.units; });
    f.ds.regions.forEach(function (r) {
      var got = 0;
      f.ds.brands.forEach(function (b) {
        f.ds.powertrains.forEach(function (p) { for (var t = 0; t < T; t++) got += f.ds.units[r][b][p][t]; });
      });
      near(got, want[r], 1e-3, r + ' 합계');
    });
    eq(f.ds.brands.length, 13, '관측 12 + 기타');
    eq(f.ds.brands[12], sim.OTHER);
  });

  // ---------- 기준선과 합 ----------

  test('카드가 없으면 결과 총수요가 기준선과 같다', function () {
    var f = fixture();
    f.ds.regions.forEach(function (r) {
      f.bl.tiv[r].forEach(function (v, h) { near(f.base.tiv[r][h], v, v * 1e-9, r + ' ' + h); });
    });
  });

  test('모든 지역, 모든 달에서 브랜드 점유율 합과 파워트레인 비중 합이 1 이다', function () {
    var f = fixture();
    var res = sim.engine.simulate(f.ds, f.bl, [
      card({ layer: 'POWERTRAIN', region: 'CN', target: 'BEV', magnitude: { min: 30, mode: 30, max: 30 } }),
      card({ layer: 'BRAND', region: 'CN', target: 'Brand A', magnitude: { min: 500, mode: 500, max: 500 } }),
      card({ layer: 'BRAND', region: 'CN', target: 'Brand B', magnitude: { min: -90, mode: -90, max: -90 } }),
    ]);
    f.ds.regions.concat([sim.TOTAL]).forEach(function (r) {
      for (var h = 0; h < res.months.length; h++) {
        var s = 0, m = 0;
        f.ds.brands.forEach(function (b) {
          var v = res.share[r][b][h];
          ok(v >= 0 && v <= 1, r + ' ' + b + ' 점유율 범위: ' + v);
          s += v;
        });
        f.ds.powertrains.forEach(function (p) { m += res.ptMix[r][p][h]; });
        near(s, 1, 1e-9, r + ' ' + h + ' 점유율 합');
        near(m, 1, 1e-9, r + ' ' + h + ' 파워트레인 합');
      }
    });
  });

  // ---------- 카드 크기 ----------

  test('BRAND +10% 카드: 완전 발효 달에 점유율이 정확히 1.1 배', function () {
    var f = fixture();
    // Brand A 는 BEV 만 팔아서 지역 점유율도 정확히 1.1 배가 됩니다.
    var c = card({ layer: 'BRAND', region: 'CN', target: 'Brand A', magnitude: { min: 10, mode: 10, max: 10 }, start: f.bl.months[2], rampShape: 'linear', rampMonths: 3 });
    var res = sim.engine.simulate(f.ds, f.bl, [c]);
    var full = fullMonths(c, f.bl.months);
    ok(full.length > 10, '완전 발효 달이 있어야 합니다');
    full.forEach(function (h) {
      near(res.share.CN['Brand A'][h], f.base.share.CN['Brand A'][h] * 1.1, 1e-9, h + '번째 달');
    });
    near(res.share.CN['Brand A'][0], f.base.share.CN['Brand A'][0], 1e-12, '시작 전은 그대로');
    near(res.tiv.CN[5], f.base.tiv.CN[5], 1e-6, '총수요는 그대로');
  });

  test('POWERTRAIN +3%p 카드: 완전 발효 달에 비중이 정확히 +3%p', function () {
    var f = fixture();
    var c = card({ layer: 'POWERTRAIN', region: 'EU', target: 'BEV', magnitude: { min: 3, mode: 3, max: 3 }, rampShape: 'step' });
    var res = sim.engine.simulate(f.ds, f.bl, [c]);
    fullMonths(c, f.bl.months).forEach(function (h) {
      near(res.ptMix.EU.BEV[h], f.base.ptMix.EU.BEV[h] + 0.03, 1e-9, h + '번째 달');
    });
  });

  test('TIV +10% 카드: 총수요 1.1 배, 점유율 그대로', function () {
    var f = fixture();
    var c = card({ layer: 'TIV', region: 'NA', magnitude: { min: 10, mode: 10, max: 10 }, rampShape: 'step' });
    var res = sim.engine.simulate(f.ds, f.bl, [c]);
    res.months.forEach(function (m, h) {
      near(res.tiv.NA[h], f.base.tiv.NA[h] * 1.1, 1e-6, h + ' 총수요');
      near(res.share.NA['Brand C'][h], f.base.share.NA['Brand C'][h], 1e-12, h + ' 점유율');
    });
  });

  test('국가 한정 카드는 그 국가들의 최근 12개월 비중만큼만 적용된다', function () {
    var f = fixture();
    var c = card({ layer: 'TIV', region: 'EU', countries: ['DE', 'FR'], magnitude: { min: 10, mode: 10, max: 10 }, rampShape: 'step' });
    var w = sim.shocks.countryWeight(c, f.ds);
    ok(w > 0.3 && w < 0.6, '가중치 범위: ' + w);
    var res = sim.engine.simulate(f.ds, f.bl, [c]);
    near(res.tiv.EU[3], f.base.tiv.EU[3] * (1 + 0.1 * w), 1e-6);
  });

  // ---------- 시점 ----------

  test('발효 곡선: 즉시, 선형, S자, 유지 후 반감기, 유지 후 종료', function () {
    var months = U.monthRange('2027-01', '2027-12');
    var c = { start: '2027-02', rampShape: 'linear', rampMonths: 3, holdMonths: 2, halfLifeMonths: 2 };
    var v = sim.shocks.curve(c, months);
    near(v[0], 0, 0); near(v[1], 1 / 3, 1e-12); near(v[2], 2 / 3, 1e-12); near(v[3], 1, 0); near(v[4], 1, 0);
    near(v[5], Math.pow(0.5, 0.5), 1e-12); near(v[6], 0.5, 1e-12);
    var s = sim.shocks.curve({ start: '2027-03', rampShape: 'step', rampMonths: 6, holdMonths: null, halfLifeMonths: null }, months);
    eq(s[1], 0); eq(s[2], 1); eq(s[11], 1);
    var sc = sim.shocks.curve({ start: '2027-01', rampShape: 'scurve', rampMonths: 3, holdMonths: 1, halfLifeMonths: null }, months);
    near(sc[0], 7 / 27, 1e-12); near(sc[1], 20 / 27, 1e-12); eq(sc[2], 1); eq(sc[3], 0);
  });

  test('당겨쓰기: 앞 구간이 늘고 뒤 구간이 줄며 두 구간 합계는 그대로', function () {
    var f = fixture();
    var start = f.bl.months[6];
    var plain = card({ layer: 'POWERTRAIN', region: 'CN', target: 'BEV', magnitude: { min: 0, mode: 0, max: 0 }, start: start, rampShape: 'step' });
    var pf = Object.assign({}, plain, { id: 'pf', pullForward: { months: 3, pct: 20 } });
    var a = sim.engine.simulate(f.ds, f.bl, [plain]);
    var b = sim.engine.simulate(f.ds, f.bl, [pf]);
    function bev(res, h) {
      var v = 0;
      f.ds.brands.forEach(function (br) { v += res.units.CN[br].BEV[h]; });
      return v;
    }
    var sa = 0, sb = 0;
    for (var h = 3; h < 9; h++) { sa += bev(a, h); sb += bev(b, h); }
    near(sb, sa, sa * 1e-9, '구간 합계');
    near(bev(b, 3), bev(a, 3) * 1.2, 1e-6, '앞 구간 +20%');
    ok(bev(b, 6) < bev(a, 6), '뒤 구간 감소');
    near(bev(b, 9), bev(a, 9), 1e-6, '구간 밖은 그대로');
  });

  // ---------- 불확실성 ----------

  test('몬테카를로: 같은 시드면 같은 결과, 확률 0 이면 기준선과 같다', function () {
    var f = fixture();
    var c = card({ layer: 'BRAND', region: 'CN', target: 'Brand A', magnitude: { min: 5, mode: 10, max: 30 }, probability: 0.5 });
    var m1 = sim.engine.monteCarlo(f.ds, f.bl, [c], { draws: 200, seed: 7 });
    var m2 = sim.engine.monteCarlo(f.ds, f.bl, [c], { draws: 200, seed: 7 });
    eq(JSON.stringify(m1.brandUnits.CN['Brand A']), JSON.stringify(m2.brandUnits.CN['Brand A']), '같은 시드');
    var zero = Object.assign({}, c, { probability: 0 });
    var m0 = sim.engine.monteCarlo(f.ds, f.bl, [zero], { draws: 50, seed: 7 });
    m0.brandUnits.CN['Brand A'].p90.forEach(function (v, h) { near(v, f.base.brandUnits.CN['Brand A'][h], 1e-6, h); });
  });

  test('몬테카를로: 확률 1 이고 강도가 한 값이면 구간 폭이 0 이고 시나리오와 같다', function () {
    var f = fixture();
    var c = card({ layer: 'POWERTRAIN', region: 'KR', target: 'BEV', magnitude: { min: 2, mode: 2, max: 2 }, probability: 1 });
    var mc = sim.engine.monteCarlo(f.ds, f.bl, [c], { draws: 20, seed: 1 });
    var det = sim.engine.simulate(f.ds, f.bl, [c]);
    det.tiv.KR.forEach(function (v, h) {
      near(mc.tiv.KR.p10[h], v, 1e-6); near(mc.tiv.KR.p90[h], v, 1e-6);
      near(mc.brandUnits.KR['Brand D'].p50[h], det.brandUnits.KR['Brand D'][h], 1e-6);
    });
  });

  // ---------- 잘못된 카드, 기여도 ----------

  test('판매가 없는 대상의 카드는 빼고 계산하고 경고를 남긴다', function () {
    var f = fixture();
    // 예시 데이터에서 Brand B 는 NA 에서 팔지 않습니다.
    var c = card({ layer: 'BRAND', region: 'NA', target: 'Brand B', magnitude: { min: 50, mode: 50, max: 50 } });
    var res = sim.engine.simulate(f.ds, f.bl, [c]);
    eq(res.warnings.length, 1, '경고 수');
    res.tiv.NA.forEach(function (v, h) { near(v, f.base.tiv.NA[h], 1e-6); });
  });

  test('기여도: 서로 다른 지역 카드 두 장이면 상호작용이 0 이고 카드 차이 합이 전체 차이와 같다', function () {
    var f = fixture();
    var c1 = card({ id: 'k1', layer: 'TIV', region: 'KR', magnitude: { min: -5, mode: -5, max: -5 } });
    var c2 = card({ id: 'k2', layer: 'BRAND', region: 'JP', target: 'Brand C', magnitude: { min: 5, mode: 5, max: 5 } });
    var cr = sim.engine.contributions(f.ds, f.bl, [c1, c2]);
    eq(cr.items.length, 2);
    cr.interaction[sim.TOTAL]['Brand C'].forEach(function (v) { near(v, 0, 1e-6, '상호작용'); });
    var d = cr.total.brandUnits.KR['Brand D'][4] - cr.base.brandUnits.KR['Brand D'][4];
    near(cr.items[0].delta.KR['Brand D'][4], d, 1e-6);
  });

  test('예시 데이터는 열 때마다 같다', function () {
    var a = sim.sample.make();
    var b = sim.sample.make();
    eq(a.sales.length, b.sales.length);
    eq(JSON.stringify(a.sales[100]), JSON.stringify(b.sales[100]));
    eq(JSON.stringify(a.powertrain[50]), JSON.stringify(b.powertrain[50]));
  });

  test('예시 카드는 모두 오류 없이 만들어진다', function () {
    var f = fixture();
    sim.presets.forEach(function (p) {
      var c = p.make(f.ds, f.bl);
      var errs = sim.shocks.validate(c, f.ds, f.bl).filter(function (n) { return n.level === 'error'; });
      eq(errs.length, 0, p.key + ': ' + (errs[0] && errs[0].message));
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
