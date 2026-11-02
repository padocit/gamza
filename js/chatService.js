/**
 * ==========================================================================
 * 감자 마켓 - 실시간 채팅 데이터 서비스 모듈 (chatService.js)
 * ==========================================================================
 */

import {
  supabase,
  getCurrentUser,
  getCurrentUserProfile,
  getOrCreateCurrentUserId
} from "./supabaseClient.js";

/**
 * 현재 채팅 사용자 정보 조회 (로그인 회원 또는 익명 고유 프로필)
 */
export async function getCurrentChatUserProfile() {
  try {
    const user = await getCurrentUser();
    if (user) {
      const profile = await getCurrentUserProfile();
      return {
        id: user.id,
        nickname: profile?.nickname || (user.email ? user.email.split("@")[0] : "감자이웃"),
        avatar_url:
          profile?.avatar_url ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.id)}`,
        temperature: profile?.temperature || 36.5,
        isAuth: true
      };
    }

    const anonId = await getOrCreateCurrentUserId();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", anonId)
      .maybeSingle();

    return {
      id: anonId,
      nickname: profile?.nickname || "감자이웃",
      avatar_url:
        profile?.avatar_url ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(anonId)}`,
      temperature: profile?.temperature || 36.5,
      isAuth: false
    };
  } catch (err) {
    console.warn("[chatService] getCurrentChatUserProfile 폴백:", err);
    const fallbackId = await getOrCreateCurrentUserId();
    return {
      id: fallbackId,
      nickname: "감자이웃",
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fallbackId)}`,
      temperature: 36.5,
      isAuth: false
    };
  }
}

/**
 * 상대적 시간 포맷팅 (방금 전, n분 전, n시간 전, 어제, M월 D일)
 */
export function formatChatTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const isSameYear = date.getFullYear() === now.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (diffHour < 48) return "어제";
  return isSameYear ? `${month}월 ${day}일` : `${date.getFullYear()}.${month}.${day}`;
}

/**
 * 대화방 내부 메시지 전송 시간 포맷팅 (오전/오후 h:mm)
 */
export function formatMessageClock(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "오후" : "오전";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0시 -> 12시
  return `${ampm} ${hours}:${minutes}`;
}

/**
 * 대화방 날짜 구분선 포맷팅 (예: 2026년 11월 2일)
 */
export function formatChatDateDivider(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

/**
 * 대화방 생성 또는 기존 방 조회
 * @param {Object} params
 * @param {number|string} params.productId
 * @param {string} params.sellerId
 * @param {string} [params.buyerId]
 * @returns {Promise<Object>} 채팅방 객체
 */
export async function getOrCreateChatRoom({ productId, sellerId, buyerId }) {
  let currentBuyerId = buyerId;
  if (!currentBuyerId) {
    const userProfile = await getCurrentChatUserProfile();
    currentBuyerId = userProfile.id;
  }

  const numProductId = Number(productId);

  if (!sellerId && numProductId) {
    try {
      const { data: prod } = await supabase
        .from("products")
        .select("seller_id")
        .eq("id", numProductId)
        .maybeSingle();
      if (prod && prod.seller_id) {
        sellerId = prod.seller_id;
      }
    } catch (e) {
      console.warn("[chatService] seller_id fallback query failed:", e);
    }
  }

  if (sellerId && String(currentBuyerId) === String(sellerId)) {
    throw new Error("자신이 등록한 상품에는 채팅할 수 없어요! 🥔");
  }

  // 1. 이미 존재하는 채팅방 조회
  const { data: existingRoom, error: queryError } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      product_id,
      seller_id,
      buyer_id,
      last_message,
      last_message_at,
      created_at,
      updated_at,
      product:products (id, title, price, status, image_url),
      seller:profiles!chat_rooms_seller_id_fkey (id, nickname, avatar_url, temperature),
      buyer:profiles!chat_rooms_buyer_id_fkey (id, nickname, avatar_url, temperature)
    `)
    .eq("product_id", numProductId)
    .eq("buyer_id", currentBuyerId)
    .maybeSingle();

  if (queryError) {
    console.error("[chatService] 채팅방 조회 실패:", queryError);
  }

  if (existingRoom) {
    return existingRoom;
  }

  // 2. 존재하지 않으면 신규 방 생성
  const { data: newRoom, error: insertError } = await supabase
    .from("chat_rooms")
    .insert({
      product_id: numProductId,
      seller_id: sellerId,
      buyer_id: currentBuyerId,
      last_message: "",
      last_message_at: new Date().toISOString()
    })
    .select(`
      id,
      product_id,
      seller_id,
      buyer_id,
      last_message,
      last_message_at,
      created_at,
      updated_at,
      product:products (id, title, price, status, image_url),
      seller:profiles!chat_rooms_seller_id_fkey (id, nickname, avatar_url, temperature),
      buyer:profiles!chat_rooms_buyer_id_fkey (id, nickname, avatar_url, temperature)
    `)
    .single();

  if (insertError) {
    console.error("[chatService] 채팅방 생성 실패:", insertError);
    throw insertError;
  }

  // 3. 상품의 chats_count 증가 반영
  try {
    const { data: prod } = await supabase
      .from("products")
      .select("chats_count")
      .eq("id", numProductId)
      .single();

    if (prod) {
      await supabase
        .from("products")
        .update({ chats_count: (prod.chats_count || 0) + 1 })
        .eq("id", numProductId);
    }
  } catch (chatCountErr) {
    console.warn("[chatService] chats_count 증가 실패 (계속 진행):", chatCountErr);
  }

  return newRoom;
}

/**
 * 단일 채팅방 상세 정보 조회
 * @param {string} roomId
 */
export async function fetchChatRoomById(roomId) {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      product_id,
      seller_id,
      buyer_id,
      last_message,
      last_message_at,
      created_at,
      updated_at,
      product:products (id, title, price, status, image_url),
      seller:profiles!chat_rooms_seller_id_fkey (id, nickname, avatar_url, temperature),
      buyer:profiles!chat_rooms_buyer_id_fkey (id, nickname, avatar_url, temperature)
    `)
    .eq("id", roomId)
    .single();

  if (error) {
    console.error("[chatService] 방 상세 조회 실패:", error);
    return null;
  }
  return data;
}

/**
 * 로그인/익명 사용자의 모든 채팅방 목록 조회
 * @param {string} userId
 * @returns {Promise<Array>} 채팅방 목록
 */
export async function fetchUserChatRooms(userId) {
  let targetUserId = userId;
  if (!targetUserId) {
    const profile = await getCurrentChatUserProfile();
    targetUserId = profile.id;
  }

  if (!targetUserId) return [];

  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      product_id,
      seller_id,
      buyer_id,
      last_message,
      last_message_at,
      created_at,
      updated_at,
      product:products (id, title, price, status, image_url),
      seller:profiles!chat_rooms_seller_id_fkey (id, nickname, avatar_url, temperature),
      buyer:profiles!chat_rooms_buyer_id_fkey (id, nickname, avatar_url, temperature)
    `)
    .or(`buyer_id.eq.${targetUserId},seller_id.eq.${targetUserId}`)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[chatService] 채팅방 목록 조회 실패:", error);
    return [];
  }

  // 각 방별 읽지 않은 메시지 수 추가 계산
  const roomsWithUnread = await Promise.all(
    (data || []).map(async (room) => {
      try {
        const { count, error: countErr } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", room.id)
          .neq("sender_id", targetUserId)
          .eq("is_read", false);

        return {
          ...room,
          unreadCount: countErr ? 0 : count || 0
        };
      } catch (e) {
        return { ...room, unreadCount: 0 };
      }
    })
  );

  return roomsWithUnread;
}

/**
 * 특정 채팅방의 모든 메시지 목록 조회
 * @param {string} roomId
 * @returns {Promise<Array>} 메시지 목록
 */
export async function fetchChatMessages(roomId) {
  if (!roomId) return [];

  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id,
      room_id,
      sender_id,
      content,
      is_read,
      created_at,
      sender:profiles!chat_messages_sender_id_fkey (id, nickname, avatar_url)
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[chatService] 메시지 목록 조회 실패:", error);
    return [];
  }

  return data || [];
}

/**
 * 채팅 메시지 전송
 * @param {Object} params
 * @param {string} params.roomId
 * @param {string} [params.senderId]
 * @param {string} params.content
 * @returns {Promise<Object>} 전송된 메시지
 */
export async function sendChatMessage({ roomId, senderId, content }) {
  if (!roomId || !content || !content.trim()) return null;

  let currentSenderId = senderId;
  if (!currentSenderId) {
    const profile = await getCurrentChatUserProfile();
    currentSenderId = profile.id;
  }

  const cleanContent = content.trim();

  // 1. 메시지 저장
  const { data: message, error: msgError } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: currentSenderId,
      content: cleanContent,
      is_read: false
    })
    .select(`
      id,
      room_id,
      sender_id,
      content,
      is_read,
      created_at,
      sender:profiles!chat_messages_sender_id_fkey (id, nickname, avatar_url)
    `)
    .single();

  if (msgError) {
    console.error("[chatService] 메시지 전송 실패:", msgError);
    throw msgError;
  }

  // 2. 채팅방의 최근 메시지 및 업데이트 시간 갱신
  await supabase
    .from("chat_rooms")
    .update({
      last_message: cleanContent,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", roomId);

  return message;
}

/**
 * 상대방 메시지 모두 읽음 처리
 * @param {string} roomId
 * @param {string} currentUserId
 */
export async function markRoomMessagesAsRead(roomId, currentUserId) {
  if (!roomId || !currentUserId) return;

  try {
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("room_id", roomId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);
  } catch (err) {
    console.warn("[chatService] 읽음 처리 실패:", err);
  }
}

/**
 * 전체 안 읽은 메시지 수 조회
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function fetchTotalUnreadCount(userId) {
  try {
    const rooms = await fetchUserChatRooms(userId);
    return rooms.reduce((acc, room) => acc + (room.unreadCount || 0), 0);
  } catch (err) {
    return 0;
  }
}

/**
 * 실시간 특정 대화방 메시지 구독
 * @param {string} roomId
 * @param {Function} onNewMessage
 * @returns {Object} Supabase Realtime 채널 객체 (unsubscribe용)
 */
export function subscribeRoomMessages(roomId, onNewMessage) {
  if (!roomId) return null;

  const channel = supabase
    .channel(`realtime:chat_messages:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        let sender = null;
        try {
          const { data } = await supabase
            .from("profiles")
            .select("id, nickname, avatar_url")
            .eq("id", payload.new.sender_id)
            .maybeSingle();
          sender = data;
        } catch (e) {
          // fallback
        }

        const completeMessage = {
          ...payload.new,
          sender: sender || { nickname: "감자이웃" }
        };

        if (typeof onNewMessage === "function") {
          onNewMessage(completeMessage);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * 실시간 사용자 채팅방 변경(새 대화, 최근 메시지 변경) 구독
 * @param {string} userId
 * @param {Function} onRoomChange
 * @returns {Object} Realtime 채널
 */
export function subscribeUserRooms(userId, onRoomChange) {
  if (!userId) return null;

  const channel = supabase
    .channel(`realtime:chat_rooms:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_rooms"
      },
      (payload) => {
        const room = payload.new || payload.old;
        if (room && (room.buyer_id === userId || room.seller_id === userId)) {
          if (typeof onRoomChange === "function") {
            onRoomChange(payload);
          }
        }
      }
    )
    .subscribe();

  return channel;
}
