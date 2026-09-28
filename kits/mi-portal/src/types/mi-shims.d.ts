// 타입 정의가 없는 패키지를 위한 최소 선언. 타입 패키지를 따로 반입하지 않으려고 둡니다.
declare module 'topojson-client' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function feature(topology: any, object: any): any
}
declare module 'world-atlas/countries-110m.json' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topology: any
  export default topology
}
