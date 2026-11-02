/**
 * ==========================================================================
 * 감자 마켓 - 실시간 감자톡(1:1 채팅) UI 컨트롤러 모듈 (chatModal.js)
 * - 대화목록 화면 (Chat List Screen)
 * - 대화방 화면 (Chat Room Screen)
 * - Supabase 실시간 연동 및 반응형 모달 전환
 * ==========================================================================
 */

import {
  getOrCreateChatRoom,
  fetchChatRoomById,
  fetchUserChatRooms,
  fetchChatMessages,
  sendChatMessage,
  markRoomMessagesAsRead,
  fetchTotalUnreadCount,
  subscribeRoomMessages,
  subscribeUserRooms,
  getCurrentChatUserProfile,
  formatChatTime,
  formatMessageClock,
  formatChatDateDivider
} from "./chatService.js";

class GamzaChatController {
  constructor() {
    this.dom = {};
    this.currentView = "list"; // 'list' | 'room'
    this.currentUser = null;
    this.currentProfile = null;
    this.activeRoomId = null;
    this.activeRoomData = null;
    this.activeRoomChannel = null;
    this.userRoomsChannel = null;
    this.rooms = [];
    this.messages = [];
    this.renderedMessageIds = new Set();
    this.options = {};
    this.isInitialized = false;
  }

  /**
   * 채팅 모듈 초기화
   * @param {Object} options
   */
  init(options = {}) {
    this.options = options;
    this.cacheDOMElements();
    this.bindEvents();
    this.isInitialized = true;

    // 초기 사용자 프로필 감지 및 안 읽은 메시지 수 동기화
    this.syncCurrentUser();

    // 글로벌 헬퍼 함수 바인딩
    window.openChatRoom = (data) => this.openChatWithProduct(data);
    window.openChatList = () => this.openChatList();
    window.closeChatModal = () => this.close();
  }

  /**
   * DOM 요소 캐싱
   */
  cacheDOMElements() {
    this.dom = {
      modal: document.getElementById("gamzaChatModal"),
      // [화면 A: 대화목록 화면]
      listView: document.getElementById("gamzaChatListView"),
      listCloseBtn: document.getElementById("gamzaChatListCloseBtn"),
      listBody: document.getElementById("gamzaChatListBody"),
      listEmptyState: document.getElementById("gamzaChatListEmptyState"),
      roomsContainer: document.getElementById("gamzaChatRoomsContainer"),

      // [화면 B: 대화방 화면]
      roomView: document.getElementById("gamzaChatRoomView"),
      roomBackBtn: document.getElementById("gamzaChatRoomBackBtn"),
      roomCloseBtn: document.getElementById("gamzaChatRoomCloseBtn"),
      partnerAvatar: document.getElementById("gamzaChatPartnerAvatar"),
      partnerName: document.getElementById("gamzaChatPartnerName"),
      partnerTemp: document.getElementById("gamzaChatPartnerTemp"),
      partnerStatus: document.getElementById("gamzaChatPartnerStatus"),

      // 상품 정보 요약 바
      productBar: document.getElementById("gamzaChatProductBar"),
      productThumb: document.getElementById("gamzaChatProductThumb"),
      productStatusBadge: document.getElementById("gamzaChatProductStatusBadge"),
      productTitle: document.getElementById("gamzaChatProductTitle"),
      productPrice: document.getElementById("gamzaChatProductPrice"),
      productDetailBtn: document.getElementById("gamzaChatProductDetailBtn"),

      // 메시지 목록 & 입력 폼
      messagesContainer: document.getElementById("gamzaChatMessagesContainer"),
      inputForm: document.getElementById("gamzaChatInputForm"),
      inputField: document.getElementById("gamzaChatInputField"),
      sendBtn: document.getElementById("gamzaChatSendBtn")
    };
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const {
      modal,
      listCloseBtn,
      roomCloseBtn,
      roomBackBtn,
      productBar,
      productDetailBtn,
      inputForm,
      roomsContainer
    } = this.dom;

    // 1. 모달 배경(오버레이) 클릭 시 닫기
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.close();
        }
      });
    }

    // 2. 닫기 버튼
    if (listCloseBtn) {
      listCloseBtn.addEventListener("click", () => this.close());
    }
    if (roomCloseBtn) {
      roomCloseBtn.addEventListener("click", () => this.close());
    }

    // 3. 뒤로가기 버튼 -> 대화방에서 대화목록 화면으로 전환
    if (roomBackBtn) {
      roomBackBtn.addEventListener("click", () => this.showListView());
    }

    // 4. 상품 요약 바 클릭 시 상품 상세 모달 오픈
    const handleProductClick = (e) => {
      e.stopPropagation();
      const product = this.activeRoomData?.product;
      const productId = product?.id || this.activeRoomData?.product_id;
      if (productId && typeof this.options.onProductClick === "function") {
        this.options.onProductClick(productId);
      }
    };
    if (productBar) {
      productBar.addEventListener("click", handleProductClick);
    }
    if (productDetailBtn) {
      productDetailBtn.addEventListener("click", handleProductClick);
    }

    // 5. 메시지 입력 폼 전송
    if (inputForm) {
      inputForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSendMessage();
      });
    }

    // 6. 대화방 목록 아이템 클릭 (이벤트 위임)
    if (roomsContainer) {
      roomsContainer.addEventListener("click", (e) => {
        const card = e.target.closest(".gamza-chat-room-card");
        if (!card) return;
        const roomId = card.dataset.roomId;
        const room = this.rooms.find((r) => String(r.id) === String(roomId));
        if (room) {
          this.enterRoom(room);
        }
      });
    }

    // 7. ESC 키로 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        this.close();
      }
    });
  }

  /**
   * 사용자 상태 업데이트 (로그인/로그아웃/초기 로딩 시 호출)
   */
  async updateAuth(user, profile) {
    this.currentUser = user || null;
    this.currentProfile = profile || null;
    await this.syncCurrentUser();
  }

  async syncCurrentUser() {
    try {
      const userProfile = await getCurrentChatUserProfile();
      this.currentProfile = userProfile;

      // 사용자 전용 실시간 방 목록 구독 갱신
      if (this.userRoomsChannel) {
        this.userRoomsChannel.unsubscribe();
        this.userRoomsChannel = null;
      }

      if (userProfile?.id) {
        this.userRoomsChannel = subscribeUserRooms(userProfile.id, () => {
          this.updateUnreadCountBadge();
          if (this.isOpen() && this.currentView === "list") {
            this.loadRooms(false);
          }
        });
        this.updateUnreadCountBadge();
      }
    } catch (err) {
      console.warn("[GamzaChat] syncCurrentUser 오류:", err);
    }
  }

  async updateUnreadCountBadge() {
    try {
      const profile = this.currentProfile || (await getCurrentChatUserProfile());
      if (!profile?.id) return;
      const count = await fetchTotalUnreadCount(profile.id);
      if (typeof this.options.onUnreadCountChange === "function") {
        this.options.onUnreadCountChange(count);
      }
    } catch (err) {
      console.warn("[GamzaChat] 안 읽은 개수 갱신 실패:", err);
    }
  }

  isOpen() {
    return this.dom.modal && this.dom.modal.classList.contains("is-active");
  }

  openModal() {
    if (!this.dom.modal) this.cacheDOMElements();
    if (this.dom.modal) {
      this.dom.modal.classList.add("is-active");
      this.dom.modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }

  close() {
    if (this.dom.modal) {
      this.dom.modal.classList.remove("is-active");
      this.dom.modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
    // 대화방 구독 해제
    if (this.activeRoomChannel) {
      this.activeRoomChannel.unsubscribe();
      this.activeRoomChannel = null;
    }
    this.activeRoomId = null;
    this.activeRoomData = null;
  }

  /**
   * ==========================================================================
   * [화면 A] 대화목록 화면 컨트롤
   * ==========================================================================
   */
  async openChatList() {
    this.openModal();
    this.showListView();
    await this.loadRooms(true);
  }

  showListView() {
    this.currentView = "list";
    if (this.activeRoomChannel) {
      this.activeRoomChannel.unsubscribe();
      this.activeRoomChannel = null;
    }
    this.activeRoomId = null;

    if (this.dom.listView) this.dom.listView.style.display = "flex";
    if (this.dom.roomView) this.dom.roomView.style.display = "none";
    this.loadRooms(false);
  }

  async loadRooms(showLoading = true) {
    const { roomsContainer, listEmptyState } = this.dom;
    if (!roomsContainer) return;

    if (showLoading && this.rooms.length === 0) {
      roomsContainer.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--seed-gray-600, #b0b3ba);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🥔</div>
          대화 목록을 불러오는 중입니다...
        </div>
      `;
    }

    try {
      const profile = this.currentProfile || (await getCurrentChatUserProfile());
      const rooms = await fetchUserChatRooms(profile.id);
      this.rooms = rooms;

      if (!rooms || rooms.length === 0) {
        if (listEmptyState) listEmptyState.style.display = "flex";
        roomsContainer.innerHTML = "";
      } else {
        if (listEmptyState) listEmptyState.style.display = "none";
        this.renderRoomsList(rooms, profile.id);
      }
    } catch (err) {
      console.error("[GamzaChat] 대화 목록 로드 실패:", err);
      roomsContainer.innerHTML = `
        <div style="padding: 30px 20px; text-align: center; color: var(--seed-carrot-600, #ff6600);">
          대화 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      `;
    }
  }

  renderRoomsList(rooms, currentUserId) {
    const { roomsContainer } = this.dom;
    if (!roomsContainer) return;

    roomsContainer.innerHTML = rooms
      .map((room) => {
        // 상대방 정보 결정 (내가 구매자면 판매자, 내가 판매자면 구매자)
        const isBuyer = String(room.buyer_id) === String(currentUserId);
        const partner = isBuyer ? room.seller : room.buyer;
        const partnerName = partner?.nickname || (isBuyer ? "판매자" : "구매자");
        const partnerAvatar =
          partner?.avatar_url ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.id || room.id)}`;
        const partnerTemp = partner?.temperature || 36.5;

        // 상품 정보
        const product = room.product || {};
        const productTitle = product.title || "상품 정보 없음";
        const productThumb =
          product.image_url ||
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fff2ec'/><text x='50' y='55' font-size='32' text-anchor='middle' dominant-baseline='middle'>🥔</text></svg>";

        const lastMsg = room.last_message || "대화 내용이 없습니다.";
        const lastMsgTime = formatChatTime(room.last_message_at);
        const unreadCount = room.unreadCount || 0;

        return `
          <div class="gamza-chat-room-card" data-room-id="${room.id}">
            <div class="gamza-card-avatar-wrap">
              <img src="${partnerAvatar}" alt="${partnerName} 아바타" class="gamza-card-avatar" />
            </div>
            <div class="gamza-card-info">
              <div class="gamza-card-top-row">
                <div class="gamza-card-name-wrap">
                  <span class="gamza-card-partner-name">${this.escapeHtml(partnerName)}</span>
                  <span class="gamza-card-temp-tag">${partnerTemp}℃</span>
                </div>
                <span class="gamza-card-time">${lastMsgTime}</span>
              </div>
              <span class="gamza-card-product-tag">${this.escapeHtml(productTitle)}</span>
              <div class="gamza-card-last-msg ${!room.last_message ? "empty" : ""}">${this.escapeHtml(lastMsg)}</div>
            </div>
            <img src="${productThumb}" alt="상품 썸네일" class="gamza-card-product-thumb" />
            ${unreadCount > 0 ? `<div class="gamza-card-unread-badge">${unreadCount > 99 ? "99+" : unreadCount}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }

  /**
   * ==========================================================================
   * [화면 B] 대화방 화면 컨트롤
   * ==========================================================================
   */
  async openChatWithProduct(productData) {
    if (!productData) return;

    this.openModal();
    this.showRoomView();

    const { productId, productTitle, seller, product } = productData;
    const sellerId = seller?.id || product?.seller_id || productData.sellerId;

    // 상품 요약 바 임시(Optimistic) 렌더링
    this.renderOptimisticProductBar({
      title: productTitle || product?.title || "상품 정보",
      price: product?.price ?? 0,
      image_url: product?.image_url,
      status: product?.status || "selling"
    });

    // 상대방 정보 임시 렌더링
    this.renderOptimisticPartnerHeader(seller);

    try {
      const myProfile = this.currentProfile || (await getCurrentChatUserProfile());

      if (sellerId && String(myProfile.id) === String(sellerId)) {
        if (typeof this.options.showToast === "function") {
          this.options.showToast("자신이 등록한 상품에는 채팅할 수 없어요! 🥔", "warning");
        }
        this.showListView();
        return;
      }

      // 대화방 조회 또는 생성
      const room = await getOrCreateChatRoom({
        productId,
        sellerId,
        buyerId: myProfile.id
      });

      if (room) {
        await this.enterRoom(room);
      }
    } catch (err) {
      console.error("[GamzaChat] 대화방 진입 실패:", err);
      if (typeof this.options.showToast === "function") {
        this.options.showToast(err.message || "채팅방을 여는 중 오류가 발생했습니다.", "error");
      }
    }
  }

  showRoomView() {
    this.currentView = "room";
    if (this.dom.listView) this.dom.listView.style.display = "none";
    if (this.dom.roomView) this.dom.roomView.style.display = "flex";
  }

  renderOptimisticPartnerHeader(partner) {
    const { partnerAvatar, partnerName, partnerTemp, partnerStatus } = this.dom;
    const name = partner?.nickname || "감자이웃";
    const avatar =
      partner?.avatar_url ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.id || "neighbor")}`;
    const temp = partner?.temperature || 36.5;

    if (partnerName) partnerName.textContent = name;
    if (partnerAvatar) partnerAvatar.src = avatar;
    if (partnerTemp) partnerTemp.textContent = `${temp}℃`;
    if (partnerStatus) partnerStatus.textContent = "보통 1시간 이내 응답";
  }

  renderOptimisticProductBar(prod) {
    const { productThumb, productStatusBadge, productTitle, productPrice } = this.dom;
    if (productTitle) productTitle.textContent = prod.title || "상품 정보";

    if (productPrice) {
      if (!prod.price || prod.price === 0) {
        productPrice.textContent = "무료 나눔 🥔";
      } else {
        productPrice.textContent = `${Number(prod.price).toLocaleString()}원`;
      }
    }

    if (productThumb) {
      productThumb.src =
        prod.image_url ||
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fff2ec'/><text x='50' y='55' font-size='32' text-anchor='middle' dominant-baseline='middle'>🥔</text></svg>";
    }

    if (productStatusBadge) {
      const status = prod.status || "selling";
      productStatusBadge.className = `gamza-chat-product-status-badge status-${status}`;
      const statusLabels = { selling: "판매중", reserved: "예약중", completed: "거래완료" };
      productStatusBadge.textContent = statusLabels[status] || "판매중";
    }
  }

  /**
   * 대화방 활성화 및 메시지 로드
   * @param {Object} room
   */
  async enterRoom(room) {
    if (!room) return;

    this.activeRoomId = room.id;
    this.activeRoomData = room;
    this.showRoomView();

    const myProfile = this.currentProfile || (await getCurrentChatUserProfile());
    const isBuyer = String(room.buyer_id) === String(myProfile.id);
    const partner = isBuyer ? room.seller : room.buyer;

    // 1. 헤더 상대방 정보 갱신
    this.renderOptimisticPartnerHeader(partner);

    // 2. 상단 상품 바 정보 갱신
    if (room.product) {
      this.renderOptimisticProductBar(room.product);
    }

    // 3. 메시지 컨테이너 초기화 및 로딩 표시
    const { messagesContainer, inputField } = this.dom;
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--seed-gray-600, #b0b3ba);">
          대화 내용을 불러오고 있습니다... 🥔
        </div>
      `;
    }

    // 4. 메시지 내역 불러오기
    try {
      const messages = await fetchChatMessages(room.id);
      this.messages = messages;
      this.renderedMessageIds.clear();
      this.renderMessagesTimeline(messages, myProfile.id, partner);
      this.scrollToBottom();

      // 5. 상대방 메시지 모두 읽음 처리
      await markRoomMessagesAsRead(room.id, myProfile.id);
      this.updateUnreadCountBadge();
    } catch (err) {
      console.error("[GamzaChat] 메시지 로드 실패:", err);
      if (messagesContainer) {
        messagesContainer.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--seed-carrot-600, #ff6600);">
            메시지를 불러오지 못했습니다.
          </div>
        `;
      }
    }

    // 6. 실시간 메시지 구독 연결
    if (this.activeRoomChannel) {
      this.activeRoomChannel.unsubscribe();
      this.activeRoomChannel = null;
    }

    this.activeRoomChannel = subscribeRoomMessages(room.id, (newMsg) => {
      this.onIncomingRealtimeMessage(newMsg, myProfile.id, partner);
    });

    // 7. 입력창 포커스
    if (inputField) {
      inputField.value = "";
      setTimeout(() => inputField.focus(), 150);
    }
  }

  renderMessagesTimeline(messages, currentUserId, partner) {
    const { messagesContainer } = this.dom;
    if (!messagesContainer) return;

    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--seed-gray-600, #b0b3ba);">
          <div style="font-size: 2.8rem; margin-bottom: 12px;">🥔👋</div>
          <div style="font-weight: 700; color: var(--seed-gray-900, #2a3038); font-size: 1.05rem; margin-bottom: 4px;">
            첫 인사를 건네보세요!
          </div>
          <div style="font-size: 0.88rem;">따뜻한 인사로 기분 좋은 거래를 시작할 수 있어요.</div>
        </div>
      `;
      return;
    }

    let html = "";
    let lastDateStr = null;

    messages.forEach((msg) => {
      this.renderedMessageIds.add(String(msg.id));
      const msgDateStr = new Date(msg.created_at).toDateString();

      // 날짜 구분선
      if (msgDateStr !== lastDateStr) {
        lastDateStr = msgDateStr;
        html += `
          <div class="gamza-chat-date-divider">
            <span class="gamza-chat-date-pill">${formatChatDateDivider(msg.created_at)}</span>
          </div>
        `;
      }

      html += this.buildMessageHTML(msg, currentUserId, partner);
    });

    messagesContainer.innerHTML = html;
  }

  buildMessageHTML(msg, currentUserId, partner) {
    const isOutgoing = String(msg.sender_id) === String(currentUserId);
    const clockTime = formatMessageClock(msg.created_at);

    if (isOutgoing) {
      return `
        <div class="gamza-msg-row outgoing" data-msg-id="${msg.id}">
          <div class="gamza-msg-content-wrap">
            <div class="gamza-msg-bubble-wrap">
              <span class="gamza-msg-time">${clockTime}</span>
              <div class="gamza-msg-bubble">${this.escapeHtml(msg.content)}</div>
            </div>
          </div>
        </div>
      `;
    }

    const senderAvatar =
      msg.sender?.avatar_url ||
      partner?.avatar_url ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.sender_id)}`;
    const senderName = msg.sender?.nickname || partner?.nickname || "감자이웃";

    return `
      <div class="gamza-msg-row incoming" data-msg-id="${msg.id}">
        <img src="${senderAvatar}" alt="${senderName} 아바타" class="gamza-msg-avatar" />
        <div class="gamza-msg-content-wrap">
          <span class="gamza-msg-sender-name">${this.escapeHtml(senderName)}</span>
          <div class="gamza-msg-bubble-wrap">
            <div class="gamza-msg-bubble">${this.escapeHtml(msg.content)}</div>
            <span class="gamza-msg-time">${clockTime}</span>
          </div>
        </div>
      </div>
    `;
  }

  onIncomingRealtimeMessage(newMsg, currentUserId, partner) {
    if (!newMsg || this.renderedMessageIds.has(String(newMsg.id))) return;
    this.renderedMessageIds.add(String(newMsg.id));

    const { messagesContainer } = this.dom;
    if (!messagesContainer) return;

    // 만약 빈 상태 안내 메시지가 있으면 지우기
    if (messagesContainer.querySelector(".gamza-msg-row") === null) {
      messagesContainer.innerHTML = "";
    }

    const msgHTML = this.buildMessageHTML(newMsg, currentUserId, partner);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = msgHTML;
    while (tempDiv.firstChild) {
      messagesContainer.appendChild(tempDiv.firstChild);
    }

    this.scrollToBottom();

    // 내가 받은 메시지라면 즉시 읽음 처리
    if (String(newMsg.sender_id) !== String(currentUserId)) {
      markRoomMessagesAsRead(this.activeRoomId, currentUserId);
    }
  }

  /**
   * 메시지 전송 처리
   */
  async handleSendMessage() {
    const { inputField, sendBtn } = this.dom;
    if (!inputField || !this.activeRoomId) return;

    const content = inputField.value.trim();
    if (!content) return;

    inputField.value = "";
    if (sendBtn) sendBtn.disabled = true;

    try {
      const myProfile = this.currentProfile || (await getCurrentChatUserProfile());
      const sentMsg = await sendChatMessage({
        roomId: this.activeRoomId,
        senderId: myProfile.id,
        content
      });

      if (sentMsg) {
        const isBuyer = String(this.activeRoomData.buyer_id) === String(myProfile.id);
        const partner = isBuyer ? this.activeRoomData.seller : this.activeRoomData.buyer;
        this.onIncomingRealtimeMessage(sentMsg, myProfile.id, partner);
      }
    } catch (err) {
      console.error("[GamzaChat] 메시지 전송 실패:", err);
      if (typeof this.options.showToast === "function") {
        this.options.showToast("메시지 전송에 실패했습니다. 다시 시도해주세요.", "error");
      }
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      inputField.focus();
    }
  }

  scrollToBottom() {
    const { messagesContainer } = this.dom;
    if (!messagesContainer) return;
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export const GamzaChatModal = new GamzaChatController();
