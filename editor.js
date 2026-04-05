/* ============================================================
   ПОДНЕБЕСЬЕ WIKI — Inline Editor
   Password-protected, saves via GitHub API commit
   ============================================================ */

(function () {
  'use strict';

  // ── CONFIG ─────────────────────────────────────────────────
  const REPO_OWNER     = 'socman2023';
  const REPO_NAME      = 'podnebesie-wiki';
  const DATA_FILE_PATH = 'data.js';
  const PW_HASH        = 'd61c55923be27a154c012a27ea442fd9c878213c0ef53efddac5a12279a68d6b';
  const ENC_TOKEN      = 'sXQlzVywPl0kdB1Oi31Nto0/eXd7hn/Es6iVVxD+xzqxK2bGVKtJUQ==';

  // ── STATE ───────────────────────────────────────────────────
  let editorUnlocked = false;
  let githubToken    = null;

  // ── UTILS ───────────────────────────────────────────────────
  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function xorDecrypt(b64, keyBytes) {
    const enc = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new TextDecoder().decode(enc.map((b, i) => b ^ keyBytes[i % keyBytes.length]));
  }

  async function deriveKey(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return new Uint8Array(buf);
  }

  // ── LOGIN PANEL ─────────────────────────────────────────────
  function createLoginPanel() {
    const panel = document.createElement('div');
    panel.id = 'editor-login-panel';
    panel.innerHTML = `
      <div class="editor-login-box">
        <div class="editor-login-title">Режим редактирования</div>
        <p class="editor-login-desc">Введите пароль для входа</p>
        <input type="password" id="editor-pw-input" class="editor-pw-input" placeholder="Пароль…" autocomplete="current-password">
        <div class="editor-login-actions">
          <button class="editor-btn editor-btn-primary" id="editor-login-btn">Войти</button>
          <button class="editor-btn editor-btn-ghost" id="editor-cancel-btn">Отмена</button>
        </div>
        <div class="editor-login-error" id="editor-login-error"></div>
      </div>
    `;
    document.body.appendChild(panel);

    const input = panel.querySelector('#editor-pw-input');
    const errEl = panel.querySelector('#editor-login-error');

    panel.querySelector('#editor-login-btn').addEventListener('click', () => tryLogin(input.value, errEl, panel));
    panel.querySelector('#editor-cancel-btn').addEventListener('click', () => panel.remove());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(input.value, errEl, panel); });

    setTimeout(() => input.focus(), 50);
  }

  async function tryLogin(password, errEl, panel) {
    errEl.textContent = '';
    if (!password) { errEl.textContent = 'Введите пароль.'; return; }

    const hash = await sha256(password);
    if (hash !== PW_HASH) {
      errEl.textContent = 'Неверный пароль.';
      return;
    }

    // Decrypt token
    const keyBytes = await deriveKey(password);
    githubToken = xorDecrypt(ENC_TOKEN, keyBytes);
    editorUnlocked = true;
    panel.remove();
    activateEditMode();
  }

  // ── EDIT MODE ───────────────────────────────────────────────
  function activateEditMode() {
    // Add edit buttons to all visible cards
    addEditButtons();

    // Show status bar
    showEditorBar();

    // Re-add buttons when tabs switch
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(addEditButtons, 300), { passive: true });
    });
  }

  function showEditorBar() {
    const bar = document.createElement('div');
    bar.id = 'editor-bar';
    bar.innerHTML = `
      <span class="editor-bar-icon">✏️</span>
      <span class="editor-bar-text">Режим редактирования активен</span>
      <button class="editor-btn editor-btn-ghost editor-bar-exit" id="editor-exit-btn">Выйти</button>
    `;
    document.body.appendChild(bar);
    bar.querySelector('#editor-exit-btn').addEventListener('click', deactivateEditMode);
  }

  function deactivateEditMode() {
    editorUnlocked = false;
    githubToken = null;
    document.querySelectorAll('.edit-pencil-btn').forEach(b => b.remove());
    document.getElementById('editor-bar')?.remove();
  }

  function addEditButtons() {
    if (!editorUnlocked) return;
    document.querySelectorAll('.card, .nation-card, .god-card, .holiday-card, .plot-card, .clergy-card, .glossary-item').forEach(card => {
      if (card.querySelector('.edit-pencil-btn')) return; // already has button
      const btn = document.createElement('button');
      btn.className = 'edit-pencil-btn';
      btn.title = 'Редактировать';
      btn.innerHTML = '✏️';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openEditorModal(card);
      });
      card.style.position = 'relative';
      card.appendChild(btn);
    });
  }

  // ── EDITOR MODAL ────────────────────────────────────────────
  function openEditorModal(card) {
    // Extract text fields from the card
    const fields = [];

    // Name
    const nameEl = card.querySelector('.card-name, .nation-name, .god-name, .holiday-name, .plot-name, .glossary-word');
    if (nameEl) fields.push({ label: 'Название', el: nameEl, key: 'name' });

    // Role / subtitle
    const roleEl = card.querySelector('.card-role, .nation-analogue, .god-role, .holiday-nation');
    if (roleEl) fields.push({ label: 'Роль / подзаголовок', el: roleEl, key: 'role' });

    // Description
    const descEl = card.querySelector('.card-desc, .nation-desc, .god-desc, .holiday-desc, .plot-desc, .glossary-def');
    if (descEl) fields.push({ label: 'Описание', el: descEl, key: 'desc' });

    if (fields.length === 0) return;

    // Build modal
    const overlay = document.createElement('div');
    overlay.className = 'editor-modal-overlay';
    overlay.innerHTML = `
      <div class="editor-modal">
        <div class="editor-modal-title">✏️ Редактировать</div>
        ${fields.map((f, i) => `
          <div class="editor-field">
            <label class="editor-field-label">${f.label}</label>
            <textarea class="editor-field-input" data-idx="${i}" rows="${f.key === 'desc' ? 4 : 1}">${f.el.textContent.trim()}</textarea>
          </div>
        `).join('')}
        <div class="editor-modal-actions">
          <button class="editor-btn editor-btn-primary" id="editor-save-btn">
            <span class="editor-save-icon">✓</span> Сохранить
          </button>
          <button class="editor-btn editor-btn-ghost" id="editor-close-modal">Отмена</button>
        </div>
        <div class="editor-save-status" id="editor-save-status"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#editor-close-modal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#editor-save-btn').addEventListener('click', async () => {
      const inputs = overlay.querySelectorAll('.editor-field-input');
      const changes = [];
      inputs.forEach((inp, i) => {
        const original = fields[i].el.textContent.trim();
        const newVal = inp.value.trim();
        if (newVal !== original) {
          changes.push({ field: fields[i], newVal, original });
        }
      });

      if (changes.length === 0) { overlay.remove(); return; }

      // Apply changes to the live DOM immediately
      changes.forEach(({ field, newVal }) => {
        field.el.textContent = newVal;
      });

      // Save to GitHub
      const statusEl = overlay.querySelector('#editor-save-status');
      statusEl.textContent = 'Сохранение…';
      statusEl.className = 'editor-save-status saving';

      try {
        await saveToGitHub(changes, statusEl);
        statusEl.textContent = '✓ Сохранено! Сайт обновится через ~30 сек.';
        statusEl.className = 'editor-save-status success';
        setTimeout(() => overlay.remove(), 2000);
      } catch (err) {
        statusEl.textContent = '✗ Ошибка: ' + err.message;
        statusEl.className = 'editor-save-status error';
        // Revert DOM changes
        changes.forEach(({ field, original }) => {
          field.el.textContent = original;
        });
      }
    });
  }

  // ── GITHUB SAVE ─────────────────────────────────────────────
  async function saveToGitHub(changes, statusEl) {
    const apiBase = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`;

    // 1. Get current file content + SHA
    statusEl.textContent = 'Получение файла с GitHub…';
    const getResp = await fetch(apiBase, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!getResp.ok) throw new Error(`GitHub API: ${getResp.status} ${getResp.statusText}`);
    const fileData = await getResp.json();
    const fileSha = fileData.sha;

    // 2. Decode content
    let content = atob(fileData.content.replace(/\n/g, ''));

    // 3. Apply text replacements in data.js
    changes.forEach(({ field, newVal, original }) => {
      // Escape for use in regex
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace the string value in JS content
      // Look for: "original" or 'original' in the JS
      const patterns = [
        new RegExp(`"${esc(original)}"`, 'g'),
        new RegExp(`'${esc(original)}'`, 'g'),
      ];
      let replaced = false;
      for (const pat of patterns) {
        if (pat.test(content)) {
          content = content.replace(pat, `"${newVal.replace(/"/g, '\\"')}"`);
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        console.warn('Could not find text to replace:', original);
      }
    });

    // 4. Encode and commit
    statusEl.textContent = 'Отправка изменений…';
    const newContent = btoa(unescape(encodeURIComponent(content)));
    const changedNames = changes.map(c => `"${c.original.substring(0,20)}" → "${c.newVal.substring(0,20)}"`).join('; ');
    const putResp = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Правка через редактор вики: ${changedNames}`,
        content: newContent,
        sha: fileSha
      })
    });

    if (!putResp.ok) {
      const errData = await putResp.json();
      throw new Error(errData.message || putResp.statusText);
    }
  }

  // ── INIT: Add lock icon to header ───────────────────────────
  function addEditorToggle() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;
    const btn = document.createElement('button');
    btn.className = 'editor-toggle-btn';
    btn.id = 'editor-toggle-btn';
    btn.title = 'Войти в режим редактирования';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    `;
    btn.addEventListener('click', () => {
      if (editorUnlocked) { deactivateEditMode(); }
      else { createLoginPanel(); }
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addEditorToggle);
  } else {
    addEditorToggle();
  }

})();
