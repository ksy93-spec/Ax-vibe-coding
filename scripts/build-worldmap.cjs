// demand-sim 의 세계 지도와 국가 이름표를 만듭니다. 바깥(인터넷 되는 곳)에서만 돌립니다.
// 결과 파일 두 개를 킷에 커밋하므로 사내에서는 이 스크립트도, 아래 패키지도 필요 없습니다.
//
// 준비 (임시 폴더에서, 정확한 버전으로):
//   npm install world-atlas@2.0.2 topojson-client@3.1.0 d3-geo@3.1.1 i18n-iso-countries@7.14.0
// 실행:
//   NODE_PATH=<그 폴더>/node_modules node scripts/build-worldmap.cjs
//
// 출력
//   kits/demand-sim/src/ui/worldmap-data.js  나라별 SVG 경로 (Natural Earth 110m, 공공 저작물)
//   kits/demand-sim/src/model/countries.js   ISO 코드, 영문/한글 이름 (i18n-iso-countries, MIT)
// 지도 경로는 투영(Natural Earth 1)과 소수 1자리 반올림만 합니다. 원자료 값을 고치지 않습니다.
'use strict';
const fs = require('fs');
const path = require('path');
const topo = require('topojson-client');
const d3 = require('d3-geo');
const iso = require('i18n-iso-countries');
iso.registerLocale(require('i18n-iso-countries/langs/en.json'));
iso.registerLocale(require('i18n-iso-countries/langs/ko.json'));

const KIT = path.join(__dirname, '..', 'kits', 'demand-sim');
const W = 960;
const H = 470;

const world = require('world-atlas/countries-110m.json');
const fc = topo.feature(world, world.objects.countries);
const features = fc.features.filter((f) => f.id !== '010'); // 남극 제외
const projection = d3.geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], { type: 'FeatureCollection', features });
const pathGen = d3.geoPath(projection).digits(1);

function largestPolygon(f) {
  if (f.geometry.type === 'Polygon') return f.geometry;
  let best = null;
  let bestA = -1;
  for (const coords of f.geometry.coordinates) {
    const g = { type: 'Polygon', coordinates: coords };
    const a = d3.geoArea(g);
    if (a > bestA) { bestA = a; best = g; }
  }
  return best;
}

const out = [];
for (const f of features) {
  const iso2 = f.id ? iso.numericToAlpha2(f.id) || '' : '';
  const main = largestPolygon(f);
  const c = pathGen.centroid(main);
  out.push({
    iso2,
    name: f.properties.name,
    d: pathGen(f),
    cx: Math.round(c[0] * 10) / 10,
    cy: Math.round(c[1] * 10) / 10,
    a: Math.round(pathGen.area(main)),
  });
}
out.sort((a, b) => (a.iso2 || 'ZZ' + a.name).localeCompare(b.iso2 || 'ZZ' + b.name));

const header = (desc) => `/* 자동 생성 파일입니다. 손으로 고치지 마세요. scripts/build-worldmap.cjs 가 만듭니다.\n * ${desc}\n */\n`;

fs.writeFileSync(
  path.join(KIT, 'src', 'ui', 'worldmap-data.js'),
  header('세계 지도: Natural Earth 1:110m 행정 경계(공공 저작물), world-atlas@2.0.2 (ISC). Natural Earth 1 투영, 960x470.') +
    '(function (global) {\n  \'use strict\';\n  var App = (global.App = global.App || {});\n  App.worldMapData = ' +
    JSON.stringify({ width: W, height: H, countries: out }) +
    ';\n})(window);\n'
);

const codes = Object.keys(iso.getAlpha2Codes()).sort();
const list = codes.map((a2) => {
  const en = iso.getName(a2, 'en', { select: 'all' }) || [];
  const ko = iso.getName(a2, 'ko', { select: 'all' }) || [];
  return [a2, iso.alpha2ToAlpha3(a2), en, ko];
});
fs.writeFileSync(
  path.join(KIT, 'src', 'model', 'countries.js'),
  header('국가 코드와 이름: i18n-iso-countries@7.14.0 (MIT). [ISO2, ISO3, 영문 이름들, 한글 이름들]') +
    "(function (global) {\n  'use strict';\n  var App = (global.App = global.App || {});\n  var sim = (App.sim = App.sim || {});\n  sim.countryTable = " +
    JSON.stringify(list) +
    ';\n})(typeof window !== \'undefined\' ? window : globalThis);\n'
);
console.log('지도 나라', out.length, '/ 국가표', list.length);
