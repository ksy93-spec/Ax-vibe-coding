/* 시뮬레이션 엔진. 전역 App.sim.engine.
 *
 * 판매량(브랜드 i, 파워트레인 p, 지역 r, 월 h)
 *   = 총수요 TIV[r,h] x 파워트레인 비중 m[p|r,h] x 파워트레인 안 브랜드 점유율 s[i|p,r,h]
 *
 * 카드는 층마다 다르게 들어갑니다.
 *   TIV        총수요에 (1 + 강도% x 발효강도) 를 곱합니다.
 *   POWERTRAIN 파워트레인 효용에 더합니다. 완전 발효 때 그 달 기준 비중이 정확히 강도 %p 만큼 바뀌는 값입니다.
 *   BRAND      브랜드 효용에 더합니다. 완전 발효 때 그 달 기준 점유율이 정확히 (1 + 강도%) 배가 되는 값입니다.
 * 카드 여러 장은 효용에 합산되므로 합이 1 을 넘거나 0 아래로 가지 않습니다.
 * 당겨쓰기는 점유율 계산이 끝난 판매량에 마지막으로 적용합니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;
  var S = sim.shocks;

  var SHARE_LO = 1e-4;
  var SHARE_HI = 0.999;

  /** 카드 목록에서 계산에 쓸 것만 골라 발효 곡선과 국가 가중치를 미리 계산합니다. */
  function prepareCards(ds, bl, cards, warnings) {
    var list = [];
    (cards || []).forEach(function (card) {
      if (!card.enabled) return;
      var problems = S.validate(card, ds, bl);
      var errors = problems.filter(function (n) { return n.level === 'error'; });
      if (errors.length) {
        warnings.push((card.name || card.id) + ': ' + errors[0].message + ' (이 카드는 빼고 계산했습니다)');
        return;
      }
      list.push({ card: card, w: S.countryWeight(card, ds), c: S.curve(card, bl.months) });
    });
    return list;
  }

  /** 준비된 카드에 이번 표본(draw)의 발생 여부와 강도를 입힙니다. */
  function applyDraw(prepared, draw) {
    var out = [];
    prepared.forEach(function (pc) {
      var card = pc.card;
      var d = draw && draw[card.id];
      if (d && !d.occurs) return;
      var mag = d ? d.magnitude : card.magnitude.mode;
      out.push({
        card: card,
        x: (mag * pc.w) / 100,
        pf: card.pullForward ? { months: card.pullForward.months, x: (card.pullForward.pct * pc.w) / 100 } : null,
        c: pc.c,
      });
    });
    return out;
  }

  function simulate(ds, bl, cards, draw) {
    var warnings = [];
    return run(ds, bl, prepareCards(ds, bl, cards, warnings), draw, warnings);
  }

  function run(ds, bl, preparedCards, draw, warnings) {
    var H = bl.months.length;
    var nPt = ds.powertrains.length;
    var nB = ds.brands.length;
    var prepared = applyDraw(preparedCards, draw);
    var units = {};

    ds.regions.forEach(function (r) {
      var mine = prepared.filter(function (pc) { return pc.card.region === r; });
      var tivCards = mine.filter(function (pc) { return pc.card.layer === 'TIV'; });
      var ptCards = mine.filter(function (pc) { return pc.card.layer === 'POWERTRAIN'; });
      var brCards = mine.filter(function (pc) { return pc.card.layer === 'BRAND'; });
      var Q = {};
      ds.brands.forEach(function (b) {
        Q[b] = {};
        ds.powertrains.forEach(function (p) { Q[b][p] = U.zeros(H); });
      });

      for (var h = 0; h < H; h++) {
        var tiv = bl.tiv[r][h];
        tivCards.forEach(function (pc) { tiv *= Math.max(0, 1 + pc.x * pc.c[h]); });

        var p;
        var mBase = bl.ptShare[r][h];
        var m = mBase;
        var uPt = null;
        ptCards.forEach(function (pc) {
          if (!pc.c[h]) return;
          if (!uPt) {
            uPt = [];
            for (var k = 0; k < nPt; k++) uPt.push(bl.ptU[r][k][h]);
          }
          var pi = ds.powertrains.indexOf(pc.card.target);
          var goal = U.clamp(mBase[pi] + pc.x, SHARE_LO, SHARE_HI);
          uPt[pi] += pc.c[h] * (U.logit(goal) - U.logit(mBase[pi]));
        });
        if (uPt) m = U.softmax(uPt, bl.ptActive[r]);

        for (p = 0; p < nPt; p++) {
          if (m[p] <= 0) continue;
          var pt = ds.powertrains[p];
          var act = bl.brandActive[r][pt];
          var sBase = bl.brandShare[r][pt][h];
          var uB = null;
          var i;
          brCards.forEach(function (pc) {
            if (!pc.c[h]) return;
            if (pc.card.powertrain && pc.card.powertrain !== pt) return;
            var bi = ds.brands.indexOf(pc.card.target);
            if (!act[bi]) return;
            if (!uB) {
              uB = [];
              for (var k = 0; k < nB; k++) uB.push(bl.brandU[r][pt][k][h]);
            }
            var goal = U.clamp(sBase[bi] * (1 + pc.x), SHARE_LO, SHARE_HI);
            uB[bi] += pc.c[h] * (U.logit(goal) - U.logit(sBase[bi]));
          });
          var s = uB ? U.softmax(uB, act) : sBase;
          for (i = 0; i < nB; i++) Q[ds.brands[i]][pt][h] = tiv * m[p] * s[i];
        }
      }

      mine.forEach(function (pc) {
        if (pc.pf) applyPullForward(Q, ds, bl, pc, warnings);
      });
      units[r] = Q;
    });

    return aggregate(ds, bl, units, warnings);
  }

  /**
   * 시작 전 K 개월 대상 물량을 (1 + x) 배로 늘리고, 늘린 물량 합계를 시작 후 K 개월에서
   * 기존 물량 비례로 뺍니다. 두 구간 합계는 당겨쓰기 전과 같습니다 (둘 다 예측 기간 안일 때).
   */
  function applyPullForward(Q, ds, bl, pc, warnings) {
    var card = pc.card;
    var H = bl.months.length;
    var A = U.monthIndex(card.start) - U.monthIndex(bl.months[0]);
    var K = pc.pf.months;
    var cells = [];
    ds.brands.forEach(function (b) {
      if (card.layer === 'BRAND' && b !== card.target) return;
      ds.powertrains.forEach(function (p) {
        if (card.layer === 'POWERTRAIN' && p !== card.target) return;
        if (card.layer === 'BRAND' && card.powertrain && p !== card.powertrain) return;
        cells.push(Q[b][p]);
      });
    });
    function vol(h) {
      var v = 0;
      cells.forEach(function (a) { v += a[h]; });
      return v;
    }
    var extra = 0;
    var h;
    for (h = Math.max(0, A - K); h < Math.min(H, A); h++) {
      extra += vol(h) * pc.pf.x;
      cells.forEach(function (a) { a[h] *= 1 + pc.pf.x; });
    }
    var from = Math.max(0, A);
    var to = Math.min(H, A + K);
    if (from >= to) {
      if (extra) warnings.push((card.name || card.id) + ': 시작 후 줄어드는 구간이 전망 기간 뒤라 미리 산 물량만 반영됐습니다.');
      return;
    }
    var post = 0;
    for (h = from; h < to; h++) post += vol(h);
    if (post <= 0) return;
    var f = 1 - extra / post;
    if (f < 0) {
      warnings.push((card.name || card.id) + ': 미리 산 물량이 시작 후 판매보다 커서 시작 후 판매를 0 으로 잘랐습니다.');
      f = 0;
    }
    for (h = from; h < to; h++) cells.forEach(function (a) { a[h] *= f; });
  }

  function aggregate(ds, bl, units, warnings) {
    var H = bl.months.length;
    var TOTAL = sim.TOTAL;
    var brandUnits = {};
    var tiv = {};
    var share = {};
    var ptMix = {};
    var keys = ds.regions.concat([TOTAL]);
    keys.forEach(function (r) {
      brandUnits[r] = {};
      ds.brands.forEach(function (b) { brandUnits[r][b] = U.zeros(H); });
      ptMix[r] = {};
      ds.powertrains.forEach(function (p) { ptMix[r][p] = U.zeros(H); });
      tiv[r] = U.zeros(H);
    });
    ds.regions.forEach(function (r) {
      ds.brands.forEach(function (b) {
        ds.powertrains.forEach(function (p) {
          var a = units[r][b][p];
          for (var h = 0; h < H; h++) {
            brandUnits[r][b][h] += a[h];
            brandUnits[TOTAL][b][h] += a[h];
            ptMix[r][p][h] += a[h];
            ptMix[TOTAL][p][h] += a[h];
            tiv[r][h] += a[h];
            tiv[TOTAL][h] += a[h];
          }
        });
      });
    });
    keys.forEach(function (r) {
      share[r] = {};
      ds.brands.forEach(function (b) {
        share[r][b] = brandUnits[r][b].map(function (v, h) { return tiv[r][h] > 0 ? v / tiv[r][h] : 0; });
      });
      ds.powertrains.forEach(function (p) {
        ptMix[r][p] = ptMix[r][p].map(function (v, h) { return tiv[r][h] > 0 ? v / tiv[r][h] : 0; });
      });
    });
    return {
      months: bl.months.slice(),
      units: units,
      brandUnits: brandUnits,
      tiv: tiv,
      share: share,
      ptMix: ptMix,
      warnings: warnings,
    };
  }

  /**
   * 카드마다 발생 여부(확률)와 강도(삼각분포 최소/최빈/최대)를 뽑아 draws 번 돌립니다.
   * 난수는 카드마다 항상 두 개씩 뽑으므로, 카드 하나를 끄거나 켜도 다른 카드의 표본은 달라지지 않습니다.
   */
  function monteCarlo(ds, bl, cards, opts) {
    var N = Math.max(1, Math.round(opts.draws || 500));
    var seed = opts.seed == null ? 42 : opts.seed;
    var r = U.rng(seed);
    var H = bl.months.length;
    var keys = ds.regions.concat([sim.TOTAL]);
    var list = (cards || []).filter(function (c) { return c.enabled; });
    var prepared = prepareCards(ds, bl, list, []);

    // 표본 저장: [key][brand] -> Float64Array(N*H), 월 h 의 d 번째 표본은 h*N + d
    var bu = {};
    var sh = {};
    var tv = {};
    keys.forEach(function (k) {
      bu[k] = {};
      sh[k] = {};
      ds.brands.forEach(function (b) {
        bu[k][b] = new Float64Array(N * H);
        sh[k][b] = new Float64Array(N * H);
      });
      tv[k] = new Float64Array(N * H);
    });

    for (var d = 0; d < N; d++) {
      var draw = {};
      list.forEach(function (c) {
        var u1 = r();
        var mg = c.magnitude;
        draw[c.id] = { occurs: u1 < c.probability, magnitude: U.triangular(r, mg.min, mg.mode, mg.max) };
      });
      var res = run(ds, bl, prepared, draw, []);
      keys.forEach(function (k) {
        ds.brands.forEach(function (b) {
          var a = res.brandUnits[k][b];
          var s = res.share[k][b];
          for (var h = 0; h < H; h++) {
            bu[k][b][h * N + d] = a[h];
            sh[k][b][h * N + d] = s[h];
          }
        });
        for (var h2 = 0; h2 < H; h2++) tv[k][h2 * N + d] = res.tiv[k][h2];
      });
    }

    function band(arr) {
      var out = { p10: [], p50: [], p90: [] };
      for (var h = 0; h < H; h++) {
        var slice = Array.prototype.slice.call(arr.subarray(h * N, (h + 1) * N)).sort(function (a, b) { return a - b; });
        out.p10.push(U.quantileSorted(slice, 0.1));
        out.p50.push(U.quantileSorted(slice, 0.5));
        out.p90.push(U.quantileSorted(slice, 0.9));
      }
      return out;
    }

    var result = { draws: N, seed: seed, months: bl.months.slice(), brandUnits: {}, tiv: {}, share: {} };
    keys.forEach(function (k) {
      result.brandUnits[k] = {};
      result.share[k] = {};
      ds.brands.forEach(function (b) {
        result.brandUnits[k][b] = band(bu[k][b]);
        result.share[k][b] = band(sh[k][b]);
      });
      result.tiv[k] = band(tv[k]);
    });
    return result;
  }

  /** 카드 하나씩만 켰을 때의 차이와, 전부 켰을 때 남는 상호작용. */
  function contributions(ds, bl, cards) {
    var base = simulate(ds, bl, []);
    var total = simulate(ds, bl, cards);
    var keys = ds.regions.concat([sim.TOTAL]);
    var H = bl.months.length;
    var items = [];
    (cards || []).forEach(function (card) {
      if (!card.enabled) return;
      var errors = S.validate(card, ds, bl).filter(function (n) { return n.level === 'error'; });
      if (errors.length) return;
      var one = simulate(ds, bl, [card]);
      var delta = {};
      keys.forEach(function (k) {
        delta[k] = {};
        ds.brands.forEach(function (b) {
          delta[k][b] = one.brandUnits[k][b].map(function (v, h) { return v - base.brandUnits[k][b][h]; });
        });
      });
      items.push({ cardId: card.id, name: card.name || card.id, delta: delta });
    });
    var interaction = {};
    keys.forEach(function (k) {
      interaction[k] = {};
      ds.brands.forEach(function (b) {
        var arr = [];
        for (var h = 0; h < H; h++) {
          var v = total.brandUnits[k][b][h] - base.brandUnits[k][b][h];
          items.forEach(function (it) { v -= it.delta[k][b][h]; });
          arr.push(v);
        }
        interaction[k][b] = arr;
      });
    });
    return { base: base, total: total, items: items, interaction: interaction };
  }

  sim.engine = { simulate: simulate, monteCarlo: monteCarlo, contributions: contributions };
})(typeof window !== 'undefined' ? window : globalThis);
