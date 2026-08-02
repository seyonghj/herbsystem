// ============================================================
//  nav-auth.js — My Account button for every page
//  Shows: profile photo + dropdown if logged in
//         Sign Up / Log In buttons if not logged in
//
//  HOW TO USE on any page — add this inside your script tag:
//  <script type="module">
//    import { initNavAuth } from './js/nav-auth.js';
//    initNavAuth();
//  </script>
// ============================================================

import { onAuthChange, logOut } from "./auth.js";
import { showAuthModal }        from "./auth-modal.js";

export function initNavAuth() {

  // ── Inject styles ──
  if (!document.getElementById("navAuthStyles")) {
    const style = document.createElement("style");
    style.id = "navAuthStyles";
    style.textContent = `
      /* ── AUTH SLOT ── */
      .nav-auth-slot {
        display: flex; align-items: center; gap: 8px;
        margin-left: auto; flex-shrink: 0;
      }

      /* ── NOT LOGGED IN: two buttons ── */
      .nav-btn-login {
        padding: 7px 14px;
        background: transparent; color: #1a7a55;
        border: 1.5px solid #22a06b; border-radius: 8px;
        font-size: 13px; font-weight: 500;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer; white-space: nowrap;
        transition: all 0.15s; text-decoration: none;
        display: inline-flex; align-items: center; gap: 5px;
      }
      .nav-btn-login:hover {
        background: #f0faf5;
      }
      .nav-btn-signup {
        padding: 7px 14px;
        background: #22a06b; color: #fff;
        border: 1.5px solid #22a06b; border-radius: 8px;
        font-size: 13px; font-weight: 500;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer; white-space: nowrap;
        transition: background 0.15s; text-decoration: none;
        display: inline-flex; align-items: center; gap: 5px;
      }
      .nav-btn-signup:hover { background: #1a7a55; border-color: #1a7a55; }

      /* ── LOGGED IN: My Account button ── */
      .nav-account-btn {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 12px 4px 4px;
        background: #f0faf5; border: 1.5px solid #d4f0e4;
        border-radius: 99px; cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        position: relative; user-select: none;
      }
      .nav-account-btn:hover {
        background: #d4f0e4; border-color: #22a06b;
      }

      /* Profile photo ring */
      .nav-profile-photo {
        width: 28px; height: 28px; border-radius: 50%;
        overflow: hidden; flex-shrink: 0;
        background: #22a06b;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; color: #fff;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1.5px #22a06b;
      }
      .nav-profile-photo img {
        width: 100%; height: 100%; object-fit: cover;
      }
      .nav-account-label {
        font-size: 13px; font-weight: 500; color: #0a4a35;
        max-width: 110px; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap;
        font-family: 'DM Sans', sans-serif;
      }
      .nav-chevron {
        font-size: 13px; color: #1a7a55;
        transition: transform 0.2s;
      }
      .nav-account-btn.open .nav-chevron {
        transform: rotate(180deg);
      }

      /* ── DROPDOWN ── */
      .nav-account-dropdown {
        display: none;
        position: absolute; top: calc(100% + 10px); right: 0;
        background: #fff; border: 1px solid #dde5e0;
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.13);
        min-width: 220px; z-index: 500;
        overflow: hidden;
        animation: dropdownIn 0.18s ease;
      }
      @keyframes dropdownIn {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .nav-account-dropdown.open { display: block; }

      /* Dropdown profile header */
      .dd-profile {
        display: flex; align-items: center; gap: 11px;
        padding: 14px 16px; border-bottom: 1px solid #f0faf5;
        background: #f8fffe;
      }
      .dd-profile-photo {
        width: 40px; height: 40px; border-radius: 50%;
        overflow: hidden; flex-shrink: 0;
        background: #22a06b; display: flex;
        align-items: center; justify-content: center;
        font-size: 15px; font-weight: 700; color: #fff;
        border: 2px solid #d4f0e4;
      }
      .dd-profile-photo img { width: 100%; height: 100%; object-fit: cover; }
      .dd-profile-info { min-width: 0; }
      .dd-profile-name {
        font-size: 13px; font-weight: 600; color: #0a4a35;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        font-family: 'DM Sans', sans-serif; max-width: 140px;
      }
      .dd-profile-email {
        font-size: 11px; color: #5a6472;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        font-family: 'DM Sans', sans-serif; max-width: 140px;
      }

      /* Dropdown items */
      .dd-item {
        display: flex; align-items: center; gap: 10px;
        padding: 11px 16px; font-size: 13px; color: #1a1a1a;
        cursor: pointer; transition: background 0.12s;
        text-decoration: none; font-family: 'DM Sans', sans-serif;
        border: none; background: none; width: 100%; text-align: left;
      }
      .dd-item:hover { background: #f0faf5; }
      .dd-item i { font-size: 16px; color: #22a06b; flex-shrink: 0; }
      .dd-item-label { flex: 1; }
      .dd-item-sub { font-size: 11px; color: #8c96a0; display: block; }

      .dd-divider { height: 1px; background: #f0faf5; margin: 4px 0; }

      .dd-item.danger { color: #e53e3e; }
      .dd-item.danger i { color: #e53e3e; }
      .dd-item.danger:hover { background: #fff5f5; }

      /* ── MOBILE ── */
      @media (max-width: 640px) {
        .nav-account-label { display: none; }
        .nav-account-btn { padding: 4px 8px 4px 4px; }
        .nav-btn-login { display: none; }
        .nav-btn-signup { padding: 7px 12px; font-size: 12px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Find nav ──
  const nav       = document.querySelector(".nav");
  const hamburger = document.querySelector(".nav-hamburger");
  if (!nav) return;

  // Remove existing slot if any
  document.getElementById("navAuthSlot")?.remove();

  const slot = document.createElement("div");
  slot.className = "nav-auth-slot";
  slot.id        = "navAuthSlot";
  nav.insertBefore(slot, hamburger);

  // ── Auth state listener ──
  onAuthChange(user => {
    if (!user) {
      renderLoggedOut(slot);
    } else {
      renderLoggedIn(slot, user);
    }
  });
}

// ── NOT LOGGED IN ──
function renderLoggedOut(slot) {
  slot.innerHTML = `
    <button class="nav-btn-login" onclick="window._navOpenLogin()">
      <i class="ti ti-login" style="font-size:14px"></i> Log in
    </button>
    <button class="nav-btn-signup" onclick="window._navOpenSignup()">
      <i class="ti ti-user-plus" style="font-size:14px"></i> Sign up
    </button>`;

  window._navOpenLogin  = () => showAuthModal("Log in to your HerbID account", null, "login");
  window._navOpenSignup = () => showAuthModal("Create your free HerbID account", null, "signup");
}

// ── LOGGED IN ──
function renderLoggedIn(slot, user) {
  const initials   = getInitials(user.displayName || user.email || "U");
  const avatarHTML = user.photoURL
    ? `<img src="${user.photoURL}" alt="${user.displayName || 'User'}" referrerpolicy="no-referrer">`
    : initials;
  const displayName = user.displayName || user.email?.split("@")[0] || "My Account";

  slot.innerHTML = `
    <div class="nav-account-btn" id="navAccountBtn" onclick="window._toggleNavDropdown(event)">
      <div class="nav-profile-photo">${avatarHTML}</div>
      <span class="nav-account-label">${displayName}</span>
      <i class="ti ti-chevron-down nav-chevron"></i>

      <div class="nav-account-dropdown" id="navAccountDropdown">
        <!-- Profile header -->
        <div class="dd-profile">
          <div class="dd-profile-photo">${avatarHTML}</div>
          <div class="dd-profile-info">
            <div class="dd-profile-name">${user.displayName || "User"}</div>
            <div class="dd-profile-email">${user.email || ""}</div>
          </div>
        </div>

        <!-- Menu items -->
        <a class="dd-item" href="history.html">
          <i class="ti ti-history"></i>
          <div class="dd-item-label">
            My scan history
            <span class="dd-item-sub">View all past herb scans</span>
          </div>
        </a>
        <a class="dd-item" href="identify.html">
          <i class="ti ti-camera"></i>
          <div class="dd-item-label">
            Identify a herb
            <span class="dd-item-sub">Upload or capture a photo</span>
          </div>
        </a>
        <a class="dd-item" href="herbs.html">
          <i class="ti ti-database"></i>
          <div class="dd-item-label">Herb database</div>
        </a>

        <div class="dd-divider"></div>

        <button class="dd-item danger" onclick="window._navSignOut()">
          <i class="ti ti-logout"></i>
          <div class="dd-item-label">Sign out</div>
        </button>
      </div>
    </div>`;

  // Toggle dropdown
  window._toggleNavDropdown = function(e) {
    e.stopPropagation();
    const btn      = document.getElementById("navAccountBtn");
    const dropdown = document.getElementById("navAccountDropdown");
    const isOpen   = dropdown.classList.toggle("open");
    btn.classList.toggle("open", isOpen);
  };

  // Sign out
  window._navSignOut = async function() {
    await logOut();
    window.location.reload();
  };

  // Close on outside click
  document.addEventListener("click", function handler(e) {
    const btn = document.getElementById("navAccountBtn");
    if (!btn?.contains(e.target)) {
      document.getElementById("navAccountDropdown")?.classList.remove("open");
      document.getElementById("navAccountBtn")?.classList.remove("open");
    }
  }, { passive: true });
}

function getInitials(name) {
  return name.split(/[\s@]+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
