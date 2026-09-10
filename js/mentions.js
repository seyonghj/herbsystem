// ============================================================
//  mentions.js
//  Handles @mention autocomplete in comment/reply inputs.
//
//  Usage:
//    import { initMentions, parseMentions } from './js/mentions.js';
//
//    // Attach to an input element
//    initMentions(inputEl, userCache, onMention);
//
//    // Parse @mentions out of a submitted string
//    const { html, mentionedUids } = parseMentions(text, userCache);
// ============================================================

// ── User cache ────────────────────────────────────────────
// Populated once at app start from Firestore /users collection.
// Structure: Map<uid, { uid, displayName, photoURL }>

// ── Init mention autocomplete on an input ────────────────
// inputEl   — the <input> or <textarea> element
// userCache — Map<uid, userObj> of all registered users
// onSelect  — called with the selected user object when a mention is chosen
//
// Returns a cleanup function to remove event listeners.

export function initMentions(inputEl, userCache, onSelect) {
  let dropdown = null;
  let mentionStart = -1;

  function removeDropdown() {
    dropdown?.remove();
    dropdown    = null;
    mentionStart = -1;
  }

  function buildDropdown(matches, cursorPos) {
    removeDropdown();
    if (!matches.length) return;

    dropdown = document.createElement('div');
    dropdown.className = 'mention-dropdown';
    dropdown.style.cssText = `
      position: absolute; z-index: 9999;
      background: #fff; border: 1px solid #dde5e0; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.14); min-width: 200px;
      max-height: 200px; overflow-y: auto;
      font-family: 'DM Sans', sans-serif;
    `;

    matches.slice(0, 6).forEach(user => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex; align-items: center; gap: 9px;
        padding: 9px 12px; cursor: pointer;
        transition: background 0.12s; font-size: 13px;
      `;
      item.onmouseenter = () => item.style.background = '#f0faf5';
      item.onmouseleave = () => item.style.background = '';

      const av = document.createElement('div');
      av.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
        background: #22a06b; color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 700; overflow: hidden;
      `;
      if (user.photoURL) {
        av.innerHTML = `<img src="${user.photoURL}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        av.textContent = (user.displayName || 'U')[0].toUpperCase();
      }

      const name = document.createElement('span');
      name.style.fontWeight = '600';
      name.style.color      = '#0a4a35';
      name.textContent      = user.displayName;

      item.appendChild(av);
      item.appendChild(name);

      item.onmousedown = e => {
        e.preventDefault();
        insertMention(user);
        if (onSelect) onSelect(user);
      };

      dropdown.appendChild(item);
    });

    // Position below the input
    const rect = inputEl.getBoundingClientRect();
    dropdown.style.top   = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left  = `${rect.left   + window.scrollX}px`;
    dropdown.style.width = `${rect.width}px`;

    document.body.appendChild(dropdown);
  }

  function insertMention(user) {
    const val    = inputEl.value;
    const before = val.slice(0, mentionStart);
    const after  = val.slice(inputEl.selectionStart);
    inputEl.value = `${before}@${user.displayName} ${after}`;
    // Move cursor after the inserted mention
    const pos = (before + '@' + user.displayName + ' ').length;
    inputEl.setSelectionRange(pos, pos);
    removeDropdown();
    inputEl.focus();
  }

  function onInput() {
    const val    = inputEl.value;
    const cursor = inputEl.selectionStart;

    // Find the @ that started the current mention (scanning back from cursor)
    let at = -1;
    for (let i = cursor - 1; i >= 0; i--) {
      if (val[i] === '@') { at = i; break; }
      if (val[i] === ' ' || val[i] === '\n') break;
    }

    if (at === -1) { removeDropdown(); return; }

    const query = val.slice(at + 1, cursor).toLowerCase();
    if (!query) { removeDropdown(); return; }

    mentionStart = at;

    // Search userCache (case-insensitive)
    const matches = [];
    userCache.forEach(user => {
      if ((user.displayName || '').toLowerCase().includes(query)) {
        matches.push(user);
      }
    });

    buildDropdown(matches, cursor);
  }

  function onKeyDown(e) {
    if (!dropdown) return;
    if (e.key === 'Escape') { removeDropdown(); }
  }

  function onBlur() {
    // Small delay so onmousedown on dropdown item fires first
    setTimeout(removeDropdown, 150);
  }

  inputEl.addEventListener('input',   onInput);
  inputEl.addEventListener('keydown', onKeyDown);
  inputEl.addEventListener('blur',    onBlur);

  // Return cleanup
  return function cleanup() {
    inputEl.removeEventListener('input',   onInput);
    inputEl.removeEventListener('keydown', onKeyDown);
    inputEl.removeEventListener('blur',    onBlur);
    removeDropdown();
  };
}

// ── Parse @mentions in submitted text ─────────────────────
// Returns:
//   html         — text with @Name wrapped in <span class="mention">
//   mentionedUids — array of uids that were mentioned
//   mentionedUsers — array of user objects that were mentioned

export function parseMentions(text, userCache) {
  if (!text) return { html: '', mentionedUids: [], mentionedUsers: [] };

  const mentionedUids  = [];
  const mentionedUsers = [];

  // Build a lookup: lowercase displayName → user
  const byName = new Map();
  userCache.forEach(user => {
    if (user.displayName) {
      byName.set(user.displayName.toLowerCase(), user);
    }
  });

  // Replace @Name with highlighted span
  const html = escapeHTML(text).replace(/@([\w\s]{1,30}?)(?=\s|$|<)/g, (match, name) => {
    const user = byName.get(name.trim().toLowerCase());
    if (!user) return match;  // not a registered user — leave as-is
    if (!mentionedUids.includes(user.uid)) {
      mentionedUids.push(user.uid);
      mentionedUsers.push(user);
    }
    return `<span class="mention" style="color:#22a06b;font-weight:600;cursor:default">@${name.trim()}</span>`;
  });

  return { html, mentionedUids, mentionedUsers };
}

function escapeHTML(str) {
  return (str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;').replace(/\n/g,'<br>');
}

// ── Load all registered users into a Map ──────────────────
// Call once at startup. Returns Map<uid, userObj>.
export async function loadUserCache(db) {
  const userCache = new Map();
  try {
    const { getDocs, collection } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach(d => {
      const data = d.data();
      if (data.displayName) {
        userCache.set(d.id, {
          uid:         d.id,
          displayName: data.displayName,
          photoURL:    data.photoURL || null,
          email:       data.email   || null,
        });
      }
    });
  } catch(e) {
    console.warn('loadUserCache failed:', e.message);
  }
  return userCache;
}
