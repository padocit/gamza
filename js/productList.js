/**
 * ==========================================================================
 * 감자 마켓 - 화면 1: 상품 목록 모듈 (productList.js)
 * ==========================================================================
 */

import { dummyProducts, categories as rawCategories } from "../data/productsData.js?v=20261102_2";

export const DEFAULT_CATEGORIES = [
  "전체",
  "디지털기기",
  "가구/인테리어",
  "의류",
  "생활가전",
  "도서/티켓",
  "반려동물 용품",
  "기타"
];

const resolvedCategories = Array.isArray(rawCategories) && rawCategories.length > 0
  ? [...rawCategories]
  : [...DEFAULT_CATEGORIES];

if (!resolvedCategories.includes("반려동물 용품")) {
  const etcIdx = resolvedCategories.indexOf("기타");
  if (etcIdx !== -1) {
    resolvedCategories.splice(etcIdx, 0, "반려동물 용품");
  } else {
    resolvedCategories.push("반려동물 용품");
  }
}

export const categories = resolvedCategories;

export class ProductListApp {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container] - 렌더링될 루트 컨테이너 (기본값 document.body)
   * @param {Array} [options.initialProducts] - 초기 상품 배열 (미지정시 dummyProducts)
   * @param {Array} [options.categories] - 카테고리 목록 배열
   * @param {Function} [options.onCardClick] - 상품 카드 클릭 시 실행될 콜백 함수 (productId, product) => void
   * @param {Function} [options.onWriteClick] - [글쓰기] 버튼 클릭 시 실행될 콜백 함수 () => void
   * @param {Function} [options.onLoginClick] - [로그인] 버튼 클릭 시 실행될 콜백 함수 () => void
   * @param {Function} [options.onLogoutClick] - [로그아웃] 버튼 클릭 시 실행될 콜백 함수 () => void
   */
  constructor(options = {}) {
    this.container = options.container || document.getElementById("gamza-app");
    this.products = [...(options.initialProducts || dummyProducts)];
    this.categories = options.categories || categories;
    this.onCardClick = options.onCardClick || this.defaultCardClickHandler;
    this.onWriteClick = options.onWriteClick || this.defaultWriteClickHandler;
    this.onLoginClick = options.onLoginClick || this.defaultLoginClickHandler;
    this.onLogoutClick = options.onLogoutClick || this.defaultLogoutClickHandler;

    // 필터 및 검색 상태
    this.state = {
      selectedCategory: "전체",
      searchKeyword: "",
      availableOnly: false // 거래 가능만 보기 (판매중/예약중만 표시)
    };

    // 인증 유저 상태 캐시
    this.currentUser = null;
    this.currentProfile = null;

    this.init();
  }

  defaultLoginClickHandler() {
    console.log("[감자 마켓] 로그인 버튼 클릭");
    window.dispatchEvent(new CustomEvent("gamza:loginClick"));
  }

  defaultLogoutClickHandler() {
    console.log("[감자 마켓] 로그아웃 버튼 클릭");
    window.dispatchEvent(new CustomEvent("gamza:logoutClick"));
  }

  defaultCardClickHandler(productId, product) {
    console.log(`[감자 마켓] 상품 상세 모달 트리거 - ID: ${productId}`, product);
    // 다른 모듈과 연동하기 위한 커스텀 이벤트 발송
    window.dispatchEvent(
      new CustomEvent("gamza:cardClick", {
        detail: { productId, product }
      })
    );
  }

  defaultWriteClickHandler() {
    console.log("[감자 마켓] 글쓰기 버튼 클릭");
    window.dispatchEvent(new CustomEvent("gamza:writeClick"));
  }

  /**
   * 초기 HTML 뼈대 생성 및 이벤트 바인딩
   */
  init() {
    if (!this.container) {
      console.error("[ProductListApp] 컨테이너 엘리먼트를 찾을 수 없습니다.");
      return;
    }

    this.container.innerHTML = this.createAppTemplate();
    this.cacheDOMElements();
    this.renderCategories();
    this.renderProducts();
    this.bindEvents();
  }

  /**
   * 기본 HTML 구조 템플릿
   */
  createAppTemplate() {
    return `
      <!-- 상단 헤더 -->
      <header class="gamza-header">
        <div class="header-container">
          <!-- 로고 -->
          <div class="logo" id="gamza-logo" title="홈으로">
            <span class="logo-icon">🥔</span>
            <span class="logo-text">감자</span>
          </div>

          <!-- 검색창 -->
          <div class="search-wrapper">
            <form class="search-form" id="search-form">
              <span class="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                class="search-input"
                id="search-input"
                placeholder="상품명을 검색해보세요"
                autocomplete="off"
              />
              <button type="button" class="search-clear-btn" id="search-clear-btn" title="검색어 지우기">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <button type="submit" class="search-submit-btn">검색</button>
            </form>
          </div>

          <!-- 헤더 우측 액션 버튼 -->
          <div class="header-actions">
            <button class="btn-write" id="btn-write" title="판매 상품 등록">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>글쓰기</span>
            </button>
            <!-- 로그인 전 버튼 -->
            <button class="btn-login" id="btn-login">로그인</button>
            <!-- 로그인 후 버튼 (닉네임 표시 + 로그아웃) -->
            <div class="user-auth-wrap" id="user-auth-wrap" style="display: none;">
              <span class="user-nickname-badge" id="user-nickname-badge" title="내 계정">
                <span class="user-avatar-mini">🥔</span>
                <span class="user-nickname-text" id="user-nickname-text">닉네임</span>
              </span>
              <button type="button" class="btn-logout" id="btn-logout" title="로그아웃">로그아웃</button>
            </div>
          </div>
        </div>
      </header>

      <!-- 메인 콘텐츠 영역 -->
      <main class="main-container">
        <!-- 카테고리 탭 -->
        <section class="category-section">
          <div class="category-list" id="category-list"></div>
        </section>

        <!-- 필터 및 카운트 바 -->
        <section class="filter-bar">
          <div class="product-count-wrap">
            전체 <span class="product-count-num" id="product-count">0</span>개 상품
          </div>

          <label class="toggle-filter-wrap" for="available-toggle">
            <span class="toggle-label">거래 가능만 보기</span>
            <div class="toggle-switch">
              <input type="checkbox" id="available-toggle" />
              <span class="toggle-slider"></span>
            </div>
          </label>
        </section>

        <!-- 상품 그리드 목록 -->
        <section class="product-grid" id="product-grid"></section>
      </main>
    `;
  }

  cacheDOMElements() {
    this.dom = {
      logo: this.container.querySelector("#gamza-logo"),
      searchForm: this.container.querySelector("#search-form"),
      searchInput: this.container.querySelector("#search-input"),
      searchClearBtn: this.container.querySelector("#search-clear-btn"),
      btnWrite: this.container.querySelector("#btn-write"),
      btnLogin: this.container.querySelector("#btn-login"),
      userAuthWrap: this.container.querySelector("#user-auth-wrap"),
      userNicknameBadge: this.container.querySelector("#user-nickname-badge"),
      userNicknameText: this.container.querySelector("#user-nickname-text"),
      btnLogout: this.container.querySelector("#btn-logout"),
      categoryList: this.container.querySelector("#category-list"),
      availableToggle: this.container.querySelector("#available-toggle"),
      productCount: this.container.querySelector("#product-count"),
      productGrid: this.container.querySelector("#product-grid")
    };
  }

  /**
   * 카테고리 탭 렌더링
   */
  renderCategories() {
    const { categoryList } = this.dom;
    if (!categoryList) return;

    categoryList.innerHTML = this.categories
      .map(
        (cat) => `
        <button 
          type="button" 
          class="category-btn ${this.state.selectedCategory === cat ? "active" : ""}" 
          data-category="${cat}"
        >
          ${cat}
        </button>
      `
      )
      .join("");
  }

  /**
   * 필터링 조건에 따른 상품 목록 추출
   */
  getFilteredProducts() {
    return this.products.filter((item) => {
      // 1. 카테고리 필터
      if (
        this.state.selectedCategory !== "전체" &&
        item.category !== this.state.selectedCategory
      ) {
        return false;
      }

      // 2. 거래 가능만 보기 필터 ('completed' 제외)
      if (this.state.availableOnly) {
        const normStatus = String(item.status || "").toLowerCase().trim();
        if (normStatus === "completed" || normStatus === "거래완료" || normStatus === "거래 완료" || normStatus === "soldout") {
          return false;
        }
      }

      // 3. 검색어 필터 (제목 또는 설명)
      if (this.state.searchKeyword.trim() !== "") {
        const keyword = this.state.searchKeyword.toLowerCase().trim();
        const inTitle = item.title.toLowerCase().includes(keyword);
        const inDesc = item.description?.toLowerCase().includes(keyword) || false;
        const inLoc = item.location?.toLowerCase().includes(keyword) || false;
        if (!inTitle && !inDesc && !inLoc) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 상품 카드 목록 렌더링
   */
  renderProducts() {
    const { productGrid, productCount } = this.dom;
    if (!productGrid) return;

    const filtered = this.getFilteredProducts();
    productCount.textContent = filtered.length;

    // 결과가 없을 때의 Empty State
    if (filtered.length === 0) {
      productGrid.style.display = "block";
      productGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🥔💨</div>
          <h3 class="empty-title">찾으시는 감자 상품이 없어요</h3>
          <p class="empty-desc">검색어나 카테고리 필터를 변경해보세요.</p>
          <button type="button" class="btn-reset-filters" id="btn-reset-filters">
            필터 및 검색 초기화
          </button>
        </div>
      `;

      const resetBtn = productGrid.querySelector("#btn-reset-filters");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => this.resetFilters());
      }
      return;
    }

    productGrid.style.display = "grid";
    productGrid.innerHTML = filtered.map((item) => this.createProductCardHTML(item)).join("");
  }

  /**
   * 단일 상품 카드 HTML 생성
   */
  createProductCardHTML(item) {
    const formattedPrice = item.price.toLocaleString() + "원";
    const isCompleted = item.status === "completed";

    return `
      <article class="product-card ${isCompleted ? 'is-completed' : ''}" data-product-id="${item.id}">
        <!-- 카드 이미지 및 뱃지 -->
        <div class="card-image-wrap">
          <img 
            src="${item.image}" 
            alt="${this.escapeHtml(item.title)}" 
            class="card-image" 
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'"
          />
          
          <!-- 상태 뱃지 (상단 오버레이) -->
          <div class="card-badge-wrap">
            <span class="status-badge ${item.status}">
              ${item.statusText}
            </span>
          </div>

          <!-- 거래 완료 시 딤드 오버레이 -->
          ${
            isCompleted
              ? `
              <div class="card-dimmed-overlay">
                <span class="overlay-completed-badge">거래 완료</span>
              </div>
            `
              : ""
          }
        </div>

        <!-- 카드 정보 본문 -->
        <div class="card-body">
          <h3 class="card-title">${this.escapeHtml(item.title)}</h3>
          <div class="card-meta">
            <span class="card-seller-name" title="작성자: ${this.escapeHtml(item.seller?.nickname || '감자이웃')}">
              <span class="seller-icon">🥔</span>
              <span class="seller-nickname">${this.escapeHtml(item.seller?.nickname || '감자이웃')}</span>
            </span>
            <span class="card-meta-dot">·</span>
            <span>${this.escapeHtml(item.location)}</span>
            <span class="card-meta-dot">·</span>
            <span>${item.timeAgo}</span>
          </div>
          <div class="card-price-row">
            <div class="card-price">${formattedPrice}</div>
            <div class="card-stats">
              ${
                item.chats > 0
                  ? `
                <span class="stat-item" title="채팅 수">
                  💬 ${item.chats}
                </span>
              `
                  : ""
              }
              ${
                item.likes > 0
                  ? `
                <span class="stat-item" title="관심 수">
                  ❤️ ${item.likes}
                </span>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const {
      logo,
      searchForm,
      searchInput,
      searchClearBtn,
      btnWrite,
      btnLogin,
      categoryList,
      availableToggle,
      productGrid
    } = this.dom;

    // 1. 로고 클릭 -> 홈/초기화
    logo.addEventListener("click", () => {
      this.resetFilters();
    });

    // 2. 검색 폼 제출 (엔터 or 검색버튼)
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.state.searchKeyword = searchInput.value.trim();
      this.renderProducts();
    });

    // 3. 검색어 실시간 입력 반응 및 클리어 버튼 토글
    searchInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (val.length > 0) {
        searchClearBtn.classList.add("visible");
      } else {
        searchClearBtn.classList.remove("visible");
      }
      // 실시간 검색 지원
      this.state.searchKeyword = val.trim();
      this.renderProducts();
    });

    // 4. 검색어 지우기 버튼
    searchClearBtn.addEventListener("click", () => {
      searchInput.value = "";
      searchClearBtn.classList.remove("visible");
      this.state.searchKeyword = "";
      this.renderProducts();
      searchInput.focus();
    });

    // 5. 카테고리 탭 클릭
    categoryList.addEventListener("click", (e) => {
      const btn = e.target.closest(".category-btn");
      if (!btn) return;

      const category = btn.dataset.category;
      if (this.state.selectedCategory === category) return;

      this.state.selectedCategory = category;

      // 활성화 버튼 UI 갱신
      categoryList
        .querySelectorAll(".category-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      this.renderProducts();
    });

    // 6. 거래 가능만 보기 토글 스위치
    availableToggle.addEventListener("change", (e) => {
      this.state.availableOnly = e.target.checked;
      this.renderProducts();
    });

    // 7. 카드 클릭 이벤트 위임 (이벤트 훅 실행)
    productGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".product-card");
      if (!card) return;

      const rawId = card.dataset.productId;
      const product = this.products.find((p) => String(p.id) === String(rawId));

      if (this.onCardClick && product) {
        this.onCardClick(product.id, product);
      }
    });

    // 8. 글쓰기 버튼 클릭
    btnWrite.addEventListener("click", () => {
      if (this.onWriteClick) {
        this.onWriteClick();
      }
    });

    // 9. 로그인 버튼 클릭 -> 로그인 모달 트리거
    if (btnLogin) {
      btnLogin.addEventListener("click", () => {
        if (this.onLoginClick) {
          this.onLoginClick();
        }
      });
    }

    // 10. 로그아웃 버튼 클릭
    if (this.dom.btnLogout) {
      this.dom.btnLogout.addEventListener("click", () => {
        if (this.onLogoutClick) {
          this.onLogoutClick();
        }
      });
    }
  }

  /**
   * 로그인 상태에 따른 우측 상단 헤더 버튼 UI 전환
   * @param {Object|null} user 현재 로그인된 Supabase 유저
   * @param {Object|null} profile 프로필 정보 (nickname 등)
   */
  updateAuthUI(user, profile) {
    this.currentUser = user || null;
    this.currentProfile = profile || null;

    const { btnLogin, userAuthWrap, userNicknameText } = this.dom;
    if (!btnLogin || !userAuthWrap) return;

    if (user) {
      // [로그인 후] 로그인 버튼 숨김, 닉네임과 로그아웃 버튼 표시
      btnLogin.style.display = "none";
      userAuthWrap.style.display = "inline-flex";

      const nickname =
        profile?.nickname ||
        user.user_metadata?.nickname ||
        (user.email ? user.email.split("@")[0] : "감자이웃");

      if (userNicknameText) {
        userNicknameText.textContent = nickname;
      }
    } else {
      // [로그인 전] 로그인 버튼만 표시, 닉네임/로그아웃 버튼 숨김
      btnLogin.style.display = "inline-flex";
      userAuthWrap.style.display = "none";
      if (userNicknameText) {
        userNicknameText.textContent = "";
      }
    }
  }

  /**
   * 필터 및 검색어 전체 초기화
   */
  resetFilters() {
    this.state.selectedCategory = "전체";
    this.state.searchKeyword = "";
    this.state.availableOnly = false;

    if (this.dom.searchInput) {
      this.dom.searchInput.value = "";
    }
    if (this.dom.searchClearBtn) {
      this.dom.searchClearBtn.classList.remove("visible");
    }
    if (this.dom.availableToggle) {
      this.dom.availableToggle.checked = false;
    }

    this.renderCategories();
    this.renderProducts();
  }

  /**
   * 외부에서 상품 목록 데이터를 추가/교체할 수 있는 공개 메서드
   * @param {Array} newProducts
   */
  setProducts(newProducts) {
    this.isLoading = false;
    this.products = [...newProducts];
    this.renderProducts();
  }

  /**
   * 데이터 로딩 상태 표시 설정
   * @param {boolean} loading
   */
  setLoading(loading) {
    this.isLoading = loading;
    const { productGrid, productCount } = this.dom;
    if (!productGrid) return;

    if (loading) {
      if (productCount) productCount.textContent = "-";
      productGrid.style.display = "block";
      productGrid.innerHTML = `
        <div class="empty-state" style="padding: 60px 20px;">
          <div class="empty-icon" style="animation: pulse 1.5s infinite; font-size: 3rem;">🥔</div>
          <h3 class="empty-title" style="margin-top: 16px;">감자 마켓 상품을 불러오는 중...</h3>
          <p class="empty-desc">신선한 동네 감자 상품을 연결하고 있어요</p>
        </div>
      `;
    } else {
      this.renderProducts();
    }
  }

  /**
   * 외부에서 신규 등록 상품을 추가할 때 쓰는 편의 메서드
   * @param {Object} product
   */
  addProduct(product) {
    if (!product || !product.id) return;
    // 중복 방지 (이미 id가 존재하는 경우 무시)
    const exists = this.products.some((p) => String(p.id) === String(product.id));
    if (!exists) {
      this.products.unshift(product);
      this.renderProducts();
    }
  }

  /**
   * 특정 상품의 관심(좋아요) 수 업데이트
   * @param {number|string} productId
   * @param {number} newCount
   * @param {boolean} [isLiked]
   */
  updateProductLikes(productId, newCount, isLiked) {
    const item = this.products.find((p) => String(p.id) === String(productId));
    if (item) {
      item.likes = newCount;
      if (typeof isLiked === "boolean") {
        item.isLiked = isLiked;
      }
      this.renderProducts();
    }
  }

  /**
   * 외부에서 특정 상품의 상태를 업데이트할 때 (예: 상세 모달에서 상태 변경 시)
   * @param {number|string} productId
   * @param {'selling'|'reserved'|'completed'} newStatus
   */
  updateProductStatus(productId, newStatus) {
    const item = this.products.find((p) => String(p.id) === String(productId));
    if (item) {
      item.status = newStatus;
      item.statusText =
        newStatus === "selling"
          ? "판매중"
          : newStatus === "reserved"
          ? "예약중"
          : "거래 완료";
      this.renderProducts();
    }
  }

  /**
   * 외부에서 상품 전체 정보를 업데이트할 때 (게시글 수정 등)
   * @param {Object} updatedProduct
   */
  updateProduct(updatedProduct) {
    if (!updatedProduct || !updatedProduct.id) return;
    const index = this.products.findIndex((p) => String(p.id) === String(updatedProduct.id));
    if (index !== -1) {
      this.products[index] = {
        ...this.products[index],
        ...updatedProduct
      };
      this.renderProducts();
    }
  }

  /**
   * 외부에서 상품을 삭제할 때
   * @param {number|string} productId
   */
  removeProduct(productId) {
    if (!productId) return;
    this.products = this.products.filter((p) => String(p.id) !== String(productId));
    this.renderProducts();
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
