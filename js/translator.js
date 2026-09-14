// ============================================================
//  translator.js — English ↔ Hiligaynon / Tagalog
//  Uses the Claude API (via your Railway proxy) to translate.
//  Injects a floating translation button on any page.
//
//  HOW TO ADD TO ANY PAGE:
//    <script type="module" src="./js/translator.js"></script>
//
//  HOW IT WORKS:
//    1. User clicks the 🌐 button (bottom-right, above FAB)
//    2. A panel slides up with language selector + text input
//    3. Sends text to /gemini-verify proxy on Railway which
//       calls Gemini to translate
//    4. Shows result with a copy button
// ============================================================

const RAILWAY_URL = "https://herbid-api-production.up.railway.app";

// ── Inject styles ─────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('translator-styles')) return;
  const style = document.createElement('style');
  style.id = 'translator-styles';
  style.textContent = `
    /* Floating button */
    .tl-fab {
      position: fixed; bottom: 9.5rem; right: 1.5rem; z-index: 300;
      width: 48px; height: 48px; border-radius: 50%;
      background: #fff; border: 1.5px solid #dde5e0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; cursor: pointer; transition: background 0.15s, transform 0.15s;
      color: #0a4a35;
    }
    .tl-fab:hover { background: #f0faf5; transform: scale(1.08); }

    /* Panel */
    .tl-overlay {
      display: none; position: fixed; inset: 0; z-index: 700;
      background: rgba(10,30,20,0.55); backdrop-filter: blur(4px);
      align-items: flex-end; justify-content: center;
    }
    .tl-overlay.open { display: flex; }
    @media (min-width: 600px) { .tl-overlay { align-items: center; } }

    .tl-panel {
      background: #fff; border-radius: 24px 24px 0 0;
      width: 100%; max-width: 560px; padding: 0 0 1.5rem;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.2);
      animation: tlUp 0.28s cubic-bezier(0.34,1.56,0.64,1);
      max-height: 90vh; overflow-y: auto;
      font-family: 'DM Sans', sans-serif;
    }
    @media (min-width: 600px) { .tl-panel { border-radius: 24px; } }
    @keyframes tlUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }

    .tl-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.1rem 1.25rem 0.75rem;
      border-bottom: 1px solid #dde5e0;
      position: sticky; top: 0; background: #fff; z-index: 2;
      border-radius: 24px 24px 0 0;
    }
    .tl-title { font-size: 15px; font-weight: 700; color: #0a4a35; display: flex; align-items: center; gap: 7px; }
    .tl-close {
      width: 30px; height: 30px; border-radius: 50%; border: none;
      background: #f0faf5; color: #5a6472; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    }

    .tl-body { padding: 1.25rem; }

    /* Language tabs */
    .tl-lang-tabs {
      display: flex; gap: 6px; margin-bottom: 1rem;
    }
    .tl-lang-btn {
      flex: 1; padding: 8px; border: 1.5px solid #dde5e0;
      border-radius: 10px; font-size: 13px; font-weight: 500;
      font-family: 'DM Sans', sans-serif; cursor: pointer;
      background: #fff; color: #5a6472;
      transition: all 0.15s; text-align: center;
    }
    .tl-lang-btn.active {
      background: #0a4a35; color: #fff; border-color: #0a4a35;
    }
    .tl-lang-btn:hover:not(.active) { border-color: #22a06b; color: #0a4a35; background: #f0faf5; }

    /* Direction toggle */
    .tl-direction {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #5a6472; margin-bottom: 1rem;
      padding: 8px 12px; background: #f0faf5; border-radius: 10px;
    }
    .tl-direction span { font-weight: 600; color: #0a4a35; }
    .tl-swap-btn {
      margin-left: auto; background: #fff; border: 1px solid #dde5e0;
      border-radius: 8px; padding: 4px 10px; font-size: 12px; font-weight: 500;
      cursor: pointer; color: #0a4a35; font-family: 'DM Sans', sans-serif;
      display: flex; align-items: center; gap: 4px; transition: background 0.15s;
    }
    .tl-swap-btn:hover { background: #d4f0e4; }

    /* Input */
    .tl-input {
      width: 100%; border: 1.5px solid #dde5e0; border-radius: 12px;
      padding: 10px 13px; font-size: 14px; font-family: 'DM Sans', sans-serif;
      resize: none; height: 100px; color: #1a1a1a; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .tl-input:focus { outline: none; border-color: #22a06b; box-shadow: 0 0 0 3px rgba(34,160,107,0.1); }

    .tl-input-hint { font-size: 11px; color: #8c96a0; margin-top: 4px; }

    /* Translate button */
    .tl-btn {
      width: 100%; margin-top: 10px; padding: 11px;
      background: #22a06b; color: #fff; border: none; border-radius: 12px;
      font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif;
      cursor: pointer; transition: background 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .tl-btn:hover:not(:disabled) { background: #1a7a55; }
    .tl-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Result */
    .tl-result {
      display: none; margin-top: 1rem;
      border: 1px solid #d4f0e4; border-radius: 12px;
      background: #f0faf5; overflow: hidden;
    }
    .tl-result.show { display: block; }
    .tl-result-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; border-bottom: 1px solid #d4f0e4;
      font-size: 11px; font-weight: 600; color: #1a7a55;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .tl-copy-btn {
      background: none; border: none; cursor: pointer; color: #22a06b;
      font-size: 12px; font-weight: 500; font-family: 'DM Sans', sans-serif;
      display: flex; align-items: center; gap: 4px; padding: 2px 6px;
      border-radius: 6px; transition: background 0.12s;
    }
    .tl-copy-btn:hover { background: #d4f0e4; }
    .tl-result-text {
      padding: 12px 14px; font-size: 15px; color: #0a4a35;
      line-height: 1.7; white-space: pre-wrap; word-break: break-word;
    }
    .tl-result-note {
      padding: 6px 14px 10px; font-size: 11px; color: #8c96a0;
      border-top: 1px solid #d4f0e4;
    }
    .tl-error {
      display: none; margin-top: 10px; padding: 10px 13px;
      background: #fee2e2; color: #991b1b; border-radius: 10px;
      font-size: 13px;
    }
    .tl-error.show { display: block; }

    /* Quick phrases */
    .tl-quick-label { font-size: 11px; font-weight: 600; color: #8c96a0; text-transform: uppercase; letter-spacing: 0.06em; margin: 1rem 0 6px; }
    .tl-quick-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tl-quick-chip {
      padding: 5px 12px; border: 1px solid #dde5e0; border-radius: 99px;
      font-size: 12px; color: #0a4a35; cursor: pointer; background: #fff;
      transition: all 0.12s; font-family: 'DM Sans', sans-serif;
    }
    .tl-quick-chip:hover { background: #f0faf5; border-color: #22a06b; }

    @media (max-width: 640px) { .tl-fab { bottom: 8.5rem; right: 1rem; } }
  `;
  document.head.appendChild(style);
}

// ── Build HTML ────────────────────────────────────────────
function injectHTML() {
  if (document.getElementById('tl-fab')) return;

  // Floating button
  const fab = document.createElement('button');
  fab.id = 'tl-fab';
  fab.className = 'tl-fab';
  fab.title = 'Translate';
  fab.innerHTML = '🌐';
  fab.onclick = () => openTranslator();
  document.body.appendChild(fab);

  // Panel overlay
  const overlay = document.createElement('div');
  overlay.id = 'tl-overlay';
  overlay.className = 'tl-overlay';
  overlay.onclick = e => { if (e.target === overlay) closeTranslator(); };
  overlay.innerHTML = `
    <div class="tl-panel">
      <div class="tl-header">
        <div class="tl-title">🌐 Translate</div>
        <button class="tl-close" onclick="window._tlClose()">✕</button>
      </div>
      <div class="tl-body">

        <!-- Target language tabs -->
        <div class="tl-lang-tabs">
          <button class="tl-lang-btn active" id="tl-btn-hil" onclick="window._tlSetLang('Hiligaynon')">
            🗣 Hiligaynon
          </button>
          <button class="tl-lang-btn" id="tl-btn-tgl" onclick="window._tlSetLang('Tagalog')">
            🗣 Tagalog
          </button>
        </div>

        <!-- Direction display -->
        <div class="tl-direction">
          <span id="tl-from-label">English</span>
          <span>→</span>
          <span id="tl-to-label">Hiligaynon</span>
          <button class="tl-swap-btn" onclick="window._tlSwap()">⇄ Swap</button>
        </div>

        <!-- Text input -->
        <textarea class="tl-input" id="tl-input"
          placeholder="Type or paste text to translate…"
          oninput="window._tlOnInput()"></textarea>
        <div class="tl-input-hint" id="tl-char-count">0 / 500 characters</div>

        <button class="tl-btn" id="tl-translate-btn" onclick="window._tlTranslate()" disabled>
          🌐 Translate
        </button>

        <!-- Error -->
        <div class="tl-error" id="tl-error"></div>

        <!-- Result -->
        <div class="tl-result" id="tl-result">
          <div class="tl-result-header">
            <span id="tl-result-lang">Hiligaynon translation</span>
            <button class="tl-copy-btn" onclick="window._tlCopy()">📋 Copy</button>
          </div>
          <div class="tl-result-text" id="tl-result-text"></div>
          <div class="tl-result-note">Translated by Gemini AI · Always verify with a native speaker</div>
        </div>

        <!-- Quick phrases for herb context -->
        <div class="tl-quick-label">Quick phrases</div>
        <div class="tl-quick-list" id="tl-quick-list"></div>

      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ── State ─────────────────────────────────────────────────
let tlState = {
  targetLang: 'Hiligaynon',
  fromLang:   'English',
  toLang:     'Hiligaynon',
  swapped:    false,
};

const QUICK_PHRASES = [
  'Medicinal herb',
  'Boil the leaves',
  'Apply to the wound',
  'Drink three times a day',
  'Fresh leaves',
  'Dried roots',
  'Mix with water',
  'For fever',
  'For cough',
  'For stomach pain',
];

// ── Open / close ──────────────────────────────────────────
function openTranslator() {
  document.getElementById('tl-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderQuickPhrases();
  setTimeout(() => document.getElementById('tl-input')?.focus(), 200);
}

function closeTranslator() {
  document.getElementById('tl-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

window._tlClose = closeTranslator;

// ── Language selection ────────────────────────────────────
window._tlSetLang = function(lang) {
  tlState.targetLang = lang;
  // Reset swap when switching language
  tlState.swapped  = false;
  tlState.fromLang = 'English';
  tlState.toLang   = lang;
  updateDirectionUI();

  document.getElementById('tl-btn-hil').classList.toggle('active', lang === 'Hiligaynon');
  document.getElementById('tl-btn-tgl').classList.toggle('active', lang === 'Tagalog');

  // Clear result when switching language
  document.getElementById('tl-result').classList.remove('show');
  document.getElementById('tl-error').classList.remove('show');
};

// ── Swap direction ────────────────────────────────────────
window._tlSwap = function() {
  tlState.swapped  = !tlState.swapped;
  tlState.fromLang = tlState.swapped ? tlState.targetLang : 'English';
  tlState.toLang   = tlState.swapped ? 'English'          : tlState.targetLang;
  updateDirectionUI();
  document.getElementById('tl-result').classList.remove('show');
  document.getElementById('tl-error').classList.remove('show');

  // Update placeholder
  const input = document.getElementById('tl-input');
  input.placeholder = tlState.swapped
    ? `Type ${tlState.targetLang} text here…`
    : 'Type or paste text to translate…';
};

function updateDirectionUI() {
  document.getElementById('tl-from-label').textContent = tlState.fromLang;
  document.getElementById('tl-to-label').textContent   = tlState.toLang;
  document.getElementById('tl-result-lang').textContent = `${tlState.toLang} translation`;
}

// ── Input handler ─────────────────────────────────────────
window._tlOnInput = function() {
  const input = document.getElementById('tl-input');
  const btn   = document.getElementById('tl-translate-btn');
  const count = document.getElementById('tl-char-count');
  const len   = input.value.length;
  count.textContent = `${len} / 500 characters`;
  count.style.color = len > 450 ? '#e53e3e' : '#8c96a0';
  if (len > 500) input.value = input.value.slice(0, 500);
  btn.disabled = input.value.trim().length === 0;
};

// ── Quick phrases ─────────────────────────────────────────
function renderQuickPhrases() {
  const list = document.getElementById('tl-quick-list');
  list.innerHTML = QUICK_PHRASES.map(phrase =>
    `<button class="tl-quick-chip" onclick="window._tlUsePhrase('${phrase}')">${phrase}</button>`
  ).join('');
}

window._tlUsePhrase = function(phrase) {
  const input = document.getElementById('tl-input');
  input.value = phrase;
  window._tlOnInput();
  input.focus();
};

// ── TRANSLATE ─────────────────────────────────────────────
window._tlTranslate = async function() {
  const input  = document.getElementById('tl-input');
  const btn    = document.getElementById('tl-translate-btn');
  const result = document.getElementById('tl-result');
  const error  = document.getElementById('tl-error');
  const text   = input.value.trim();

  if (!text) return;

  // Reset
  result.classList.remove('show');
  error.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;animation:spin 0.8s linear infinite">⏳</span> Translating…';

  const prompt = `You are a translation expert for Philippine languages.

Translate the following ${tlState.fromLang} text to ${tlState.toLang}.

Rules:
- Return ONLY the translated text, nothing else
- No explanations, no notes, no quotation marks around the result
- Keep proper nouns (plant names, place names) as-is
- If a word has no direct translation, use the closest equivalent
- Preserve the tone and meaning of the original

Text to translate:
${text}`;

  try {
    const res = await fetch(`${RAILWAY_URL}/gemini-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Send a blank image (1x1 white pixel) since gemini-verify expects one
        // but we only need the text response here
        image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        prompt,
        textOnly: true,
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Server error ${res.status}: ${err}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    // app.py returns { translation: "..." } for text-only requests
    let translated = (data.translation || '').trim();

    document.getElementById('tl-result-text').textContent = translated;
    result.classList.add('show');
    // Scroll result into view
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch(e) {
    console.error('Translation error:', e);
    error.textContent = `Translation failed: ${e.message}. Please try again.`;
    error.classList.add('show');
  }

  btn.disabled = false;
  btn.innerHTML = '🌐 Translate';
};

// ── Copy result ───────────────────────────────────────────
window._tlCopy = function() {
  const text = document.getElementById('tl-result-text').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.tl-copy-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.innerHTML = '📋 Copy', 1500);
  });
};

// ── Init ──────────────────────────────────────────────────
injectStyles();
injectHTML();
