# 폰트

## PretendardVariable.subset.woff2

- 587KB, 가변 폰트 하나로 굵기 45~930 전부 커버
- 한글 음절 2,780자 + 한글 자모 + 라틴 + 문장부호 + 원문자/도형 + 전각 기호
- 한자는 빠져 있습니다. 한자가 나오면 시스템 글꼴로 대체됩니다.
- 라이선스: SIL Open Font License 1.1 (`Pretendard-OFL.txt`). 임베딩과 사내 배포 모두 허용됩니다.
- 원본: Pretendard 1.3.9 (npm `pretendard@1.3.9`), Kil Hyung-jin
- 포함 코드포인트 목록: `subset-codepoints.txt`

원본 가변 폰트는 2,057KB입니다. 서브셋으로 3.5배 줄였습니다. 반입 용량 제한이 있으면 이게 유리합니다.

### 재생성 방법 (외부에서만 가능)

```
npm pack pretendard@1.3.9
tar xzf pretendard-1.3.9.tgz
pip install fonttools==4.60.1 brotli==1.1.0
python -m fontTools.subset package/dist/public/variable/PretendardVariable.ttf \
  --unicodes-file=codepoints.txt \
  --layout-features='kern,liga,calt,ccmp,locl' \
  --flavor=woff2 --output-file=PretendardVariable.subset.woff2
```

한자가 필요하면 `--unicodes` 에 `U+4E00-9FFF` 를 더합니다. 용량이 크게 늘어나니 정말 필요할 때만 하세요.

## 사용

`@font-face` 는 `shared/design-tokens/tokens.css` 안에 이미 들어 있습니다. 킷에서는 폰트 파일을
`assets/fonts/` 로 복사하고 tokens.css 의 경로만 맞추면 됩니다.

`font-weight` 는 100에서 900 사이 아무 값이나 쓸 수 있습니다. 가변 폰트라 중간값도 나옵니다.
