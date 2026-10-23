// earnings-archive 의 회사 CI 마크를 만듭니다. 바깥(npm 레지스트리에 닿는 곳)에서만 돌립니다.
// 결과 SVG 를 킷에 커밋하므로 사내에서는 이 스크립트도, 아래 패키지도 필요 없습니다.
//
// 준비 (임시 폴더에서, 정확한 버전으로):
//   npm pack simple-icons@16.35.0 && tar xzf simple-icons-16.35.0.tgz
// 실행:
//   node scripts/build-logos.cjs <압축 푼 package 폴더>
//
// 출력
//   kits/earnings-archive/assets/logos/<회사 id>.svg   아이콘 경로에 브랜드 색 fill 만 넣습니다. 모양은 고치지 않습니다.
//   kits/earnings-archive/assets/logos/SOURCES.md      아이콘별 출처, 버전, 라이선스, 브랜드 지침 주소
// simple-icons 에 없는 회사(Mercedes-Benz, JLR, Aumovio, DENSO, ALPS ALPINE, Visteon)는 만들지 않습니다.
// 화면이 글자 마크로 대신 그리고, 사내에서 관리 탭의 "로고 바꾸기" 로 파일을 넣습니다.
'use strict';
const fs = require('fs');
const path = require('path');

const pkgDir = process.argv[2];
if (!pkgDir) {
  console.error('사용법: node scripts/build-logos.cjs <simple-icons package 폴더>');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(pkgDir, 'data', 'simple-icons.json'), 'utf8'));
const list = Array.isArray(data) ? data : data.icons;

// 회사 id -> simple-icons slug
const MAP = {
  gm: 'generalmotors',
  tesla: 'tesla',
  hyundai: 'hyundai',
  kia: 'kia',
  honda: 'honda',
  toyota: 'toyota',
  audi: 'audi',
  vw: 'volkswagen',
  bmw: 'bmw',
  porsche: 'porsche',
  volvo: 'volvo',
};

function slugOf(icon) {
  if (icon.slug) return icon.slug;
  return icon.title.toLowerCase().replace(/\+/g, 'plus').replace(/\./g, 'dot').replace(/&/g, 'and')
    .normalize('NFD').replace(/[^a-z0-9]/g, '');
}

const out = path.join(__dirname, '..', 'kits', 'earnings-archive', 'assets', 'logos');
fs.mkdirSync(out, { recursive: true });
const rows = [];
for (const [id, slug] of Object.entries(MAP)) {
  const icon = list.find((i) => slugOf(i) === slug);
  if (!icon) throw new Error('simple-icons 에 ' + slug + ' 가 없습니다');
  const svg = fs.readFileSync(path.join(pkgDir, 'icons', slug + '.svg'), 'utf8').trim();
  const colored = svg.replace('<svg ', '<svg fill="#' + icon.hex + '" ');
  fs.writeFileSync(path.join(out, id + '.svg'), colored + '\n');
  const lic = icon.license ? icon.license.type || icon.license.url : '표기 없음';
  rows.push('| `' + id + '.svg` | ' + icon.title + ' | `' + slug + '` | #' + icon.hex + ' | ' + lic + ' | ' + (icon.guidelines || '-') + ' |');
}

const md = [
  '# CI 마크 출처',
  '',
  '`scripts/build-logos.cjs` 가 만든 파일입니다. npm `simple-icons@' + pkg.version + '` (패키지 라이선스 ' + pkg.license + ') 의 아이콘 경로에',
  '브랜드 색(fill)만 넣었습니다. 모양은 고치지 않았습니다.',
  '',
  '아이콘 데이터는 CC0 이지만 마크 자체는 각 회사의 상표입니다. 사내 자료에서 회사를 알아보는 용도로만 씁니다.',
  '홍보물이나 외부 배포 자료에 쓸 때는 각 회사 브랜드 지침을 따릅니다. 원문: `../licenses/simple-icons-DISCLAIMER.md`',
  '',
  '| 파일 | 회사 | simple-icons slug | 색 | 아이콘 라이선스 | 브랜드 지침 |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
  'Mercedes-Benz, JLR, Aumovio, DENSO, ALPS ALPINE, Visteon 은 simple-icons 에 없어 파일이 없습니다. 화면에는 글자 마크가 나옵니다.',
  '사내에서 관리 탭의 "로고 바꾸기" 로 SVG 나 PNG 를 넣으면 `data/companies.js` 에 저장됩니다.',
  '',
].join('\n');
fs.writeFileSync(path.join(out, 'SOURCES.md'), md);
console.log(rows.length + '개 만들었습니다: ' + out);
