/**
 * 차트는 전부 이 컴포넌트로 그립니다.
 *   <Chart option={{ xAxis: {...}, yAxis: {...}, series: [...] }} height={320} />
 * option 은 ECharts 6 문법 그대로입니다. 계열 색은 테마가 정하니 series 에 color 를 넣지 마세요.
 *
 * 'echarts' 나 'echarts-for-react' 를 직접 import 하지 마세요. 용량이 세 배로 커집니다.
 * 'echarts-for-react/lib/core' 는 CommonJS 라 Vite 8 빌드에서 화면이 통째로 비었습니다.
 * 여기서는 ES 모듈판 'esm/core' 를 씁니다.
 */
import ReactEChartsCore from 'echarts-for-react/esm/core'
import type { EChartsOption } from 'echarts'
import { fontStack } from '@/config/fonts'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { chartTheme, echarts } from '@/lib/mi/echarts'

type ChartProps = {
  option: EChartsOption
  height?: number
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvents?: Record<string, (params: any) => void>
}

export function Chart({ option, height = 320, className, onEvents }: ChartProps) {
  const { resolvedTheme } = useTheme()
  const { font, fontScale, fontReady } = useFont()
  // 차트는 캔버스라 화면 글꼴을 물려받지 못합니다. 글꼴 이름을 직접 넘기고,
  // 글꼴 파일을 다 읽은 뒤(fontReady) 다시 그립니다. 글자가 커지면 차트 높이도 같이 늘립니다.
  const merged: EChartsOption = {
    ...option,
    textStyle: { fontFamily: fontStack(font), ...(option.textStyle as object) },
  }
  return (
    <ReactEChartsCore
      key={`${resolvedTheme}-${fontScale}-${font}-${fontReady}`}
      echarts={echarts}
      option={merged}
      theme={chartTheme(resolvedTheme === 'dark' ? 'dark' : 'light', fontScale)}
      notMerge
      lazyUpdate
      onEvents={onEvents}
      style={{ height: Math.round(height * Math.max(1, fontScale)), width: '100%' }}
      className={className}
    />
  )
}
