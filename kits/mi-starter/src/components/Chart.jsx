// 차트는 전부 이 컴포넌트로 그립니다.
//   <Chart option={{ xAxis: {...}, yAxis: {...}, series: [...] }} height={320} />
// option 은 ECharts 6 문법 그대로입니다. 색은 테마가 정하니 series 에 color 를 넣지 마세요.
// 'echarts-for-react' 나 'echarts' 를 직접 import 하지 마세요. 용량이 세 배로 커집니다.
//
// 'echarts-for-react/lib/core' 가 아니라 'esm/core' 입니다. README 에 나오는 lib/core 는
// CommonJS 라 Vite 8 빌드에서 컴포넌트 대신 모듈 객체가 들어와 화면이 통째로 비었습니다
// (React 오류 #130).

import ReactEChartsCore from 'echarts-for-react/esm/core';
import { echarts } from '../lib/echarts.js';
import { useTheme } from '../lib/theme.js';

export default function Chart({ option, height = 320, className = '', onEvents }) {
  const theme = useTheme();
  return (
    <ReactEChartsCore
      key={theme}
      echarts={echarts}
      option={option}
      theme={theme === 'dark' ? 'portal-dark' : 'portal-light'}
      notMerge
      lazyUpdate
      onEvents={onEvents}
      style={{ height, width: '100%' }}
      className={className}
    />
  );
}
