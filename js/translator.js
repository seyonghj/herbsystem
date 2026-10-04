// ============================================================
//  translator.js — Full Page Translator (including dynamic content)
//  Uses Google Translate widget — free, no API key, no limit.
//
//  HOW TO ADD TO ANY PAGE:
//    <script type="module" src="./js/translator.js"></script>
//
//  WHAT THIS FIXES vs the basic version:
//    Herb procedures, preparation text, and any content loaded
//    from Firestore AFTER page load is also translated by watching
//    the DOM for changes and re-triggering translation.
// ============================================================

// ── Load Google Translate script once ────────────────────
function loadGoogleTranslate() {
  if (document.getElementById('gt-script')) return;

  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        includedLanguages: 'en,tl,ceb',
        autoDisplay: false,
      },
      'gt-container'
    );
  };

  const script   = document.createElement('script');
  script.id      = 'gt-script';
  script.src     = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async   = true;
  document.head.appendChild(script);
}

// ── Inject styles ─────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('tl-styles')) return;
  const style = document.createElement('style');
  style.id = 'tl-styles';
  style.textContent = `
    .goog-te-banner-frame { display: none !important; }
    body { top: 0 !important; }
    .skiptranslate { display: none !important; }

    #tl-fab {
      position: fixed; bottom: 9.5rem; right: 1.5rem; z-index: 400;
      display: flex; align-items: center; gap: 7px;
      background: #fff; border: 1.5px solid #dde5e0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      border-radius: 99px; padding: 10px 16px 10px 12px;
      font-size: 13px; font-weight: 600; color: #0a4a35;
      cursor: pointer; font-family: 'DM Sans', sans-serif;
      transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
      white-space: nowrap;
    }
    #tl-fab:hover { background: #f0faf5; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.14); }
    #tl-fab .tl-globe { font-size: 18px; }
    #tl-fab.translated { background: #0a4a35; color: #fff; border-color: #0a4a35; }
    #tl-fab.translated:hover { background: #1a7a55; }

    #tl-panel {
      position: fixed; bottom: 13rem; right: 1.5rem; z-index: 401;
      background: #fff; border: 1px solid #dde5e0;
      border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.14);
      padding: 12px; min-width: 210px;
      display: none; flex-direction: column; gap: 6px;
      animation: tlPop 0.2s cubic-bezier(0.34,1.56,0.64,1);
      font-family: 'DM Sans', sans-serif;
    }
    #tl-panel.open { display: flex; }
    @keyframes tlPop {
      from { opacity:0; transform:scale(0.92) translateY(8px); }
      to   { opacity:1; transform:scale(1)    translateY(0);   }
    }

    .tl-panel-label {
      font-size: 10px; font-weight: 700; color: #8c96a0;
      text-transform: uppercase; letter-spacing: 0.08em;
      padding: 0 4px; margin-bottom: 2px;
    }
    .tl-lang-opt {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 10px; cursor: pointer;
      transition: background 0.12s; border: none; background: none;
      width: 100%; text-align: left; font-family: 'DM Sans', sans-serif;
    }
    .tl-lang-opt:hover { background: #f0faf5; }
    .tl-lang-opt.active { background: #0a4a35; }
    .tl-lang-opt.active .tl-lang-name { color: #fff; }
    .tl-lang-opt.active .tl-lang-sub  { color: rgba(255,255,255,0.6); }
    .tl-lang-flag { font-size: 20px; flex-shrink: 0; }
    .tl-lang-name { font-size: 13px; font-weight: 600; color: #0a4a35; display: block; }
    .tl-lang-sub  { font-size: 11px; color: #8c96a0; display: block; margin-top: 1px; }
    .tl-divider   { height: 1px; background: #dde5e0; margin: 2px 0; }

    /* "Translating…" indicator */
    #tl-loading {
      position: fixed; bottom: 9.5rem; right: 1.5rem; z-index: 402;
      background: #0a4a35; color: #fff;
      border-radius: 99px; padding: 8px 16px;
      font-size: 12px; font-weight: 600; font-family: 'DM Sans', sans-serif;
      display: none; align-items: center; gap: 7px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    #tl-loading.show { display: flex; }
    .tl-spinner {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      animation: tlSpin 0.7s linear infinite;
    }
    @keyframes tlSpin { to { transform: rotate(360deg); } }

    #gt-container { display: none; }

    @media (max-width: 640px) {
      #tl-fab    { bottom: 8.5rem; right: 1rem; padding: 9px 14px 9px 11px; }
      #tl-panel  { bottom: 12rem;  right: 1rem; min-width: 185px; }
      #tl-loading{ bottom: 8.5rem; right: 1rem; }
    }
  `;
  document.head.appendChild(style);
}

// ── Inject HTML ───────────────────────────────────────────
function injectHTML() {
  if (document.getElementById('tl-fab')) return;

  // Hidden Google Translate mount point
  const gtDiv = document.createElement('div');
  gtDiv.id = 'gt-container';
  document.body.appendChild(gtDiv);

  // Loading indicator
  const loading = document.createElement('div');
  loading.id = 'tl-loading';
  loading.innerHTML = `<div class="tl-spinner"></div> Translating…`;
  document.body.appendChild(loading);

  // FAB
  const fab = document.createElement('button');
  fab.id = 'tl-fab';
  fab.innerHTML = `<span class="tl-globe">🌐</span> Translate`;
  fab.onclick = togglePanel;
  document.body.appendChild(fab);

  // Panel
  const panel = document.createElement('div');
  panel.id = 'tl-panel';
  panel.innerHTML = `
    <div class="tl-panel-label">Choose language</div>
    <button class="tl-lang-opt active" id="tl-opt-en" onclick="window._tlSetLang('en','English')">
      <span class="tl-lang-flag">🇺🇸</span>
      <span>
        <span class="tl-lang-name">English</span>
        <span class="tl-lang-sub">Original</span>
      </span>
    </button>
    <div class="tl-divider"></div>
    <button class="tl-lang-opt" id="tl-opt-tl" onclick="window._tlSetLang('tl','Tagalog')">
      <span class="tl-lang-flag">🇵🇭</span>
      <span>
        <span class="tl-lang-name">Tagalog</span>
        <span class="tl-lang-sub">Filipino</span>
      </span>
    </button>
    <button class="tl-lang-opt" id="tl-opt-ceb" onclick="window._tlSetLang('ceb','Hiligaynon')">
      <span class="tl-lang-flag">🇵🇭</span>
      <span>
        <span class="tl-lang-name">Hiligaynon</span>
        <span class="tl-lang-sub">via Cebuano (closest available)</span>
      </span>
    </button>`;
  document.body.appendChild(panel);

  // Close panel when clicking outside
  document.addEventListener('click', e => {
    const panel = document.getElementById('tl-panel');
    const fab   = document.getElementById('tl-fab');
    if (panel?.classList.contains('open') &&
        !panel.contains(e.target) &&
        !fab?.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
}

// ── Toggle panel ──────────────────────────────────────────
function togglePanel() {
  document.getElementById('tl-panel')?.classList.toggle('open');
}

// ── State ─────────────────────────────────────────────────
let currentLang   = 'en';
let domObserver   = null;
let retranslateTimer = null;

// ── Set language ──────────────────────────────────────────
window._tlSetLang = function(langCode, langName) {
  currentLang = langCode;

  // Update active button
  ['en','tl','ceb'].forEach(code => {
    document.getElementById(`tl-opt-${code}`)?.classList.remove('active');
  });
  document.getElementById(`tl-opt-${langCode}`)?.classList.add('active');

  // Update FAB
  const fab = document.getElementById('tl-fab');
  if (langCode === 'en') {
    fab.classList.remove('translated');
    fab.innerHTML = `<span class="tl-globe">🌐</span> Translate`;
  } else {
    fab.classList.add('translated');
    fab.innerHTML = `<span class="tl-globe">🌐</span> ${langName}`;
  }

  document.getElementById('tl-panel')?.classList.remove('open');
  applyTranslation(langCode);
};

// ── Restore original English text ────────────────────────
// Google Translate stores the original text in the page and provides
// a "Show original" mechanism. We trigger it directly instead of
// "translating to English" which produces awkward machine-translated
// English from whatever language was active.
function restoreOriginal() {
  // Method 1: click Google's injected restore link/button
  const candidates = [
    ...document.querySelectorAll('a, span, div, button'),
  ].filter(el => {
    const t = el.textContent.trim();
    return t === 'Show original' || t === 'Restore' || t === 'Original';
  });

  if (candidates.length) {
    candidates[0].click();
    return true;
  }

  // Method 2: use the cookie approach — remove the translation cookie
  // and reload the page back to English
  const cookies = document.cookie.split(';');
  const hasCookie = cookies.some(c => c.trim().startsWith('googtrans='));
  if (hasCookie) {
    // Clear the googtrans cookie for both the current path and root
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname;
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
    location.reload();
    return true;
  }

  return false;
}

// ── Apply translation ─────────────────────────────────────
function applyTranslation(langCode, silent = false) {
  if (!silent && langCode !== 'en') {
    document.getElementById('tl-loading')?.classList.add('show');
  }

  const tryApply = (attempts = 0) => {
    const select = document.querySelector('.goog-te-combo');
    if (!select) {
      if (attempts < 30) setTimeout(() => tryApply(attempts + 1), 200);
      else document.getElementById('tl-loading')?.classList.remove('show');
      return;
    }

    if (langCode === 'en') {
      // Restore to original English — use Google's restore mechanism
      // instead of "translating to English" which gives awkward results
      const restored = restoreOriginal();
      if (!restored) {
        // Fallback: set combo to English then trigger restore link
        select.value = 'en';
        select.dispatchEvent(new Event('change'));
        setTimeout(() => {
          const link = [...document.querySelectorAll('a,span')]
            .find(el => el.textContent.trim() === 'Show original');
          if (link) link.click();
        }, 500);
      }
    } else {
      select.value = langCode;
      select.dispatchEvent(new Event('change'));
    }

    // Hide loading after a moment
    setTimeout(() => {
      document.getElementById('tl-loading')?.classList.remove('show');
    }, 1500);
  };

  tryApply();
}

// ── Watch DOM for dynamically loaded content ──────────────
// This is the key fix — when Firestore loads herb procedures,
// preparation text, or any other content AFTER page load,
// we detect the DOM change and re-trigger translation.
function startDomObserver() {
  if (domObserver) return;

  domObserver = new MutationObserver((mutations) => {
    // Only re-translate if we're not on English
    if (currentLang === 'en') return;

    // Check if any meaningful text content was added
    const hasNewText = mutations.some(m =>
      Array.from(m.addedNodes).some(node => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 10;
        if (node.nodeType === Node.ELEMENT_NODE) return node.textContent.trim().length > 10;
        return false;
      })
    );

    if (!hasNewText) return;

    // Debounce — wait 600ms after last DOM change before re-translating
    // so we don't fire dozens of times for a single Firestore load
    clearTimeout(retranslateTimer);
    retranslateTimer = setTimeout(() => {
      applyTranslation(currentLang, true);  // silent = no loading spinner
    }, 600);
  });

  // Watch the entire document body for any added nodes
  domObserver.observe(document.body, {
    childList:  true,
    subtree:    true,
    // Don't watch attribute/text changes — only new elements being added
  });
}

// ── Init ──────────────────────────────────────────────────
injectStyles();
injectHTML();
loadGoogleTranslate();
startDomObserver();