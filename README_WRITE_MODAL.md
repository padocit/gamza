# 감자(Gamza) 마켓 - 화면 3: 상품 등록(글쓰기) 모달 모듈

## 1. 개요
따뜻한 감자 테마(웜 브라운 `#8B5A2B`, 베이지 `#D2B48C`, 크림 배경 `#FAF7F2`)를 기반으로 제작된 싱글 페이지 웹용 글쓰기 모달 컴포넌트입니다.

---

## 2. 파일 구성
- `write-modal.html`: 모달 마크업 구조
- `css/writeModal.css` (및 루트 `write-modal.css`): 감자 마켓 전용 반응형 스타일시트
- `js/writeModal.js` (및 루트 `write-modal.js`): 유효성 검사, 이미지 미리보기, 객체 생성 및 이벤트 핸들링 스크립트
- `write-modal-demo.html`: 단독 테스트용 데모 페이지

---

## 3. 주요 기능 명세
1. **모달 팝업 & 백드롭 UX**
   - 부드러운 페이드인 & 스케일업 애니메이션
   - 배경 딤(Dim) 클릭 시 닫기, `ESC` 키보드 단축키 닫기 지원
   - 작성 중인 내용이 있을 때 모달 닫기 시 이탈 확인(confirm) 방어 로직
   - 모바일 바텀시트 / 반응형 최적화

2. **상품 이미지 업로드 & 미리보기**
   - 로컬 파일 드래그 앤 드롭 및 클릭 업로드 (JPG, PNG, WEBP 지원)
   - `FileReader` 기반 실시간 DataURL 미리보기 및 즉시 삭제 기능
   - 빠른 등록을 위한 고화질 추천 샘플 사진 5종(디지털, 가구, 의류, 가전, 도서) 칩 선택기 제공

3. **입력 필드 & 유효성 검사**
   - **상품명**: 필수, 2자 이상, 50자 실시간 카운터
   - **카테고리**: 필수, 셀렉트 박스 (디지털기기, 가구/인테리어, 의류, 생활가전, 도서/티켓, 기타)
   - **가격**: 숫자 자동 콤마 포맷팅 (`150,000`), 한글 금액 미리보기 (`15만 원`), 무료 나눔 🥔 체크박스 연동 (0원 설정)
   - **거래 동네**: 필수, 2자 이상, 빠른 동네 추천 태그 칩 (역삼동, 반포동, 연남동 등 클릭 시 자동 입력)
   - **판매 상태**: 라디오 버튼 카드 형태 (`판매중` #2E7D32 / `예약중` #ED6C02 / `거래 완료` #757575), 기본값 판매중
   - **자세한 설명**: 필수, 5자 이상, 최대 500자 실시간 카운터
   - 유효성 검사 실패 시 첫 오류 항목으로 부드러운 스크롤 및 붉은색 보더 + 쉐이크 애니메이션

4. **연동 및 데이터 전달**
   - 작성 완료 시 `data/productsData.js` 스키마와 100% 호환되는 상품 객체 생성:
     ```javascript
     {
       id: 1712345678901,
       title: "상품명",
       category: "디지털기기",
       price: 150000,
       location: "서울 강남구 역삼동",
       timeAgo: "방금 전",
       createdAt: "방금 전",
       status: "selling", // selling | reserved | completed
       statusText: "판매중", // 판매중 | 예약중 | 거래 완료
       image: "data:image/... or sampleUrl",
       description: "상세 설명",
       seller: {
         name: "내감자",
         nickname: "내감자",
         temperature: 36.5,
         avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=myPotato"
       },
       likes: 0,
       chats: 0
     }
     ```
   - 등록 완료 시 `GamzaWriteModal.init({ onProductSubmit(newProduct) })` 콜백 자동 호출
   - 커스텀 이벤트 `window.dispatchEvent(new CustomEvent('gamza:productSubmit', { detail: { product: newProduct } }))` 발행
   - 메인 목록 인스턴스 `window.gamzaProductList.addProduct(newProduct)` 자동 연동

---

## 4. 간편 연동 가이드
```html
<!-- 1. CSS 로드 -->
<link rel="stylesheet" href="./css/theme.css" />
<link rel="stylesheet" href="./css/writeModal.css" />

<!-- 2. HTML 삽입 (write-modal.html 내용) -->
<!-- ... -->

<!-- 3. JS 로드 및 연동 -->
<script src="./js/writeModal.js"></script>
<script>
  // 글쓰기 모달 초기화 및 콜백 등록
  GamzaWriteModal.init({
    onProductSubmit: function(newProduct) {
      console.log('새 상품이 등록되었습니다:', newProduct);
      // 상품 목록 상단에 추가 (예: productList.addProduct)
      myProductList.unshift(newProduct);
    }
  });

  // 버튼 클릭 시 열기
  document.getElementById('writeBtn').addEventListener('click', () => {
    GamzaWriteModal.open();
  });
</script>
```
