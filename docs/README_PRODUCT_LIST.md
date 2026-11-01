# 🥔 감자 마켓 - 화면 1: 상품 목록 (Product List) 개발 문서

## 1. 파일 구조
```
gamza/
├── index.html                  # 전체 통합 테스트 및 데모 페이지
├── css/
│   ├── theme.css               # 감자 마켓 공통 디자인 시스템 (컬러, 폰트, 리셋)
│   └── productList.css         # 화면 1: 상품 목록 및 헤더/필터 전용 스타일
├── js/
│   └── productList.js          # ProductListApp 클래스 (렌더링, 필터, 검색, 이벤트)
└── data/
    └── productsData.js         # 기본 더미 상품 데이터 6종 및 카테고리 목록
```

## 2. 디자인 가이드 반영
- **메인 컬러**: `#8B5A2B` (감자 웜 브라운)
- **보조 컬러**: `#D2B48C` (베이지/탄)
- **배경**: `#FAF7F2` (크림 베이지)
- **카드 배경**: `#FFFFFF`
- **상태별 뱃지 색상**:
  - `판매중` (selling): `#2E7D32` (그린)
  - `예약중` (reserved): `#ED6C02` (오렌지/앰버)
  - `거래 완료` (completed): `#757575` (그레이) + 이미지 딤드 오버레이

## 3. 주요 기능 및 이벤트 훅 연동 가이드

### (1) 초기화 및 인스턴스 생성
```javascript
import { ProductListApp } from "./js/productList.js";

const app = new ProductListApp({
  container: document.getElementById("gamza-app"),
  
  // [요구사항 6] 상품 카드 클릭 훅 (상세 모달과 연동)
  onCardClick: (productId, product) => {
    // 상세 모달 열기 로직 호출
    console.log("선택된 상품 ID:", productId, product);
  },

  // [글쓰기 버튼 클릭 훅] (상품 등록 모달과 연동)
  onWriteClick: () => {
    // 글쓰기 모달 열기 로직 호출
  }
});
```

### (2) 커스텀 DOM 이벤트 리스너를 통한 연동 (선택 사항)
`ProductListApp`은 다른 모듈과의 느슨한 결합(Loose Coupling)을 위해 커스텀 이벤트도 동시 발행합니다.
```javascript
// 카드 클릭 이벤트 감지
window.addEventListener("gamza:cardClick", (e) => {
  const { productId, product } = e.detail;
  // 상세 모달 열기
});

// 글쓰기 버튼 클릭 감지
window.addEventListener("gamza:writeClick", () => {
  // 글쓰기 모달 열기
});
```

### (3) 외부 데이터 연동 API
- `app.addProduct(newProduct)`: 상품 등록 완료 시 목록 맨 앞에 추가 및 리렌더링
- `app.setProducts(newList)`: 전체 상품 목록 갱신
- `app.updateProductStatus(productId, 'completed')`: 상품 상태 변경 시 실시간 반영
