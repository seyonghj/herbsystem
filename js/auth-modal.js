// ============================================================
//  auth-modal.js — Reusable Login/Signup Modal
//  Usage: import and call showAuthModal() from any page
// ============================================================

import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from "./auth.js";

// Inline SVGs so the eye icon works even on pages that haven't loaded the
// Tabler icon webfont (this modal gets injected into any page that imports
// it, so it can't assume that CSS is present).
const EYE_OPEN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// ── Inject modal HTML + styles once ──
function injectModal() {
  if (document.getElementById("authModal")) return;

  const style = document.createElement("style");
  style.textContent = `
    .auth-overlay {
      display: flex; position: fixed; inset: 0;
      background: rgba(0,0,0,0.45); z-index: 1000;
      align-items: center; justify-content: center;
      padding: 1rem; font-family: 'DM Sans', sans-serif;
      opacity: 0; pointer-events: none;
      transition: opacity 0.12s ease;
    }
    .auth-overlay.open { opacity: 1; pointer-events: auto; }
    .auth-box {
      background: #fff; border-radius: 20px;
      width: 100%; max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      overflow: hidden;
      transform: translateY(8px) scale(0.98); opacity: 0;
      transition: transform 0.15s cubic-bezier(0.2,0,0.2,1), opacity 0.15s ease;
    }
    .auth-overlay.open .auth-box { transform: translateY(0) scale(1); opacity: 1; }
    .auth-header {
      background: #0a4a35; padding: 1.5rem 1.5rem 1.25rem;
      text-align: center;
    }
    .auth-header-icon { font-size: 36px; margin-bottom: 6px; }
    .auth-header h2 {
      font-size: 1.25rem; font-weight: 700; color: #fff;
      font-family: 'Playfair Display', serif; margin-bottom: 4px;
    }
    .auth-header p { font-size: 13px; color: rgba(255,255,255,0.6); }
    .auth-body { padding: 1.5rem; }
    .auth-tabs {
      display: flex; gap: 0; margin-bottom: 1.25rem;
      background: #f0faf5; border-radius: 10px; padding: 3px;
    }
    .auth-tab {
      flex: 1; padding: 8px; border: none; background: none;
      border-radius: 8px; font-size: 13px; font-weight: 500;
      cursor: pointer; color: #5a6472; font-family: 'DM Sans', sans-serif;
      transition: all 0.15s;
    }
    .auth-tab.active { background: #fff; color: #0a4a35; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .auth-form { display: flex; flex-direction: column; gap: 12px; }
    .auth-form-group { display: flex; flex-direction: column; gap: 5px; }
    .auth-form-group label { font-size: 12px; font-weight: 600; color: #5a6472; text-transform: uppercase; letter-spacing: 0.05em; }
    .auth-input {
      padding: 10px 13px; border: 1px solid #dde5e0; border-radius: 10px;
      font-size: 14px; font-family: 'DM Sans', sans-serif;
      color: #1a1a1a; transition: border 0.15s, box-shadow 0.15s;
      width: 100%; box-sizing: border-box;
    }
    .auth-input:focus { outline: none; border-color: #22a06b; box-shadow: 0 0 0 3px rgba(34,160,107,0.12); }
    .auth-password-wrap { position: relative; }
    .auth-password-wrap .auth-input { padding-right: 42px; }
    .auth-toggle-pw {
      position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
      width: 30px; height: 30px; background: none; border: none; cursor: pointer;
      color: #8c96a0; display: flex; align-items: center; justify-content: center;
      border-radius: 6px; transition: color 0.15s, background 0.15s; padding: 0;
    }
    .auth-toggle-pw:hover { color: #22a06b; background: #f0faf5; }
    .auth-toggle-pw svg { display: block; }
    .auth-btn-primary {
      padding: 11px; background: #22a06b; color: #fff; border: none;
      border-radius: 10px; font-size: 14px; font-weight: 600;
      font-family: 'DM Sans', sans-serif; cursor: pointer;
      transition: background 0.15s; margin-top: 4px;
    }
    .auth-btn-primary:hover { background: #1a7a55; }
    .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-divider {
      display: flex; align-items: center; gap: 10px;
      font-size: 12px; color: #8c96a0; margin: 4px 0;
    }
    .auth-divider::before, .auth-divider::after {
      content: ''; flex: 1; height: 1px; background: #dde5e0;
    }
    .auth-btn-google {
      padding: 10px; background: #fff; color: #1a1a1a;
      border: 1.5px solid #dde5e0; border-radius: 10px;
      font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif;
      cursor: pointer; transition: background 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .auth-btn-google:hover { background: #f0faf5; border-color: #22a06b; }
    .auth-btn-google img { width: 18px; height: 18px; }
    .auth-error {
      background: #fee2e2; color: #991b1b; border-radius: 8px;
      padding: 9px 12px; font-size: 13px; display: none;
    }
    .auth-error.show { display: block; }
    .auth-success {
      background: #d1fae5; color: #065f46; border-radius: 8px;
      padding: 9px 12px; font-size: 13px; display: none;
    }
    .auth-success.show { display: block; }
    .auth-forgot {
      text-align: right; font-size: 12px; color: #22a06b;
      cursor: pointer; text-decoration: underline; background: none;
      border: none; font-family: 'DM Sans', sans-serif;
    }
    .auth-close {
      position: absolute; top: 12px; right: 14px;
      background: rgba(255,255,255,0.15); border: none;
      color: #fff; width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 18px;
    }
    .auth-close:hover { background: rgba(255,255,255,0.25); }
    .auth-guest-note {
      text-align: center; font-size: 12px; color: #8c96a0;
      margin-top: 12px; padding-top: 12px; border-top: 1px solid #dde5e0;
    }
    .auth-guest-note a { color: #22a06b; cursor: pointer; text-decoration: underline; }
  `;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.id = "authModal";
  modal.className = "auth-overlay";
  modal.innerHTML = `
    <div class="auth-box" role="dialog" aria-modal="true">
      <div class="auth-header" style="position:relative">
        <button class="auth-close" onclick="window._closeAuthModal()" aria-label="Close">✕</button>
        <div class="auth-header-icon">🌿</div>
        <h2>HerbID Iloilo</h2>
        <p id="authSubtitle">Sign in to save your scan history</p>
      </div>
      <div class="auth-body">
        <div class="auth-tabs">
          <button class="auth-tab active" onclick="window._authTab('login')"  id="tabLogin">Sign in</button>
          <button class="auth-tab"        onclick="window._authTab('signup')" id="tabSignup">Sign up</button>
        </div>

        <div id="authError"   class="auth-error"></div>
        <div id="authSuccess" class="auth-success"></div>

        <!-- LOGIN FORM -->
        <div id="formLogin" class="auth-form">
          <div class="auth-form-group">
            <label>Email</label>
            <input class="auth-input" type="email" id="loginEmail" placeholder="your@email.com" />
          </div>
          <div class="auth-form-group">
            <label>Password</label>
            <div class="auth-password-wrap">
              <input class="auth-input" type="password" id="loginPassword" placeholder="••••••••" />
              <button type="button" class="auth-toggle-pw" id="loginPasswordToggle"
                onclick="window._toggleAuthPw('loginPassword','loginPasswordToggle')"
                aria-label="Show password" title="Show password">${EYE_OPEN_SVG}</button>
            </div>
            <button class="auth-forgot" onclick="window._authForgot()">Forgot password?</button>
          </div>
          <button class="auth-btn-primary" id="loginBtn" onclick="window._doLogin()">Sign in</button>
          <div class="auth-divider">or</div>
          <button class="auth-btn-google" onclick="window._doGoogle()">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Continue with Google
          </button>
        </div>

        <!-- SIGNUP FORM -->
        <div id="formSignup" class="auth-form" style="display:none">
          <div class="auth-form-group">
            <label>Full name</label>
            <input class="auth-input" type="text" id="signupName" placeholder="Juan dela Cruz" />
          </div>
          <div class="auth-form-group">
            <label>Email</label>
            <input class="auth-input" type="email" id="signupEmail" placeholder="your@email.com" />
          </div>
          <div class="auth-form-group">
            <label>Password <span style="font-weight:400;text-transform:none;letter-spacing:0">(min 6 characters)</span></label>
            <div class="auth-password-wrap">
              <input class="auth-input" type="password" id="signupPassword" placeholder="••••••••" />
              <button type="button" class="auth-toggle-pw" id="signupPasswordToggle"
                onclick="window._toggleAuthPw('signupPassword','signupPasswordToggle')"
                aria-label="Show password" title="Show password">${EYE_OPEN_SVG}</button>
            </div>
          </div>
          <button class="auth-btn-primary" id="signupBtn" onclick="window._doSignup()">Create account</button>
          <div class="auth-divider">or</div>
          <button class="auth-btn-google" onclick="window._doGoogle()">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Continue with Google
          </button>
        </div>

        <p class="auth-guest-note">
          You can <a onclick="window._closeAuthModal()">continue as guest</a> —
          sign up only needed to save scan history.
        </p>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) window._closeAuthModal(); });
}

// ── Show/hide password toggle ──
// Swaps the input's type between "password" and "text" and updates the
// icon/aria-label/title to match, so screen readers and hover tooltips
// always reflect the current state, not just the visual icon.
window._toggleAuthPw = function(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (!input || !btn) return;
  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  btn.innerHTML = willShow ? EYE_OFF_SVG : EYE_OPEN_SVG;
  const label = willShow ? "Hide password" : "Show password";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
};

// ── Tab switch ──
window._authTab = function(tab) {
  document.getElementById("formLogin").style.display  = tab === "login"  ? "flex" : "none";
  document.getElementById("formSignup").style.display = tab === "signup" ? "flex" : "none";
  document.getElementById("tabLogin").classList.toggle("active",  tab === "login");
  document.getElementById("tabSignup").classList.toggle("active", tab === "signup");
  clearMessages();
};

function clearMessages() {
  const err = document.getElementById("authError");
  const suc = document.getElementById("authSuccess");
  if (err) { err.classList.remove("show"); err.textContent = ""; }
  if (suc) { suc.classList.remove("show"); suc.textContent = ""; }
}

function showError(msg) {
  const el = document.getElementById("authError");
  el.textContent = msg; el.classList.add("show");
  document.getElementById("authSuccess").classList.remove("show");
}

function showSuccess(msg) {
  const el = document.getElementById("authSuccess");
  el.textContent = msg; el.classList.add("show");
  document.getElementById("authError").classList.remove("show");
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled     = loading;
  btn.textContent  = loading ? "Please wait…" : (btnId === "loginBtn" ? "Sign in" : "Create account");
}

// ── Login ──
window._doLogin = async function() {
  clearMessages();
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) { showError("Please fill in all fields."); return; }

  setLoading("loginBtn", true);
  try {
    await signInWithEmail(email, password);
    window._closeAuthModal();
    window._onAuthSuccess?.();
  } catch(e) {
    showError(friendlyError(e.code));
  }
  setLoading("loginBtn", false);
};

// ── Sign up ──
window._doSignup = async function() {
  clearMessages();
  const name     = document.getElementById("signupName").value.trim();
  const email    = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  if (!name || !email || !password) { showError("Please fill in all fields."); return; }
  if (password.length < 6)          { showError("Password must be at least 6 characters."); return; }

  setLoading("signupBtn", true);
  try {
    await signUpWithEmail(name, email, password);
    window._closeAuthModal();
    window._onAuthSuccess?.();
  } catch(e) {
    showError(friendlyError(e.code));
  }
  setLoading("signupBtn", false);
};

// ── Google ──
window._doGoogle = async function() {
  clearMessages();
  try {
    await signInWithGoogle();
    window._closeAuthModal();
    window._onAuthSuccess?.();
  } catch(e) {
    if (e.code !== "auth/popup-closed-by-user") {
      showError(friendlyError(e.code));
    }
  }
};

// ── Forgot password ──
window._authForgot = async function() {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) { showError("Enter your email first, then click Forgot password."); return; }
  try {
    await resetPassword(email);
    showSuccess(`Password reset email sent to ${email}`);
  } catch(e) {
    showError(friendlyError(e.code));
  }
};

// ── Open / close ──
window._closeAuthModal = function() {
  document.getElementById("authModal")?.classList.remove("open");
};

export function showAuthModal(subtitle, onSuccess, defaultTab = "login") {
  injectModal();
  if (subtitle) document.getElementById("authSubtitle").textContent = subtitle;
  window._onAuthSuccess = onSuccess || null;
  clearMessages();
  window._authTab(defaultTab);
  document.getElementById("authModal").classList.add("open");
}

// ── Friendly Firebase error messages ──
function friendlyError(code) {
  const map = {
    "auth/user-not-found":       "No account found with this email.",
    "auth/wrong-password":       "Incorrect password. Try again.",
    "auth/email-already-in-use": "This email is already registered. Try signing in.",
    "auth/weak-password":        "Password must be at least 6 characters.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/too-many-requests":    "Too many failed attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-blocked":        "Popup was blocked. Allow popups for this site.",
  };
  return map[code] || "Something went wrong. Please try again.";
}