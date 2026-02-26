# 썰푸드 🍽️

## 폴더 구조

```
netlify-project/
├── index.html                    # 메인 페이지 (API 키 없음)
├── netlify.toml                  # Netlify 빌드 설정
├── .env                          # 로컬 개발용 환경변수 (git 제외)
├── .gitignore
└── netlify/
    └── functions/
        ├── gemini.js             # 텍스트 분석 API
        └── gemini-image.js       # 이미지 생성 API
```

## API 호출 흐름

```
브라우저 (index.html)
    │
    │  POST /api/gemini           ← API 키 없음, 안전!
    │  POST /api/gemini-image
    ▼
Netlify Functions (서버)
    │
    │  API 키는 서버에서만 사용
    ▼
Gemini API (Google)
```

---

## 로컬 개발

### 1. Netlify CLI 설치
```bash
npm install -g netlify-cli
```

### 2. .env 파일에 키 입력
```
GEMINI_API_KEY=AIzaSy...본인키...
```

### 3. 로컬 서버 실행
```bash
netlify dev
# → http://localhost:8888 에서 확인
```

---

## Netlify 배포

### 1. GitHub에 올리기 (.env는 .gitignore로 제외됨)
```bash
git init
git add .
git commit -m "init"
git push origin main
```

### 2. Netlify 대시보드 설정
1. [netlify.com](https://netlify.com) 로그인
2. "Add new site" → "Import an existing project" → GitHub 연결
3. **Site settings → Environment variables** 에서:
   - Key: `GEMINI_API_KEY`
   - Value: `AIzaSy...본인키...`
4. Deploy!

### ⚠️ 주의사항
- `.env` 파일은 절대 git에 올리지 마세요
- API 키는 반드시 Netlify 환경변수로만 설정하세요
- index.html에는 API 키가 없어야 합니다 (현재 제거된 상태)
