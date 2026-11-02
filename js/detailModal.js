/**
 * ========================================================
 * 감자(Gamza) 마켓 - 화면 2: 상세 팝업(모달) 스크립트
 * ========================================================
 */

(function (global) {
  'use strict';

  // 현재 열려 있는 상품 데이터 캐시
  let currentProduct = null;

  // DOM 캐시 객체
  let elements = null;

  /**
   * DOM 요소 초기화 및 캐싱 (동적 로드 대응)
   */
  function initElements() {
    if (elements && elements.overlay) return elements;

    const overlay = document.getElementById('gamzaDetailModal');
    if (!overlay) return {};

    elements = {
      overlay: overlay,
      container: overlay.querySelector('.gamza-modal-container'),
      closeBtn: document.getElementById('gamzaModalCloseBtn'),
      image: document.getElementById('gamzaModalImage'),
      imagePlaceholder: document.getElementById('gamzaModalImagePlaceholder'),
      statusBadge: document.getElementById('gamzaModalStatusBadge'),
      category: document.getElementById('gamzaModalCategory'),
      title: document.getElementById('gamzaModalTitle'),
      location: document.getElementById('gamzaModalLocation'),
      createdAt: document.getElementById('gamzaModalCreatedAt'),
      price: document.getElementById('gamzaModalPrice'),
      description: document.getElementById('gamzaModalDescription'),
      sellerAvatar: document.getElementById('gamzaModalSellerAvatar'),
      sellerNickname: document.getElementById('gamzaModalSellerNickname'),
      sellerLocation: document.getElementById('gamzaModalSellerLocation'),
      sellerTemp: document.getElementById('gamzaModalSellerTemp'),
      sellerTempBar: document.getElementById('gamzaModalSellerTempBar'),
      likeBtn: document.getElementById('gamzaModalLikeBtn'),
      chatBtn: document.getElementById('gamzaModalChatBtn'),
      ownerStatusBar: document.getElementById('gamzaModalOwnerStatusBar'),
      ownerActions: document.getElementById('gamzaModalOwnerActions'),
      editBtn: document.getElementById('gamzaModalEditBtn'),
      deleteBtn: document.getElementById('gamzaModalDeleteBtn'),
    };

    return elements;
  }

  let isEventsBound = false;

  /**
   * 이벤트 리스너 바인딩 (오버레이 클릭, 닫기 버튼, ESC 키)
   */
  function bindEvents() {
    if (isEventsBound) return;
    const el = initElements();
    if (!el.overlay) return;

    isEventsBound = true;

    // 1. 닫기 버튼 클릭
    if (el.closeBtn) {
      el.closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeDetailModal();
      });
    }

    // 2. 배경 오버레이 클릭 시 닫기 (모달 컨테이너 외부 클릭)
    el.overlay.addEventListener('click', function (e) {
      if (e.target === el.overlay) {
        closeDetailModal();
      }
    });

    // 3. ESC 키 입력 시 닫기
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (el.overlay && el.overlay.classList.contains('is-active')) {
          closeDetailModal();
        }
      }
    });

    // 4. 관심 추가(찜) 버튼 토글
    if (el.likeBtn) {
      el.likeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isLiked = el.likeBtn.classList.toggle('is-liked');
        if (currentProduct) {
          currentProduct.isLiked = isLiked;
        }

        // 선택적 커스텀 이벤트 발행 (외부 연동용)
        const event = new CustomEvent('gamza:toggle-like', {
          detail: {
            productId: currentProduct ? currentProduct.id : null,
            isLiked: isLiked
          }
        });
        window.dispatchEvent(event);
      });
    }

    // 5. 채팅 시작하기 버튼 피드백
    if (el.chatBtn) {
      el.chatBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!currentProduct) return;

        // 상세 모달 닫기
        closeDetailModal();

        // 커스텀 이벤트 발행
        const event = new CustomEvent('gamza:start-chat', {
          detail: {
            productId: currentProduct.id,
            productTitle: currentProduct.title,
            seller: currentProduct.seller,
            product: currentProduct
          }
        });
        window.dispatchEvent(event);

        // 전역 함수 직접 호출도 지원
        if (typeof window.openChatRoom === "function") {
          window.openChatRoom({
            productId: currentProduct.id,
            productTitle: currentProduct.title,
            seller: currentProduct.seller,
            product: currentProduct
          });
        }

        console.log(`[감자톡] '${currentProduct.title}' 판매자(${currentProduct.seller?.nickname || '판매자'})와의 채팅을 시작합니다.`);
      });
    }

    // 6. 작성자 전용 거래 상태 변경 버튼 클릭
    if (el.ownerStatusBar) {
      el.ownerStatusBar.addEventListener('click', function (e) {
        const btn = e.target.closest('.gamza-owner-status-btn');
        if (!btn || !currentProduct) return;

        const newStatus = btn.dataset.status;
        if (!newStatus || newStatus === currentProduct.status) return;

        currentProduct.status = newStatus;
        applyStatusBadge(newStatus);

        const statusButtons = el.ownerStatusBar.querySelectorAll('.gamza-owner-status-btn');
        statusButtons.forEach(b => {
          b.classList.toggle('is-active', b.dataset.status === newStatus);
        });

        const event = new CustomEvent('gamza:change-status', {
          detail: {
            productId: currentProduct.id,
            newStatus: newStatus,
            product: currentProduct
          }
        });
        window.dispatchEvent(event);
      });
    }

    // 7. 작성자 전용 게시글 수정 버튼
    if (el.editBtn) {
      el.editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!currentProduct) return;

        const event = new CustomEvent('gamza:edit-product', {
          detail: {
            product: currentProduct
          }
        });
        window.dispatchEvent(event);
      });
    }

    // 8. 작성자 전용 게시글 삭제 버튼
    if (el.deleteBtn) {
      el.deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!currentProduct) return;

        if (confirm(`'${currentProduct.title}' 상품을 정말 삭제하시겠습니까?\n삭제된 상품은 복구할 수 없습니다.`)) {
          const event = new CustomEvent('gamza:delete-product', {
            detail: {
              productId: currentProduct.id,
              product: currentProduct
            }
          });
          window.dispatchEvent(event);
        }
      });
    }
  }

  /**
   * 가격 포맷터 (숫자 -> 00,000원 또는 나눔)
   */
  function formatPrice(price) {
    if (price === 0 || price === '0' || price === '무료' || price === '나눔') {
      return '<span class="price-free">나눔 🧡</span>';
    }
    const num = Number(price);
    if (!isNaN(num)) {
      return num.toLocaleString('ko-KR') + '원';
    }
    return price || '가격 미정';
  }

  /**
   * 판매 상태 뱃지 클래스 및 레이블 파싱
   */
  function applyStatusBadge(status) {
    const el = initElements();
    if (!el.statusBadge) return;

    el.statusBadge.classList.remove('status-selling', 'status-reserved', 'status-completed');

    let label = '판매중';
    let className = 'status-selling';

    const normalized = String(status || '').toUpperCase().trim();

    if (normalized === 'RESERVED' || normalized === '예약중') {
      label = '예약중';
      className = 'status-reserved';
    } else if (normalized === 'COMPLETED' || normalized === 'SOLDOUT' || normalized === '거래완료' || normalized === '거래 완료') {
      label = '거래 완료';
      className = 'status-completed';
    } else {
      label = '판매중';
      className = 'status-selling';
    }

    el.statusBadge.textContent = label;
    el.statusBadge.classList.add(className);
  }

  /**
   * 상세 모달 열기 함수
   * @param {Object} product - 상품 상세 정보 객체
   * @param {Object} [options] - 옵션 (isOwner: boolean 등)
   */
  function openDetailModal(product, options = {}) {
    bindEvents();
    const el = initElements();
    if (!el.overlay) {
      console.error('[Gamza] gamzaDetailModal 요소를 찾을 수 없습니다.');
      return;
    }

    currentProduct = Object.assign({}, product);
    const isOwner = !!(options && options.isOwner);

    // 1. 대표 이미지 처리
    const imageUrl = product.imageUrl || product.image || (Array.isArray(product.images) ? product.images[0] : null);
    if (imageUrl) {
      el.image.src = imageUrl;
      el.image.alt = product.title || '상품 이미지';
      el.image.style.display = 'block';
      if (el.imagePlaceholder) el.imagePlaceholder.style.display = 'none';
    } else {
      el.image.src = '';
      el.image.style.display = 'none';
      if (el.imagePlaceholder) el.imagePlaceholder.style.display = 'flex';
    }

    // 2. 판매 상태 뱃지
    applyStatusBadge(product.status);

    // 3. 카테고리
    el.category.textContent = product.category || '기타 중고물품';

    // 4. 상품명 (제목)
    el.title.textContent = product.title || '제목 없음';

    // 5. 판매 위치 및 업로드 시간
    el.location.textContent = product.location || '동네 미지정';
    el.createdAt.textContent = product.createdAt || product.timeAgo || '방금 전';

    // 6. 가격
    el.price.innerHTML = formatPrice(product.price);

    // 7. 상품 상세 설명 (줄바꿈 지원)
    el.description.textContent = product.description || '등록된 상세 설명이 없습니다.';

    // 8. 판매자 정보 영역
    const seller = product.seller || {};
    el.sellerAvatar.src = seller.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(seller.nickname || 'gamza');
    el.sellerAvatar.alt = (seller.nickname || '판매자') + ' 프로필';
    el.sellerNickname.textContent = seller.nickname || '익명의 감자';
    el.sellerLocation.textContent = seller.location || product.location || '인증된 이웃';

    // 포슬온도 / 매너온도 (기본 36.5)
    const temp = typeof seller.temperature === 'number' ? seller.temperature : 36.5;
    el.sellerTemp.textContent = temp.toFixed(1) + '℃';
    const tempPercent = Math.min(Math.max((temp / 60) * 100, 10), 100);
    el.sellerTempBar.style.width = tempPercent + '%';

    // 9. 관심 상태 동기화 및 버튼 가시성
    if (product.isLiked) {
      el.likeBtn.classList.add('is-liked');
    } else {
      el.likeBtn.classList.remove('is-liked');
    }

    // 10. 작성자 전용 UI (상태 변경 바 및 수정/삭제 버튼) 토글
    if (el.ownerStatusBar) {
      el.ownerStatusBar.style.display = isOwner ? 'flex' : 'none';
      const statusButtons = el.ownerStatusBar.querySelectorAll('.gamza-owner-status-btn');
      statusButtons.forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.status === product.status);
      });
    }
    if (el.ownerActions) {
      el.ownerActions.style.display = isOwner ? 'flex' : 'none';
    }
    if (el.chatBtn) {
      el.chatBtn.style.display = isOwner ? 'none' : 'inline-flex';
    }
    if (el.likeBtn) {
      el.likeBtn.style.display = isOwner ? 'none' : 'inline-flex';
    }

    // 11. 스크롤 최상단으로 리셋 및 모달 활성화
    const scrollable = el.container.querySelector('.gamza-modal-scrollable');
    if (scrollable) scrollable.scrollTop = 0;

    // 모달 표시
    el.overlay.classList.add('is-active');
    el.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
  }

  /**
   * 상세 모달 닫기 함수
   */
  function closeDetailModal() {
    const el = initElements();
    if (!el.overlay) return;

    el.overlay.classList.remove('is-active');
    el.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // 배경 스크롤 복원
    currentProduct = null;
  }

  // DOM 로드 완료 시 이벤트 바인딩
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  // 전역 스코프에 함수 노출
  global.openDetailModal = openDetailModal;
  global.closeDetailModal = closeDetailModal;

})(typeof window !== 'undefined' ? window : this);
