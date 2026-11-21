/* Interface do Sistema: HUD, faixa da Promessa, telas, avisos e rolagens. */
(() => {
  const R = Rules;
  const st = () => Store.state;
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- Construtor de DOM ---------- */
  const PROPS = ['value', 'checked', 'disabled', 'hidden', 'selected', 'readOnly'];
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (PROPS.includes(k)) e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return e;
  }
  const save = () => Store.save();
  const tokens = () => {
    const s = st(), t = { PB: s.prof, NIV: s.level };
    R.ATTRS.forEach(([k], i) => { t[k] = R.mod(s.attrs[i]); });
    return t;
  };

  /* Janela do Sistema */
  function win(title, opts = {}, ...body) {
    const head = h('div', { class: 'win-head' },
      opts.orn ? h('span', { class: 'orn', 'aria-hidden': 'true', text: opts.orn }) : null,
      h('h2', { class: 'win-title', text: title }),
      h('span', { class: 'spacer' }),
      opts.note ? h('small', { text: opts.note }) : null,
      opts.actions || null);
    return h('section', { class: 'win ' + (opts.cls || ''), 'data-type': opts.type, style: opts.delay ? 'animation-delay:' + opts.delay + 'ms' : null }, head, ...body);
  }
  function field(label, value, onInput, opts = {}) {
    const input = h(opts.multiline ? 'textarea' : 'input', { class: opts.multiline ? 'area' : 'input', value: value ?? '', placeholder: opts.placeholder || '', type: opts.type || null, inputmode: opts.inputmode || null, 'data-fk': opts.fk || null });
    input.addEventListener('input', () => onInput(input.value));
    return label ? h('label', { class: 'lbl ' + (opts.cls || '') }, label, input) : input;
  }
  function select(options, value, onChange, label) {
    const s = h('select', { class: 'sel', 'aria-label': label || null });
    for (const opt of options) {
      if (Array.isArray(opt[1])) s.append(h('optgroup', { label: opt[0] }, opt[1].map(([v, t]) => h('option', { value: v, text: t }))));
      else s.append(h('option', { value: opt[0], text: opt[1] }));
    }
    s.value = value;
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }
  const numIn = (value, opts = {}) => h('input', { class: opts.cls || 'input', type: 'number', inputmode: 'numeric', value, min: opts.min ?? null, max: opts.max ?? null, 'aria-label': opts.label || null, 'data-fk': opts.fk || null });
  function bar(cls, value, max) {
    const b = h('div', { class: 'bar ' + cls, role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': value });
    b.append(h('i', { style: 'width:' + (max > 0 ? Math.min(100, value / max * 100) : 0) + '%' }));
    return b;
  }

  /* ---------- Avisos do Sistema ---------- */
  const toasts = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  document.body.append(toasts);
  function notify(title, text) {
    const t = h('div', { class: 'toast' }, h('b', { text: title.toUpperCase() }), h('p', { text }));
    toasts.append(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3600);
  }

  /* ---------- Janela de rolagem ---------- */
  const rollDlg = h('dialog', { class: 'sys', 'aria-labelledby': 'roll-title' });
  document.body.append(rollDlg);
  let lastRoll = null;
  function openRoll(title, result, expr, tok) {
    lastRoll = expr ? [title, expr, tok] : lastRoll;
    const total = h('div', { class: 'roll-total' + (result?.d20 === 20 ? ' crit' : result?.d20 === 1 ? ' fail' : ''), text: result ? String(result.total) : '⚄' });
    const detail = h('p', { class: 'roll-detail', text: result ? result.detail + (result.d20 === 20 ? ' · CRÍTICO' : result.d20 === 1 ? ' · FALHA CRÍTICA' : '') : 'Escolha um dado ou escreva uma expressão.' });
    const exprIn = h('input', { class: 'input', placeholder: 'Ex.: 1d20+DES+PB, 2d6+3', 'aria-label': 'Expressão de dados', value: expr && !result ? expr : '' });
    const form = h('form', { class: 'row', style: 'flex-wrap:nowrap' }, exprIn, h('button', { class: 'btn primary', text: 'Rolar' }));
    form.addEventListener('submit', e => { e.preventDefault(); if (exprIn.value.trim()) doRoll('Expressão', exprIn.value.trim()); });
    const dice = h('div', { class: 'dice-row' }, [4, 6, 8, 10, 12, 20, 100].map(n => h('button', { class: 'btn sm', type: 'button', text: 'd' + n, onclick: () => doRoll('d' + n, '1d' + n) })));
    rollDlg.replaceChildren(win(title, { orn: '⚄', actions: h('button', { class: 'x', 'aria-label': 'Fechar', text: '×', onclick: () => rollDlg.close() }) },
      total, detail, dice, form,
      h('p', { class: 'hint', text: 'Atalhos: FOR DES CON INT SAB CAR (modificadores), PB, NIV.' }),
      lastRoll && result ? h('button', { class: 'btn', style: 'width:100%;margin-top:8px', text: 'Rolar de novo', onclick: () => doRoll(...lastRoll) }) : null));
    rollDlg.querySelector('.win').id = 'roll-title';
    if (!rollDlg.open) rollDlg.showModal();
  }
  /* tok: atributos de outra criatura (um familiar); sem ele, valem os do personagem */
  function doRoll(title, expr, tok) {
    const r = R.rollExpr(expr, tok || tokens());
    if (!r) return openRoll(title, { total: '?', detail: 'Não entendi “' + expr + '”.', d20: null });
    openRoll(title, r, expr, tok);
  }
  const rollCheck = (title, bonus) => doRoll(title, '1d20' + R.signed(bonus));
  rollDlg.addEventListener('click', e => { if (e.target === rollDlg) rollDlg.close(); });

  /* ---------- Nível ---------- */
  const lvlDlg = h('dialog', { class: 'sys' });
  document.body.append(lvlDlg);
  function levelUp(from, to) {
    lvlDlg.replaceChildren(win('As runas se acendem', { orn: '✦' },
      h('div', { class: 'levelup' },
        h('div', { class: 'big', text: 'NÍVEL ' + to }),
        h('p', { class: 'muted', text: 'Seu nível aumentou (' + from + ' → ' + to + ').' }),
        h('p', { text: 'Bônus de proficiência: ' + R.signed(st().prof) }),
        h('button', { class: 'btn primary', text: 'Confirmar', onclick: () => lvlDlg.close() }))));
    lvlDlg.showModal();
  }

  /* ---------- HUD e faixa da Promessa ---------- */
  const SCREENS = [
    ['status', 'Status', '✠', 'Status'], ['skills', 'Habilidades', '✦', 'Hab.'], ['familiars', 'Familiares', '❂', 'Famil.'], ['inventory', 'Inventário', '⚔', 'Itens'],
    ['quests', 'Missões', '❖', 'Missões'], ['record', 'Registro', '❦', 'Registro'], ['journal', 'Diário', '✎', 'Diário']
  ];
  let current = 'status';
  try { const saved = sessionStorage.getItem('bedivere-tela'); if (SCREENS.some(s => s[0] === saved)) current = saved; } catch {}

  const hud = h('header', { class: 'hud' });
  const strip = h('div', { class: 'oath-strip', role: 'button', tabindex: '0', 'aria-label': 'Abrir a Promessa' });
  const main = h('main', { id: 'main' });
  const fab = h('button', { class: 'fab', 'aria-label': 'Rolar dados', title: 'Rolar dados', text: '⚄', onclick: () => openRoll('Rolagem', null) });
  document.body.append(hud, strip, main, fab);

  function renderHud() {
    const s = st();
    const hpLow = s.hp / s.maxhp <= 0.3;
    hud.replaceChildren(
      h('a', { class: 'hud-brand', href: '#', onclick: e => { e.preventDefault(); go('status'); } },
        h('b', { text: '✠', 'aria-hidden': 'true' }), h('span', {}, h('strong', { text: s.name.toUpperCase() || 'BEDIVERE' }), h('small', { text: 'NÍVEL ' + s.level + ' · GRIMÓRIO' }))),
      h('nav', { class: 'tabs', 'aria-label': 'Páginas do grimório' }, SCREENS.map(([id, label, icon, short]) =>
        h('button', { class: 'tab', type: 'button', 'aria-label': label, 'aria-current': id === current ? 'page' : null, onclick: () => go(id) },
          h('i', { text: icon, 'aria-hidden': 'true' }), h('span', { class: 'full', text: label, 'aria-hidden': 'true' }), h('span', { class: 'short', text: short, 'aria-hidden': 'true' })))),
      h('div', { class: 'hud-side' },
        h('div', { class: 'hud-hp' }, h('span', { text: 'PV ' + s.hp + ' / ' + s.maxhp + (s.tempHp ? ' (+' + s.tempHp + ')' : '') }), bar('hp' + (hpLow ? ' low' : ''), s.hp, s.maxhp)),
        h('button', { class: 'btn icon ghost', 'aria-label': 'Configurações', title: 'Configurações', text: '⚙', onclick: openSettings })));
    const seals = s.promise.seals;
    strip.replaceChildren(
      h('span', { class: 'cross', 'aria-hidden': 'true', text: '✠' }),
      h('q', { class: s.promise.oath ? null : 'empty', text: s.promise.oath || 'Escreva o juramento do personagem…' }),
      h('div', { class: 'seal-row', 'aria-label': seals.filter(x => x.done).length + ' de ' + seals.length + ' selos acesos' }, seals.map(x => h('i', { class: x.done ? 'on' : '' }))),
      h('small', { text: 'A PROMESSA' }));
  }
  strip.addEventListener('click', () => { go('status'); setTimeout(() => $('#promise')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); });
  strip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); strip.click(); } });
  Store.onChange(renderHud);

  function go(id) {
    current = id;
    try { sessionStorage.setItem('bedivere-tela', id); } catch {}
    renderHud(); render();
    window.scrollTo({ top: 0 });
  }
  /* Redesenha a tela atual mantendo foco e rolagem */
  function render() {
    const fk = document.activeElement?.dataset?.fk;
    const y = window.scrollY;
    const screen = { status: screenStatus, skills: screenSkills, familiars: screenFamiliars, inventory: screenInventory, quests: screenQuests, record: screenRecord, journal: screenJournal }[current]();
    screen.classList.add('screen');
    main.replaceChildren(screen);
    window.scrollTo({ top: y });
    if (fk) main.querySelector('[data-fk="' + CSS.escape(fk) + '"]')?.focus({ preventScroll: true });
  }
  const refresh = () => { save(); render(); };
  const screenHead = (title, sub, ...actions) => h('div', { class: 'screen-head' },
    h('div', {}, h('h1', { text: title }), h('p', { text: sub }), window.Orn ? Orn.divider() : null),
    actions.length ? h('div', { class: 'row' }, actions) : null);

  /* ================= STATUS ================= */
  function screenStatus() {
    const s = st();
    const nameEl = h('h2', { text: s.name || 'Sem nome' });
    const epiEl = h('p', { class: 'epithet' + (s.epithet ? '' : ' empty'), text: s.epithet || 'Escreva um epíteto…' });
    const kv = (label, key, cls) => h('label', { class: cls || null }, label, h('input', { value: s[key], placeholder: 'A registrar', 'data-fk': 'kv-' + key, oninput: e => {
      s[key] = e.target.value;
      if (key === 'name') nameEl.textContent = s.name || 'Sem nome';
      if (key === 'epithet') { epiEl.textContent = s.epithet || 'Escreva um epíteto…'; epiEl.classList.toggle('empty', !s.epithet); }
      save();
    } }));
    const player = win('Portador', { orn: '✠', delay: 0 },
      h('div', { class: 'player' },
        portraitBox(s),
        h('div', { class: 'name-block' }, nameEl, epiEl,
          h('div', { class: 'kv' }, kv('Nome', 'name'), kv('Título', 'title'), kv('Classe', 'classes', 'wide'), kv('Afinidade', 'affinity'), kv('Raça', 'race'),
            kv('Idade', 'age'), kv('Altura', 'height'), kv('Gênero', 'gender'), kv('Antecedente', 'background'), kv('Epíteto', 'epithet', 'wide')))));

    /* Vitalidade */
    const hpIn = numIn(s.hp, { min: 0, label: 'PV atuais', fk: 'hp' });
    const maxIn = numIn(s.maxhp, { min: 1, label: 'PV máximos', fk: 'maxhp' });
    [hpIn, maxIn].forEach(i => { i.className = ''; });
    hpIn.addEventListener('change', () => { s.hp = R.int(hpIn.value, s.hp); refresh(); });
    maxIn.addEventListener('change', () => { s.maxhp = R.int(maxIn.value, s.maxhp); refresh(); });
    const amount = numIn(1, { min: 1, label: 'Quantidade', fk: 'dmg' });
    const status = h('p', { class: 'hint', role: 'status' });
    const dmgForm = h('form', { class: 'dmg-form' }, amount,
      h('button', { class: 'btn danger', value: 'dmg', text: 'Dano' }), h('button', { class: 'btn', value: 'heal', text: 'Cura' }));
    dmgForm.addEventListener('submit', e => {
      e.preventDefault();
      const n = Math.max(0, R.int(amount.value)); if (!n) return;
      if (e.submitter?.value === 'heal') { const b = s.hp; s.hp = Math.min(s.maxhp, s.hp + n); notify('Vitalidade', '+' + (s.hp - b) + ' PV'); }
      else {
        const absorbed = Math.min(s.tempHp, n); s.tempHp -= absorbed; s.hp = Math.max(0, s.hp - (n - absorbed));
        notify('Vitalidade', '−' + n + ' PV' + (absorbed ? ' (' + absorbed + ' nos temporários)' : '') + (s.hp === 0 ? ' · Inconsciente' : ''));
      }
      refresh();
    });
    const tempIn = numIn(s.tempHp, { min: 0, label: 'PV temporários', fk: 'temp' });
    tempIn.addEventListener('change', () => { s.tempHp = Math.max(0, R.int(tempIn.value)); refresh(); });
    const mpIn = numIn(s.mana, { min: 0, label: 'Mana atual', fk: 'mp' }), mpMax = numIn(s.maxMana, { min: 0, label: 'Mana máxima', fk: 'mpmax' });
    [mpIn, mpMax].forEach(i => { i.className = ''; });
    mpIn.addEventListener('change', () => { s.mana = R.int(mpIn.value, s.mana); refresh(); });
    mpMax.addEventListener('change', () => { s.maxMana = R.int(mpMax.value, s.maxMana); refresh(); });
    const mpAmt = numIn(1, { min: 1, label: 'Mana', fk: 'mpamt' });
    const mpForm = h('form', { class: 'dmg-form' }, mpAmt, h('button', { class: 'btn', value: 'spend', text: 'Gastar' }), h('button', { class: 'btn', value: 'gain', text: 'Recuperar' }));
    mpForm.addEventListener('submit', e => {
      e.preventDefault(); const n = Math.max(0, R.int(mpAmt.value)); if (!n) return;
      if (e.submitter?.value === 'gain') s.mana = Math.min(s.maxMana, s.mana + n);
      else { if (n > s.mana) return notify('Mana', 'Mana insuficiente (' + s.mana + '/' + n + ').'); s.mana -= n; }
      refresh();
    });
    const acIn = numIn(s.ac, { label: 'Classe de armadura', fk: 'ac', cls: '' });
    acIn.addEventListener('change', () => { s.ac = R.int(acIn.value, s.ac); refresh(); });
    const pbIn = numIn(s.prof, { label: 'Bônus de proficiência', fk: 'pb', cls: '' });
    pbIn.readOnly = s.autoProf; pbIn.title = s.autoProf ? 'Automático pelo nível (desligue em Experiência)' : '';
    pbIn.addEventListener('change', () => { s.prof = R.int(pbIn.value, s.prof); refresh(); });
    const spIn = h('input', { value: s.speed, placeholder: '—', 'aria-label': 'Deslocamento', 'data-fk': 'speed', oninput: e => { s.speed = e.target.value; save(); } });
    const vitals = win('Vitalidade', { orn: '✚', delay: 60 },
      h('div', { class: 'vitals' },
        h('div', {}, h('div', { class: 'vital-top' }, h('span', { text: 'PONTOS DE VIDA' }), h('b', {}, hpIn, ' / ', maxIn)), bar('hp' + (s.hp / s.maxhp <= 0.3 ? ' low' : ''), s.hp, s.maxhp)),
        dmgForm,
        h('label', { class: 'lbl', style: 'grid-template-columns:1fr 90px;align-items:center' }, 'PV temporários (absorvem o dano primeiro)', tempIn),
        status,
        h('div', {}, h('div', { class: 'vital-top' }, h('span', { text: 'MANA' }), h('b', {}, mpIn, ' / ', mpMax)), bar('mp', s.mana, s.maxMana)),
        mpForm,
        h('div', { class: 'tiles' },
          h('div', { class: 'tile' }, h('small', { text: 'CA' }), acIn),
          h('div', { class: 'tile' }, h('small', { text: 'Iniciativa' }), h('button', { class: 'btn ghost', style: 'border:0;font:700 24px var(--title);min-height:0;padding:0', text: R.signed(R.mod(s.attrs[1])), title: 'Rolar iniciativa', onclick: () => rollCheck('Iniciativa', R.mod(s.attrs[1])) })),
          h('div', { class: 'tile' }, h('small', { text: 'Prof.' }), pbIn),
          h('div', { class: 'tile' }, h('small', { text: 'Desloc.' }), spIn))));

    /* Atributos */
    const attrs = win('Atributos', { orn: '◆', delay: 120, note: 'toque para rolar' },
      h('div', { class: 'attr-list' }, R.ATTRS.map(([abbr, name], i) => {
        const input = numIn(s.attrs[i], { min: 1, max: 30, label: name, fk: 'attr-' + i, cls: '' });
        input.addEventListener('change', () => { s.attrs[i] = R.clamp(R.int(input.value, 10), 1, 30); refresh(); });
        const m = R.mod(s.attrs[i]);
        return h('div', { class: 'attr-row' }, h('abbr', { title: name, text: abbr }),
          h('div', { class: 'meta' }, h('span', { text: name }), bar('', s.attrs[i], 20)), input,
          h('button', { class: 'btn', text: R.signed(m), 'aria-label': 'Rolar ' + name + ' (' + R.signed(m) + ')', onclick: () => rollCheck(name, m) }));
      })));

    /* Experiência */
    const need = R.XP[s.level] ?? null, prev = R.XP[s.level - 1] ?? 0;
    const xpIn = numIn('', { min: 1, label: 'XP ganho', fk: 'xpin' }); xpIn.placeholder = '+ XP ganho';
    const xpForm = h('form', { class: 'xp-form' }, xpIn, h('button', { class: 'btn primary', text: 'Adicionar' }));
    xpForm.addEventListener('submit', e => {
      e.preventDefault(); const n = Math.max(0, R.int(xpIn.value)); if (!n) return;
      s.xp += n; const from = s.level, to = Math.max(s.level, R.levelForXp(s.xp));
      s.level = to; save();
      notify('Experiência', '+' + n.toLocaleString('pt-BR') + ' XP');
      if (to > from) { if (s.autoProf) s.prof = R.pbFor(to); save(); levelUp(from, to); }
      render();
    });
    const lvIn = numIn(s.level, { min: 1, max: 20, label: 'Nível', fk: 'lv', cls: 'input' });
    lvIn.addEventListener('change', () => { s.level = R.clamp(R.int(lvIn.value, 1), 1, 20); refresh(); });
    const auto = h('input', { type: 'checkbox', checked: s.autoProf, onchange: e => { s.autoProf = e.target.checked; refresh(); } });
    const xpWin = win('Experiência', { orn: '✦', delay: 180 },
      h('div', { class: 'xp-line' }, h('span', { text: 'XP ' + s.xp.toLocaleString('pt-BR') }), h('span', { text: need ? 'próximo nível: ' + need.toLocaleString('pt-BR') : 'nível máximo' })),
      bar('xp', need ? s.xp - prev : 1, need ? need - prev : 1), xpForm,
      h('div', { class: 'row', style: 'margin-top:12px' }, h('label', { class: 'lbl', style: 'width:90px' }, 'Nível', lvIn),
        h('label', { class: 'row muted', style: 'font-size:12.5px' }, auto, 'Proficiência automática pelo nível')));

    /* Estado: condições e descansos */
    const stateWin = win('Estado', { orn: '☾', delay: 240 },
      h('div', { class: 'row' }, R.CONDITIONS.map(c => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(s.conditions.includes(c)), text: c,
        onclick: () => { s.conditions = s.conditions.includes(c) ? s.conditions.filter(x => x !== c) : [...s.conditions, c]; refresh(); } }))),
      h('div', { class: 'divider' }),
      h('div', { class: 'row' }, h('button', { class: 'btn', text: '☾ Descanso curto', onclick: () => rest('short') }), h('button', { class: 'btn primary', text: '☀ Descanso longo', onclick: () => rest('long') })));

    /* Equipamento em uso, com a durabilidade de cada peça */
    const worn = s.items.map((it, i) => [it, i]).filter(([it]) => it.equipped);
    const equipWin = win('Equipamento', { orn: '⚔', delay: 300 },
      worn.length ? h('div', { class: 'gear-list' }, worn.map(([it, i]) => {
        const g = R.gearInfo(it), stN = g ? (g.immune ? 'artefato' : R.stateOf(it.pd, g.max)) : null;
        return h('button', { class: 'gear', type: 'button', 'data-state': stN, onclick: () => { selItem = i; go('inventory'); } },
          h('span', { class: 'gear-ico', text: it.icon || '✦', 'aria-hidden': 'true' }),
          h('span', { class: 'gear-main' }, h('span', { class: 'gear-name', text: it.name || 'Item' }),
            g ? h('span', { class: 'pd-bar' }, h('i', { style: 'width:' + (g.immune ? 100 : it.pd / g.max * 100) + '%' })) : h('small', { class: 'hint', text: 'Sem durabilidade' })),
          g ? h('span', { class: 'gear-pd' }, h('b', { text: g.immune ? '∞' : it.pd + '/' + g.max }), h('small', { text: R.STATE_LABEL[stN] })) : null);
      })) : h('p', { class: 'hint', style: 'margin:0', text: 'Nada equipado. No Inventário, marque armas, armaduras e escudos como “Equipado” para acompanhar a durabilidade aqui.' }));

    return h('div', {},
      screenHead('Status', 'Folha do portador'),
      h('div', { class: 'cols' },
        h('div', { class: 'span-7 stack' }, player, promiseWindow(), equipWin),
        h('div', { class: 'span-5 stack' }, vitals, attrs, xpWin, stateWin)));
  }

  /* Retrato enviado pelo jogador (reduzido para caber no salvamento local) */
  function shrink(file, size = 720) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(); };
      img.src = url;
    });
  }
  function portraitBox(s) {
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      try {
        if (f.size > 15 * 1024 * 1024) throw Error();
        s.portrait = await shrink(f); refresh(); notify('Runas', 'Retrato atualizado.');
      } catch { notify('Runas', 'Não foi possível usar essa imagem.'); }
      finally { file.value = ''; }
    });
    const box = h('button', { class: 'portrait' + (s.portrait ? '' : ' empty'), type: 'button', 'aria-label': s.portrait ? 'Trocar retrato' : 'Adicionar retrato', 'data-fk': 'portrait', onclick: () => file.click() },
      s.portrait ? h('img', { src: s.portrait, alt: '' }) : h('span', { class: 'portrait-empty' }, h('b', { 'aria-hidden': 'true' }, h('span', { text: '✠' })), h('span', { text: 'Adicionar retrato' })),
      s.portrait ? h('span', { class: 'rank', title: 'Nível' }, h('span', { text: String(s.level) })) : null);
    return h('div', { class: 'portrait-wrap' }, h('div', { class: 'portrait-box' }, box, window.Orn ? Orn.portraitFrame() : null), file,
      s.portrait ? h('button', { class: 'btn sm ghost', text: 'Remover retrato', onclick: () => { if (confirm('Remover o retrato?')) { s.portrait = ''; refresh(); } } }) : null);
  }
  /* Estado vazio decorado, com convite para preencher */
  const empty = (icon, title, text, label, onClick) => h('div', { class: 'empty-state' },
    h('div', { class: 'empty-sigil', 'aria-hidden': 'true' }, h('span', { text: icon })),
    h('h3', { text: title }), text ? h('p', { text }) : null,
    label ? h('button', { class: 'btn primary', text: label, onclick: onClick }) : null);

  /* A Promessa: cresce por feitos (selos acesos pelo jogador ou pelo mestre) */
  let editingOath = false;
  function promiseWindow() {
    const p = st().promise;
    const lit = p.seals.filter(x => x.done).length;
    const body = editingOath
      ? h('div', { class: 'stack', style: 'gap:10px' },
        field('Juramento', p.oath, v => { p.oath = v; save(); }, { multiline: true, fk: 'oath' }),
        field('A quem', p.to, v => { p.to = v; save(); }, { fk: 'oath-to' }),
        h('button', { class: 'btn', text: 'Concluir', onclick: () => { editingOath = false; render(); } }))
      : p.oath
        ? h('div', { class: 'oath' }, window.Orn ? Orn.seal() : null, h('small', { text: p.to || 'Juramento' }), h('blockquote', { text: '“' + p.oath + '”' }),
          h('div', { class: 'progress-text', text: lit + ' / ' + p.seals.length + ' SELOS ACESOS' }))
        : empty('✠', 'Nenhum juramento escrito', 'Qual promessa move este personagem? Ela fica sempre visível no topo da ficha.', 'Escrever juramento', () => { editingOath = true; render(); });
    const seals = h('div', { class: 'seals' }, p.seals.map((seal, i) => h('div', { class: 'seal' + (seal.done ? ' on' : '') },
      h('button', { class: 'seal-gem', type: 'button', 'aria-pressed': String(seal.done), 'aria-label': (seal.done ? 'Apagar' : 'Acender') + ' selo: ' + seal.text, 'data-fk': 'seal-' + i,
        onclick: () => { seal.done = !seal.done; if (seal.done) notify('Selo da Promessa aceso', seal.text || 'Um feito foi registrado.'); refresh(); } }, h('i')),
      h('input', { value: seal.text, placeholder: 'Descreva o feito…', 'aria-label': 'Feito', 'data-fk': 'seal-text-' + i, oninput: e => { seal.text = e.target.value; save(); } }),
      h('button', { class: 'x', 'aria-label': 'Remover feito', text: '×', onclick: () => { if (confirm('Remover este feito?')) { p.seals.splice(i, 1); refresh(); } } }))));
    const w = win('A Promessa', { orn: '✠', cls: 'promise', delay: 90, actions: h('button', { class: 'btn sm ghost', text: editingOath ? 'Editando' : 'Editar', onclick: () => { editingOath = !editingOath; render(); } }) },
      body, seals,
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:space-between' },
        h('p', { class: 'hint', style: 'margin:0', text: p.seals.length ? 'A Promessa cresce por feitos. Acenda um selo quando ele acontecer na história.' : 'Registre feitos importantes da jornada e acenda os selos quando acontecerem.' }),
        h('button', { class: 'btn sm', text: '+ Novo feito', onclick: () => { p.seals.push({ text: '', done: false }); refresh(); setTimeout(() => main.querySelector('[data-fk="seal-text-' + (p.seals.length - 1) + '"]')?.focus(), 0); } })));
    w.id = 'promise';
    return w;
  }

  function rest(kind) {
    const s = st();
    if (!confirm(kind === 'long' ? 'Fazer um descanso longo? Recupera PV e mana (também dos familiares), zera PV temporários e recarrega todos os usos.' : 'Fazer um descanso curto? Recarrega os usos de descanso curto.')) return;
    [...s.abilities, ...s.techniques, ...s.familiars.flatMap(f => f.abilities)].forEach(a => { if (kind === 'long' || a.reset === 'short') a.uses = a.usesMax; });
    if (kind === 'long') s.familiars.forEach(f => { f.hp = f.maxhp; });
    s.items.forEach(i => { i.maintShort = false; if (kind === 'long') i.maintLong = false; });
    if (kind === 'long') { s.hp = s.maxhp; s.mana = s.maxMana; s.tempHp = 0; s.conditions = s.conditions.filter(c => c !== 'Concentrando'); }
    refresh();
    notify(kind === 'long' ? 'Descanso longo' : 'Descanso curto', kind === 'long' ? 'PV, mana e usos restaurados.' : 'Usos de descanso curto recarregados.');
  }

  /* ================= HABILIDADES ================= */
  const RESET = [['long', 'Descanso longo'], ['short', 'Descanso curto'], ['none', 'Manual']];
  /* usos por descanso (pips), comum a habilidades, técnicas e habilidades de familiares */
  const usesRow = (a, fk) => {
    const max = Math.max(0, R.int(a.usesMax));
    const maxIn = numIn(max, { min: 0, max: 30, label: 'Usos máximos', fk: fk + '-max' });
    maxIn.style.width = '64px';
    maxIn.addEventListener('change', () => { a.usesMax = R.clamp(R.int(maxIn.value), 0, 30); a.uses = Math.min(R.int(a.uses), a.usesMax); refresh(); });
    return h('div', { class: 'row' }, h('span', { class: 'muted', style: 'font-size:12px;letter-spacing:.14em', text: 'USOS' }),
      h('div', { class: 'pips' }, Array.from({ length: max }, (_, k) => h('button', { type: 'button', class: k < a.uses ? 'on' : '', 'aria-label': 'Uso ' + (k + 1) + ' de ' + max,
        onclick: () => { a.uses = k + 1 === a.uses ? k : k + 1; refresh(); } }))),
      h('span', { style: 'flex:1' }), maxIn, select(RESET, a.reset || 'long', v => { a.reset = v; save(); }, 'Recarga'));
  };
  const footer = (a, list, i, label, diceFrom, tok) => h('div', { class: 'row', style: 'justify-content:space-between' },
    R.firstDice(diceFrom) ? h('button', { class: 'btn sm', text: '⚄ Rolar ' + R.firstDice(diceFrom), onclick: () => doRoll(a.name || label, R.firstDice(diceFrom), tok?.()) }) : h('span'),
    h('button', { class: 'btn sm danger', text: '✕ Excluir ' + label, onclick: () => { if (confirm('Excluir “' + (a.name || label) + '”?')) { list.splice(i, 1); refresh(); } } }));
  let openSkill = null, skillTab = 'pericias';

  /* ---------- Árvore de habilidades ---------- */
  /* Cada nó tem ramo (coluna), nível (linha), custo em pontos e pré-requisitos.
     Desbloquear exige os pré-requisitos e gasta pontos; bloquear de novo devolve. */
  let selNode = null, scrollToEditor = false;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const branchOf = n => n.branch.trim() || 'Sem ramo';
  function treeAdd(parent) {
    const T = st().tree;
    const first = T.nodes[0];
    const n = { id: Math.random().toString(36).slice(2, 10), name: '', branch: parent ? parent.branch : (first ? first.branch : 'Ramo 1'),
      tier: parent ? Math.min(10, parent.tier + 1) : 1, cost: 1, req: parent ? [parent.id] : [], text: '', unlocked: false };
    T.nodes.push(n); selNode = n.id; scrollToEditor = true; refresh();
    setTimeout(() => main.querySelector('[data-fk="tn-name"]')?.focus(), 0);
  }
  function treeView() {
    const s = st(), T = s.tree, nodes = T.nodes;
    const byId = id => nodes.find(n => n.id === id);
    const reqMet = n => n.req.every(r => byId(r)?.unlocked);
    const stateOf = n => n.unlocked ? 'on' : !reqMet(n) ? 'locked' : T.points >= n.cost ? 'ready' : 'poor';
    if (selNode && !byId(selNode)) selNode = null;
    const spent = nodes.reduce((t, n) => t + (n.unlocked ? n.cost : 0), 0);
    const pts = n => n + (n === 1 ? ' ponto' : ' pontos');

    const pointsIn = numIn(T.points, { min: 0, label: 'Pontos disponíveis', fk: 'tree-points', cls: '' });
    pointsIn.addEventListener('change', () => { T.points = Math.max(0, R.int(pointsIn.value, T.points)); refresh(); });
    const summary = h('div', { class: 'tiles tree-tiles' },
      h('div', { class: 'tile' }, h('small', { text: 'Pontos livres' }), pointsIn),
      h('div', { class: 'tile' }, h('small', { text: 'Gastos' }), h('strong', { text: String(spent) })),
      h('div', { class: 'tile' }, h('small', { text: 'Desbloqueadas' }), h('strong', { text: nodes.filter(n => n.unlocked).length + '/' + nodes.length })));

    if (!nodes.length) return win('Árvore de habilidades', { orn: '❖' }, summary,
      empty('❖', 'A árvore está vazia', 'Monte os ramos de evolução do personagem: cada habilidade tem custo em pontos e pode exigir outras antes.', '+ Primeira habilidade da árvore', () => treeAdd(null)));

    /* tabuleiro: coluna de níveis + uma coluna por ramo */
    const branches = [...new Set(nodes.map(branchOf))];
    const maxTier = Math.max(...nodes.map(n => n.tier));
    const board = h('div', { class: 'tree-board', style: 'grid-template-columns:30px repeat(' + branches.length + ',minmax(150px,1fr));grid-template-rows:auto repeat(' + maxTier + ',auto)' });
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'tree-lines'); svg.setAttribute('aria-hidden', 'true');
    board.append(svg);
    for (let t = 1; t <= maxTier; t++) board.append(h('div', { class: 'tree-tier', style: 'grid-row:' + (t + 1), text: t, title: 'Nível ' + t }));
    branches.forEach((b, c) => {
      board.append(h('div', { class: 'tree-branch', style: 'grid-column:' + (c + 2), text: b }));
      for (let t = 1; t <= maxTier; t++) {
        const cell = h('div', { class: 'tree-cell', style: 'grid-column:' + (c + 2) + ';grid-row:' + (t + 1) });
        nodes.filter(n => branchOf(n) === b && n.tier === t).forEach(n => {
          const sn = stateOf(n);
          const label = { on: 'desbloqueada', ready: 'pode desbloquear', poor: 'faltam pontos', locked: 'exige pré-requisitos' }[sn];
          cell.append(h('button', { class: 'tree-node', type: 'button', 'data-id': n.id, 'data-state': sn, 'aria-pressed': String(selNode === n.id), 'aria-label': (n.name || 'Sem nome') + ', ' + pts(n.cost) + ', ' + label,
            onclick: () => { selNode = selNode === n.id ? null : n.id; scrollToEditor = !!selNode; render(); } },
            h('span', { class: 'tn-ico', 'aria-hidden': 'true', text: sn === 'on' ? '✦' : sn === 'locked' ? '⛓' : '◇' }),
            h('span', { class: 'tn-name', text: n.name || 'Sem nome' }),
            h('small', { text: pts(n.cost) })));
        });
        board.append(cell);
      }
    });
    /* linhas entre pré-requisito e habilidade, desenhadas depois que o tabuleiro tem tamanho */
    const draw = () => {
      if (!board.isConnected) { ro.disconnect(); return; }
      const W = board.scrollWidth, H = board.scrollHeight, br = board.getBoundingClientRect();
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      const pos = {};
      board.querySelectorAll('.tree-node').forEach(el => { const r = el.getBoundingClientRect(); pos[el.dataset.id] = { x: r.left - br.left + r.width / 2, top: r.top - br.top, bottom: r.bottom - br.top }; });
      const paths = [];
      nodes.forEach(n => n.req.forEach(rid => {
        const a = pos[rid], b = pos[n.id], rn = byId(rid); if (!a || !b) return;
        const y1 = a.bottom, y2 = b.top, my = (y1 + y2) / 2;
        const cls = rn.unlocked && n.unlocked ? 'on' : rn.unlocked ? 'ready' : '';
        const sel = selNode && (selNode === n.id || selNode === rid) ? ' sel' : '';
        paths.push('<path class="' + cls + sel + '" d="M' + a.x.toFixed(1) + ' ' + y1.toFixed(1) + ' C' + a.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + y2.toFixed(1) + '"/>');
      }));
      svg.innerHTML = paths.join('');
    };
    const ro = new ResizeObserver(draw);
    ro.observe(board);
    requestAnimationFrame(draw);

    const treeWin = win('Árvore de habilidades', { orn: '❖', note: '✦ desbloqueada · ◇ disponível · ⛓ bloqueada', actions: h('button', { class: 'btn sm', text: '+ Habilidade', onclick: () => treeAdd(null) }) },
      summary, h('div', { class: 'tree-scroll' }, board),
      h('p', { class: 'hint', style: 'margin:10px 0 0', text: 'Toque numa habilidade para editar, desbloquear ou criar outra abaixo dela. O ramo vira a coluna e o nível vira a linha.' }));
    if (!selNode) return treeWin;

    /* editor da habilidade selecionada */
    const n = byId(selNode), sn = stateOf(n);
    const descendants = new Set();
    (function walk(id) { nodes.forEach(m => { if (m.req.includes(id) && !descendants.has(m.id)) { descendants.add(m.id); walk(m.id); } }); })(n.id);
    const nameIn = h('input', { class: 'input', value: n.name, placeholder: 'Nome da habilidade', 'aria-label': 'Nome da habilidade da árvore', 'data-fk': 'tn-name',
      oninput: e => { n.name = e.target.value; const el = board.querySelector('[data-id="' + n.id + '"] .tn-name'); if (el) el.textContent = n.name || 'Sem nome'; save(); } });
    const branchList = h('datalist', { id: 'tree-branches' }, branches.map(b => h('option', { value: b })));
    const branchIn = h('input', { class: 'input', value: n.branch, placeholder: 'Ramo (ex.: Lâmina, Sombras)', list: 'tree-branches', 'aria-label': 'Ramo', 'data-fk': 'tn-branch', onchange: e => { n.branch = e.target.value; refresh(); } });
    const tierIn = numIn(n.tier, { min: 1, max: 10, label: 'Nível na árvore', fk: 'tn-tier' });
    tierIn.addEventListener('change', () => { n.tier = R.clamp(R.int(tierIn.value, n.tier), 1, 10); refresh(); });
    const costIn = numIn(n.cost, { min: 0, max: 99, label: 'Custo em pontos', fk: 'tn-cost' });
    costIn.addEventListener('change', () => { n.cost = R.clamp(R.int(costIn.value, n.cost), 0, 99); refresh(); });
    const options = nodes.filter(m => m.id !== n.id && !descendants.has(m.id));
    const reqChips = options.length ? h('div', { class: 'row' }, options.map(m => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(n.req.includes(m.id)), text: (m.name || 'Sem nome') + ' · ' + branchOf(m),
      onclick: () => { n.req = n.req.includes(m.id) ? n.req.filter(x => x !== m.id) : [...n.req, m.id]; refresh(); } })))
      : h('p', { class: 'hint', style: 'margin:0', text: 'Nenhuma outra habilidade pode ser pré-requisito desta.' });

    const missing = n.req.map(byId).filter(m => m && !m.unlocked).map(m => m.name || 'Sem nome');
    const blockers = nodes.filter(m => m.unlocked && m.req.includes(n.id)).map(m => m.name || 'Sem nome');
    let action;
    if (n.unlocked) action = h('button', { class: 'btn', disabled: blockers.length > 0, text: blockers.length ? 'Bloqueie antes: ' + blockers.join(', ') : 'Bloquear de novo (devolve ' + pts(n.cost) + ')',
      onclick: () => { n.unlocked = false; T.points += n.cost; refresh(); } });
    else action = h('button', { class: 'btn primary', disabled: sn !== 'ready', text: sn === 'locked' ? 'Exige: ' + missing.join(', ') : sn === 'poor' ? 'Faltam ' + pts(n.cost - T.points) : '✦ Desbloquear (' + pts(n.cost) + ')',
      onclick: () => { n.unlocked = true; T.points -= n.cost; refresh(); notify('Árvore de habilidades', 'Desbloqueada: ' + (n.name || 'habilidade sem nome') + '.'); } });
    const free = n.unlocked ? null : h('button', { class: 'btn sm ghost', text: 'Liberar sem gastar pontos', title: 'Quando o mestre concede a habilidade',
      onclick: () => { n.unlocked = true; refresh(); notify('Árvore de habilidades', 'Liberada pelo mestre: ' + (n.name || 'habilidade sem nome') + '.'); } });
    const dice = R.firstDice(n.text);
    const editor = win(n.name || 'Habilidade da árvore', { orn: '✦', cls: 'tree-editor', actions: h('button', { class: 'x', 'aria-label': 'Fechar editor', text: '×', onclick: () => { selNode = null; render(); } }) },
      h('div', { class: 'stack', style: 'gap:10px' },
        h('label', { class: 'lbl' }, 'Nome', nameIn),
        h('div', { class: 'tree-meta' }, h('label', { class: 'lbl' }, 'Ramo', branchIn, branchList), h('label', { class: 'lbl' }, 'Nível', tierIn), h('label', { class: 'lbl' }, 'Custo', costIn)),
        field('Descrição', n.text, v => { n.text = v; save(); }, { multiline: true, placeholder: 'O que a habilidade faz, bônus, dano (ex.: 2d8+FOR)…', fk: 'tn-text' }),
        h('div', { class: 'lbl' }, 'Pré-requisitos', reqChips),
        h('div', { class: 'row' }, action, free),
        h('div', { class: 'row', style: 'justify-content:space-between' },
          h('div', { class: 'row' },
            h('button', { class: 'btn sm', text: '+ Habilidade abaixo desta', onclick: () => treeAdd(n) }),
            dice ? h('button', { class: 'btn sm', text: '⚄ Rolar ' + dice, onclick: () => doRoll(n.name || 'Árvore', dice) }) : null),
          h('button', { class: 'btn sm danger', text: '✕ Excluir', onclick: () => {
            if (!confirm('Excluir “' + (n.name || 'esta habilidade') + '” da árvore?' + (n.unlocked ? ' Os ' + pts(n.cost) + ' voltam para você.' : ''))) return;
            if (n.unlocked) T.points += n.cost;
            nodes.forEach(m => { m.req = m.req.filter(x => x !== n.id); });
            nodes.splice(nodes.indexOf(n), 1); selNode = null; refresh();
          } }))));
    if (scrollToEditor) { scrollToEditor = false; requestAnimationFrame(() => { if (matchMedia('(max-width: 1100px)').matches) editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); }
    return h('div', { class: 'cols' }, h('div', { class: 'span-8' }, treeWin), h('div', { class: 'span-4' }, editor));
  }
  function screenSkills() {
    const s = st();
    const lvlMark = ['○', '●', '◆'], lvlName = ['Sem treino', 'Proficiente', 'Especialista'];
    /* cada perícia (padrão ou própria) tem nível, bônus extra e anotação */
    const rows = [
      ...R.SKILLS.map(([name, attr]) => {
        const info = s.skillInfo[name] || {};
        return { key: 'sk-' + name, name, attr, level: s.skillLevels[name] || 0, extra: R.int(info.extra, 0), note: info.note || '', custom: false,
          setLevel: n => { if (n) s.skillLevels[name] = n; else delete s.skillLevels[name]; },
          setInfo: (k, v) => { const cur = s.skillInfo[name] || {}; cur[k] = v; if (!cur.note && !R.int(cur.extra, 0)) delete s.skillInfo[name]; else s.skillInfo[name] = cur; } };
      }),
      ...s.customSkills.map((c, i) => ({ key: 'cs-' + i, name: c.name || 'Perícia sem nome', attr: c.attr, level: c.level, extra: c.extra, note: c.note, custom: c, index: i,
        setLevel: n => { c.level = n; }, setInfo: (k, v) => { c[k] = v; } }))
    ];
    const skillRow = sk => {
      const bonus = R.mod(s.attrs[sk.attr]) + s.prof * sk.level + sk.extra;
      const open = openSkill === sk.key;
      const row = h('div', { class: 'skill' + (open ? ' open' : '') + (sk.custom ? ' custom' : ''), 'data-level': sk.level },
        h('button', { type: 'button', text: lvlMark[sk.level], title: lvlName[sk.level] + ' · clique para mudar', 'aria-label': sk.name + ': ' + lvlName[sk.level] + '. Mudar', 'data-fk': sk.key + '-lv',
          onclick: () => { sk.setLevel((sk.level + 1) % 3); refresh(); } }),
        h('button', { class: 'skill-roll', type: 'button', 'aria-label': 'Rolar ' + sk.name + ' ' + R.signed(bonus), onclick: () => rollCheck(sk.name, bonus) },
          h('span', { text: sk.name }), h('small', { text: R.ATTRS[sk.attr][0] + (sk.extra ? ' ' + R.signed(sk.extra) : '') }), h('b', { text: R.signed(bonus) })),
        h('button', { class: 'skill-info' + (sk.note || sk.extra ? ' has' : ''), type: 'button', 'aria-expanded': String(open), 'aria-label': 'Detalhes de ' + sk.name, title: sk.note || 'Anotações e bônus', text: sk.note || sk.extra ? '✎' : 'ⓘ', 'data-fk': sk.key + '-info',
          onclick: () => { openSkill = open ? null : sk.key; render(); } }));
      if (!open) return row;
      const extraIn = numIn(sk.extra || '', { label: 'Bônus extra', fk: sk.key + '-extra' });
      extraIn.placeholder = '0';
      extraIn.addEventListener('change', () => { sk.setInfo('extra', R.int(extraIn.value, 0)); refresh(); });
      const editor = h('div', { class: 'skill-editor' },
        sk.custom ? h('div', { class: 'row', style: 'flex-wrap:nowrap' },
          field(null, sk.custom.name, v => { sk.custom.name = v; save(); }, { placeholder: 'Nome da perícia', fk: sk.key + '-name' }),
          select(R.ATTRS.map(([k, n], i) => [String(i), k + ' · ' + n]), String(sk.custom.attr), v => { sk.custom.attr = Number(v); refresh(); }, 'Atributo')) : null,
        h('div', { class: 'row', style: 'flex-wrap:nowrap;align-items:end' },
          h('label', { class: 'lbl', style: 'width:120px' }, 'Bônus extra', extraIn),
          h('p', { class: 'hint', style: 'margin:0', text: R.ATTRS[sk.attr][1] + ' ' + R.signed(R.mod(s.attrs[sk.attr])) + (sk.level ? ' · PB ' + R.signed(s.prof * sk.level) : '') + (sk.extra ? ' · extra ' + R.signed(sk.extra) : '') + ' = ' + R.signed(bonus) })),
        field(null, sk.note, v => { sk.setInfo('note', v); save(); }, { multiline: true, placeholder: 'De onde vem o treino, vantagens, situações especiais…', fk: sk.key + '-note' }),
        sk.custom ? h('button', { class: 'btn sm danger', style: 'justify-self:start', text: '✕ Excluir perícia', onclick: () => { if (confirm('Excluir a perícia “' + sk.name + '”?')) { s.customSkills.splice(sk.index, 1); openSkill = null; refresh(); } } }) : null);
      return h('div', { class: 'skill-wrap open' }, row, editor);
    };
    const addSkill = () => { s.customSkills.push({ name: '', attr: 1, level: 1, extra: 0, note: '' }); openSkill = 'cs-' + (s.customSkills.length - 1); refresh(); setTimeout(() => main.querySelector('[data-fk="' + openSkill + '-name"]')?.focus(), 0); };
    const skills = win('Perícias', { orn: '◆', note: '○ ● ◆ treino · ⓘ detalhes', actions: h('button', { class: 'btn sm', text: '+ Perícia própria', onclick: addSkill }) },
      h('div', { class: 'skill-grid' }, rows.map(skillRow)),
      h('p', { class: 'hint', style: 'margin:10px 0 0', text: 'Toque no nome para rolar. Em ⓘ você anota detalhes e soma bônus extras (itens, talentos, bênçãos…).' }));
    const training = win('Treinamento', { orn: '⛨' }, field(null, s.training, v => { s.training = v; save(); }, { multiline: true, placeholder: 'Resistências, armaduras, armas, ferramentas e idiomas…', fk: 'training' }));

    /* Habilidades: traços e poderes (passivos ou ativos) */
    const abilities = s.abilities.map((a, i) => win(a.branch || 'Habilidade', { orn: '✦', cls: 'ability' },
      h('div', { class: 'ability-head' }, h('div', { class: 'glyph' }, h('span', { text: '✦' })),
        h('input', { value: a.name, 'aria-label': 'Nome da habilidade', 'data-fk': 'ab-name-' + i, oninput: e => { a.name = e.target.value; save(); } })),
      h('div', { class: 'row', style: 'flex-wrap:nowrap' }, field(null, a.branch, v => { a.branch = v; save(); }, { placeholder: 'Categoria (passiva, racial…)', fk: 'ab-cat-' + i }),
        field(null, a.cost, v => { a.cost = v; save(); }, { placeholder: 'Custo / ativação', fk: 'ab-cost-' + i })),
      field(null, a.text, v => { a.text = v; save(); }, { multiline: true, placeholder: 'O que a habilidade faz…', fk: 'ab-text-' + i }),
      usesRow(a, 'ab-' + i), footer(a, s.abilities, i, 'habilidade', a.text)));

    /* Técnicas: golpes e manobras usados em ação, com alcance e dano */
    const ACTIONS = [['acao', 'Ação'], ['bonus', 'Ação bônus'], ['reacao', 'Reação'], ['livre', 'Livre'], ['ritual', 'Ritual']];
    const techniques = s.techniques.map((t, i) => win(ACTIONS.find(x => x[0] === t.action)?.[1] || 'Técnica', { orn: '⚔', cls: 'ability technique' },
      h('div', { class: 'ability-head' }, h('div', { class: 'glyph tech' }, h('span', { text: '⚔' })),
        h('input', { value: t.name, 'aria-label': 'Nome da técnica', 'data-fk': 'tc-name-' + i, oninput: e => { t.name = e.target.value; save(); } })),
      h('div', { class: 'tech-meta' },
        select(ACTIONS, t.action || 'acao', v => { t.action = v; refresh(); }, 'Tipo de ação'),
        field(null, t.range, v => { t.range = v; save(); }, { placeholder: 'Alcance', fk: 'tc-range-' + i }),
        field(null, t.cost, v => { t.cost = v; save(); }, { placeholder: 'Custo', fk: 'tc-cost-' + i }),
        field(null, t.damage, v => { t.damage = v; save(); }, { placeholder: 'Dano (ex.: 2d6+DES)', fk: 'tc-dmg-' + i })),
      field(null, t.text, v => { t.text = v; save(); }, { multiline: true, placeholder: 'Como a técnica funciona…', fk: 'tc-text-' + i }),
      usesRow(t, 'tc-' + i), footer(t, s.techniques, i, 'técnica', t.damage)));

    /* Títulos: conquistas com raridade; um deles pode ser usado como título ativo */
    const RAR = [['comum', 'Comum'], ['raro', 'Raro'], ['epico', 'Épico'], ['lendario', 'Lendário'], ['mitico', 'Mítico']];
    const titles = s.titles.map((t, i) => {
      const active = !!t.name && s.title === t.name;
      const useBtn = h('button', { class: 'btn sm' + (active ? ' primary' : ''), text: active ? '♛ Título em uso' : 'Usar como título', disabled: !t.name,
        onclick: () => { const on = !!t.name && s.title === t.name; s.title = on ? '' : t.name; refresh(); if (!on) notify('Título', 'Agora você é “' + t.name + '”.'); } });
      return h('article', { class: 'title-card', 'data-rarity': t.rarity || 'comum', 'data-active': String(active) },
        h('div', { class: 'title-crest', 'aria-hidden': 'true' }, h('span', { text: '♛' })),
        h('input', { class: 'title-name', value: t.name, placeholder: 'Nome do título', 'aria-label': 'Nome do título', 'data-fk': 'tt-name-' + i,
          oninput: e => { const was = active; t.name = e.target.value; if (was) s.title = t.name; useBtn.disabled = !t.name; save(); } }),
        select(RAR, t.rarity || 'comum', v => { t.rarity = v; refresh(); }, 'Raridade'),
        field(null, t.source, v => { t.source = v; save(); }, { placeholder: 'Como foi conquistado…', fk: 'tt-src-' + i }),
        field(null, t.benefit, v => { t.benefit = v; save(); }, { multiline: true, placeholder: 'Benefício ou efeito do título…', fk: 'tt-ben-' + i }),
        h('div', { class: 'row', style: 'justify-content:space-between' },
          useBtn,
          h('button', { class: 'btn sm danger', text: '✕ Excluir título', onclick: () => { if (confirm('Excluir o título “' + (t.name || 'sem nome') + '”?')) { if (active) s.title = ''; s.titles.splice(i, 1); refresh(); } } })));
    });

    const focusNew = fk => setTimeout(() => main.querySelector('[data-fk="' + fk + '"]')?.select(), 0);
    const add = {
      habilidades: () => { s.abilities.push({ name: 'Nova habilidade', branch: '', text: '', cost: '', uses: 0, usesMax: 0, reset: 'long' }); refresh(); focusNew('ab-name-' + (s.abilities.length - 1)); },
      tecnicas: () => { s.techniques.push({ name: 'Nova técnica', action: 'acao', range: '', cost: '', damage: '', text: '', uses: 0, usesMax: 0, reset: 'long' }); refresh(); focusNew('tc-name-' + (s.techniques.length - 1)); },
      titulos: () => { s.titles.push({ name: '', rarity: 'comum', source: '', benefit: '' }); refresh(); focusNew('tt-name-' + (s.titles.length - 1)); },
      arvore: () => treeAdd(null)
    };
    const TABS = [['pericias', 'Perícias', R.SKILLS.length + s.customSkills.length], ['habilidades', 'Habilidades', s.abilities.length], ['tecnicas', 'Técnicas', s.techniques.length], ['arvore', 'Árvore', s.tree.nodes.length], ['titulos', 'Títulos', s.titles.length]];
    const tabs = h('div', { class: 'row subtabs', role: 'tablist' }, TABS.map(([k, label, n]) =>
      h('button', { class: 'chip', type: 'button', role: 'tab', 'aria-selected': String(skillTab === k), 'aria-pressed': String(skillTab === k), onclick: () => { skillTab = k; openSkill = null; render(); } }, label, h('small', { class: 'count', text: String(n) }))));
    let body;
    if (skillTab === 'pericias') body = h('div', { class: 'cols' }, h('div', { class: 'span-8' }, skills), h('div', { class: 'span-4' }, training));
    else if (skillTab === 'habilidades') body = abilities.length ? h('div', { class: 'ability-grid' }, abilities)
      : win('Habilidades', { orn: '✦' }, empty('✦', 'Nenhuma habilidade registrada', 'Traços, poderes passivos e habilidades especiais do personagem, com usos por descanso.', '+ Primeira habilidade', add.habilidades));
    else if (skillTab === 'tecnicas') body = techniques.length ? h('div', { class: 'ability-grid' }, techniques)
      : win('Técnicas', { orn: '⚔' }, empty('⚔', 'Nenhuma técnica registrada', 'Golpes, disparos e manobras: tipo de ação, alcance, custo e dano com rolagem.', '+ Primeira técnica', add.tecnicas));
    else if (skillTab === 'arvore') body = treeView();
    else body = titles.length ? h('div', { class: 'title-grid' }, titles)
      : win('Títulos', { orn: '♛' }, empty('♛', 'Nenhum título conquistado', 'Nomes ganhos na jornada, com raridade e benefício. Um deles pode virar o título exibido no Status.', '+ Primeiro título', add.titulos));
    const addLabel = { habilidades: '+ Habilidade', tecnicas: '+ Técnica', arvore: '+ Na árvore', titulos: '+ Título' }[skillTab];
    return h('div', {},
      screenHead('Habilidades', 'Perícias, habilidades, técnicas, árvore e títulos', addLabel ? h('button', { class: 'btn primary', text: addLabel, onclick: add[skillTab] }) : null),
      tabs, body);
  }

  /* ================= FAMILIARES ================= */
  /* Criaturas ligadas ao personagem: vida, CA, atributos próprios e habilidades com usos */
  const newFamiliar = () => ({ name: '', kind: '', bond: '', portrait: '', hp: 10, maxhp: 10, ac: 10, speed: '', attrs: [10, 10, 10, 10, 10, 10], notes: '', abilities: [] });
  function screenFamiliars() {
    const s = st();
    const addFam = () => { s.familiars.push(newFamiliar()); refresh(); setTimeout(() => main.querySelector('[data-fk="fm-' + (s.familiars.length - 1) + '-name"]')?.focus(), 0); };
    const cards = s.familiars.map((f, i) => {
      const fk = 'fm-' + i + '-';
      const who = () => f.name || 'Familiar';
      /* PB e nível são os do personagem; os modificadores são os do familiar */
      const famTokens = () => { const t = { PB: s.prof, NIV: s.level }; R.ATTRS.forEach(([k], n) => { t[k] = R.mod(f.attrs[n]); }); return t; };
      let card;

      const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true });
      file.addEventListener('change', async () => {
        const fl = file.files[0]; if (!fl) return;
        try { if (fl.size > 15 * 1024 * 1024) throw Error(); f.portrait = await shrink(fl, 360); refresh(); notify('Familiar', 'Retrato atualizado.'); }
        catch { notify('Familiar', 'Não foi possível usar essa imagem.'); }
        finally { file.value = ''; }
      });
      const pic = h('button', { class: 'fam-pic' + (f.portrait ? '' : ' empty'), type: 'button', 'aria-label': f.portrait ? 'Trocar retrato de ' + who() : 'Adicionar retrato do familiar', title: f.portrait ? 'Trocar retrato' : 'Adicionar retrato', onclick: () => file.click() },
        f.portrait ? h('img', { src: f.portrait, alt: '' }) : h('span', { text: '❂', 'aria-hidden': 'true' }));

      const ident = h('div', { class: 'fam-ident' },
        h('div', { class: 'ability-head' }, h('input', { value: f.name, placeholder: 'Nome do familiar', 'aria-label': 'Nome do familiar', 'data-fk': fk + 'name',
          oninput: e => { f.name = e.target.value; card.querySelector('.win-title').textContent = who(); save(); } })),
        field(null, f.kind, v => { f.kind = v; save(); }, { placeholder: 'Espécie / tipo (corvo, lobo espectral…)', fk: fk + 'kind' }),
        field(null, f.bond, v => { f.bond = v; save(); }, { placeholder: 'Vínculo (como se ligou ao personagem)', fk: fk + 'bond' }));

      /* vida, CA e deslocamento */
      const hpIn = numIn(f.hp, { min: 0, label: 'PV atuais de ' + who(), fk: fk + 'hp' });
      const maxIn = numIn(f.maxhp, { min: 1, label: 'PV máximos de ' + who(), fk: fk + 'maxhp' });
      [hpIn, maxIn].forEach(x => { x.className = ''; });
      hpIn.addEventListener('change', () => { f.hp = R.int(hpIn.value, f.hp); refresh(); });
      maxIn.addEventListener('change', () => { f.maxhp = R.int(maxIn.value, f.maxhp); refresh(); });
      const amt = numIn(1, { min: 1, label: 'Quantidade', fk: fk + 'amt' });
      const dmg = h('form', { class: 'dmg-form' }, amt, h('button', { class: 'btn danger', value: 'dmg', text: 'Dano' }), h('button', { class: 'btn', value: 'heal', text: 'Cura' }));
      dmg.addEventListener('submit', e => {
        e.preventDefault(); const n = Math.max(0, R.int(amt.value)); if (!n) return;
        if (e.submitter?.value === 'heal') { const b = f.hp; f.hp = Math.min(f.maxhp, f.hp + n); notify(who(), '+' + (f.hp - b) + ' PV'); }
        else { f.hp = Math.max(0, f.hp - n); notify(who(), '−' + n + ' PV' + (f.hp === 0 ? ' · Caído' : '')); }
        refresh();
      });
      const acIn = numIn(f.ac, { label: 'CA de ' + who(), fk: fk + 'ac', cls: '' });
      acIn.addEventListener('change', () => { f.ac = R.int(acIn.value, f.ac); refresh(); });
      const spIn = h('input', { value: f.speed, placeholder: '—', 'aria-label': 'Deslocamento de ' + who(), 'data-fk': fk + 'speed', oninput: e => { f.speed = e.target.value; save(); } });
      const ini = R.mod(f.attrs[1]);
      const vitals = h('div', { class: 'vitals' },
        h('div', {}, h('div', { class: 'vital-top' }, h('span', { text: 'PONTOS DE VIDA' }), h('b', {}, hpIn, ' / ', maxIn)), bar('hp' + (f.hp / f.maxhp <= 0.3 ? ' low' : ''), f.hp, f.maxhp)),
        dmg,
        h('div', { class: 'tiles fam-tiles' },
          h('div', { class: 'tile' }, h('small', { text: 'CA' }), acIn),
          h('div', { class: 'tile' }, h('small', { text: 'Iniciativa' }), h('button', { class: 'btn ghost', style: 'border:0;font:700 24px var(--title);min-height:0;padding:0', text: R.signed(ini), title: 'Rolar iniciativa', onclick: () => rollCheck(who() + ' · Iniciativa', ini) })),
          h('div', { class: 'tile' }, h('small', { text: 'Desloc.' }), spIn)));

      /* atributos próprios */
      const attrs = h('div', { class: 'fam-attrs' }, R.ATTRS.map(([abbr, name], k) => {
        const inp = numIn(f.attrs[k], { min: 1, max: 30, label: name + ' de ' + who(), fk: fk + 'at' + k, cls: '' });
        inp.addEventListener('change', () => { f.attrs[k] = R.clamp(R.int(inp.value, 10), 1, 30); refresh(); });
        const m = R.mod(f.attrs[k]);
        return h('div', { class: 'fam-attr' }, h('abbr', { title: name, text: abbr }), inp,
          h('button', { class: 'btn sm', type: 'button', text: R.signed(m), 'aria-label': 'Rolar ' + name + ' de ' + who() + ' (' + R.signed(m) + ')', onclick: () => rollCheck(who() + ' · ' + name, m) }));
      }));

      /* habilidades do familiar */
      const addAb = () => { f.abilities.push({ name: '', cost: '', text: '', uses: 0, usesMax: 0, reset: 'long' }); refresh(); setTimeout(() => main.querySelector('[data-fk="' + fk + 'ab-name-' + (f.abilities.length - 1) + '"]')?.focus(), 0); };
      const abilities = f.abilities.map((a, j) => h('div', { class: 'fam-ability' },
        h('div', { class: 'ability-head' }, h('div', { class: 'glyph fam' }, h('span', { text: '✧' })),
          h('input', { value: a.name, placeholder: 'Nome da habilidade', 'aria-label': 'Nome da habilidade de ' + who(), 'data-fk': fk + 'ab-name-' + j, oninput: e => { a.name = e.target.value; save(); } })),
        field(null, a.cost, v => { a.cost = v; save(); }, { placeholder: 'Custo / ativação', fk: fk + 'ab-cost-' + j }),
        field(null, a.text, v => { a.text = v; save(); }, { multiline: true, placeholder: 'O que faz (ex.: mordida 1d6+FOR)…', fk: fk + 'ab-text-' + j }),
        usesRow(a, fk + 'ab-' + j), footer(a, f.abilities, j, 'habilidade', a.text, famTokens)));

      card = win(who(), { orn: '❂', cls: 'familiar' },
        h('div', { class: 'fam-top' }, h('div', { class: 'fam-pic-wrap' }, pic, file), ident),
        h('div', { class: 'fam-body' },
          h('div', { class: 'stack', style: 'gap:14px' }, vitals, h('div', {}, h('p', { class: 'fam-label', text: 'ATRIBUTOS · toque no bônus para rolar' }), attrs)),
          h('div', { class: 'stack', style: 'gap:10px' },
            h('div', { class: 'row', style: 'justify-content:space-between' }, h('p', { class: 'fam-label', text: 'HABILIDADES DO FAMILIAR · ' + f.abilities.length }), h('button', { class: 'btn sm', text: '+ Habilidade', onclick: addAb })),
            abilities.length ? abilities : h('p', { class: 'hint', style: 'margin:0', text: 'Ataques, sentidos, magias e truques do familiar, com usos por descanso.' }))),
        field('Anotações', f.notes, v => { f.notes = v; save(); }, { multiline: true, placeholder: 'Personalidade, ordens que obedece, o que sabe fazer fora de combate…', fk: fk + 'notes' }),
        h('div', { class: 'row', style: 'justify-content:space-between' },
          f.portrait ? h('button', { class: 'btn sm ghost', text: 'Remover retrato', onclick: () => { if (confirm('Remover o retrato de ' + who() + '?')) { f.portrait = ''; refresh(); } } }) : h('span'),
          h('button', { class: 'btn sm danger', text: '✕ Excluir familiar', onclick: () => { if (confirm('Excluir ' + who() + ' e todas as habilidades dele?')) { s.familiars.splice(i, 1); refresh(); } } })));
      return card;
    });
    return h('div', {},
      screenHead('Familiares', 'Criaturas ligadas ao portador', h('button', { class: 'btn primary', text: '+ Familiar', onclick: addFam })),
      cards.length ? h('div', { class: 'fam-grid' }, cards)
        : win('Familiares', { orn: '❂' }, empty('❂', 'Nenhum familiar ainda', 'Companheiros, invocações e montarias: vida, CA, atributos próprios e as habilidades de cada um.', '+ Primeiro familiar', addFam)));
  }

  /* ================= INVENTÁRIO ================= */
  let selItem = 0;
  const ICONS = ['⚔', '⌖', '🗡', '🏹', '⛨', '❖', '◉', '✧', '▤', '⚗', '✉', '⚿', '☩', '◈', '✦', '❦'];
  const MATERIAL = [['metal', 'Metal (ferreiro)'], ['madeira', 'Madeira (carpinteiro)'], ['couro', 'Couro (coureiro)']];
  const coins = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' PO';
  function screenInventory() {
    const s = st();
    if (selItem >= s.items.length) selItem = s.items.length - 1;
    const goldIn = numIn(s.gold, { min: 0, label: 'Ouro', fk: 'gold' });
    goldIn.style.width = '110px';
    goldIn.addEventListener('change', () => { s.gold = Math.max(0, Number(goldIn.value) || 0); refresh(); });
    const slots = h('div', { class: 'slots' }, s.items.map((it, i) => {
      const g = R.gearInfo(it);
      const st8 = g ? (g.immune ? 'artefato' : R.stateOf(it.pd, g.max)) : null;
      return h('button', { class: 'slot', type: 'button', 'aria-pressed': String(i === selItem), 'data-state': st8, 'data-fk': 'slot-' + i, title: it.name, onclick: () => { selItem = i; render(); } },
        it.equipped ? h('span', { class: 'eq', text: 'EQ' }) : it.key ? h('span', { class: 'key', text: '★' }) : null,
        it.qty !== 1 ? h('span', { class: 'qty', text: '×' + it.qty }) : null,
        h('span', { class: 'ico', text: it.icon || '✦', 'aria-hidden': 'true' }), h('span', { class: 'nm', text: it.name }),
        g ? h('span', { class: 'dur' }, h('i', { style: 'width:' + (g.immune ? 100 : it.pd / g.max * 100) + '%' })) : null);
    }), h('button', { class: 'slot add', type: 'button', onclick: () => { s.items.push({ name: 'Novo item', qty: 1, icon: '✦', notes: '' }); selItem = s.items.length - 1; refresh(); } }, h('span', { class: 'ico', text: '+' }), 'Novo item'));
    /* itens com desgaste de combate pendente: encerrar todos de uma vez */
    const pending = s.items.filter(it => R.gearInfo(it) && it.combat?.length);
    const endAll = pending.length > 1 ? h('button', { class: 'btn primary sm', text: 'Encerrar combate (' + pending.length + ' itens)', onclick: () => {
      const lines = pending.map(it => {
        const g = R.gearInfo(it), r = R.resolveCombat(it.pd, g.max, it.combat, g.rarity.cut, g.immune), b = it.pd;
        it.pd = r.after; it.log = [{ d: new Date().toLocaleDateString('pt-BR'), t: 'Combate: ' + r.raw + ' → ' + r.final + ' (' + b + ' → ' + r.after + ')' }, ...(it.log || [])].slice(0, 8); it.combat = [];
        return it.name + ' −' + (b - r.after);
      });
      refresh(); notify('Fim do combate', lines.join(' · '));
    } }) : null;
    const left = win('Inventário', { orn: '⚔', actions: h('label', { class: 'row muted', style: 'font-size:12px;letter-spacing:.14em' }, 'OURO', goldIn) }, slots,
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        h('p', { class: 'hint', style: 'margin:0', text: 'EQ = equipado · ★ = item de missão · a barra mostra a durabilidade.' }), endAll));
    return h('div', {}, screenHead('Inventário', 'Equipamentos e durabilidade'),
      h('div', { class: 'inv-wrap' }, h('div', { class: 'stack' }, left, quickCalcs()), itemDetail()));
  }
  /* cálculos rápidos da regra de durabilidade */
  function quickCalcs() {
    const out = (el, text) => { el.textContent = text; };
    const sDmg = numIn(12, { min: 0, label: 'Dano do ataque', fk: 'qc-dmg' }), sOut = h('output', { class: 'qc-out' });
    const sCalc = () => { const d = Math.max(0, R.int(sDmg.value)); out(sOut, R.sunder(d) + ' PD' + (Math.floor(d / 4) > 10 ? ' (limite 10)' : '')); };
    sDmg.addEventListener('input', sCalc); sCalc();
    const cPrice = numIn(15, { min: 0, label: 'Preço original', fk: 'qc-price' }), cPd = numIn(20, { min: 0, label: 'PD a restaurar', fk: 'qc-pd' }), cOut = h('output', { class: 'qc-out' });
    const cCalc = () => { const v = R.repairCost(Number(cPrice.value) || 0, Math.max(0, R.int(cPd.value))); out(cOut, v ? coins(v) : '—'); };
    cPrice.addEventListener('input', cCalc); cPd.addEventListener('input', cCalc); cCalc();
    const life = { gear: 'w-martial', rarity: 'comum' }, lWear = numIn(1, { min: 0, label: 'Desgaste por combate', fk: 'qc-wear' }), lOut = h('output', { class: 'qc-out' });
    const lCalc = () => { const g = R.gearInfo(life), f = g.immune ? 0 : R.accelerate(Math.max(0, R.int(lWear.value) - g.rarity.cut)); out(lOut, g.immune ? 'Não se desgasta' : f ? '≈ ' + Math.ceil(g.max / f) + ' combates' : 'Não perde PD'); };
    lWear.addEventListener('input', lCalc); lCalc();
    const lGear = select(Object.entries(R.GEAR).map(([k, v]) => [k, v.label]), life.gear, v => { life.gear = v; lCalc(); }, 'Categoria');
    const lRar = select(Object.entries(R.RARITY).map(([k, v]) => [k, v.label]), life.rarity, v => { life.rarity = v; lCalc(); }, 'Raridade');
    return win('Cálculos rápidos', { orn: '⚒', cls: 'qc-win' },
      h('div', { class: 'qc-grid' },
        h('div', { class: 'qc' }, h('h4', { text: 'Golpe Destruidor' }), h('label', { class: 'lbl' }, 'Dano do ataque', sDmg), sOut, h('small', { class: 'hint', text: 'máx(1, ⌊dano ÷ 4⌋), até 10 PD.' })),
        h('div', { class: 'qc' }, h('h4', { text: 'Custo de reparo' }), h('label', { class: 'lbl' }, 'Preço (PO)', cPrice), h('label', { class: 'lbl' }, 'PD a restaurar', cPd), cOut, h('small', { class: 'hint', text: '1% do preço a cada 10 PD, mínimo 1 PO.' })),
        h('div', { class: 'qc' }, h('h4', { text: 'Vida útil' }), lGear, lRar, h('label', { class: 'lbl' }, 'Desgaste por combate', lWear), lOut, h('small', { class: 'hint', text: 'Sem manutenção nem críticos.' }))));
  }
  function itemDetail() {
    const s = st(), it = s.items[selItem];
    if (!it) return win('Detalhes', { orn: '⚔' }, empty('⚔', s.items.length ? 'Escolha um item' : 'Inventário vazio', s.items.length ? 'Toque em um espaço para ver e editar o item.' : 'Armas, armaduras e escudos ganham durabilidade, com desgaste em combate e reparos.', s.items.length ? null : '+ Primeiro item', () => { s.items.push({ name: 'Novo item', qty: 1, icon: '✦', notes: '' }); selItem = 0; refresh(); }));
    const g = R.gearInfo(it);
    const qtyIn = numIn(it.qty, { min: 0, label: 'Quantidade', fk: 'it-qty' });
    qtyIn.addEventListener('change', () => { it.qty = Math.max(0, R.int(qtyIn.value)); refresh(); });
    /* tipo do item em destaque: escolher Arma, Armadura ou Escudo liga a durabilidade */
    const kind = g ? g.kind : 'none';
    const KINDS = [['weapon', '⚔ Arma', 'w-martial', 'metal'], ['armor', '⛨ Armadura', 'a-light', 'couro'], ['shield', '◈ Escudo', 'shield', 'madeira'], ['none', '✦ Outro', '', '']];
    const kindRow = h('div', { class: 'kind-row', role: 'group', 'aria-label': 'Tipo de item' }, KINDS.map(([k, label, def, mat]) =>
      h('button', { class: 'kind', type: 'button', 'aria-pressed': String(kind === k), text: label, onclick: () => {
        if (k === kind) return;
        if (!def) delete it.gear; else { it.gear = def; it.rarity ||= 'comum'; it.material = mat; it.pd = R.gearInfo(it).max; it.combat = []; }
        refresh();
      } })));
    const parts = [
      h('div', { class: 'row', style: 'flex-wrap:nowrap' },
        select(ICONS.map(c => [c, c]), it.icon || '✦', v => { it.icon = v; refresh(); }, 'Ícone'),
        field(null, it.name, v => { it.name = v; save(); }, { fk: 'it-name' })),
      kindRow,
      g ? durabilityPanel(it, g) : h('p', { class: 'hint', style: 'margin:0', text: 'Escolha Arma, Armadura ou Escudo para controlar a durabilidade deste item.' }),
      h('div', { class: 'row' }, h('label', { class: 'lbl', style: 'width:100px' }, 'Qtd.', qtyIn),
        h('button', { class: 'chip', type: 'button', 'aria-pressed': String(!!it.equipped), text: it.equipped ? 'Equipado' : 'Equipar', onclick: () => { it.equipped = !it.equipped; refresh(); } }),
        h('button', { class: 'chip', type: 'button', 'aria-pressed': String(!!it.key), text: '★ Item de missão', onclick: () => { it.key = !it.key; refresh(); } })),
      h('div', { class: 'row', style: 'flex-wrap:nowrap' }, field(null, it.damage, v => { it.damage = v; save(); }, { placeholder: 'Dano (ex.: 1d8+DES)', fk: 'it-dmg' }),
        R.firstDice(it.damage) ? h('button', { class: 'btn', text: 'Rolar', onclick: () => doRoll('Dano · ' + it.name, R.firstDice(it.damage)) }) : null),
      field(null, it.notes, v => { it.notes = v; save(); }, { multiline: true, placeholder: 'Descrição e observações…', fk: 'it-notes' })
    ];
    parts.push(h('div', { class: 'divider' }), h('button', { class: 'btn danger', style: 'width:100%', text: '✕ Remover item', onclick: () => { if (confirm('Remover “' + it.name + '”?')) { s.items.splice(selItem, 1); refresh(); } } }));
    return win('Detalhes', { orn: it.icon || '✦' }, h('div', { class: 'stack', style: 'gap:10px' }, parts));
  }
  /* painel de durabilidade: categoria exata, estado, reparos e combate */
  function durabilityPanel(it, g) {
    const stName = g.immune ? 'artefato' : R.stateOf(it.pd, g.max);
    const typeSel = select(Object.entries(R.GEAR).filter(([, v]) => v.kind === g.kind).map(([k, v]) => [k, v.label + ' · ' + v.pd + ' PD']), it.gear, v => {
      const full = it.pd >= g.max; it.gear = v; if (full) it.pd = R.gearInfo(it).max; refresh();
    }, 'Categoria');
    return h('section', { class: 'dur-panel', 'data-state': stName },
      h('div', { class: 'dur-head' }, h('span', { class: 'win-title', text: 'Durabilidade' }), h('span', { class: 'dur-pill', text: R.STATE_LABEL[stName] })),
      typeSel, ...durabilityBlock(it, g));
  }
  function durabilityBlock(it, g) {
    const s = st();
    const stName = g.immune ? 'artefato' : R.stateOf(it.pd, g.max);
    const pdIn = numIn(it.pd, { min: 0, max: g.max, label: 'PD atuais', fk: 'it-pd' });
    pdIn.style.cssText = 'width:80px;font:700 22px var(--title);text-align:right';
    pdIn.addEventListener('change', () => { it.pd = R.clamp(R.int(pdIn.value, it.pd), 0, g.max); refresh(); });
    const log = text => { it.log = [{ d: new Date().toLocaleDateString('pt-BR'), t: text }, ...(it.log || [])].slice(0, 8); };
    const pb = s.prof;
    const repair = mode => {
      if (it.pd <= 0) return notify('Durabilidade', 'Quebrado: só um profissional pode restaurar.');
      const flag = mode === 'short' ? 'maintShort' : 'maintLong';
      if (it[flag]) return notify('Durabilidade', 'Já feito neste descanso.');
      if (!confirm((mode === 'short' ? 'Manutenção (descanso curto, 10 min)' : 'Reparo (descanso longo, 1 h)') + ' em “' + it.name + '”. Exige ferramentas e proficiência. Continuar?')) return;
      const dice = mode === 'short' ? [R.die(6)] : [R.die(10), R.die(10)];
      const gain = dice.reduce((a, b) => a + b, 0) + pb, before = it.pd;
      it.pd = Math.min(g.max, before + gain); it[flag] = true;
      log((mode === 'short' ? 'Manutenção' : 'Reparo') + ': ' + before + ' → ' + it.pd);
      refresh();
      openRoll((mode === 'short' ? 'Manutenção · ' : 'Reparo · ') + it.name, { total: '+' + (it.pd - before), detail: (mode === 'short' ? '1d6' : '2d10') + ' [' + dice.join(', ') + '] + PB ' + pb + ' · PD ' + before + ' → ' + it.pd, d20: null });
    };
    const priceIn = h('input', { class: 'input', value: it.price || '', placeholder: 'Preço (PO)', inputmode: 'decimal', 'data-fk': 'it-price', onchange: e => { it.price = e.target.value.trim(); refresh(); } });
    const base = Number(String(it.price || '').replace(',', '.')) || 0;
    const cost = R.repairCost(base, g.max - it.pd);
    const pro = () => {
      if (!cost) return notify('Ferreiro', 'Informe o preço original para calcular o custo.');
      if (cost > s.gold) return notify('Ferreiro', 'Custa ' + coins(cost) + '; há ' + coins(s.gold) + '.');
      if (!confirm('Reparo profissional: restaurar ' + (g.max - it.pd) + ' PD por ' + coins(cost) + ' (sai do ouro).')) return;
      s.gold = Math.round((s.gold - cost) * 100) / 100; log('Ferreiro: ' + it.pd + ' → ' + g.max + ' por ' + coins(cost)); it.pd = g.max; refresh();
      notify('Ferreiro', 'Restaurado por ' + coins(cost) + '.');
    };
    /* Desgaste de combate */
    it.combat ||= [];
    const r = R.resolveCombat(it.pd, g.max, it.combat, g.rarity.cut, g.immune);
    const stAfter = g.immune ? 'artefato' : R.stateOf(r.after, g.max);
    const events = h('div', { class: 'ev-grid' }, R.EVENTS[g.kind].map(([k, label, n, once]) => {
      const count = it.combat.filter(e => e.k === k).length;
      return h('button', { class: 'btn sm', type: 'button', 'aria-pressed': once ? String(count > 0) : null, 'data-fk': 'ev-' + k, text: label + ' · ' + n + (count && !once ? ' ×' + count : ''),
        onclick: () => { if (once && count) it.combat = it.combat.filter(e => e.k !== k); else it.combat.push({ k, label, n }); refresh(); } });
    }));
    const sunderIn = numIn('', { min: 0, label: 'Dano do Golpe Destruidor', fk: 'ev-sunder-in' }); sunderIn.placeholder = 'dano';
    const sunderForm = h('form', { class: 'row', style: 'flex-wrap:nowrap' }, sunderIn, h('button', { class: 'btn sm', text: 'Golpe Destruidor' }));
    sunderForm.addEventListener('submit', e => { e.preventDefault(); if (sunderIn.value === '') return; const d = Math.max(0, R.int(sunderIn.value)); it.combat.push({ k: 'sunder', label: 'Golpe Destruidor (' + d + ')', n: R.sunder(d) }); refresh(); });
    return [
      h('div', { class: 'row', style: 'flex-wrap:nowrap' },
        select(Object.entries(R.RARITY).map(([k, v]) => [k, v.label + (v.immune ? ' · sem desgaste' : v.bonus ? ' · +' + v.bonus : '')]), it.rarity || 'comum', v => { const full = it.pd >= g.max; it.rarity = v; if (full) it.pd = R.gearInfo(it).max; refresh(); }, 'Raridade'),
        select(MATERIAL, it.material || 'metal', v => { it.material = v; save(); }, 'Material')),
      h('div', { 'data-state': stName },
        h('div', { class: 'pd-big' }, h('b', {}, pdIn, ' / ' + g.max + ' PD'), h('strong', { text: R.STATE_LABEL[stName] })),
        h('div', { class: 'pd-ticks', 'aria-hidden': 'true' }, h('i', { style: 'left:10%' }), h('i', { style: 'left:25%' }), h('i', { style: 'left:50%' })),
        h('div', { class: 'pd-bar' }, h('i', { style: 'width:' + (g.immune ? 100 : it.pd / g.max * 100) + '%' })),
        h('ul', { class: 'list' }, (g.immune ? ['Não sofre desgaste convencional.'] : R.penalties(g.kind, stName, g.magic)).map(t => h('li', { text: t })))),
      h('div', { class: 'row' },
        h('button', { class: 'btn sm', disabled: it.maintShort || it.pd <= 0 || it.pd >= g.max, text: it.maintShort ? 'Manutenção ✓' : 'Manutenção 1d6+' + pb, onclick: () => repair('short') }),
        h('button', { class: 'btn sm', disabled: it.maintLong || it.pd <= 0 || it.pd >= g.max, text: it.maintLong ? 'Reparo ✓' : 'Reparo 2d10+' + pb, onclick: () => repair('long') }),
        h('button', { class: 'btn sm', disabled: it.pd >= g.max, text: 'Ferreiro' + (cost ? ' · ' + coins(cost) : ''), onclick: pro })),
      priceIn,
      h('div', { class: 'win-title', style: 'margin-top:6px', text: 'Combate' }),
      events, sunderForm,
      h('dl', { class: 'sum' },
        h('dt', { text: 'Registrado' }), h('dd', { text: r.raw + ' PD' }),
        g.rarity.cut ? [h('dt', { text: 'Resistência (' + g.rarity.label + ')' }), h('dd', { text: '−' + g.rarity.cut })] : null,
        h('dt', { text: 'Desgaste ×1,10 ↑' }), h('dd', { text: r.final + ' PD' }),
        h('dt', { text: 'Resultado' }), h('dd', { text: it.pd + ' → ' + r.after + ' · ' + R.STATE_LABEL[stAfter] })),
      r.broke ? h('p', { class: 'warn', text: '⚠ ' + r.reason }) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn primary sm', disabled: !it.combat.length, text: 'Encerrar combate', onclick: () => { const b = it.pd; it.pd = r.after; log('Combate: ' + r.raw + ' → ' + r.final + ' (' + b + ' → ' + r.after + ')'); it.combat = []; refresh(); notify('Fim do combate', it.name + ': −' + (b - r.after) + ' PD'); } }),
        h('button', { class: 'btn sm ghost', disabled: !it.combat.length, text: 'Limpar', onclick: () => { it.combat = []; refresh(); } })),
      it.log?.length ? h('details', {}, h('summary', { class: 'hint', text: 'Histórico (' + it.log.length + ')' }), h('ul', { class: 'list' }, it.log.map(l => h('li', { text: l.d + ' · ' + l.t })))) : null
    ];
  }

  /* ================= MISSÕES ================= */
  const QTYPE = { principal: 'Missão principal', secundaria: 'Missão secundária', oculta: 'Missão oculta' };
  function screenQuests() {
    const s = st();
    const cards = s.quests.map((q, qi) => {
      const done = q.objectives.filter(o => o.done).length;
      const text = h('textarea', { class: 'quest-text', rows: 2, value: q.text, placeholder: 'Descrição da missão…', 'aria-label': 'Descrição', 'data-fk': 'q-text-' + qi });
      const fit = () => { text.style.height = 'auto'; text.style.height = text.scrollHeight + 'px'; };
      text.addEventListener('input', () => { q.text = text.value; fit(); save(); });
      requestAnimationFrame(fit);
      const objectives = h('div', { class: 'objectives' }, q.objectives.map((o, oi) => h('div', { class: 'obj' + (o.done ? ' done' : '') },
        h('button', { type: 'button', text: o.done ? '✓' : '', 'aria-pressed': String(o.done), 'aria-label': (o.done ? 'Desmarcar' : 'Concluir') + ': ' + o.text, 'data-fk': 'obj-' + qi + '-' + oi,
          onclick: () => {
            o.done = !o.done;
            if (o.done) { notify('Objetivo concluído', o.text); if (q.objectives.every(x => x.done)) setTimeout(() => notify('Missão concluída', q.title), 500); }
            refresh();
          } }),
        h('input', { value: o.text, placeholder: 'Objetivo…', 'aria-label': 'Objetivo', 'data-fk': 'obj-text-' + qi + '-' + oi, oninput: e => { o.text = e.target.value; save(); } }),
        h('button', { class: 'x', 'aria-label': 'Remover objetivo', title: 'Remover objetivo', text: '✕', onclick: () => { q.objectives.splice(oi, 1); refresh(); } }))));
      const curse = q.curse ? curseTracker() : null;
      return h('div', { class: q.type === 'principal' ? 'span-6' : 'span-6' }, win(QTYPE[q.type] || 'Missão', { orn: q.type === 'oculta' ? '?' : '❖', cls: 'quest', type: q.type,
        actions: h('div', { class: 'row' },
          h('button', { class: 'chip', type: 'button', 'aria-pressed': String(!!q.curse), title: 'Mostrar um medidor de avanço (maldição, doença, prazo…) nesta missão', text: '◆ Medidor', onclick: () => { q.curse = !q.curse; refresh(); } }),
          select(Object.entries(QTYPE), q.type, v => { q.type = v; refresh(); }, 'Tipo')) },
        h('input', { class: 'quest-title', value: q.title, 'aria-label': 'Título da missão', 'data-fk': 'q-title-' + qi, oninput: e => { q.title = e.target.value; save(); } }),
        text, curse,
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', { class: 'progress-text', text: done + ' / ' + q.objectives.length + ' OBJETIVOS' }),
          h('button', { class: 'btn sm', text: '+ Objetivo', onclick: () => { q.objectives.push({ text: '', done: false }); refresh(); setTimeout(() => main.querySelector('[data-fk="obj-text-' + qi + '-' + (q.objectives.length - 1) + '"]')?.focus(), 0); } })),
        bar('xp', done, Math.max(1, q.objectives.length)), objectives,
        h('div', { class: 'quest-foot' },
          h('button', { class: 'btn sm danger', text: '✕ Excluir missão', 'data-fk': 'q-del-' + qi, onclick: () => { if (confirm('Excluir a missão “' + (q.title || 'sem título') + '”? Isso não pode ser desfeito.')) { s.quests.splice(qi, 1); refresh(); notify('Missões', 'Missão excluída.'); } } }))));
    });
    return h('div', {},
      screenHead('Missões', 'Caminhos e juramentos',
        h('button', { class: 'btn primary', text: '+ Missão', onclick: () => { s.quests.push({ title: 'Nova missão', type: 'secundaria', text: '', objectives: [] }); refresh(); } })),
      cards.length ? h('div', { class: 'cols' }, cards)
        : win('Missões', { orn: '❖' }, empty('❖', 'Nenhuma missão registrada', 'Objetivos da campanha, missões secundárias e segredos ocultos ficam aqui.', '+ Primeira missão', () => { s.quests.push({ title: 'Nova missão', type: 'principal', text: '', objectives: [] }); refresh(); })));
  }
  function curseTracker() {
    const c = st().curse;
    return h('div', { class: 'curse' },
      h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap' },
        h('input', { class: 'curse-label', value: c.label, placeholder: 'Nome do medidor (ex.: maldição)', 'aria-label': 'Nome do medidor', 'data-fk': 'curse-label', oninput: e => { c.label = e.target.value; save(); } }),
        h('span', { class: 'progress-text', style: 'color:#d6c9ff;white-space:nowrap', text: c.stage + ' / ' + c.max })),
      h('div', { class: 'crystals', role: 'group', 'aria-label': 'Avanço do medidor' }, Array.from({ length: c.max }, (_, k) => h('button', { type: 'button', class: k < c.stage ? 'on' : '', 'aria-label': 'Estágio ' + (k + 1), 'data-fk': 'cr-' + k,
        onclick: () => { const before = c.stage; c.stage = k + 1 === c.stage ? k : k + 1; if (c.stage > before) notify('Alerta', (c.label || 'O medidor') + ' avançou (' + c.stage + '/' + c.max + ').'); refresh(); } }))),
      field(null, c.notes, v => { c.notes = v; save(); }, { placeholder: 'Sintomas e observações…', fk: 'curse-notes' }),
      h('p', { class: 'hint', style: 'margin:0', text: 'Marcador narrativo: o mestre define quando ele avança.' }));
  }

  /* ================= REGISTRO ================= */
  let recordTab = 'lore', chapter = 0, editingChapter = false;
  function screenRecord() {
    const s = st();
    const tabs = h('div', { class: 'row' }, [['lore', 'História'], ['ties', 'Relações'], ['profile', 'Perfil']].map(([k, label]) =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': String(recordTab === k), text: label, onclick: () => { recordTab = k; render(); } })));
    let body;
    if (recordTab === 'lore') {
      chapter = R.clamp(chapter, 0, Math.max(0, s.lore.length - 1));
      const c = s.lore[chapter];
      const list = h('div', { class: 'chapters' }, s.lore.map((x, i) => h('button', { type: 'button', 'aria-current': String(i === chapter), onclick: () => { chapter = i; editingChapter = false; render(); } },
        h('small', { text: x.tag || 'CAPÍTULO ' + (i + 1) }), h('span', { text: x.title || 'Sem título' }))),
      h('button', { class: 'btn sm', text: '+ Capítulo', onclick: () => { s.lore.push({ title: 'Novo capítulo', tag: '', text: '' }); chapter = s.lore.length - 1; editingChapter = true; refresh(); } }));
      const reader = !c ? win('História', { orn: '❦' }, empty('❦', 'A história ainda não foi escrita', 'Divida a história do personagem em capítulos e leia como um livro.', '+ Primeiro capítulo', () => { s.lore.push({ title: 'Capítulo I', tag: '', text: '' }); chapter = 0; editingChapter = true; refresh(); })) : win(c.tag || 'Capítulo', { orn: '❦', cls: 'reader',
        actions: h('button', { class: 'btn sm ghost', text: editingChapter ? 'Concluir' : 'Editar', onclick: () => { editingChapter = !editingChapter; render(); } }) },
      editingChapter
        ? h('div', { class: 'stack', style: 'gap:10px' }, field('Título', c.title, v => { c.title = v; save(); }, { fk: 'ch-title' }), field('Marcador', c.tag, v => { c.tag = v; save(); }, { fk: 'ch-tag' }),
          field('Texto', c.text, v => { c.text = v; save(); }, { multiline: true, fk: 'ch-text' }),
          h('button', { class: 'btn danger sm', text: 'Excluir capítulo', onclick: () => { if (confirm('Excluir este capítulo?')) { s.lore.splice(chapter, 1); editingChapter = false; refresh(); } } }))
        : [h('h3', { text: c.title }), h('div', { class: 'prose', text: c.text || 'Capítulo em branco.' }),
          h('div', { class: 'row', style: 'justify-content:space-between;margin-top:18px' },
            h('button', { class: 'btn sm', disabled: chapter === 0, text: '← Anterior', onclick: () => { chapter--; render(); } }),
            h('button', { class: 'btn sm', disabled: chapter >= s.lore.length - 1, text: 'Próximo →', onclick: () => { chapter++; render(); } }))]);
      body = h('div', { class: 'lore-wrap' }, list, reader);
    } else if (recordTab === 'ties') {
      const ATT = [['aliado', 'Aliado'], ['amigo', 'Amigo'], ['familia', 'Família'], ['neutro', 'Neutro'], ['desconhecido', 'Desconhecido'], ['rival', 'Rival'], ['inimigo', 'Inimigo']];
      const addRel = () => { s.relations.push({ name: '', role: '', status: '', text: '', attitude: 'neutro' }); refresh(); setTimeout(() => main.querySelector('[data-fk="rel-n-' + (s.relations.length - 1) + '"]')?.focus(), 0); };
      body = s.relations.length ? h('div', { class: 'cards' }, s.relations.map((r, i) => win(ATT.find(a => a[0] === (r.attitude || 'neutro'))?.[1] || 'Relação', { orn: '❧', cls: 'rel', type: r.attitude || 'neutro' },
        h('div', { class: 'rel-head' }, h('span', { class: 'rel-sigil', 'aria-hidden': 'true', text: (r.name || '?').trim().charAt(0).toUpperCase() || '?' }),
          h('input', { class: 'nm', value: r.name, placeholder: 'Nome', 'aria-label': 'Nome', 'data-fk': 'rel-n-' + i, oninput: e => { r.name = e.target.value; save(); } })),
        h('div', { class: 'att-row', role: 'group', 'aria-label': 'Atitude' }, ATT.map(([k, label]) => h('button', { class: 'att', type: 'button', 'data-att': k, 'aria-pressed': String((r.attitude || 'neutro') === k), text: label, onclick: () => { r.attitude = k; refresh(); } }))),
        field('Vínculo', r.role, v => { r.role = v; save(); }, { fk: 'rel-r-' + i, placeholder: 'Quem é para o personagem' }),
        field('Situação', r.status, v => { r.status = v; save(); }, { fk: 'rel-s-' + i, placeholder: 'Onde está, como está' }),
        field(null, r.text, v => { r.text = v; save(); }, { multiline: true, fk: 'rel-t-' + i, placeholder: 'História juntos, segredos, dívidas…' }),
        h('button', { class: 'btn sm danger', style: 'justify-self:start', text: '✕ Excluir relação', onclick: () => { if (confirm('Excluir “' + (r.name || 'esta relação') + '”?')) { s.relations.splice(i, 1); refresh(); } } }))),
      h('button', { class: 'slot add', style: 'aspect-ratio:auto;min-height:180px', type: 'button', onclick: addRel }, h('span', { class: 'ico', text: '+' }), 'Nova relação'))
        : win('Relações', { orn: '❧' }, empty('❧', 'Nenhuma relação registrada', 'Família, aliados, rivais e inimigos: quem cruza o caminho do personagem.', '+ Primeira relação', addRel));
    } else {
      const list = (title, key, orn) => win(title, { orn },
        h('div', { class: 'stack', style: 'gap:6px' }, s[key].map((t, i) => h('div', { class: 'row', style: 'flex-wrap:nowrap' },
          field(null, t, v => { s[key][i] = v; save(); }, { fk: key + '-' + i }),
          h('button', { class: 'x', 'aria-label': 'Remover', text: '×', onclick: () => { s[key].splice(i, 1); refresh(); } })))),
        h('button', { class: 'btn sm', style: 'margin-top:10px', text: '+ Adicionar', onclick: () => { s[key].push(''); refresh(); } }));
      body = h('div', { class: 'cols' },
        h('div', { class: 'span-4' }, win('Personalidade', { orn: '✦' }, h('div', { class: 'trait-list' }, s.personality.map((t, i) => h('span', { class: 'chip' }, t, h('button', { class: 'x', style: 'width:18px;height:18px', 'aria-label': 'Remover ' + t, text: '×', onclick: () => { s.personality.splice(i, 1); refresh(); } })))),
          (() => { const f = h('form', { class: 'row', style: 'margin-top:10px;flex-wrap:nowrap' }, h('input', { class: 'input', placeholder: 'Novo traço', 'aria-label': 'Novo traço', 'data-fk': 'trait-new' }), h('button', { class: 'btn sm', text: '+' }));
            f.addEventListener('submit', e => { e.preventDefault(); const v = f.querySelector('input').value.trim(); if (v) { s.personality.push(v); refresh(); } }); return f; })())),
        h('div', { class: 'span-4' }, list('Pontos fortes', 'strengths', '▲')),
        h('div', { class: 'span-4' }, list('Pontos fracos', 'weaknesses', '▼')),
        h('div', { class: 'span-12' }, win('Citações', { orn: '❝' }, h('div', { class: 'stack', style: 'gap:10px' }, s.quotes.map((q, i) => h('div', { class: 'row', style: 'flex-wrap:nowrap;align-items:stretch' },
          h('textarea', { class: 'area quote', rows: 2, value: q, 'aria-label': 'Citação', 'data-fk': 'quote-' + i, oninput: e => { s.quotes[i] = e.target.value; save(); } }),
          h('button', { class: 'x', 'aria-label': 'Remover citação', text: '×', onclick: () => { s.quotes.splice(i, 1); refresh(); } })))),
        h('button', { class: 'btn sm', style: 'margin-top:10px', text: '+ Citação', onclick: () => { s.quotes.push(''); refresh(); } }))));
    }
    return h('div', {}, screenHead('Registro', 'História, relações e perfil', tabs), body);
  }

  /* ================= DIÁRIO ================= */
  /* Tipos de anotação: cada um tem ícone, cor, modelo de texto e visual próprio */
  const JKINDS = {
    registro: { label: 'Registro', icon: '✎', ph: 'O que aconteceu hoje…', tpl: '' },
    sessao: { label: 'Sessão', icon: '⚔', ph: '', tpl: 'Onde estávamos:\n\nO que aconteceu:\n\nRecompensas e XP:\n\nGanchos para a próxima sessão:\n' },
    descoberta: { label: 'Descoberta', icon: '✧', ph: '', tpl: 'O que descobri:\n\nOnde / com quem:\n\nO que isso muda:\n' },
    rumor: { label: 'Rumor', icon: '❝', ph: 'O que se diz por aí…', tpl: '' },
    carta: { label: 'Carta', icon: '✉', ph: '', tpl: 'Para \n\n\n\nCom estima,\n' },
    sonho: { label: 'Sonho / visão', icon: '☾', ph: 'O que vi enquanto dormia…', tpl: '' },
    pessoa: { label: 'Pessoa', icon: '☉', ph: '', tpl: 'Nome:\nAparência:\nOnde encontrar:\nO que quer:\nO que sabe:\n' },
    lugar: { label: 'Lugar', icon: '⌂', ph: '', tpl: 'Onde fica:\nComo é:\nPerigos:\nSegredos:\n' },
    lista: { label: 'Lista', icon: '☐', ph: '', tpl: '' }
  };
  let page = 0, jFilter = 'todos', jQuery = '';
  const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('pt-BR') : 'Sem data';
  function screenJournal() {
    const s = st();
    const order = s.journal.map((p, i) => [p, i]).sort((a, b) => (b[0].pinned - a[0].pinned) || (a[1] - b[1]));
    const visible = order.filter(([p]) => (jFilter === 'todos' || (p.kind || 'registro') === jFilter) &&
      (!jQuery || [p.title, p.text, ...(p.items || []).map(x => x.text)].join(' ').toLocaleLowerCase().includes(jQuery)));
    if (!s.journal[page]) page = visible[0]?.[1] ?? 0;
    const p = s.journal[page];
    const newEntry = kind => {
      const k = JKINDS[kind];
      s.journal.unshift({ title: k.label === 'Registro' ? 'Nova página' : k.label, date: new Date().toISOString().slice(0, 10), text: k.tpl, kind, pinned: false, items: kind === 'lista' ? [{ text: '', done: false }] : [] });
      page = 0; jFilter = 'todos'; jQuery = ''; refresh();
      setTimeout(() => main.querySelector('[data-fk="j-title"]')?.select(), 0);
    };
    /* barra de criação: um botão por tipo */
    const creator = win('Nova anotação', { orn: '✎', cls: 'j-creator' },
      h('div', { class: 'j-kinds' }, Object.entries(JKINDS).map(([k, v]) => h('button', { class: 'j-kind', type: 'button', 'data-kind': k, onclick: () => newEntry(k) },
        h('span', { class: 'j-kind-ico', text: v.icon, 'aria-hidden': 'true' }), v.label))));
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Buscar nas anotações', 'aria-label': 'Buscar nas anotações', value: jQuery, 'data-fk': 'j-search' });
    search.addEventListener('input', () => { jQuery = search.value.trim().toLocaleLowerCase(); render(); });
    const used = new Set(s.journal.map(x => x.kind || 'registro'));
    const filters = h('div', { class: 'row j-filters' },
      h('button', { class: 'chip', type: 'button', 'aria-pressed': String(jFilter === 'todos'), text: 'Todas', onclick: () => { jFilter = 'todos'; render(); } }),
      Object.entries(JKINDS).filter(([k]) => used.has(k)).map(([k, v]) => h('button', { class: 'chip', type: 'button', 'data-kind': k, 'aria-pressed': String(jFilter === k), text: v.icon + ' ' + v.label, onclick: () => { jFilter = k; render(); } })));
    const list = win('Páginas', { orn: '❦' }, search, filters,
      h('div', { class: 'j-list' }, visible.length ? visible.map(([x, i]) => {
        const k = JKINDS[x.kind] || JKINDS.registro;
        return h('button', { class: 'j-entry', type: 'button', 'data-kind': x.kind || 'registro', 'aria-current': String(i === page), onclick: () => { page = i; render(); } },
          h('span', { class: 'j-entry-ico', text: k.icon, 'aria-hidden': 'true' }),
          h('span', { class: 'j-entry-main' }, h('small', { text: k.label.toUpperCase() + ' · ' + fmtDate(x.date) }), h('span', { text: x.title || 'Sem título' })),
          x.pinned ? h('span', { class: 'j-pin', text: '★', title: 'Fixada' }) : null);
      }) : h('p', { class: 'hint', text: s.journal.length ? 'Nada encontrado com esse filtro.' : 'Nenhuma anotação ainda.' })));
    if (!p) return h('div', {}, screenHead('Diário', 'Anotações da jornada'), creator,
      win('Diário', { orn: '✎' }, empty('✎', 'O diário está em branco', 'Escolha um tipo acima para começar: registro, sessão, carta, sonho, lista…', null)));
    const k = JKINDS[p.kind] || JKINDS.registro;
    const kindSel = select(Object.entries(JKINDS).map(([kk, v]) => [kk, v.icon + ' ' + v.label]), p.kind || 'registro', v => { p.kind = v; if (v === 'lista' && !p.items.length) p.items.push({ text: '', done: false }); refresh(); }, 'Tipo');
    const textArea = h('textarea', { class: 'area j-text', value: p.text, placeholder: k.ph || 'Escreva aqui…', 'aria-label': 'Texto', 'data-fk': 'j-text', oninput: e => { p.text = e.target.value; save(); } });
    const checklist = p.kind === 'lista' ? h('div', { class: 'objectives j-check' },
      p.items.map((it, ii) => h('div', { class: 'obj' + (it.done ? ' done' : '') },
        h('button', { type: 'button', text: it.done ? '✓' : '', 'aria-pressed': String(it.done), 'aria-label': (it.done ? 'Desmarcar' : 'Marcar') + ': ' + it.text, onclick: () => { it.done = !it.done; refresh(); } }),
        h('input', { value: it.text, placeholder: 'Item…', 'aria-label': 'Item', 'data-fk': 'j-it-' + ii, oninput: e => { it.text = e.target.value; save(); } }),
        h('button', { class: 'x', 'aria-label': 'Remover item', text: '✕', onclick: () => { p.items.splice(ii, 1); refresh(); } }))),
      h('button', { class: 'btn sm', style: 'justify-self:start', text: '+ Item', onclick: () => { p.items.push({ text: '', done: false }); refresh(); setTimeout(() => main.querySelector('[data-fk="j-it-' + (p.items.length - 1) + '"]')?.focus(), 0); } })) : null;
    const sheet = h('div', { class: 'j-sheet', 'data-kind': p.kind || 'registro' },
      p.kind === 'carta' ? h('div', { class: 'j-seal', 'aria-hidden': 'true' }, h('span', { text: '✠' })) : null,
      h('div', { class: 'j-sheet-head' }, h('span', { class: 'j-sheet-ico', text: k.icon, 'aria-hidden': 'true' }),
        h('input', { class: 'j-title', value: p.title, placeholder: 'Título', 'aria-label': 'Título', 'data-fk': 'j-title', oninput: e => { p.title = e.target.value; save(); } })),
      checklist, textArea);
    const editor = win(k.label, { orn: k.icon, cls: 'j-editor',
      actions: h('button', { class: 'chip', type: 'button', 'aria-pressed': String(!!p.pinned), text: p.pinned ? '★ Fixada' : '☆ Fixar', onclick: () => { p.pinned = !p.pinned; refresh(); } }) },
      h('div', { class: 'row j-meta' }, kindSel,
        h('input', { class: 'input', type: 'date', value: p.date, 'aria-label': 'Data', onchange: e => { p.date = e.target.value; refresh(); } })),
      sheet,
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('span', { class: 'hint', text: (p.text.trim() ? p.text.trim().split(/\s+/).length : 0) + ' palavras' }),
        h('button', { class: 'btn sm danger', text: '✕ Excluir anotação', onclick: () => { if (confirm('Excluir “' + (p.title || 'esta anotação') + '”?')) { s.journal.splice(page, 1); page = 0; refresh(); } } })));
    return h('div', {}, screenHead('Diário', 'Anotações da jornada'), creator, h('div', { class: 'journal' }, list, editor));
  }

  /* ================= CONFIGURAÇÕES ================= */
  const setDlg = h('dialog', { class: 'sys' });
  document.body.append(setDlg);
  const PREF = 'bedivere-sistema-prefs';
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch {} };
  document.body.classList.toggle('calm', prefs.calm === true);
  function openSettings() {
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      try {
        if (f.size > 5 * 1024 * 1024) throw Error('O arquivo deve ter até 5 MB.');
        const next = Store.parseBackup(await f.text());
        if (!confirm('Importar a ficha de ' + next.name + '? Isso substitui os dados deste navegador.')) return;
        Store.replace(next); setDlg.close(); render(); notify('Runas', 'Ficha importada.');
      } catch (e) { alert('Não foi possível importar. ' + e.message); }
      finally { file.value = ''; }
    });
    const check = (label, key, onChange) => h('label', { class: 'row', style: 'font-size:14px' }, h('input', { type: 'checkbox', checked: !!prefs[key], onchange: e => { prefs[key] = e.target.checked; savePrefs(); onChange?.(); } }), label);
    setDlg.replaceChildren(win('Configurações', { orn: '⚙', actions: h('button', { class: 'x', 'aria-label': 'Fechar', text: '×', onclick: () => setDlg.close() }) },
      h('div', { class: 'stack', style: 'gap:12px' },
        check('Pular a entrada ao abrir a ficha', 'skipIntro'),
        check('Modo calmo (sem partículas)', 'calm', () => document.body.classList.toggle('calm', prefs.calm === true)),
        h('button', { class: 'btn', text: 'Ver a entrada de novo', onclick: () => { setDlg.close(); window.Intro?.play(true); } }),
        h('div', { class: 'divider' }),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', text: '✉ Compartilhar ficha', onclick: () => { setDlg.close(); window.Share?.open(); } }),
          h('button', { class: 'btn', text: 'Abrir ficha compartilhada', onclick: () => { setDlg.close(); window.Share?.openReceive(); } })),
        h('p', { class: 'hint', text: 'Gera um link criptografado com a ficha inteira, para enviar por WhatsApp, Discord ou e-mail. Só este site sabe abrir.' }),
        h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Exportar JSON', onclick: () => Store.exportJson() }), h('button', { class: 'btn', text: 'Importar JSON', onclick: () => file.click() }), file),
        h('p', { class: 'hint', text: 'A ficha fica salva só neste navegador. Exporte antes de trocar de aparelho ou limpar os dados.' }),
        h('button', { class: 'btn danger', text: 'Recomeçar a ficha do zero', onclick: () => { if (confirm('Apagar tudo desta ficha neste navegador e voltar aos dados iniciais? Exporte antes se quiser guardar.')) { Store.reset(); setDlg.close(); render(); } } }))));
    setDlg.showModal();
  }

  /* ---------- Fundo e início ---------- */
  /* Círculo mágico: anéis com runas do futhark antigo escritas ao longo de círculos */
  const FUTHARK = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  const ringText = (id, r, size, reps) => `<path id="${id}" d="M500 ${500 - r} a${r} ${r} 0 1 1 -0.1 0" fill="none"/><text font-size="${size}" letter-spacing="${size * 0.55}"><textPath href="#${id}">${FUTHARK.repeat(reps)}</textPath></text>`;
  /* cada anel é uma camada HTML própria: girar a camada é composição na GPU,
     girar um <g> dentro do SVG forçaria redesenhar o texto a cada quadro */
  const ringSvg = `<div class="rune-ring">
    <div class="ring-layer spin"><svg viewBox="0 0 1000 1000" aria-hidden="true"><g fill="none" stroke="#7fc4ff">
      <circle cx="500" cy="500" r="480" stroke-width="2"/><circle cx="500" cy="500" r="440" stroke-width="1"/>
      ${ringText('rr1', 458, 26, 3)}
      <polygon points="500,90 855,705 145,705" stroke-width="1.5"/><polygon points="500,910 145,295 855,295" stroke-width="1.5"/>
    </g></svg></div>
    <div class="ring-layer spin-rev"><svg viewBox="0 0 1000 1000" aria-hidden="true"><g fill="none" stroke="#7fc4ff">
      <circle cx="500" cy="500" r="300" stroke-width="1.5"/><circle cx="500" cy="500" r="262" stroke-width="1"/>
      ${ringText('rr2', 280, 20, 2)}
      <circle cx="500" cy="500" r="120" stroke-width="1"/><path d="M500 380 L500 620 M380 500 L620 500" stroke-width="1.5"/>
    </g></svg></div></div>`;
  const back = h('div', { class: 'backdrop', 'aria-hidden': 'true' });
  back.insertAdjacentHTML('beforeend', ringSvg + (window.Scene ? Scene.svg({ intro: false }) : ''));
  const motes = h('div', { class: 'motes', 'aria-hidden': 'true' });
  for (let i = 0; i < (matchMedia('(max-width: 860px)').matches ? 9 : 16); i++) {
    motes.append(h('i', { text: FUTHARK[Math.floor(Math.random() * FUTHARK.length)],
      style: '--x:' + (Math.random() * 80 - 40) + 'px;--r:' + (Math.random() * 80 - 40) + 'deg;--s:' + (12 + Math.random() * 12) + 'px;--t:' + (16 + Math.random() * 16) + 's;--d:' + (-Math.random() * 32) + 's;left:' + (Math.random() * 100) + '%' }));
  }
  document.body.prepend(back, motes);

  window.App = { notify, prefs, render };
  renderHud(); render();
  if (!prefs.skipIntro) window.Intro?.play(false);
})();
