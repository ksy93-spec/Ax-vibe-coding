// 표는 전부 이 컴포넌트로 그립니다. AG Grid Community 36 입니다.
//   <DataGrid rows={rows} columns={[{ field: 'oem', headerName: 'OEM' }, ...]} height={420} />
// columns 는 AG Grid 의 columnDefs 문법 그대로입니다.
// 정렬, 필터, 열 크기 조절, 편집(editable: true), CSV 내보내기가 기본으로 됩니다.
//
// AG Grid 33 부터 모듈 등록과 테마 방식이 바뀌었습니다. 옛 방식(ag-grid.css import,
// className="ag-theme-alpine")은 쓰지 마세요. 여기서 이미 설정해 두었습니다.

import { forwardRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AG_GRID_LOCALE_KR } from '@ag-grid-community/locale';

ModuleRegistry.registerModules([AllCommunityModule]);

// CSS 변수를 그대로 넘겨서 다크 모드를 따라가게 합니다.
const theme = themeQuartz.withParams({
  fontFamily: 'inherit',
  fontSize: 13,
  backgroundColor: 'var(--c-bg-raised)',
  foregroundColor: 'var(--c-fg)',
  headerBackgroundColor: 'var(--c-bg-sunken)',
  headerTextColor: 'var(--c-fg)',
  borderColor: 'var(--c-border)',
  rowHoverColor: 'var(--c-bg-hover)',
  selectedRowBackgroundColor: 'var(--c-accent-bg)',
  accentColor: 'var(--c-accent)',
  oddRowBackgroundColor: 'var(--c-bg-sunken)',
  wrapperBorderRadius: 8,
  headerFontWeight: 600,
});

const defaultColDef = { sortable: true, filter: true, resizable: true, minWidth: 90 };

const DataGrid = forwardRef(function DataGrid({ rows, columns, height = 420, ...rest }, ref) {
  return (
    <div style={{ height, width: '100%' }}>
      <AgGridReact
        ref={ref}
        theme={theme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        localeText={AG_GRID_LOCALE_KR}
        animateRows={false}
        {...rest}
      />
    </div>
  );
});

export default DataGrid;
