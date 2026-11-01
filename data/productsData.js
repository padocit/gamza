/**
 * 감자 마켓 - 더미 상품 데이터
 */
export const dummyProducts = [
  {
    id: 1,
    title: "맥북 에어 M2 13인치 스페이스 그레이 (풀박스)",
    category: "디지털기기",
    price: 950000,
    location: "서울 강남구 역삼동",
    timeAgo: "10분 전",
    status: "selling", // selling: 판매중, reserved: 예약중, completed: 거래 완료
    statusText: "판매중",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    description: "배터리 효율 96%, 기스 전혀 없는 특S급 상태입니다. 충전기 및 정품 박스 전부 보유 중이며 강남역/역삼역 인근 직거래 환영합니다.",
    seller: {
      name: "포테이토마스터",
      nickname: "포테이토마스터",
      temperature: 38.5,
      location: "강남구 역삼1동",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=potato1"
    },
    likes: 12,
    chats: 4
  },
  {
    id: 2,
    title: "이케아 원목 원형 식탁 & 의자 2인 세트",
    category: "가구/인테리어",
    price: 850000,
    location: "서울 서초구 반포동",
    timeAgo: "35분 전",
    status: "reserved",
    statusText: "예약중",
    image: "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=600&auto=format&fit=crop&q=80",
    description: "원룸 이사로 인해 급처합니다. 원목 감성이라 인테리어에 아주 예쁘고 생활 스크래치 약간 있는 편입니다. 직접 가져가셔야 합니다.",
    seller: {
      name: "햇감자사랑",
      nickname: "햇감자사랑",
      temperature: 42.1,
      location: "서초구 반포동",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=potato2"
    },
    likes: 8,
    chats: 6
  },
  {
    id: 3,
    title: "파타고니아 클래식 레트로-X 플리스 자켓 M",
    category: "의류",
    price: 120000,
    location: "서울 마포구 연남동",
    timeAgo: "2시간 전",
    status: "completed",
    statusText: "거래 완료",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80",
    description: "작년 겨울에 구매해서 3회 단시간 착용 후 드라이클리닝 보관 중입니다. 보풀이나 오염 일절 없습니다. 쿨거래 시 택포 가능합니다.",
    seller: {
      name: "감자튀김러버",
      nickname: "감자튀김러버",
      temperature: 36.5,
      location: "마포구 연남동",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=potato3"
    },
    likes: 24,
    chats: 15
  },
  {
    id: 4,
    title: "네스프레소 버츄오 팝 캡슐 커피머신 (코코넛 화이트)",
    category: "생활가전",
    price: 60000,
    location: "서울 송파구 잠실동",
    timeAgo: "3시간 전",
    status: "selling",
    statusText: "판매중",
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80",
    description: "선물받고 실사용 5회 미만입니다. 다른 머신이 생겨서 판매해요. 웰컴 캡슐 남은 것 6개 함께 드립니다. 잠실새내역 직거래 가능합니다.",
    seller: {
      name: "왕감자소년",
      nickname: "왕감자소년",
      temperature: 39.0,
      location: "송파구 잠실동",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=potato4"
    },
    likes: 5,
    chats: 2
  },
  {
    id: 5,
    title: "해리포터 20주년 기념판 양장본 전권 세트 (미개봉 신품)",
    category: "도서/티켓",
    price: 45000,
    location: "경기 성남시 분당구 정자동",
    timeAgo: "5시간 전",
    status: "selling",
    statusText: "판매중",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    description: "비닐도 뜯지 않은 새 책 소장용 세트입니다. 책장에 공간이 부족해 눈물을 머금고 정리합니다. 책 좋아하는 분이 데려가셨으면 좋겠습니다.",
    seller: {
      name: "알감자책방",
      nickname: "알감자책방",
      temperature: 45.2,
      location: "분당구 정자동",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=potato5"
    },
    likes: 19,
    chats: 7
  },
  {
    id: 6,
    title: "소니 무선 노이즈캔슬링 헤드폰 WH-1000XM5 블랙",
    category: "디지털기기",
    price: 280000,
    location: "서울 영등포구 여의도동",
    timeAgo: "1일 전",
    status: "completed",
    statusText: "거래 완료",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    description: "출퇴근할 때 사용하다가 이어폰으로 갈아타서 판매합니다. 헤드밴드나 패드 헤짐 없고 상태 좋습니다. 정품 케이스, 케이블 포함입니다.",
    seller: {
      name: "바삭감자",
      nickname: "바삭감자",
      temperature: 37.2,
      location: "영등포구 여의도동",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=potato6"
    },
    likes: 31,
    chats: 11
  },
  {
    id: 7,
    title: "강아지 원목 식기 2구 & 푹신한 마약방석 세트 (소형견용)",
    category: "반려동물 용품",
    price: 25000,
    location: "서울 강남구 역삼동",
    timeAgo: "6시간 전",
    status: "selling",
    statusText: "판매중",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80",
    description: "우리 강아지가 다른 방석만 써서 보관만 하던 새상품급 방석과 원목 2구 식기입니다. 세척 및 소독 완료했습니다. 소형견 키우시는 분 데려가세요!",
    seller: {
      name: "감자멍멍이",
      nickname: "감자멍멍이",
      temperature: 40.2,
      location: "강남구 역삼동",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=potato7"
    },
    likes: 14,
    chats: 5
  }
];

export const categories = [
  "전체",
  "디지털기기",
  "가구/인테리어",
  "의류",
  "생활가전",
  "도서/티켓",
  "반려동물 용품",
  "기타"
];
