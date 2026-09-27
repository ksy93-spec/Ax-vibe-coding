// 엑셀과 CSV 입출력. 브라우저 안에서만 처리하고 어디로도 전송하지 않습니다.
//
//   const t = await readTableFile(file);        // <input type="file"> 에서 받은 파일
//   t.columns, t.rows (객체 배열), t.encoding, t.sheet
//
//   await downloadXlsx('orders.xlsx', [{ name: '수주', columns, rows }]);
//
// CSV 는 UTF-8 과 CP949(엑셀 기본 저장) 를 자동으로 구분합니다.
// xlsx 는 ExcelJS 로 읽습니다. 구형 .xls 는 읽지 못합니다. 엑셀에서 xlsx 로 다시 저장하세요.

import ExcelJS from 'exceljs';
import Papa from 'papaparse';

function decodeText(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8' };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    // 브라우저의 'euc-kr' 디코더는 실제로 CP949(확장 완성형)까지 읽습니다.
    return { text: new TextDecoder('euc-kr').decode(bytes), encoding: 'cp949' };
  }
}

function dedupe(headers) {
  const seen = {};
  return headers.map((h, i) => {
    let key = String(h ?? '').trim() || 'col' + (i + 1);
    if (seen[key]) { seen[key] += 1; key = key + '_' + seen[key]; } else { seen[key] = 1; }
    return key;
  });
}

function cellValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object' || v instanceof Date) return v;
  if ('result' in v) return v.result ?? null;              // 수식: 마지막 계산값
  if ('richText' in v) return v.richText.map((r) => r.text).join('');
  if ('text' in v) return v.text;                          // 하이퍼링크
  if ('error' in v) return null;
  return String(v);
}

/**
 * CSV 또는 xlsx 파일을 표로 읽습니다. 첫 행이 머리글입니다.
 * @param {File} file
 * @param {{ sheet?: string }} [opts] xlsx 의 시트 이름. 없으면 첫 시트.
 */
export async function readTableFile(file, opts = {}) {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) {
    const { text, encoding } = decodeText(buffer);
    const parsed = Papa.parse(text, { skipEmptyLines: 'greedy' });
    const [head = [], ...body] = parsed.data;
    const columns = dedupe(head);
    const rows = body.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ''])));
    return { columns, rows, encoding, sheet: null };
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = opts.sheet ? wb.getWorksheet(opts.sheet) : wb.worksheets[0];
    if (!ws) throw new Error('시트를 찾을 수 없습니다: ' + (opts.sheet || '(첫 시트)'));
    const all = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      // row.values 는 1부터 시작합니다.
      all.push(row.values.slice(1).map(cellValue));
    });
    const [head = [], ...body] = all;
    const columns = dedupe(head);
    const rows = body.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? null])));
    return { columns, rows, encoding: null, sheet: ws.name };
  }

  if (name.endsWith('.xls')) throw new Error('구형 .xls 는 읽을 수 없습니다. 엑셀에서 .xlsx 로 다시 저장하세요.');
  throw new Error('csv 또는 xlsx 파일만 읽습니다: ' + file.name);
}

/** 한글은 두 칸으로 세는 표시 폭. 엑셀 열 너비 계산용 */
function displayWidth(v) {
  let w = 0;
  for (const ch of String(v ?? '')) w += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 2 : 1;
  return w;
}

/**
 * 크로미움은 다운로드 파일명에 한글이 섞이면 이름을 버리고 확장자 없는 'download' 로 저장합니다.
 * 기본은 ASCII 이름으로 바꿉니다.
 */
export function safeFilename(name, fallbackExt = '.xlsx') {
  const m = /\.[A-Za-z0-9]{1,8}$/.exec(name);
  const ext = m ? m[0].toLowerCase() : fallbackExt;
  const base = (m ? name.slice(0, -m[0].length) : name).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[_.]+|_+$/g, '');
  return (/[A-Za-z0-9]/.test(base) ? base : 'export') + ext;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 서식 있는 xlsx 를 만들어 내려받습니다.
 * @param {string} filename
 * @param {Array<{ name: string, columns: Array<{ header: string, key: string, numFmt?: string, width?: number }>, rows: object[] }>} sheets
 *   numFmt 예: '#,##0' (정수), '#,##0.0' , '0.0%' (0.123 을 12.3% 로), 'yyyy-mm-dd'
 * @returns {Promise<string>} 실제로 쓴 파일명
 */
export async function downloadXlsx(filename, sheets) {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(String(s.name).replace(/[[\]:*?/\\]/g, '_').slice(0, 31) || 'Sheet1', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    ws.columns = s.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width || Math.min(50, Math.max(displayWidth(c.header), ...s.rows.slice(0, 200).map((r) => displayWidth(r[c.key]))) + 3),
      style: c.numFmt ? { numFmt: c.numFmt } : {},
    }));
    s.rows.forEach((r) => ws.addRow(r));
    const head = ws.getRow(1);
    head.font = { bold: true };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEEF3' } };
    head.border = { bottom: { style: 'thin', color: { argb: 'FFC3CAD3' } } };
    if (s.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.columns.length } };
  }
  const buf = await wb.xlsx.writeBuffer();
  const name = safeFilename(filename);
  triggerDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name);
  return name;
}

/** 엑셀에서 한글이 깨지지 않는 CSV (UTF-8 BOM, CRLF) 로 내려받습니다. */
export function downloadCsv(filename, columns, rows) {
  const text = Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => r[c])) }, { newline: '\r\n' });
  const name = safeFilename(filename, '.csv');
  triggerDownload(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }), name);
  return name;
}
