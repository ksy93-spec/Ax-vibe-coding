/* CSV 읽기/쓰기. 한국 사내 데이터에서 실제로 문제가 되는 것들을 처리합니다.
 * - CP949(EUC-KR) 로 저장된 파일 자동 판별
 * - UTF-8 BOM 제거, 내보낼 때는 BOM 부착 (엑셀이 BOM 없으면 한글을 깹니다)
 * - 따옴표 안의 쉼표, 줄바꿈, 이스케이프된 따옴표 ("")
 * - CRLF / LF 혼용
 * 전역 App.csv 에 붙습니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  /**
   * ArrayBuffer 를 문자열로 디코딩합니다.
   * UTF-8 로 엄격하게 읽어보고 실패하면 CP949 로 다시 읽습니다.
   * @returns {{ text: string, encoding: 'utf-8'|'cp949' }}
   */
  function decode(buffer) {
    var bytes = new Uint8Array(buffer);
    // BOM 이 있으면 UTF-8 확정
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8' };
    }
    try {
      var text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { text: text, encoding: 'utf-8' };
    } catch (e) {
      // UTF-8 로 해석되지 않는 바이트가 있으면 CP949 로 봅니다.
      // 브라우저에서 'euc-kr' 라벨은 실제로 CP949(확장 완성형) 디코더에 연결됩니다.
      return { text: new TextDecoder('euc-kr').decode(bytes), encoding: 'cp949' };
    }
  }

  /**
   * CSV 텍스트를 2차원 배열로 파싱합니다. RFC 4180 기준.
   * @param {string} text
   * @param {string} [delimiter] 기본 ','. 탭 구분이면 '\t'.
   * @returns {string[][]}
   */
  function parse(text, delimiter) {
    var d = delimiter || ',';
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    var n = text.length;

    while (i < n) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += ch;
        i += 1;
        continue;
      }

      if (ch === '"' && field === '') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (ch === d) {
        row.push(field);
        field = '';
        i += 1;
        continue;
      }
      if (ch === '\r') {
        if (text[i + 1] === '\n') i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i += 1;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
    }

    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  /** 구분자를 추정합니다. 첫 5줄에서 쉼표/탭/세미콜론 중 가장 일관된 것. */
  function sniffDelimiter(text) {
    var head = text.split(/\r?\n/).slice(0, 5).filter(Boolean);
    if (!head.length) return ',';
    var best = ',';
    var bestScore = -1;
    [',', '\t', ';', '|'].forEach(function (d) {
      var counts = head.map(function (line) {
        return line.split(d).length - 1;
      });
      var first = counts[0];
      if (first === 0) return;
      var consistent = counts.every(function (c) {
        return c === first;
      });
      var score = first * (consistent ? 10 : 1);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    });
    return best;
  }

  /**
   * 첫 줄을 헤더로 보고 객체 배열로 바꿉니다.
   * 빈 헤더나 중복 헤더는 col1, col2 식으로 채웁니다.
   */
  function toObjects(rows) {
    if (!rows.length) return { columns: [], records: [] };
    var seen = {};
    var columns = rows[0].map(function (name, idx) {
      var key = String(name).trim() || 'col' + (idx + 1);
      if (seen[key]) {
        seen[key] += 1;
        key = key + '_' + seen[key];
      } else {
        seen[key] = 1;
      }
      return key;
    });
    var records = rows.slice(1).map(function (r) {
      var o = {};
      columns.forEach(function (c, i) {
        o[c] = r[i] === undefined ? '' : r[i];
      });
      return o;
    });
    return { columns: columns, records: records };
  }

  /** 한 필드를 CSV 규칙에 맞게 감쌉니다. */
  function escapeField(value, delimiter) {
    var s = value === null || value === undefined ? '' : String(value);
    if (s.indexOf('"') >= 0 || s.indexOf(delimiter) >= 0 || /[\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /**
   * 객체 배열을 CSV 문자열로 만듭니다.
   * @param {string[]} columns
   * @param {object[]} records
   * @param {{delimiter?: string, newline?: string}} [opts]
   */
  function stringify(columns, records, opts) {
    var o = opts || {};
    var d = o.delimiter || ',';
    var nl = o.newline || '\r\n'; // 엑셀 호환을 위해 기본 CRLF
    var lines = [
      columns
        .map(function (c) {
          return escapeField(c, d);
        })
        .join(d),
    ];
    records.forEach(function (rec) {
      lines.push(
        columns
          .map(function (c) {
            return escapeField(rec[c], d);
          })
          .join(d)
      );
    });
    return lines.join(nl);
  }

  /**
   * 다운로드 파일명을 안전하게 만듭니다.
   *
   * 크로미움 계열은 <a download> 값에 한글이 섞이면 이름을 통째로 버리고 확장자 없는
   * 'download' 파일을 떨굽니다. 폐쇄망에서는 사용자가 원인을 찾기 어려우므로 기본값은
   * ASCII 이름입니다. 사내 브라우저에서 한글 파일명이 정상 동작하는 것을 확인했다면
   * download(name, text, { allowUnicodeName: true }) 로 끌 수 있습니다.
   * @param {string} name
   * @returns {string}
   */
  function safeFilename(name) {
    var ext = '';
    var m = /\.[A-Za-z0-9]{1,8}$/.exec(name);
    if (m) {
      ext = m[0].toLowerCase();
      name = name.slice(0, -ext.length);
    }
    var ascii = name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[_.]+|_+$/g, '');
    if (!/[A-Za-z0-9]/.test(ascii)) ascii = 'export';
    return ascii + (ext || '.csv');
  }

  /**
   * 브라우저에서 CSV 파일로 내려받습니다. UTF-8 BOM 을 붙여 엑셀에서 한글이 깨지지 않게 합니다.
   * @param {string} filename
   * @param {string} csvText
   * @param {{allowUnicodeName?: boolean}} [opts]
   * @returns {string} 실제로 사용한 파일명
   */
  function download(filename, csvText, opts) {
    var name = opts && opts.allowUnicodeName ? filename : safeFilename(filename);
    var blob = new Blob(['\ufeff' + csvText], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    return name;
  }

  /**
   * File 객체를 읽어 파싱까지 합니다.
   * @param {File} file
   * @param {(err: Error|null, result?: {columns: string[], records: object[], encoding: string, delimiter: string}) => void} cb
   */
  function readFile(file, cb) {
    var reader = new FileReader();
    reader.onerror = function () {
      cb(new Error('파일을 읽지 못했습니다: ' + file.name));
    };
    reader.onload = function () {
      try {
        var d = decode(reader.result);
        var delimiter = sniffDelimiter(d.text);
        var table = toObjects(parse(d.text, delimiter));
        cb(null, {
          columns: table.columns,
          records: table.records,
          encoding: d.encoding,
          delimiter: delimiter,
        });
      } catch (e) {
        cb(e);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  App.csv = {
    decode: decode,
    parse: parse,
    sniffDelimiter: sniffDelimiter,
    toObjects: toObjects,
    stringify: stringify,
    safeFilename: safeFilename,
    download: download,
    readFile: readFile,
  };
})(window);
