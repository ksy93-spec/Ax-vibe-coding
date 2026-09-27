// 수주 관리. 편집 가능한 DataGrid, zod 검증, 엑셀 가져오기와 내보내기 예시입니다.
//
// 주의: 이 화면에서 고친 내용은 브라우저를 닫으면 사라집니다. 여러 사람이 같이 쓰는
// 수주 대장이라면 원본은 공유 폴더의 엑셀로 두고, 이 화면은 그 파일을 읽고 고쳐서
// 다시 내려받는 용도로 쓰세요. 여러 사람이 동시에 고치려면 사내 서버가 필요합니다.
import { useMemo, useRef, useState } from 'react';
import * as z from 'zod';
import { Download, Upload } from 'lucide-react';
import DataGrid from '../components/DataGrid.jsx';
import Panel from '../components/Panel.jsx';
import Kpi from '../components/Kpi.jsx';
import Button from '../components/Button.jsx';
import { ORDERS } from '../sample/data.js';
import { readTableFile, downloadXlsx } from '../lib/excel.js';
import { compact, num } from '../lib/format.js';

const STATUS = ['확정', '협의', '보류'];

// 엑셀에서 가져올 때 한 줄씩 검사합니다. 머리글은 한글 열 이름 그대로입니다.
const Row = z.object({
  수주번호: z.string().min(1, '수주번호가 비었습니다'),
  수주일: z.coerce.string().regex(/^\d{4}-\d{2}-\d{2}$/, '수주일은 YYYY-MM-DD'),
  OEM: z.string().min(1, 'OEM 이 비었습니다'),
  품목: z.string().min(1, '품목이 비었습니다'),
  수량: z.coerce.number().int('수량은 정수').positive('수량은 1 이상'),
  단가: z.coerce.number().nonnegative('단가는 0 이상'),
  상태: z.enum(STATUS, { error: '상태는 확정, 협의, 보류 중 하나' }),
  납기: z.coerce.string().regex(/^\d{4}-\d{2}-\d{2}$/, '납기는 YYYY-MM-DD'),
});

const toRow = (r) => ({ id: r.수주번호, date: r.수주일, oem: r.OEM, part: r.품목, qty: r.수량, unitPrice: r.단가, status: r.상태, due: r.납기 });

function asYmd(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v;
}

export default function Orders() {
  const [rows, setRows] = useState(ORDERS);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);

  const columns = useMemo(() => [
    { field: 'id', headerName: '수주번호', pinned: 'left', width: 130 },
    { field: 'date', headerName: '수주일', width: 120 },
    { field: 'oem', headerName: 'OEM', width: 110 },
    { field: 'part', headerName: '품목', width: 140 },
    { field: 'qty', headerName: '수량', type: 'numericColumn', editable: true, valueParser: (p) => Number(p.newValue) || 0, valueFormatter: (p) => num(p.value) },
    { field: 'unitPrice', headerName: '단가', type: 'numericColumn', editable: true, valueParser: (p) => Number(p.newValue) || 0, valueFormatter: (p) => num(p.value) },
    { headerName: '금액', type: 'numericColumn', valueGetter: (p) => p.data.qty * p.data.unitPrice, valueFormatter: (p) => num(p.value) },
    { field: 'status', headerName: '상태', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: STATUS }, width: 100 },
    { field: 'due', headerName: '납기', width: 120 },
  ], []);

  const sum = (s) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.qty * r.unitPrice, 0);

  async function onImport(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const t = await readTableFile(file);
      const ok = [];
      const bad = [];
      t.rows.forEach((raw, i) => {
        const r = Row.safeParse({ ...raw, 수주일: asYmd(raw.수주일), 납기: asYmd(raw.납기) });
        if (r.success) ok.push(toRow(r.data));
        else bad.push({ line: i + 2, msg: r.error.issues.map((x) => x.message).join(', ') });
      });
      setErrors(bad);
      if (ok.length) setRows(ok);
      setNotice(file.name + ': ' + ok.length + '행 가져옴' + (bad.length ? ', ' + bad.length + '행 제외' : ''));
    } catch (err) {
      setErrors([]);
      setNotice('가져오지 못했습니다: ' + err.message);
    }
  }

  async function onExport() {
    const name = await downloadXlsx('orders.xlsx', [{
      name: '수주',
      columns: [
        { header: '수주번호', key: '수주번호' }, { header: '수주일', key: '수주일' },
        { header: 'OEM', key: 'OEM' }, { header: '품목', key: '품목' },
        { header: '수량', key: '수량', numFmt: '#,##0' }, { header: '단가', key: '단가', numFmt: '#,##0' },
        { header: '금액', key: '금액', numFmt: '#,##0' }, { header: '상태', key: '상태' }, { header: '납기', key: '납기' },
      ],
      rows: rows.map((r) => ({ 수주번호: r.id, 수주일: r.date, OEM: r.oem, 품목: r.part, 수량: r.qty, 단가: r.unitPrice, 금액: r.qty * r.unitPrice, 상태: r.status, 납기: r.due })),
    }]);
    setNotice(name + ' 로 내려받았습니다.');
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="확정 수주액" value={compact(sum('확정'))} unit="원" tone="good" />
        <Kpi label="협의 중" value={compact(sum('협의'))} unit="원" />
        <Kpi label="보류" value={compact(sum('보류'))} unit="원" />
        <Kpi label="건수" value={rows.length} unit="건" />
      </div>

      <Panel title="수주 목록" hint="수량, 단가, 상태 칸을 두 번 누르면 고칠 수 있습니다. 고친 내용은 엑셀로 내려받아야 남습니다."
             actions={<>
               <input ref={fileRef} id="order-file" type="file" accept=".xlsx,.csv" className="hidden" onChange={onImport} />
               <Button onClick={() => fileRef.current.click()}><Upload size={14} />엑셀 가져오기</Button>
               <Button primary onClick={onExport}><Download size={14} />엑셀 내려받기</Button>
             </>}>
        {notice && <p className="mb-3 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent" role="status">{notice}</p>}
        {errors.length > 0 && (
          <div className="mb-3 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
            <div className="font-semibold">제외된 행</div>
            <ul className="mt-1 list-disc pl-5">{errors.slice(0, 8).map((e) => <li key={e.line}>{e.line}행: {e.msg}</li>)}</ul>
            {errors.length > 8 && <div className="mt-1">외 {errors.length - 8}행</div>}
          </div>
        )}
        <DataGrid height={440} rows={rows} columns={columns}
                  onCellValueChanged={(e) => setRows((prev) => prev.map((r) => (r.id === e.data.id ? { ...e.data } : r)))} />
      </Panel>
    </div>
  );
}
