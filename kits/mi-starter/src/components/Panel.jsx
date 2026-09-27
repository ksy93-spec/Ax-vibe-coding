// 화면의 한 덩어리. 제목, 설명, 오른쪽 버튼 자리를 가집니다.
//
// min-w-0 을 지우지 마세요. 그리드 칸은 기본적으로 안의 내용(차트 캔버스)보다 좁아지지
// 않아서, 창을 줄여도 차트가 그대로 남아 가로 스크롤이 생깁니다.
export default function Panel({ title, hint, actions, children }) {
  return (
    <section className="min-w-0 rounded-lg border border-line bg-surface p-5">
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          <div className="flex-1" />
          {actions}
        </div>
      )}
      {hint && <p className="-mt-2 mb-3 text-sm text-muted">{hint}</p>}
      {children}
    </section>
  );
}
