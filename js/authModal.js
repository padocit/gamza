/**
 * ==========================================================================
 * 감자 마켓 - 인증 모달(로그인/회원가입) 모듈 (authModal.js)
 * ==========================================================================
 */

import {
  signUpWithEmail,
  signInWithEmail,
  getCurrentUser,
  getCurrentUserProfile
} from "./supabaseClient.js";

// 모달 전역 상태
let elements = null;
let currentTab = "login"; // 'login' | 'signup'
let pendingSuccessCallback = null;
let authSuccessCallback = null;

/**
 * 간단한 토스트 알림 표시 함수
 */
export function showGamzaToast(message, type = "success") {
  let container = document.getElementById("gamza-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "gamza-toast-container";
    container.className = "gamza-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `gamza-toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === "error" ? "⚠️" : "🥔"}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

/**
 * DOM 엘리먼트 캐싱
 */
function initElements() {
  if (elements) return elements;

  const overlay = document.getElementById("gamzaAuthModal");
  if (!overlay) return null;

  elements = {
    overlay,
    closeBtn: document.getElementById("gamzaAuthCloseBtn"),
    promptBanner: document.getElementById("gamzaAuthPromptBanner"),
    promptBannerText: document.getElementById("gamzaAuthPromptBannerText"),

    // 탭 버튼
    tabLogin: document.getElementById("gamzaAuthTabLogin"),
    tabSignup: document.getElementById("gamzaAuthTabSignup"),

    // 패널
    panelLogin: document.getElementById("gamzaAuthPanelLogin"),
    panelSignup: document.getElementById("gamzaAuthPanelSignup"),

    // 로그인 폼
    formLogin: document.getElementById("gamzaLoginForm"),
    loginEmail: document.getElementById("gamzaLoginEmail"),
    loginPassword: document.getElementById("gamzaLoginPassword"),
    loginError: document.getElementById("gamzaLoginError"),
    loginSubmitBtn: document.getElementById("gamzaLoginSubmitBtn"),
    toSignupLink: document.getElementById("gamzaToSignupLink"),

    // 회원가입 폼
    formSignup: document.getElementById("gamzaSignupForm"),
    signupNickname: document.getElementById("gamzaSignupNickname"),
    signupEmail: document.getElementById("gamzaSignupEmail"),
    signupPassword: document.getElementById("gamzaSignupPassword"),
    signupPasswordConfirm: document.getElementById("gamzaSignupPasswordConfirm"),
    signupError: document.getElementById("gamzaSignupError"),
    signupSubmitBtn: document.getElementById("gamzaSignupSubmitBtn"),
    toLoginLink: document.getElementById("gamzaToLoginLink")
  };

  return elements;
}

/**
 * 탭 전환
 * @param {'login'|'signup'} tab
 */
export function switchAuthTab(tab) {
  const el = initElements();
  if (!el) return;

  currentTab = tab;
  clearErrors();

  if (tab === "signup") {
    el.tabSignup.classList.add("active");
    el.tabLogin.classList.remove("active");
    el.panelSignup.classList.add("active");
    el.panelLogin.classList.remove("active");
    setTimeout(() => el.signupNickname?.focus(), 50);
  } else {
    el.tabLogin.classList.add("active");
    el.tabSignup.classList.remove("active");
    el.panelLogin.classList.add("active");
    el.panelSignup.classList.remove("active");
    setTimeout(() => el.loginEmail?.focus(), 50);
  }
}

/**
 * 에러 문구 초기화
 */
function clearErrors() {
  const el = initElements();
  if (!el) return;

  if (el.loginError) {
    el.loginError.textContent = "";
    el.loginError.classList.remove("visible");
  }
  if (el.signupError) {
    el.signupError.textContent = "";
    el.signupError.classList.remove("visible");
  }
}

/**
 * 한국어 친화적 에러 메시지 변환
 */
function getKoreanErrorMessage(err) {
  const msg = err?.message || String(err || "");

  if (msg.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 일치하지 않습니다.";
  }
  if (msg.includes("User already registered") || msg.includes("already registered")) {
    return "이미 가입된 이메일 주소입니다. 로그인해주세요.";
  }
  if (msg.includes("Password should be at least 6 characters")) {
    return "비밀번호는 최소 6자 이상이어야 합니다.";
  }
  if (msg.includes("Email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.";
  }
  if (msg.includes("invalid email")) {
    return "올바른 이메일 형식을 입력해주세요.";
  }

  return msg || "요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
}

/**
 * 로그인 처리
 */
async function handleLoginSubmit(e) {
  e.preventDefault();
  const el = initElements();
  if (!el) return;

  const email = el.loginEmail.value.trim();
  const password = el.loginPassword.value;

  if (!email) {
    el.loginError.textContent = "이메일을 입력해주세요.";
    el.loginError.classList.add("visible");
    el.loginEmail.focus();
    return;
  }
  if (!password) {
    el.loginError.textContent = "비밀번호를 입력해주세요.";
    el.loginError.classList.add("visible");
    el.loginPassword.focus();
    return;
  }

  clearErrors();
  el.loginSubmitBtn.disabled = true;
  el.loginSubmitBtn.innerHTML = `<span>로그인 중...</span>`;

  try {
    const data = await signInWithEmail(email, password);
    const user = data.user;
    const profile = await getCurrentUserProfile();

    showGamzaToast(`${profile?.nickname || "감자이웃"}님, 반가워요! 🥔`);
    closeAuthModal();

    // 전역 콜백 및 대기 콜백 실행
    if (typeof authSuccessCallback === "function") {
      authSuccessCallback(user, profile);
    }
    if (typeof pendingSuccessCallback === "function") {
      const cb = pendingSuccessCallback;
      pendingSuccessCallback = null;
      cb(user, profile);
    }
  } catch (err) {
    console.error("[Auth] 로그인 에러:", err);
    el.loginError.textContent = getKoreanErrorMessage(err);
    el.loginError.classList.add("visible");
  } finally {
    el.loginSubmitBtn.disabled = false;
    el.loginSubmitBtn.innerHTML = `<span>로그인하기</span>`;
  }
}

/**
 * 회원가입 처리 (닉네임 필수)
 */
async function handleSignupSubmit(e) {
  e.preventDefault();
  const el = initElements();
  if (!el) return;

  const nickname = el.signupNickname.value.trim();
  const email = el.signupEmail.value.trim();
  const password = el.signupPassword.value;
  const passwordConfirm = el.signupPasswordConfirm.value;

  // 유효성 검사 (닉네임 필수!)
  if (!nickname) {
    el.signupError.textContent = "닉네임은 필수입니다. 감자마켓에서 사용할 이름을 적어주세요.";
    el.signupError.classList.add("visible");
    el.signupNickname.focus();
    return;
  }
  if (nickname.length < 2) {
    el.signupError.textContent = "닉네임은 2자 이상이어야 합니다.";
    el.signupError.classList.add("visible");
    el.signupNickname.focus();
    return;
  }
  if (!email || !email.includes("@")) {
    el.signupError.textContent = "올바른 이메일 주소를 입력해주세요.";
    el.signupError.classList.add("visible");
    el.signupEmail.focus();
    return;
  }
  if (!password || password.length < 6) {
    el.signupError.textContent = "비밀번호는 최소 6자 이상이어야 합니다.";
    el.signupError.classList.add("visible");
    el.signupPassword.focus();
    return;
  }
  if (password !== passwordConfirm) {
    el.signupError.textContent = "비밀번호가 서로 일치하지 않습니다.";
    el.signupError.classList.add("visible");
    el.signupPasswordConfirm.focus();
    return;
  }

  clearErrors();
  el.signupSubmitBtn.disabled = true;
  el.signupSubmitBtn.innerHTML = `<span>가입 진행 중...</span>`;

  try {
    const data = await signUpWithEmail(email, password, nickname);
    const user = data.user;
    
    // 자동 세션 확인 및 프로필 로드
    let profile = await getCurrentUserProfile();
    if (!profile) {
      profile = { nickname };
    }

    showGamzaToast(`환영합니다, ${nickname}님! 회원가입이 완료되었습니다 🥔`);
    closeAuthModal();

    // 전역 콜백 및 대기 콜백 실행
    if (typeof authSuccessCallback === "function") {
      authSuccessCallback(user, profile);
    }
    if (typeof pendingSuccessCallback === "function") {
      const cb = pendingSuccessCallback;
      pendingSuccessCallback = null;
      cb(user, profile);
    }
  } catch (err) {
    console.error("[Auth] 회원가입 에러:", err);
    el.signupError.textContent = getKoreanErrorMessage(err);
    el.signupError.classList.add("visible");
  } finally {
    el.signupSubmitBtn.disabled = false;
    el.signupSubmitBtn.innerHTML = `<span>감자 마켓 시작하기</span>`;
  }
}

/**
 * 모달 열기
 * @param {Object} [options]
 * @param {'login'|'signup'} [options.mode='login']
 * @param {string|null} [options.message] 액션 유도 안내 문구 (예: 글쓰기 클릭 시)
 * @param {Function} [options.onSuccess] 로그인/가입 성공 후 실행할 콜백
 */
export function openAuthModal(options = {}) {
  const el = initElements();
  if (!el) {
    console.error("[Auth] gamzaAuthModal 요소를 찾을 수 없습니다.");
    return;
  }

  const { mode = "login", message = null, onSuccess = null } = options;
  pendingSuccessCallback = onSuccess || null;

  // 안내 배너 처리
  if (message) {
    el.promptBannerText.textContent = message;
    el.promptBanner.classList.add("visible");
  } else {
    el.promptBanner.classList.remove("visible");
  }

  // 탭 설정
  switchAuthTab(mode);

  // 모달 표시
  el.overlay.classList.add("is-active");
  el.overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

/**
 * 모달 닫기
 */
export function closeAuthModal() {
  const el = initElements();
  if (!el) return;

  el.overlay.classList.remove("is-active");
  el.overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  // 폼 초기화
  el.formLogin?.reset();
  el.formSignup?.reset();
  clearErrors();
}

/**
 * 이벤트 바인딩 및 초기화
 * @param {Object} options
 * @param {Function} [options.onAuthSuccess] (user, profile) => void
 */
export function initAuthModal(options = {}) {
  authSuccessCallback = options.onAuthSuccess || null;
  const el = initElements();
  if (!el) return;

  // 닫기 버튼
  el.closeBtn?.addEventListener("click", closeAuthModal);

  // 배경 클릭 시 닫기
  el.overlay.addEventListener("click", (e) => {
    if (e.target === el.overlay) {
      closeAuthModal();
    }
  });

  // ESC 키 닫기
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Escape" || e.key === "Esc") && el.overlay.classList.contains("is-active")) {
      closeAuthModal();
    }
  });

  // 탭 전환 이벤트
  el.tabLogin?.addEventListener("click", () => switchAuthTab("login"));
  el.tabSignup?.addEventListener("click", () => switchAuthTab("signup"));
  el.toSignupLink?.addEventListener("click", () => switchAuthTab("signup"));
  el.toLoginLink?.addEventListener("click", () => switchAuthTab("login"));

  // 폼 제출 이벤트
  el.formLogin?.addEventListener("submit", handleLoginSubmit);
  el.formSignup?.addEventListener("submit", handleSignupSubmit);

  // 전역 노출
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.showGamzaToast = showGamzaToast;
}
