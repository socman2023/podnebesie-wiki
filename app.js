/* ============================================================
   ПОДНЕБЕСЬЕ WIKI — App Logic (расширенная версия)
   ============================================================ */

(function () {
  'use strict';

  // ── SHORTCUTS ──────────────────────────────────────────────
  const D = WIKI_DATA;
  const $ = id => document.getElementById(id);
  const all = sel => document.querySelectorAll(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  // ── STATE ───────────────────────────────────────────────────
  let activeTab = 'characters';
  let searchOpen = false;
  let searchQuery = '';
  let activeTag = null;

  // ── THEME TOGGLE ────────────────────────────────────────────
  (function () {
    const toggle = document.querySelector('[data-theme-toggle]');
    const html = document.documentElement;
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    html.setAttribute('data-theme', theme);
    updateToggleIcon(toggle, theme);
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', theme);
      updateToggleIcon(toggle, theme);
    });

    function updateToggleIcon(btn, t) {
      if (!btn) return;
      if (t === 'dark') {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        btn.setAttribute('aria-label', 'Включить светлую тему');
      } else {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        btn.setAttribute('aria-label', 'Включить тёмную тему');
      }
    }
  })();

  // ── TAB NAVIGATION ─────────────────────────────────────────
  all('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  function switchTab(tab) {
    activeTab = tab;
    activeTag = null;

    hideSearchResults();
    $('searchInput').value = '';
    searchQuery = '';
    updateTagPills();

    all('.tab-btn').forEach(b => {
      const isActive = b.dataset.tab === tab;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    all('.tab-section').forEach(s => {
      s.classList.toggle('active', s.id === `section-${tab}`);
    });
  }

  // ── SEARCH TOGGLE ──────────────────────────────────────────
  $('searchToggle').addEventListener('click', () => {
    searchOpen = !searchOpen;
    const wrap = $('searchBarWrap');
    wrap.classList.toggle('open', searchOpen);
    if (searchOpen) {
      setTimeout(() => $('searchInput').focus(), 150);
    }
  });

  // ── SEARCH INPUT ───────────────────────────────────────────
  $('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim().toLowerCase();
    $('searchClear').style.display = searchQuery ? '' : 'none';
    if (searchQuery.length > 0) {
      renderSearchResults();
    } else {
      hideSearchResults();
    }
  });

  $('searchClear').addEventListener('click', () => {
    $('searchInput').value = '';
    searchQuery = '';
    $('searchClear').style.display = 'none';
    hideSearchResults();
  });

  function hideSearchResults() {
    $('searchResults').classList.add('hidden');
    all('.tab-section').forEach(s => {
      if (s.id === `section-${activeTab}`) s.classList.add('active');
    });
  }

  function renderSearchResults() {
    const results = searchAll(searchQuery);
    const sr = $('searchResults');
    const grid = $('resultsGrid');
    sr.classList.remove('hidden');
    all('.tab-section').forEach(s => s.classList.remove('active'));
    grid.innerHTML = '';

    if (results.length === 0) {
      grid.innerHTML = '<div class="result-empty">Ничего не найдено. Попробуй другой запрос.</div>';
      return;
    }

    const types = {
      character: { label: 'Персонажи', items: [] },
      place:     { label: 'Места',      items: [] },
      nation:    { label: 'Народы',     items: [] },
      god:       { label: 'Боги',       items: [] },
      holiday:   { label: 'Праздники',  items: [] },
      plotline:  { label: 'Сюжет',      items: [] },
      clergy:    { label: 'Жречество',  items: [] },
      academy:   { label: 'Академия',   items: [] },
      glossary:  { label: 'Словарь',    items: [] },
    };

    results.forEach(r => { if (types[r.type]) types[r.type].items.push(r); });

    Object.values(types).forEach(group => {
      if (group.items.length === 0) return;
      const label = el('div', 'result-type-label', group.label);
      grid.appendChild(label);
      group.items.forEach(r => {
        const card = buildResultCard(r);
        grid.appendChild(card);
      });
    });
  }

  // ── SEARCH ALL ─────────────────────────────────────────────
  function searchAll(q) {
    const results = [];
    const match = s => s && s.toLowerCase().includes(q);

    D.characters.forEach(c => {
      if (match(c.name) || match(c.fullName) || match(c.role) || match(c.description) || (c.tags && c.tags.some(t => match(t)))) {
        results.push({ type: 'character', data: c });
      }
    });
    D.places.forEach(p => {
      if (match(p.name) || match(p.description) || match(p.type) || (p.tags && p.tags.some(t => match(t)))) {
        results.push({ type: 'place', data: p });
      }
    });
    D.nations.forEach(n => {
      if (match(n.name) || match(n.analogue) || match(n.description) || (n.tags && n.tags.some(t => match(t)))) {
        results.push({ type: 'nation', data: n });
      }
    });
    D.gods.forEach(g => {
      if (match(g.name) || match(g.role) || match(g.description) || (g.tags && g.tags.some(t => match(t)))) {
        results.push({ type: 'god', data: g });
      }
    });
    D.holidays.forEach(h => {
      if (match(h.name) || match(h.description) || match(h.nation) || (h.tags && h.tags.some(t => match(t)))) {
        results.push({ type: 'holiday', data: h });
      }
    });
    D.plotlines.forEach(pl => {
      if (match(pl.name) || match(pl.description) || (pl.tags && pl.tags.some(t => match(t)))) {
        results.push({ type: 'plotline', data: pl });
      }
    });
    // Clergy search
    if (D.clergy) {
      D.clergy.forEach(cl => {
        if (match(cl.nation) || match(cl.servants) || match(cl.temple) || match(cl.description) ||
            (cl.hierarchy && cl.hierarchy.some(h => match(h))) ||
            (cl.taboos && cl.taboos.some(t => match(t)))) {
          results.push({ type: 'clergy', data: cl });
        }
      });
    }
    // Academy locations search
    if (D.academy && D.academy.locations) {
      D.academy.locations.forEach(loc => {
        if (match(loc.name) || match(loc.desc)) {
          results.push({ type: 'academy', data: loc });
        }
      });
    }
    D.glossary.forEach(g => {
      if (match(g.word) || match(g.def) || (g.tags && g.tags.some(t => match(t)))) {
        results.push({ type: 'glossary', data: g });
      }
    });

    return results;
  }

  function buildResultCard(r) {
    const { type, data } = r;
    const div = el('div', 'card');
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');

    if (type === 'character') {
      div.innerHTML = `
        <div class="card-name">${esc(data.name)}</div>
        <div class="card-role">${esc(data.role)}</div>
        <div class="card-desc">${esc(data.description)}</div>
        ${buildTagsHTML(data.tags)}
      `;
      div.addEventListener('click', () => openModal('character', data));
    } else if (type === 'place') {
      div.innerHTML = `
        <div class="card-name">${esc(data.name)}</div>
        <div class="card-role">${esc(data.type)}</div>
        <div class="card-desc">${esc(data.description)}</div>
      `;
      div.addEventListener('click', () => openModal('place', data));
    } else if (type === 'nation') {
      div.innerHTML = `
        <div class="card-name">${esc(data.name)}</div>
        <div class="card-role">${esc(data.analogue)}</div>
        <div class="card-desc">${esc(data.description)}</div>
      `;
      div.addEventListener('click', () => openModal('nation', data));
    } else if (type === 'god') {
      div.innerHTML = `
        <div class="card-name">${esc(data.name)}</div>
        <div class="card-role">${esc(data.role)}</div>
        <div class="card-desc">${esc(data.description)}</div>
      `;
      div.addEventListener('click', () => openModal('god', data));
    } else if (type === 'holiday') {
      div.innerHTML = `
        <div class="card-name">${esc(data.name)}</div>
        <div class="card-role">${esc(data.nation)} · ${esc(data.date)}</div>
        <div class="card-desc">${esc(data.description)}</div>
      `;
      div.addEventListener('click', () => openModal('holiday', data));
    } else if (type === 'plotline') {
      div.innerHTML = `
        <div class="card-name">${data.icon || ''} ${esc(data.name)}</div>
        <div class="card-desc">${esc(data.description)}</div>
      `;
      div.addEventListener('click', () => openModal('plotline', data));
    } else if (type === 'clergy') {
      div.innerHTML = `
        <div class="card-name">${esc(data.nation)}</div>
        <div class="card-role">${esc(data.servants)} · ${esc(data.temple)}</div>
        <div class="card-desc">${esc(data.description)}</div>
      `;
      div.addEventListener('click', () => openModal('clergy', data));
    } else if (type === 'academy') {
      div.innerHTML = `
        <div class="card-name">№ ${esc(String(data.num))} ${esc(data.name)}</div>
        <div class="card-desc">${esc(data.desc)}</div>
      `;
    } else if (type === 'glossary') {
      div.innerHTML = `
        <div class="card-name">${esc(data.word)}</div>
        <div class="card-desc">${esc(data.def)}</div>
      `;
    }

    div.addEventListener('keydown', e => { if (e.key === 'Enter') div.click(); });
    return div;
  }

  // ── TAG PILLS ──────────────────────────────────────────────
  function buildTagPills() {
    const container = $('tagPills');
    // Show first 30 most useful tags
    const tags = (D.allTags || []).slice(0, 30);
    tags.forEach(tag => {
      const btn = el('button', 'tag-pill', esc(tag));
      btn.setAttribute('role', 'listitem');
      btn.addEventListener('click', () => {
        if (activeTag === tag) {
          activeTag = null;
          btn.classList.remove('active');
          if (searchQuery) renderSearchResults();
          else hideSearchResults();
        } else {
          activeTag = tag;
          updateTagPills();
          filterByTag(tag);
        }
      });
      container.appendChild(btn);
    });
  }

  function updateTagPills() {
    all('.tag-pill').forEach(pill => {
      pill.classList.toggle('active', pill.textContent === activeTag);
    });
  }

  function filterByTag(tag) {
    const sr = $('searchResults');
    const grid = $('resultsGrid');
    sr.classList.remove('hidden');
    all('.tab-section').forEach(s => s.classList.remove('active'));
    grid.innerHTML = '';

    const results = searchAll(tag);
    if (results.length === 0) {
      grid.innerHTML = '<div class="result-empty">Ничего не найдено по этому тегу.</div>';
      return;
    }

    const types = {
      character: { label: 'Персонажи', items: [] },
      place:     { label: 'Места',      items: [] },
      nation:    { label: 'Народы',     items: [] },
      god:       { label: 'Боги',       items: [] },
      holiday:   { label: 'Праздники',  items: [] },
      plotline:  { label: 'Сюжет',      items: [] },
      clergy:    { label: 'Жречество',  items: [] },
      academy:   { label: 'Академия',   items: [] },
      glossary:  { label: 'Словарь',    items: [] },
    };

    results.forEach(r => { if (types[r.type]) types[r.type].items.push(r); });

    Object.values(types).forEach(group => {
      if (group.items.length === 0) return;
      const label = el('div', 'result-type-label', group.label);
      grid.appendChild(label);
      group.items.forEach(r => grid.appendChild(buildResultCard(r)));
    });
  }

  // ── RENDER CHARACTERS ──────────────────────────────────────
  function renderCharacters() {
    const heroes   = D.characters.filter(c => c.group === 'hero');
    const teachers = D.characters.filter(c => c.group === 'teacher');

    renderCharGroup('grid-heroes',   heroes);
    renderCharGroup('grid-teachers', teachers);
    renderStudents();
    renderStaff();
    renderNPCs();
  }

  function renderCharGroup(gridId, chars) {
    const grid = $(gridId);
    if (!grid) return;
    chars.forEach(char => {
      const card = el('div', 'card');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        ${char.portrait ? `<img class="card-portrait" src="${char.portrait}" alt="${esc(char.name)}" loading="lazy">` : ''}
        <div class="card-name">${esc(char.name)}</div>
        <div class="card-role">${esc(char.role)}</div>
        <div class="card-desc">${esc(char.description)}</div>
        ${buildTagsHTML(char.tags)}
      `;
      card.addEventListener('click', () => openModal('character', char));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('character', char); });
      grid.appendChild(card);
    });
  }

  // ── RENDER STUDENTS ────────────────────────────────────────
  function renderStudents() {
    const academy = D.academy;
    if (!academy || !academy.classes) return;

    const gridIds = ['grid-class-arboris', 'grid-class-brin', 'grid-class-simeon'];
    const teacherNames = [null, null, null]; // resolved below

    academy.classes.forEach((cls, idx) => {
      const gridId = gridIds[idx];
      const grid = $(gridId);
      if (!grid) return;

      // Resolve teacher name
      const teacher = D.characters.find(c => c.id === cls.teacher);
      const teacherName = teacher ? teacher.name : cls.teacher;

      cls.students.forEach(sid => {
        const char = D.characters.find(c => c.id === sid);
        if (!char) return;

        const card = el('div', 'student-card');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        // Use nation + magic tag as role text
        const nationTag = (char.tags || []).find(t =>
          ['россы','боруски','кушты','славоны','альвы','нордунги','синды','рамеи','баллы',
           'воны','арависки','кахеты','арды','даны','тартары','казары','риттеры','татавинцы','хмуры'].includes(t)
        );
        const magicTag = (char.tags || []).find(t =>
          ['маг','магия','зельевар','оборотень','чутьё','целитель','трансмутатор','иллюзии'].some(m => t.includes(m))
        );
        const roleText = [nationTag, magicTag].filter(Boolean).join(' · ') || char.role || '';

        card.innerHTML = `
          <div class="student-name">${esc(char.name)}</div>
          <div class="student-role">${esc(roleText)}</div>
        `;
        card.addEventListener('click', () => openModal('character', char));
        card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('character', char); });
        grid.appendChild(card);
      });
    });
  }

  // ── RENDER STAFF ──────────────────────────────────────────
  function renderStaff() {
    const staff = D.characters.filter(c => c.group === 'staff');
    renderCharGroup('grid-staff', staff);
  }

  // ── RENDER NPCS ───────────────────────────────────────────
  function renderNPCs() {
    const npcs = D.characters.filter(c => c.group === 'npc');
    renderCharGroup('grid-npcs', npcs);
  }

  // ── RENDER PLACES ──────────────────────────────────────────
  function renderPlaces() {
    const grid = $('grid-places');
    D.places.forEach(place => {
      const card = el('div', 'card');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="card-name">${esc(place.name)}</div>
        <div class="card-role">${esc(place.type)} · ${esc(place.nation)}</div>
        <div class="card-desc">${esc(place.description)}</div>
        ${buildTagsHTML(place.tags)}
      `;
      card.addEventListener('click', () => openModal('place', place));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('place', place); });
      grid.appendChild(card);
    });
  }

  // ── RENDER NATIONS ─────────────────────────────────────────
  function renderNations() {
    const list = $('grid-nations');
    D.nations.forEach(nation => {
      const card = el('div', 'nation-card');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const heroNames = (nation.heroes || [])
        .map(hid => {
          const c = D.characters.find(ch => ch.id === hid);
          return c ? c.name : null;
        })
        .filter(Boolean);

      card.innerHTML = `
        <div class="nation-header">
          <div>
            <div class="nation-name">${esc(nation.name)}</div>
            <div class="nation-analogue">${esc(nation.analogue)}</div>
          </div>
        </div>
        <div class="nation-meta">
          <div class="nation-meta-item">
            <span class="nation-meta-label">Родина</span>
            <span class="nation-meta-value">${esc(nation.homeland)}</span>
          </div>
          <div class="nation-meta-item">
            <span class="nation-meta-label">Религия</span>
            <span class="nation-meta-value">${esc(nation.religion)}</span>
          </div>
          <div class="nation-meta-item">
            <span class="nation-meta-label">Жрецы</span>
            <span class="nation-meta-value">${esc(nation.priests)}</span>
          </div>
          <div class="nation-meta-item">
            <span class="nation-meta-label">Храм</span>
            <span class="nation-meta-value">${esc(nation.temple)}</span>
          </div>
        </div>
        <div class="nation-desc">${esc(nation.description)}</div>
        ${heroNames.length ? `<div class="card-tags" style="margin-top:var(--space-3)">${heroNames.map(n => `<span class="card-tag">${esc(n)}</span>`).join('')}</div>` : ''}
      `;
      card.addEventListener('click', () => openModal('nation', nation));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('nation', nation); });
      list.appendChild(card);
    });
  }

  // ── RENDER GODS ────────────────────────────────────────────
  function renderGods() {
    const container = $('grid-gods');
    const groups = {};
    D.gods.forEach(g => {
      const key = g.nation;
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });

    Object.entries(groups).forEach(([nation, gods]) => {
      const groupDiv = el('div', 'gods-group');
      const title = el('div', 'gods-group-title', esc(nation));
      const grid = el('div', 'gods-grid');

      gods.forEach(god => {
        const card = el('div', 'god-card');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
          <div class="god-name">${esc(god.name)}</div>
          <div class="god-role">${esc(god.role)}</div>
          <div class="god-desc">${esc(god.description)}</div>
        `;
        card.addEventListener('click', () => openModal('god', god));
        card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('god', god); });
        grid.appendChild(card);
      });

      groupDiv.appendChild(title);
      groupDiv.appendChild(grid);
      container.appendChild(groupDiv);
    });
  }

  // ── RENDER HOLIDAYS ────────────────────────────────────────
  function renderHolidays() {
    const list = $('grid-holidays');
    D.holidays.forEach(holiday => {
      const card = el('div', 'holiday-card');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="holiday-header">
          <div class="holiday-name">${esc(holiday.name)}</div>
          <div class="holiday-nation">${esc(holiday.nation)}</div>
        </div>
        <div class="holiday-date">${esc(holiday.date)} · Бог: ${esc(holiday.god)}</div>
        <div class="holiday-desc">${esc(holiday.description)}</div>
        ${buildTagsHTML(holiday.tags)}
      `;
      card.addEventListener('click', () => openModal('holiday', holiday));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('holiday', holiday); });
      list.appendChild(card);
    });
  }

  // ── RENDER PLOTLINES ───────────────────────────────────────
  function renderPlotlines() {
    const list = $('grid-plotlines');
    D.plotlines.forEach(pl => {
      const card = el('div', 'plot-card');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const bar = el('div', 'plot-accent-bar');
      bar.style.background = pl.color || 'var(--color-gold)';
      card.appendChild(bar);

      const chars = (pl.characters || [])
        .map(cid => D.characters.find(c => c.id === cid))
        .filter(Boolean);

      const charsHTML = chars.map(c =>
        `<span class="plot-char-chip" data-char-id="${esc(c.id)}">${esc(c.name)}</span>`
      ).join('');

      const inner = el('div');
      inner.innerHTML = `
        <div class="plot-header">
          <span class="plot-icon">${pl.icon || '📖'}</span>
          <span class="plot-name">${esc(pl.name)}</span>
        </div>
        <div class="plot-desc">${esc(pl.description)}</div>
        ${chars.length ? `<div class="plot-chars">${charsHTML}</div>` : ''}
      `;
      card.appendChild(inner);

      inner.querySelectorAll('.plot-char-chip').forEach(chip => {
        chip.addEventListener('click', e => {
          e.stopPropagation();
          const char = D.characters.find(c => c.id === chip.dataset.charId);
          if (char) openModal('character', char);
        });
      });

      card.addEventListener('click', e => {
        if (!e.target.closest('.plot-char-chip')) openModal('plotline', pl);
      });
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('plotline', pl); });
      list.appendChild(card);
    });
  }

  // ── RENDER GLOSSARY ────────────────────────────────────────
  function renderGlossary() {
    const list = $('grid-glossary');
    const seen = new Set();
    D.glossary.forEach(item => {
      if (seen.has(item.word)) return;
      seen.add(item.word);
      const row = el('div', 'glossary-item');
      row.innerHTML = `
        <div class="glossary-word">${esc(item.word)}</div>
        <div>
          <div class="glossary-def">${esc(item.def)}</div>
          ${item.tags ? `<div class="glossary-def-tags">${item.tags.map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
      `;
      list.appendChild(row);
    });
  }

  // ── RENDER ACADEMY ─────────────────────────────────────────
  function renderAcademy() {
    const academy = D.academy;
    if (!academy) return;

    // ── Hero block ──────────────────────────────────────────
    const heroBlock = $('academy-hero-block');
    if (heroBlock) {
      const classChips = (academy.classes || []).map(cls => {
        const teacher = D.characters.find(c => c.id === cls.teacher);
        const teacherName = teacher ? teacher.name : cls.teacher;
        return `
          <div class="academy-class-chip">
            <div class="academy-class-chip-name">${esc(cls.name)}</div>
            <div class="academy-class-chip-meta">Учитель: ${esc(teacherName)} · ${cls.count} учеников</div>
          </div>
        `;
      }).join('');

      heroBlock.innerHTML = `
        <div class="academy-hero-title">Академия магии Светозара</div>
        <div class="academy-hero-desc">${esc(academy.description)}</div>
        <div class="academy-classes-summary">${classChips}</div>
      `;
    }

    // ── Classes grid (summary cards) ───────────────────────
    const classesGrid = $('academy-classes-grid');
    if (classesGrid) {
      (academy.classes || []).forEach(cls => {
        const teacher = D.characters.find(c => c.id === cls.teacher);
        const teacherName = teacher ? teacher.name : cls.teacher;
        const studentNames = cls.students.map(sid => {
          const c = D.characters.find(ch => ch.id === sid);
          return c ? c.name : null;
        }).filter(Boolean);

        const card = el('div', 'academy-class-card');
        card.innerHTML = `
          <div class="academy-class-header">
            <div class="academy-class-name">${esc(cls.name)}</div>
            <div class="academy-class-teacher">Учитель: ${esc(teacherName)}<span class="academy-class-count">${cls.count} учеников</span></div>
          </div>
          <div class="student-tags">
            ${studentNames.map(n => `<span class="student-tag">${esc(n)}</span>`).join('')}
          </div>
        `;
        classesGrid.appendChild(card);
      });
    }

    // ── Locations grid ─────────────────────────────────────
    const locGrid = $('academy-locations-grid');
    if (locGrid && academy.locations) {
      academy.locations.forEach(loc => {
        const card = el('div', 'card');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
          <div class="location-number">${esc(String(loc.num))}</div>
          <div class="card-name">${esc(loc.name)}</div>
          <div class="card-desc">${esc(loc.desc)}</div>
        `;
        locGrid.appendChild(card);
      });
    }

    // ── Courses accordion ──────────────────────────────────
    const coursesEl = $('academy-courses');
    if (coursesEl && academy.courses) {
      const courseGroups = [
        { key: 'main',    label: 'Основные курсы' },
        { key: 'special', label: 'Спецкурсы' },
        { key: 'elective',label: 'Факультативы' },
      ];

      courseGroups.forEach(group => {
        const list = academy.courses[group.key] || [];
        if (!list.length) return;

        const block = el('div', 'accordion-block');

        const header = el('div', 'accordion-header');
        header.innerHTML = `
          <span class="accordion-title">${esc(group.label)}<span class="accordion-count">${list.length}</span></span>
          <svg class="accordion-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        `;

        const body = el('div', 'accordion-body');
        list.forEach(course => {
          const item = el('div', 'course-item');
          item.innerHTML = `
            <div class="course-name">${esc(course.name)}</div>
            <div class="course-meta">
              <span class="course-teacher">${esc(course.teacher)}</span>
              ${course.days ? `<span class="course-days">${esc(course.days)}</span>` : ''}
            </div>
            ${course.description ? `<div class="course-desc">${esc(course.description)}</div>` : ''}
          `;
          body.appendChild(item);
        });

        header.addEventListener('click', () => {
          block.classList.toggle('open');
        });

        block.appendChild(header);
        block.appendChild(body);
        coursesEl.appendChild(block);
      });
    }

    // ── Schedule table ─────────────────────────────────────
    renderScheduleTable();

    // ── Menu table ─────────────────────────────────────────
    renderMenuTable();
  }

  const DAY_KEYS  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const DAY_NAMES = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
  const MEAL_KEYS  = ['breakfast','snack','lunch','dinner'];
  const MEAL_NAMES = ['Завтрак','Перекус','Обед','Ужин'];

  function renderScheduleTable() {
    const tbl = $('academy-schedule');
    if (!tbl || !D.schedule) return;

    // Collect all unique time slots
    const allTimes = new Set();
    DAY_KEYS.forEach(day => {
      (D.schedule[day] || []).forEach(slot => allTimes.add(slot.time));
    });
    const times = [...allTimes];

    // Header row
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const thTime = document.createElement('th');
    thTime.textContent = 'Время';
    headRow.appendChild(thTime);
    DAY_NAMES.forEach((name, i) => {
      const th = document.createElement('th');
      th.className = 'schedule-day-col';
      th.textContent = name;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    tbl.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    times.forEach(time => {
      const tr = document.createElement('tr');
      const tdTime = document.createElement('td');
      tdTime.className = 'schedule-time';
      tdTime.textContent = time;
      tr.appendChild(tdTime);

      DAY_KEYS.forEach(day => {
        const td = document.createElement('td');
        const slot = (D.schedule[day] || []).find(s => s.time === time);
        td.textContent = slot ? slot.activity : '—';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
  }

  function renderMenuTable() {
    const tbl = $('academy-menu');
    if (!tbl || !D.menu) return;

    // Header
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const thMeal = document.createElement('th');
    thMeal.textContent = 'Приём пищи';
    headRow.appendChild(thMeal);
    DAY_NAMES.forEach(name => {
      const th = document.createElement('th');
      th.className = 'schedule-day-col';
      th.textContent = name;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    tbl.appendChild(thead);

    // Body — 4 rows for meals
    const tbody = document.createElement('tbody');
    MEAL_KEYS.forEach((mealKey, mIdx) => {
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.innerHTML = `<span class="meal-label">${esc(MEAL_NAMES[mIdx])}</span>`;
      tr.appendChild(tdLabel);

      DAY_KEYS.forEach(day => {
        const td = document.createElement('td');
        const items = D.menu[day] && D.menu[day][mealKey];
        if (items && items.length) {
          const wrap = el('div', 'menu-items');
          items.forEach(item => {
            const span = el('span', '', esc(item));
            wrap.appendChild(span);
          });
          td.appendChild(wrap);
        } else {
          td.textContent = '—';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
  }

  // ── RENDER CLERGY ──────────────────────────────────────────
  function renderClergy() {
    const list = $('grid-clergy');
    if (!list || !D.clergy) return;

    D.clergy.forEach(cl => {
      const card = el('div', 'clergy-card');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const hierarchyItems = (cl.hierarchy || []).map(h => `<li>${esc(h)}</li>`).join('');
      const tabooItems = (cl.taboos || []).map(t => `<li>${esc(t)}</li>`).join('');

      card.innerHTML = `
        <div class="clergy-nation">${esc(cl.nation)}</div>
        <div class="clergy-subtitle">${esc(cl.servants)} · ${esc(cl.temple)}</div>
        <div class="clergy-desc">${esc(cl.description)}</div>
        <div class="clergy-clothing">${esc(cl.clothing)}</div>
        ${hierarchyItems ? `
          <div class="clergy-hierarchy">
            <div class="clergy-hierarchy-title">Иерархия</div>
            <ol class="clergy-hierarchy-list">${hierarchyItems}</ol>
          </div>
        ` : ''}
        ${tabooItems ? `
          <div class="clergy-taboos-title">Табу</div>
          <ul class="clergy-taboos-list">${tabooItems}</ul>
        ` : ''}
        ${cl.initiation ? `
          <div class="clergy-initiation">
            <span class="clergy-initiation-label">Посвящение</span>
            ${esc(cl.initiation)}
          </div>
        ` : ''}
      `;

      card.addEventListener('click', () => openModal('clergy', cl));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal('clergy', cl); });
      list.appendChild(card);
    });
  }

  // ── MODAL ──────────────────────────────────────────────────
  const overlay  = $('modalOverlay');
  const modalBody = $('modalBody');

  $('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  function openModal(type, data) {
    modalBody.innerHTML = buildModalContent(type, data);

    // Bind relation chip clicks
    modalBody.querySelectorAll('[data-rel-id]').forEach(chip => {
      chip.addEventListener('click', () => {
        const char = D.characters.find(c => c.id === chip.dataset.relId);
        if (char) openModal('character', char);
      });
    });

    // Bind plot badge clicks
    modalBody.querySelectorAll('[data-plot-id]').forEach(badge => {
      badge.addEventListener('click', () => {
        const pl = D.plotlines.find(p => p.id === badge.dataset.plotId);
        if (pl) openModal('plotline', pl);
      });
    });

    // Bind nation hero chips
    modalBody.querySelectorAll('[data-hero-id]').forEach(chip => {
      chip.addEventListener('click', () => {
        const char = D.characters.find(c => c.id === chip.dataset.heroId);
        if (char) openModal('character', char);
      });
    });

    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    $('modalClose').focus();
  }

  function closeModal() {
    overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function buildModalContent(type, data) {
    if (type === 'character') return buildCharModal(data);
    if (type === 'place')     return buildPlaceModal(data);
    if (type === 'nation')    return buildNationModal(data);
    if (type === 'god')       return buildGodModal(data);
    if (type === 'holiday')   return buildHolidayModal(data);
    if (type === 'plotline')  return buildPlotModal(data);
    if (type === 'clergy')    return buildClergyModal(data);
    return '';
  }

  function buildCharModal(char) {
    const groupLabel = { hero: 'Главный герой', teacher: 'Учитель', student: 'Ученик', staff: 'Персонал', npc: 'НПС' };

    const relHTML = (char.relations || []).map(rel => {
      const linked = D.characters.find(c => c.id === rel.id);
      if (!linked) return '';
      return `
        <div class="relation-chip" role="button" tabindex="0" data-rel-id="${esc(rel.id)}">
          <span class="relation-name">${esc(linked.name)}</span>
          <span class="relation-label">${esc(rel.label)}</span>
          <svg class="relation-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      `;
    }).join('');

    const plotHTML = (char.plotlines || []).map(pid => {
      const pl = D.plotlines.find(p => p.id === pid);
      if (!pl) return '';
      return `<span class="plot-badge" data-plot-id="${esc(pid)}" role="button" tabindex="0" style="background:${pl.color}22;color:${pl.color};border:1px solid ${pl.color}44">${pl.icon || ''} ${esc(pl.name)}</span>`;
    }).join('');

    return `
      <div class="modal-type-badge">${esc(groupLabel[char.group] || 'Персонаж')}</div>
      <h2 class="modal-title" id="modalTitle">${esc(char.name)}</h2>
      <div class="modal-subtitle">${esc(char.fullName)}</div>
      ${char.portrait ? `<img class="modal-portrait" src="${char.portrait}" alt="${esc(char.name)}" loading="lazy">` : ''}
      <div class="modal-section-label">О персонаже</div>
      <p class="modal-text">${esc(char.description)}</p>
      <div class="modal-divider"></div>
      <div class="modal-section-label">Подробнее</div>
      <p class="modal-text">${esc(char.details || '—')}</p>
      ${char.tags && char.tags.length ? `<div class="modal-divider"></div>${buildTagsHTML(char.tags)}` : ''}
      ${relHTML ? `<div class="modal-divider"></div><div class="modal-section-label">Связи</div><div class="modal-relations">${relHTML}</div>` : ''}
      ${plotHTML ? `<div class="modal-divider"></div><div class="modal-section-label">Сюжетные линии</div><div class="modal-plot-badges">${plotHTML}</div>` : ''}
    `;
  }

  function buildPlaceModal(place) {
    return `
      <div class="modal-type-badge">${esc(place.type)} · ${esc(place.nation)}</div>
      <h2 class="modal-title" id="modalTitle">${esc(place.name)}</h2>
      <div class="modal-section-label">Описание</div>
      <p class="modal-text">${esc(place.description)}</p>
      <div class="modal-divider"></div>
      <div class="modal-section-label">Подробнее</div>
      <p class="modal-text">${esc(place.details || '—')}</p>
      ${place.tags && place.tags.length ? `<div class="modal-divider"></div>${buildTagsHTML(place.tags)}` : ''}
    `;
  }

  function buildNationModal(nation) {
    const heroes = (nation.heroes || [])
      .map(hid => D.characters.find(c => c.id === hid))
      .filter(Boolean);

    const heroChips = heroes.map(h =>
      `<span class="plot-char-chip" role="button" tabindex="0" data-hero-id="${esc(h.id)}">${esc(h.name)}</span>`
    ).join('');

    return `
      <div class="modal-type-badge">Народ · ${esc(nation.analogue)}</div>
      <h2 class="modal-title" id="modalTitle">${esc(nation.name)}</h2>
      <div class="modal-meta-grid">
        <div class="modal-meta-item">
          <div class="modal-meta-label">Родина</div>
          <div class="modal-meta-value">${esc(nation.homeland)}</div>
        </div>
        <div class="modal-meta-item">
          <div class="modal-meta-label">Аналог</div>
          <div class="modal-meta-value">${esc(nation.analogue)}</div>
        </div>
        <div class="modal-meta-item">
          <div class="modal-meta-label">Религия</div>
          <div class="modal-meta-value">${esc(nation.religion)}</div>
        </div>
        <div class="modal-meta-item">
          <div class="modal-meta-label">Жрецы</div>
          <div class="modal-meta-value">${esc(nation.priests)}</div>
        </div>
        <div class="modal-meta-item">
          <div class="modal-meta-label">Святилище</div>
          <div class="modal-meta-value">${esc(nation.temple)}</div>
        </div>
      </div>
      <div class="modal-section-label">Об этом народе</div>
      <p class="modal-text">${esc(nation.description)}</p>
      ${heroes.length ? `<div class="modal-divider"></div><div class="modal-section-label">Известные герои</div><div class="modal-plot-badges">${heroChips}</div>` : ''}
    `;
  }

  function buildGodModal(god) {
    return `
      <div class="modal-type-badge">Бог · ${esc(god.nation)}</div>
      <h2 class="modal-title" id="modalTitle">${esc(god.name)}</h2>
      <div class="modal-subtitle">${esc(god.role)}</div>
      <div class="modal-section-label">Описание</div>
      <p class="modal-text">${esc(god.description)}</p>
      ${god.tags && god.tags.length ? `<div class="modal-divider"></div>${buildTagsHTML(god.tags)}` : ''}
    `;
  }

  function buildHolidayModal(holiday) {
    return `
      <div class="modal-type-badge">Праздник · ${esc(holiday.nation)}</div>
      <h2 class="modal-title" id="modalTitle">${esc(holiday.name)}</h2>
      <div class="modal-meta-grid">
        <div class="modal-meta-item">
          <div class="modal-meta-label">Дата</div>
          <div class="modal-meta-value">${esc(holiday.date)}</div>
        </div>
        <div class="modal-meta-item">
          <div class="modal-meta-label">Бог</div>
          <div class="modal-meta-value">${esc(holiday.god)}</div>
        </div>
      </div>
      <div class="modal-section-label">Описание и обряды</div>
      <p class="modal-text">${esc(holiday.description)}</p>
      ${holiday.tags && holiday.tags.length ? `<div class="modal-divider"></div>${buildTagsHTML(holiday.tags)}` : ''}
    `;
  }

  function buildPlotModal(pl) {
    const chars = (pl.characters || [])
      .map(cid => D.characters.find(c => c.id === cid))
      .filter(Boolean);

    const charChips = chars.map(c =>
      `<span class="plot-char-chip" role="button" tabindex="0" data-hero-id="${esc(c.id)}">${esc(c.name)}</span>`
    ).join('');

    return `
      <div class="modal-type-badge">Сюжетная линия</div>
      <h2 class="modal-title" id="modalTitle">${pl.icon || ''} ${esc(pl.name)}</h2>
      <div class="modal-section-label">О линии</div>
      <p class="modal-text">${esc(pl.description)}</p>
      ${chars.length ? `<div class="modal-divider"></div><div class="modal-section-label">Участники</div><div class="modal-plot-badges">${charChips}</div>` : ''}
      ${pl.tags && pl.tags.length ? `<div class="modal-divider"></div>${buildTagsHTML(pl.tags)}` : ''}
    `;
  }

  function buildClergyModal(cl) {
    const hierarchyItems = (cl.hierarchy || []).map(h => `<li>${esc(h)}</li>`).join('');
    const tabooItems = (cl.taboos || []).map(t => `<li>${esc(t)}</li>`).join('');

    return `
      <div class="modal-type-badge">Жреческая традиция</div>
      <h2 class="modal-title" id="modalTitle">${esc(cl.nation)}</h2>
      <div class="modal-subtitle">${esc(cl.servants)} · ${esc(cl.temple)}</div>

      <div class="modal-section-label">О традиции</div>
      <p class="modal-text">${esc(cl.description)}</p>

      <div class="modal-divider"></div>
      <div class="modal-section-label">Одежда и атрибуты</div>
      <p class="modal-text">${esc(cl.clothing)}</p>

      ${hierarchyItems ? `
        <div class="modal-divider"></div>
        <div class="modal-section-label">Иерархия</div>
        <div class="clergy-modal-hierarchy">
          <ol>${hierarchyItems}</ol>
        </div>
      ` : ''}

      ${tabooItems ? `
        <div class="modal-divider"></div>
        <div class="modal-section-label">Табу</div>
        <div class="clergy-modal-taboos">
          <ul>${tabooItems}</ul>
        </div>
      ` : ''}

      ${cl.initiation ? `
        <div class="modal-divider"></div>
        <div class="modal-section-label">Посвящение и инициация</div>
        <p class="modal-text">${esc(cl.initiation)}</p>
      ` : ''}
    `;
  }

  // ── HELPERS ────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildTagsHTML(tags) {
    if (!tags || !tags.length) return '';
    return `<div class="card-tags">${tags.map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}</div>`;
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    renderCharacters();
    renderPlaces();
    renderNations();
    renderGods();
    renderHolidays();
    renderPlotlines();
    renderAcademy();
    renderClergy();
    renderGlossary();
    buildTagPills();
  }

  init();

})();
