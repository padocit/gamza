# 🥔 감자 마켓 (Gamza Market)

> **"따뜻한 우리 동네 이웃과의 즐거운 중고거래"**  
> 순수 웹 표준(Vanilla JS, HTML5, CSS3)과 **Supabase (Database, Auth, Realtime)**를 기반으로 제작된 반응형 모던 중고거래 웹 플랫폼입니다.

---

## 🌟 주요 기능

### 1. 📋 실시간 상품 목록 (Product List)
- **Supabase DB 실시간 연동**: 최신 등록 상품 및 실시간 변경 사항 자동 반영 (`supabase.channel` Realtime)
- **카테고리 필터링**: 전체, 디지털기기, 가구/인테리어, 의류, 생활가전, 도서/티켓, 반려동물 용품, 기타
- **스마트 검색**: 제목 및 내용 키워드 실시간 검색
- **정렬 옵션**: 최신순, 낮은 가격순, 높은 가격순, 관심순(찜 많은 순)
- **거래 완료 제외 토글**: 판매중인 상품만 빠르게 모아보기 기능 지원

### 2. 🔍 상품 상세 보기 (Detail Modal)
- 상세 이미지 갤러리 및 기본 플레이스홀더 제공
- 카테고리, 등록 시간(상대 시간 표기), 조회수, 찜 수, 판매 상태 뱃지
- **찜하기(좋아요) 토글**: 즉시 카운트 반영 및 DB 저장
- **작성자 관리 기능**:
  - 판매 상태 직접 변경 (`판매중` / `예약중` / `거래완료`)
  - 상품 정보 수정 및 게시글 삭제

### 3. ✍️ 상품 등록 및 수정 (Write Modal)
- 드래그 앤 드롭 및 클릭을 통한 직관적인 대표 이미지 업로드 (Base64 미리보기)
- 가격 천 단위 콤마 자동 서식 지원 및 무료 나눔(0원) 옵션
- 거래 희망 장소, 카테고리, 제목, 상세 설명 유효성 검사

### 4. 🔐 이메일 인증 & 프로필 (Auth Modal)
- Supabase Auth를 통한 간편 회원가입 및 로그인/로그아웃
- 닉네임 및 자동 아바타 프로필(DiceBear) 생성
- 미로그인 상태에서 글쓰기 클릭 시 로그인 모달 자동 연동

### 5. 💬 실시간 1:1 감자톡 (GamzaTalk)
- **Supabase Realtime 기반 초저지연 실시간 양방향 채팅**
- **대화방 화면 (Chat Room Screen)**:
  - 상세 팝업의 "감자톡 채팅하기" 클릭 시 해당 판매자와의 1:1 채팅방 즉시 오픈
  - 상단 상대방 프로필(아바타, 닉네임, 포슬온도 뱃지, 응답 상태) 노출
  - 상단 거래 상품 요약 바(썸네일, 제목, 가격, 거래상태 뱃지, 상품보기 버튼)
  - 날짜 구분선, 송수신 말풍선(당근 오렌지 포인트 & 상대방 아바타), 오전/오후 전송 시각
  - 실시간 메시지 수신 즉시 스크롤 및 읽음 처리(`is_read`)
- **대화목록 화면 (Chat List Screen)**:
  - 상단 헤더의 "감자톡" 버튼 또는 대화방 뒤로가기 버튼 클릭 시 전체 참여 대화방 목록 노출
  - 상대방 아바타, 닉네임, 포슬온도, 마지막 메시지 내용, 상대 시간(방금 전, n분 전 등), 상품 썸네일 노출
  - 읽지 않은 메시지 수 배지(Badge) 및 대화 내역이 없을 때 친근한 감자 빈 화면 제공
- **게스트 & 회원 모두 지원**: 비로그인 방문자도 고유 감자 이웃 식별자로 즉시 대화 가능

---

## 🛠 기술 스택

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3 (CSS Variables, Flexbox, Grid)
- **Backend / Database**: [Supabase](https://supabase.com/)
  - **Database (PostgreSQL)**: 상품 테이블(`products`), 사용자 프로필(`profiles`), 찜 목록(`likes`)
  - **Auth**: Supabase 이메일/비밀번호 인증
  - **Realtime**: 실시간 상품 추가/수정/삭제 WebSocket 구독
- **Icons & Assets**: SVG Icons, DiceBear Avatar API

---

## 📁 프로젝트 구조

```plaintext
gamza/
├── css/
│   ├── theme.css           # 전역 CSS 변수 및 디자인 시스템
│   ├── productList.css     # 메인 상품 목록 스타일
│   ├── detailModal.css     # 상품 상세 팝업 모달 스타일
│   ├── writeModal.css      # 상품 등록/수정 모달 스타일
│   ├── authModal.css       # 로그인/회원가입 모달 스타일
│   └── chatModal.css       # 실시간 감자톡(채팅) 플로팅 모달 스타일
├── js/
│   ├── supabaseClient.js   # Supabase 클라이언트 및 DB/인증 API 모듈
│   ├── chatService.js      # 채팅 DB 쿼리 및 Supabase Realtime 구독 모듈
│   ├── chatModal.js        # 감자톡 위젯 UI 제어 및 이벤트 컨트롤러
│   ├── productList.js      # 상품 목록 렌더링 및 필터링 컨트롤러
│   ├── detailModal.js      # 상품 상세 모달 제어 로직
│   ├── writeModal.js       # 글쓰기/수정 모달 제어 로직
│   └── authModal.js        # 회원가입/로그인 모달 제어 로직
├── data/
│   └── productsData.js     # 초기/대체 목업 데이터
├── docs/                   # 컴포넌트별 개발 문서 및 템플릿/데모
│   ├── README_PRODUCT_LIST.md # 상품 목록 컴포넌트 상세 문서
│   ├── README_WRITE_MODAL.md  # 글쓰기 모달 컴포넌트 상세 문서
│   ├── templates/          # 모달 HTML 템플릿 조각
│   │   ├── detail-modal.html
│   │   └── write-modal.html
│   └── demos/              # 모듈별 독립 실행 테스트 데모
│       ├── detail-modal-demo.html
│       └── write-modal-demo.html
├── index.html              # 감자 마켓 메인 애플리케이션 진입점
├── .env.example            # 환경 변수 템플릿 파일
├── .gitignore              # Git 무시 파일 목록 (보안 키 파일 격리)
└── README.md               # 프로젝트 종합 안내 문서
```

---

## 🚀 로컬 실행 방법

별도의 번들러(Vite, Webpack 등) 설치 없이, 브라우저의 ES Module 기능을 지원하는 모든 로컬 웹 서버로 바로 실행할 수 있습니다.

### 방법 1: VS Code Live Server
1. VS Code에서 `gamza` 폴더를 엽니다.
2. `index.html` 우클릭 후 **'Open with Live Server'**를 선택합니다.

### 방법 2: Python 간이 서버
```bash
# Python 3
python -m http.server 3000
```
브라우저에서 `http://localhost:3000` 접속

### 방법 3: Node.js (npx serve)
```bash
npx serve .
```

---

## 🌐 배포 안내 (Deployment)

본 프로젝트는 순수 정적 웹 애플리케이션으로, **GitHub Pages**, **Vercel**, **Netlify**, **Cloudflare Pages** 등에 즉시 배포할 수 있습니다.

### GitHub Pages 배포 예시
1. 저장소의 **Settings** > **Pages** 이동
2. **Build and deployment**의 Source를 `Deploy from a branch`로 선택
3. Branch를 `main` / `/ (root)`로 지정 후 **Save** 클릭
4. 잠시 후 안내되는 웹 주소(`https://<username>.github.io/gamza`)로 접속

---

## 🔒 보안 주의사항

- `.env` 및 개인 Access Token, Service Role Secret이 포함된 파일은 절대 Git 저장소에 커밋되지 않도록 `.gitignore`에 등록되어 있습니다.
- 브라우저 클라이언트(`js/supabaseClient.js`)에는 공개 가능한 `ANON_KEY`만 사용해야 합니다.
