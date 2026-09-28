# 글꼴

## pretendard/

- Pretendard 1.3.9 (npm `pretendard@1.3.9`, Kil Hyung-jin) 의 공식 가변 분할 파일 92개와 `font.css`
- 배포처 파일을 고치지 않았습니다. 글자 범위(`unicode-range`)별로 나뉘어 있어 화면에 나온 글자가 든 파일만 읽힙니다.
  전체 2.8MB 이지만 보통 화면 하나에 수백 KB 만 읽습니다.
- font-family 이름: `'Pretendard Variable'`, 굵기 45~930
- 라이선스: SIL Open Font License 1.1, 원문 `pretendard/LICENSE.txt`

### 직접 서브셋하지 않는 이유

Pretendard 라이선스에는 "Reserved Font Name Pretendard" 가 붙어 있습니다. OFL 에서 글자를 줄이는 것(서브셋)도
글꼴을 고치는 것에 해당하고, 고친 글꼴은 예약된 이름을 쓸 수 없습니다. 예전에 넣었던 직접 만든 서브셋
(`PretendardVariable.subset.woff2`)은 이 조항에 걸려서 공식 분할 파일로 바꿨습니다.
SUIT, 나눔, Spoqa, IBM Plex 도 같은 조항이 있으니 서브셋하지 말고 배포처 파일을 그대로 씁니다.

### 다시 받는 방법 (외부에서만 가능)

```
node scripts/collect-fonts.cjs --out shared/fonts --only pretendard
```

다른 글꼴 9종은 `kits/mi-portal/public/fonts/` 에 있고 같은 스크립트로 받습니다. 목록과 라이선스는 `kits/mi-portal/MANIFEST.md`.

## 사용

`shared/design-tokens/tokens.css` 첫머리가 `@import url('../fonts/pretendard/font.css');` 입니다.
킷에서는 `pretendard/` 폴더를 통째로 `assets/fonts/` 로 복사하고 tokens.css 의 경로만 맞추면 됩니다.
더블클릭(file://)으로 연 화면에서도 옆 폴더의 글꼴을 읽는 것을 확인했습니다.
