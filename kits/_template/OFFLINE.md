# 오프라인 설치 및 실행

인터넷 연결 없이 이 절차만으로 실행됩니다. 여기 적히지 않은 명령은 쓰지 마세요.

## 1. 압축 해제

한글이나 공백이 없는 경로에 풉니다. 예: `C:\work\<킷이름>`

## 2. 설치

### 빌드가 없는 킷 (반입 방식 C)

설치 단계 없음. `src/index.html` 을 브라우저로 엽니다.

### Node 킷 (반입 방식 B)

```
npm ci --offline --cache ./vendor
```

`--offline` 없이 실행하면 레지스트리에 접속하려다 멈춥니다.

### Python 킷 (반입 방식 B)

```
python -m venv .venv
.venv\Scripts\activate
pip install --no-index --find-links ./vendor -r requirements.txt
```

## 3. 실행

```
(실행 명령)
```

## 4. 확인

아래가 모두 맞으면 정상입니다.

- [ ] 
- [ ] 

## 문제가 생기면

- 설치가 멈춘다: `--offline` / `--no-index` 를 빠뜨렸는지 확인
- 폰트가 기본 글꼴로 나온다: `assets/fonts/` 경로가 맞는지 확인
- 그 외: 에러 메시지와 재현 방법을 사내 정보 지우고 저장소 쪽으로 넘기기
