/**
 * ==========================================================================
 * 감자 마켓 - Supabase 클라이언트 및 데이터 서비스 모듈 (supabaseClient.js)
 * ==========================================================================
 */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://bwnqbuzsyavedoqzbgfe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bnFidXpzeWF2ZWRvcXpiZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MjE0MzAsImV4cCI6MjEwOTA5NzQzMH0.X6PleE0nWZyTR_ir7ZV7E2lneTG1Y8ZxNOLVNYXIiEk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 로컬 사용자 익명 ID 키 (개인식별정보 배제: 브라우저 고유 UUID)
const LOCAL_USER_ID_KEY = "gamza_anonymous_user_id";

/**
 * 로그인한 사용자의 프로필을 조회하거나 없으면 자동 생성/보장
 * @param {Object} user Supabase User 객체
 * @param {string} [nickname] 새 프로필 지정 닉네임
 * @returns {Promise<Object>} profile 객체
 */
export async function ensureUserProfile(user, nickname) {
  if (!user || !user.id) return null;

  try {
    // 1. 기존 프로필 조회
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const targetNickname =
      nickname?.trim() ||
      user.user_metadata?.nickname ||
      existingProfile?.nickname ||
      (user.email ? user.email.split("@")[0] : "감자이웃");

    const avatarUrl =
      existingProfile?.avatar_url ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.id)}`;

    if (existingProfile) {
      // 닉네임이 새로 전달되었고 기존과 다르면 업데이트
      if (nickname && nickname.trim() !== existingProfile.nickname) {
        const { data: updated } = await supabase
          .from("profiles")
          .update({ nickname: targetNickname, updated_at: new Date().toISOString() })
          .eq("id", user.id)
          .select("*")
          .single();
        return updated || existingProfile;
      }
      return existingProfile;
    }

    // 2. 프로필이 없으면 생성 (upsert)
    const newProfile = {
      id: user.id,
      nickname: targetNickname,
      avatar_url: avatarUrl,
      temperature: 36.5,
      activity_location: "서울 강남구 역삼동",
      is_verified: true
    };

    const { data: createdProfile, error } = await supabase
      .from("profiles")
      .upsert(newProfile, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      console.warn("[Supabase] ensureUserProfile 생성 실패 (계속 진행):", error);
      return newProfile;
    }

    return createdProfile;
  } catch (err) {
    console.error("[Supabase] ensureUserProfile 예외:", err);
    return null;
  }
}

/**
 * 현재 로그인된 사용자 정보 조회
 * @returns {Promise<Object|null>} user 객체
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch (err) {
    console.error("[Supabase] getCurrentUser 에러:", err);
    return null;
  }
}

/**
 * 현재 로그인된 사용자의 세션 조회
 * @returns {Promise<Object|null>} session 객체
 */
export async function getCurrentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session || null;
  } catch (err) {
    console.error("[Supabase] getCurrentSession 에러:", err);
    return null;
  }
}

/**
 * 현재 로그인된 사용자의 프로필 조회
 * @returns {Promise<Object|null>} profile 객체
 */
export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return await ensureUserProfile(user);
}

/**
 * 회원가입 (이메일, 비밀번호, 닉네임 필수)
 * @param {string} email
 * @param {string} password
 * @param {string} nickname
 */
export async function signUpWithEmail(email, password, nickname) {
  if (!nickname || !nickname.trim()) {
    throw new Error("닉네임은 필수 입력 항목입니다.");
  }
  const cleanNickname = nickname.trim();

  // Supabase Auth 가입 (메타데이터에 nickname 포함)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nickname: cleanNickname
      }
    }
  });

  if (error) {
    console.error("[Supabase Auth] 회원가입 실패:", error);
    throw error;
  }

  // 가입 성공 시 profiles 테이블에 프로필 저장
  if (data?.user) {
    try {
      await ensureUserProfile(data.user, cleanNickname);
    } catch (profileErr) {
      console.warn("[Supabase] 가입 후 프로필 생성 경고:", profileErr);
    }
  }

  return data;
}

/**
 * 로그인 (이메일, 비밀번호)
 * @param {string} email
 * @param {string} password
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("[Supabase Auth] 로그인 실패:", error);
    throw error;
  }

  // 로그인 성공 시 프로필 확인 및 보장
  if (data?.user) {
    try {
      await ensureUserProfile(data.user);
    } catch (profileErr) {
      console.warn("[Supabase] 로그인 후 프로필 동기화 경고:", profileErr);
    }
  }

  return data;
}

/**
 * 로그아웃
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[Supabase Auth] 로그아웃 실패:", error);
    throw error;
  }
  return true;
}

/**
 * Auth 상태 변경 리스너
 * @param {Function} callback (event, session, user, profile) => void
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user || null;
    let profile = null;
    if (user) {
      try {
        profile = await ensureUserProfile(user);
      } catch (e) {
        console.warn("[Supabase] onAuthStateChange 프로필 조회 경고:", e);
      }
    }
    if (typeof callback === "function") {
      callback(event, session, user, profile);
    }
  });
}

/**
 * 현재 클라이언트의 익명 프로필 ID를 가져오거나 없으면 생성
 * @returns {Promise<string>} profile id (UUID)
 */
export async function getOrCreateCurrentUserId() {
  let userId = localStorage.getItem(LOCAL_USER_ID_KEY);

  if (userId) {
    // DB에 존재하는지 확인
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (data) return data.id;
  }

  // 없거나 DB에 존재하지 않으면 새로운 익명 프로필 생성
  const newNickname = "내감자_" + Math.floor(1000 + Math.random() * 9000);
  const randomSeed = "gamza_" + Math.random().toString(36).substring(2, 8);
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      nickname: newNickname,
      avatar_url: avatarUrl,
      temperature: 36.5,
      activity_location: "서울 강남구 역삼동",
      is_verified: true
    })
    .select("id")
    .single();

  if (error || !newProfile) {
    console.error("[Supabase] 프로필 생성 실패, 기본 시드 프로필 사용:", error);
    // 폴백: 시드 등록된 첫 번째 프로필 ID 반환
    return "11111111-1111-1111-1111-111111111111";
  }

  localStorage.setItem(LOCAL_USER_ID_KEY, newProfile.id);
  return newProfile.id;
}

/**
 * 상대 시간 변환 포맷터 ("방금 전", "10분 전", "2시간 전" 등)
 */
export function formatTimeAgo(isoString) {
  if (!isoString) return "방금 전";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

/**
 * DB 레코드를 UI 컴포넌트용 포맷으로 변환
 */
export function transformProductRow(row) {
  const statusTextMap = {
    selling: "판매중",
    reserved: "예약중",
    completed: "거래 완료"
  };

  const sellerProfile = row.seller || {};

  return {
    id: row.id,
    seller_id: row.seller_id,
    sellerId: row.seller_id,
    title: row.title,
    category: row.category,
    price: Number(row.price),
    location: row.location,
    timeAgo: formatTimeAgo(row.created_at),
    createdAt: formatTimeAgo(row.created_at),
    rawCreatedAt: row.created_at,
    status: row.status,
    statusText: statusTextMap[row.status] || "판매중",
    image: row.image_url,
    description: row.description,
    seller: {
      id: sellerProfile.id || row.seller_id,
      name: sellerProfile.nickname || "감자이웃",
      nickname: sellerProfile.nickname || "감자이웃",
      temperature: sellerProfile.temperature ? Number(sellerProfile.temperature) : 36.5,
      location: sellerProfile.activity_location || row.location,
      avatar: sellerProfile.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=potato",
      isVerified: sellerProfile.is_verified ?? true
    },
    likes: row.likes_count || 0,
    chats: row.chats_count || 0
  };
}

/**
 * 전체 상품 목록 가져오기 (판매자 프로필 조인)
 */
export async function fetchProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        seller_id,
        title,
        category,
        price,
        location,
        status,
        image_url,
        description,
        likes_count,
        chats_count,
        created_at,
        updated_at,
        seller:profiles!products_seller_id_fkey (
          id,
          nickname,
          avatar_url,
          temperature,
          activity_location,
          is_verified
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] 상품 목록 조회 실패:", error);
      throw error;
    }

    // 비정상적인 연속 중복 등록 데이터 필터링 (동일 판매자/제목/가격이 5초 이내에 등록된 경우 1건만 유지)
    const uniqueRows = [];
    for (const row of data || []) {
      const isDuplicate = uniqueRows.some((existing) => {
        const sameSeller = existing.seller_id === row.seller_id;
        const sameTitle = existing.title === row.title;
        const samePrice = existing.price === row.price;
        const timeDiff = Math.abs(new Date(existing.created_at) - new Date(row.created_at));
        return sameSeller && sameTitle && samePrice && timeDiff < 5000;
      });
      if (!isDuplicate) {
        uniqueRows.push(row);
      }
    }

    return uniqueRows.map(transformProductRow);
  } catch (err) {
    console.error("[Supabase] fetchProducts 예외:", err);
    throw err;
  }
}

/**
 * 새 상품 등록하기 (로그인된 사용자의 ID를 작성자 seller_id로 저장)
 */
export async function createProduct(input) {
  try {
    // 1. 현재 로그인된 사용자 확인
    let currentUserId = null;
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await ensureUserProfile(currentUser);
      currentUserId = currentUser.id;
    } else {
      currentUserId = await getOrCreateCurrentUserId();
    }

    const insertPayload = {
      seller_id: currentUserId,
      title: input.title,
      category: input.category,
      price: input.price || 0,
      location: input.location,
      status: input.status || "selling",
      image_url: input.image || input.image_url,
      description: input.description,
      likes_count: 0,
      chats_count: 0
    };

    const { data, error } = await supabase
      .from("products")
      .insert(insertPayload)
      .select(`
        id,
        seller_id,
        title,
        category,
        price,
        location,
        status,
        image_url,
        description,
        likes_count,
        chats_count,
        created_at,
        updated_at,
        seller:profiles!products_seller_id_fkey (
          id,
          nickname,
          avatar_url,
          temperature,
          activity_location,
          is_verified
        )
      `)
      .single();

    if (error) {
      console.error("[Supabase] 상품 등록 실패:", error);
      throw error;
    }

    return transformProductRow(data);
  } catch (err) {
    console.error("[Supabase] createProduct 예외:", err);
    throw err;
  }
}

/**
 * 현재 접속 중인 사용자가 해당 상품의 작성자(판매자)인지 확인
 * @param {Object} product
 * @returns {Promise<boolean>}
 */
export async function isCurrentUserAuthor(product) {
  if (!product) return false;
  const sellerId = product.seller_id || product.sellerId || product.seller?.id;
  if (!sellerId) return false;

  try {
    // 1. Supabase Auth 현재 로그인 유저와 비교
    const currentUser = await getCurrentUser();
    if (currentUser && String(currentUser.id) === String(sellerId)) {
      return true;
    }

    // 2. 비로그인 익명 유저 고유 ID와 비교 (글 작성 시 익명으로 등록된 경우)
    const localUserId = localStorage.getItem(LOCAL_USER_ID_KEY);
    if (localUserId && String(localUserId) === String(sellerId)) {
      return true;
    }
  } catch (err) {
    console.warn("[Supabase] isCurrentUserAuthor 확인 실패:", err);
  }

  return false;
}

/**
 * 상품 판매 상태 변경 (selling, reserved, completed)
 * @param {number|string} productId
 * @param {'selling'|'reserved'|'completed'} newStatus
 * @returns {Promise<Object>}
 */
export async function updateProductStatus(productId, newStatus) {
  try {
    const { data, error } = await supabase
      .from("products")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId)
      .select(`
        id,
        seller_id,
        title,
        category,
        price,
        location,
        status,
        image_url,
        description,
        likes_count,
        chats_count,
        created_at,
        updated_at,
        seller:profiles!products_seller_id_fkey (
          id,
          nickname,
          avatar_url,
          temperature,
          activity_location,
          is_verified
        )
      `)
      .single();

    if (error) {
      console.error("[Supabase] 상태 업데이트 실패:", error);
      throw error;
    }

    return transformProductRow(data);
  } catch (err) {
    console.error("[Supabase] updateProductStatus 예외:", err);
    throw err;
  }
}

/**
 * 상품 전체 정보 수정 (작성자 수정)
 * @param {number|string} productId
 * @param {Object} input
 * @returns {Promise<Object>}
 */
export async function updateProduct(productId, input) {
  try {
    const updatePayload = {
      title: input.title,
      category: input.category,
      price: input.price || 0,
      location: input.location,
      status: input.status || "selling",
      image_url: input.image || input.image_url,
      description: input.description,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", productId)
      .select(`
        id,
        seller_id,
        title,
        category,
        price,
        location,
        status,
        image_url,
        description,
        likes_count,
        chats_count,
        created_at,
        updated_at,
        seller:profiles!products_seller_id_fkey (
          id,
          nickname,
          avatar_url,
          temperature,
          activity_location,
          is_verified
        )
      `)
      .single();

    if (error) {
      console.error("[Supabase] 상품 정보 수정 실패:", error);
      throw error;
    }

    return transformProductRow(data);
  } catch (err) {
    console.error("[Supabase] updateProduct 예외:", err);
    throw err;
  }
}

/**
 * 상품 삭제
 * @param {number|string} productId
 * @returns {Promise<boolean>}
 */
export async function deleteProduct(productId) {
  try {
    // 좋아요 테이블 참조 먼저 정리
    try {
      await supabase.from("product_likes").delete().eq("product_id", productId);
    } catch (likeErr) {
      console.warn("[Supabase] 좋아요 정리 실패 (계속 진행):", likeErr);
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("[Supabase] 상품 삭제 실패:", error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error("[Supabase] deleteProduct 예외:", err);
    throw err;
  }
}

/**
 * 특정 상품의 찜(관심) 토글
 */
export async function toggleProductLike(productId, isLiked) {
  try {
    const userId = await getOrCreateCurrentUserId();

    if (isLiked) {
      // 찜 추가
      await supabase
        .from("product_likes")
        .upsert({ product_id: productId, user_id: userId }, { onConflict: "product_id,user_id" });

      // likes_count 1 증가
      const { data: prod } = await supabase
        .from("products")
        .select("likes_count")
        .eq("id", productId)
        .single();

      const newCount = (prod?.likes_count || 0) + 1;
      await supabase.from("products").update({ likes_count: newCount }).eq("id", productId);
      return newCount;
    } else {
      // 찜 삭제
      await supabase
        .from("product_likes")
        .delete()
        .eq("product_id", productId)
        .eq("user_id", userId);

      // likes_count 1 감소
      const { data: prod } = await supabase
        .from("products")
        .select("likes_count")
        .eq("id", productId)
        .single();

      const newCount = Math.max(0, (prod?.likes_count || 1) - 1);
      await supabase.from("products").update({ likes_count: newCount }).eq("id", productId);
      return newCount;
    }
  } catch (err) {
    console.error("[Supabase] toggleProductLike 오류:", err);
    return null;
  }
}

/**
 * 현재 사용자가 특정 상품을 찜했는지 여부 확인
 */
export async function checkProductLiked(productId) {
  try {
    const userId = await getOrCreateCurrentUserId();
    const { data } = await supabase
      .from("product_likes")
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", userId)
      .maybeSingle();

    return !!data;
  } catch (err) {
    console.error("[Supabase] checkProductLiked 오류:", err);
    return false;
  }
}

/**
 * 실시간 변경 구독 (Supabase Realtime)
 * @param {Function|Object} callbacks - 콜백 함수 또는 { onInsert, onUpdate, onDelete }
 */
export function subscribeToProductChanges(callbacks) {
  const onInsert = typeof callbacks === "function" ? callbacks : callbacks?.onInsert;
  const onUpdate = typeof callbacks === "object" ? callbacks?.onUpdate : null;
  const onDelete = typeof callbacks === "object" ? callbacks?.onDelete : null;

  const channel = supabase
    .channel("public:products")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "products" },
      async (payload) => {
        console.log("[Supabase Realtime] 새 상품 감지:", payload.new);
        const { data } = await supabase
          .from("products")
          .select(`
            *,
            seller:profiles!products_seller_id_fkey (*)
          `)
          .eq("id", payload.new.id)
          .single();

        if (data && typeof onInsert === "function") {
          onInsert(transformProductRow(data));
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "products" },
      async (payload) => {
        console.log("[Supabase Realtime] 상품 수정 감지:", payload.new);
        const { data } = await supabase
          .from("products")
          .select(`
            *,
            seller:profiles!products_seller_id_fkey (*)
          `)
          .eq("id", payload.new.id)
          .single();

        if (data && typeof onUpdate === "function") {
          onUpdate(transformProductRow(data));
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "products" },
      (payload) => {
        console.log("[Supabase Realtime] 상품 삭제 감지:", payload.old);
        if (payload?.old?.id && typeof onDelete === "function") {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe();

  return channel;
}
