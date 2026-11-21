/* Grimórios: livros de magia totalmente livres. Cada grimório tem campos próprios
   (nome, escola, descrição, anotações e campos extras) e uma lista de magias.
   Os campos das magias são definidos por grimório (renomear, reordenar, criar, excluir)
   e cada magia ainda pode ter campos só dela.
   Carregado antes de state.js (para a validação) e de app.js (que desenha a tela). */
const Grimoires = window.Grimoires = (() => {
  const ID = /^[a-z0-9]{1,24}$/;
  const uid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 8);
  const DEFAULT_FIELDS = ['Nível / Círculo', 'Custo', 'Tempo de conjuração', 'Alcance', 'Duração', 'Componentes'];

  const newGrimoire = () => ({ id: uid(), name: '', school: '', desc: '', notes: '', fields: [], spellFields: DEFAULT_FIELDS.map(label => ({ id: uid(), label })), spells: [] });
  const newSpell = () => ({ id: uid(), name: '', text: '', values: {}, extra: [] });

  /* ---------- Validação (no lugar, como o resto do state.js) ---------- */
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const str = (v, n = 20000) => typeof v === 'string' ? v.slice(0, n) : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
  const keep = (arr, ok) => { for (let i = arr.length - 1; i >= 0; i--) if (!ok(arr[i])) arr.splice(i, 1); return arr; };
  /* id único dentro do conjunto; troca ids ausentes, inválidos ou repetidos */
  const fixId = (o, seen) => { if (typeof o.id !== 'string' || !ID.test(o.id) || seen.has(o.id)) o.id = uid(); seen.add(o.id); };
  const cleanPairs = arr => keep(arr, isObj).forEach(p => { p.label = str(p.label, 200); p.value = str(p.value); });
  function clean(list) {
    if (!Array.isArray(list)) return [];
    const gSeen = new Set();
    keep(list, isObj).forEach(g => {
      fixId(g, gSeen);
      g.name = str(g.name, 300); g.school = str(g.school, 300); g.desc = str(g.desc); g.notes = str(g.notes);
      if (!Array.isArray(g.fields)) g.fields = [];
      cleanPairs(g.fields);
      if (!Array.isArray(g.spellFields)) g.spellFields = [];
      const fSeen = new Set();
      keep(g.spellFields, isObj).forEach(f => { fixId(f, fSeen); f.label = str(f.label, 200); });
      if (!Array.isArray(g.spells)) g.spells = [];
      const sSeen = new Set();
      keep(g.spells, isObj).forEach(sp => {
        fixId(sp, sSeen);
        sp.name = str(sp.name, 300); sp.text = str(sp.text);
        if (!isObj(sp.values)) sp.values = {};
        for (const k of Object.keys(sp.values)) { if (!fSeen.has(k)) delete sp.values[k]; else sp.values[k] = str(sp.values[k], 2000); }
        if (!Array.isArray(sp.extra)) sp.extra = [];
        cleanPairs(sp.extra);
      });
    });
    return list;
  }

  /* ---------- Estado da tela (não vai para o salvamento) ---------- */
  const SEL = 'bedivere-grimorio';
  let sel = null, openSpell = null, query = '';
  try { sel = sessionStorage.getItem(SEL); } catch {}
  const select = id => { sel = id; openSpell = null; query = ''; try { sessionStorage.setItem(SEL, id); } catch {} };
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ui: construtores e ações da ficha (app.js) */
  function screen(ui) {
    const { h, win, field, screenHead, empty, save, refresh, render, main } = ui;
    const s = Store.state;
    const list = s.grimoires;
    const focus = (fk, pick) => setTimeout(() => { const el = main.querySelector('[data-fk="' + CSS.escape(fk) + '"]'); el?.focus(); if (pick) el?.select?.(); }, 0);
    const iconBtn = (text, label, onclick, disabled) => h('button', { class: 'x gr-icon', type: 'button', text, 'aria-label': label, title: label, disabled: !!disabled, onclick });

    const addGrimoire = () => { const g = newGrimoire(); list.push(g); select(g.id); refresh(); focus('gr-' + g.id + '-name'); };
    const head = screenHead('Grimórios', 'Livros de magia, escolas e feitiços', h('button', { class: 'btn primary', text: '+ Grimório', onclick: addGrimoire }));
    if (!list.length) return h('div', {}, head, win('Grimórios', { orn: '✧' },
      empty('✧', 'Nenhum grimório ainda', 'Crie quantos livros de magia quiser: cada um com escola, descrição, campos próprios e as magias que guarda.', '+ Primeiro grimório', addGrimoire)));

    let gi = list.findIndex(g => g.id === sel);
    if (gi < 0) { gi = 0; sel = list[0].id; }
    const g = list[gi];
    const gk = 'gr-' + g.id + '-';
    const gName = () => g.name || 'Grimório sem nome';

    /* abas: um chip por grimório */
    const tabs = h('div', { class: 'row subtabs gr-tabs', role: 'tablist', 'aria-label': 'Grimórios' }, list.map(x =>
      h('button', { class: 'chip', type: 'button', role: 'tab', 'aria-selected': String(x === g), 'aria-pressed': String(x === g), 'data-gid': x.id, onclick: () => { select(x.id); render(); } },
        h('span', { class: 'gr-tab-name', text: x.name || 'Grimório sem nome' }), h('small', { class: 'count', text: String(x.spells.length) }))));

    /* ---------- campos livres (rótulo + valor), usados no grimório e em cada magia ---------- */
    const pairRows = (arr, fk, what) => arr.map((p, i) => h('div', { class: 'gr-pair' },
      h('input', { class: 'input gr-pair-label', value: p.label, placeholder: 'Campo', 'aria-label': 'Nome do campo', 'data-fk': fk + 'pl' + i, oninput: e => { p.label = e.target.value; save(); } }),
      h('input', { class: 'input', value: p.value, placeholder: 'Valor', 'aria-label': (p.label || 'Campo') + ': valor', 'data-fk': fk + 'pv' + i, oninput: e => { p.value = e.target.value; save(); } }),
      h('div', { class: 'gr-ctl' },
        iconBtn('↑', 'Subir campo', () => { if (move(arr, i, -1)) refresh(); }, i === 0),
        iconBtn('↓', 'Descer campo', () => { if (move(arr, i, 1)) refresh(); }, i === arr.length - 1),
        iconBtn('×', 'Excluir campo ' + (p.label || what), () => { if (!p.label && !p.value || confirm('Excluir o campo “' + (p.label || 'sem nome') + '”?')) { arr.splice(i, 1); refresh(); } }))));
    const addPair = (arr, fk) => () => { arr.push({ label: '', value: '' }); refresh(); focus(fk + 'pl' + (arr.length - 1)); };

    /* ---------- janela do grimório ---------- */
    let detail;
    const nameIn = h('input', { value: g.name, placeholder: 'Nome do grimório', 'aria-label': 'Nome do grimório', 'data-fk': gk + 'name',
      oninput: e => {
        g.name = e.target.value; save();
        detail.querySelector('.win-title').textContent = gName();
        const t = main.querySelector('.gr-tabs [data-gid="' + g.id + '"] .gr-tab-name'); if (t) t.textContent = gName();
      } });
    detail = win(gName(), { orn: '✧', cls: 'ability gr-book', actions: h('div', { class: 'gr-ctl' },
      iconBtn('◀', 'Mover grimório para a esquerda', () => { if (move(list, gi, -1)) refresh(); }, gi === 0),
      iconBtn('▶', 'Mover grimório para a direita', () => { if (move(list, gi, 1)) refresh(); }, gi === list.length - 1)) },
      h('div', { class: 'ability-head' }, h('div', { class: 'glyph' }, h('span', { text: '✧' })), nameIn),
      field('Escola / tipo', g.school, v => { g.school = v; save(); }, { placeholder: 'Arcana, divina, rúnica, de sangue…', fk: gk + 'school' }),
      field('Descrição', g.desc, v => { g.desc = v; save(); }, { multiline: true, placeholder: 'Aparência do livro, origem, quem o escreveu…', fk: gk + 'desc' }),
      h('div', { class: 'stack', style: 'gap:8px' },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('p', { class: 'fam-label', text: 'CAMPOS DO GRIMÓRIO · ' + g.fields.length }), h('button', { class: 'btn sm', text: '+ Campo', onclick: addPair(g.fields, gk) })),
        g.fields.length ? pairRows(g.fields, gk, 'do grimório') : h('p', { class: 'hint', style: 'margin:0', text: 'Crie os campos que quiser: idioma, fechadura, páginas, afinidade, mestre…' })),
      field('Anotações', g.notes, v => { g.notes = v; save(); }, { multiline: true, placeholder: 'Regras da mesa, limites, rituais, segredos…', fk: gk + 'notes' }),
      h('div', { class: 'row', style: 'justify-content:flex-end' },
        h('button', { class: 'btn sm danger', text: '✕ Excluir grimório', onclick: () => {
          if (!confirm('Excluir o grimório “' + gName() + '” e ' + (g.spells.length === 1 ? 'a magia dele' : 'as ' + g.spells.length + ' magias dele') + '?')) return;
          list.splice(gi, 1); select(list[Math.min(gi, list.length - 1)]?.id || ''); refresh();
        } })));

    /* ---------- campos das magias deste grimório ---------- */
    const SF = g.spellFields;
    const addField = () => { SF.push({ id: uid(), label: '' }); refresh(); focus(gk + 'sf-' + SF[SF.length - 1].id); };
    const fieldsWin = win('Campos das magias', { orn: '❖', cls: 'gr-fields', actions: h('button', { class: 'btn sm', text: '+ Campo', onclick: addField }) },
      h('p', { class: 'hint', style: 'margin:0 0 10px', text: 'Valem para todas as magias deste grimório. Renomeie, reordene, crie ou exclua. Nome e descrição sempre existem.' }),
      SF.length ? h('div', { class: 'stack', style: 'gap:6px' }, SF.map((f, i) => h('div', { class: 'gr-sf' },
        h('input', { class: 'input', value: f.label, placeholder: 'Nome do campo', 'aria-label': 'Nome do campo de magia', 'data-fk': gk + 'sf-' + f.id, oninput: e => { f.label = e.target.value; save(); } }),
        h('div', { class: 'gr-ctl' },
          iconBtn('↑', 'Subir campo', () => { if (move(SF, i, -1)) refresh(); }, i === 0),
          iconBtn('↓', 'Descer campo', () => { if (move(SF, i, 1)) refresh(); }, i === SF.length - 1),
          iconBtn('×', 'Excluir campo ' + (f.label || ''), () => {
            const used = g.spells.filter(sp => (sp.values[f.id] || '').trim()).length;
            if (used && !confirm('Excluir o campo “' + (f.label || 'sem nome') + '”? ' + used + (used === 1 ? ' magia perde' : ' magias perdem') + ' o valor dele.')) return;
            SF.splice(i, 1); g.spells.forEach(sp => delete sp.values[f.id]); refresh();
          }))))) : h('p', { class: 'hint', style: 'margin:0', text: 'Sem campos: as magias terão só nome e descrição.' }),
      SF.length ? null : h('button', { class: 'btn sm ghost', style: 'margin-top:8px', text: 'Restaurar campos padrão', onclick: () => { DEFAULT_FIELDS.forEach(label => SF.push({ id: uid(), label })); refresh(); } }));

    /* ---------- magias ---------- */
    const spells = g.spells;
    const addSpell = () => { const sp = newSpell(); spells.push(sp); openSpell = sp.id; query = ''; refresh(); focus('sp-' + sp.id + '-name'); };
    const match = (sp, q) => norm([sp.name, sp.text, ...Object.values(sp.values), ...sp.extra.flatMap(p => [p.label, p.value])].join(' ')).includes(q);
    const label = f => f.label || 'Campo sem nome';

    const spellCard = (sp, i) => {
      const fk = 'sp-' + sp.id + '-';
      const open = openSpell === sp.id;
      const sName = () => sp.name || 'Magia sem nome';
      const filled = SF.filter(f => (sp.values[f.id] || '').trim());
      const toggle = h('button', { class: 'gr-spell-head', type: 'button', 'aria-expanded': String(open), 'data-fk': fk + 'toggle', onclick: () => { openSpell = open ? null : sp.id; render(); } },
        h('span', { class: 'gr-spell-glyph', 'aria-hidden': 'true' }, h('span', { text: '✦' })),
        h('span', { class: 'gr-spell-title' }, h('b', { class: 'gr-spell-name', text: sName() }),
          filled.length ? h('small', { text: filled.slice(0, 3).map(f => sp.values[f.id].trim()).join(' · ') }) : null),
        h('i', { class: 'gr-caret', 'aria-hidden': 'true', text: open ? '▴' : '▾' }));
      const ctl = h('div', { class: 'gr-ctl' },
        iconBtn('↑', 'Subir ' + sName(), () => { if (move(spells, i, -1)) refresh(); }, i === 0),
        iconBtn('↓', 'Descer ' + sName(), () => { if (move(spells, i, 1)) refresh(); }, i === spells.length - 1));
      const top = h('div', { class: 'gr-spell-top' }, toggle, ctl);

      let body;
      if (!open) {
        /* leitura rápida para a mesa */
        body = (filled.length || sp.extra.some(p => p.label || p.value) || sp.text) ? h('div', { class: 'gr-spell-read' },
          filled.length || sp.extra.length ? h('dl', { class: 'gr-dl' },
            [...filled.map(f => [label(f), sp.values[f.id]]), ...sp.extra.filter(p => p.label || p.value).map(p => [p.label || 'Campo', p.value || '—'])]
              .map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v })))) : null,
          sp.text ? h('p', { class: 'gr-spell-text', text: sp.text }) : null) : null;
      } else {
        const nameIn = h('input', { class: 'input gr-spell-name-in', value: sp.name, placeholder: 'Nome da magia', 'aria-label': 'Nome da magia', 'data-fk': fk + 'name',
          oninput: e => { sp.name = e.target.value; save(); toggle.querySelector('.gr-spell-name').textContent = sName(); } });
        body = h('div', { class: 'gr-spell-edit' },
          nameIn,
          SF.length ? h('div', { class: 'gr-spell-grid' }, SF.map(f => field(label(f), sp.values[f.id] || '', v => { if (v) sp.values[f.id] = v; else delete sp.values[f.id]; save(); }, { fk: fk + 'v-' + f.id }))) : null,
          field('Descrição / efeito', sp.text, v => { sp.text = v; save(); }, { multiline: true, placeholder: 'O que a magia faz, dano, testes, efeitos em níveis maiores…', fk: fk + 'text' }),
          h('div', { class: 'stack', style: 'gap:8px' },
            h('div', { class: 'row', style: 'justify-content:space-between' }, h('p', { class: 'fam-label', text: 'CAMPOS SÓ DESTA MAGIA · ' + sp.extra.length }), h('button', { class: 'btn sm', text: '+ Campo', onclick: addPair(sp.extra, fk) })),
            sp.extra.length ? pairRows(sp.extra, fk, 'da magia') : null),
          h('div', { class: 'row', style: 'justify-content:space-between' },
            h('button', { class: 'btn sm', text: 'Concluir', onclick: () => { openSpell = null; render(); } }),
            h('button', { class: 'btn sm danger', text: '✕ Excluir magia', onclick: () => { if (confirm('Excluir a magia “' + sName() + '”?')) { spells.splice(i, 1); openSpell = null; refresh(); } } })));
      }
      return h('article', { class: 'gr-spell' + (open ? ' open' : '') }, top, body);
    };

    /* a busca só esconde cartões (sem redesenhar), para não perder o cursor */
    const cards = spells.map((sp, i) => { const c = spellCard(sp, i); c.dataset.sid = sp.id; return c; });
    const none = h('p', { class: 'hint gr-none', hidden: true });
    const filter = () => {
      const q = norm(query.trim());
      let n = 0;
      cards.forEach((c, i) => { const ok = !q || match(spells[i], q) || spells[i].id === openSpell; c.hidden = !ok; n += ok; });
      none.hidden = n > 0; none.textContent = 'Nenhuma magia encontrada para “' + query.trim() + '”.';
    };
    const search = spells.length > 3 || query ? h('input', { class: 'input gr-search', type: 'search', value: query, placeholder: 'Buscar magia…', 'aria-label': 'Buscar magia neste grimório', 'data-fk': gk + 'search',
      oninput: e => { query = e.target.value; filter(); } }) : null;
    filter();
    const spellsWin = win('Magias · ' + spells.length, { orn: '✦', cls: 'gr-spells', actions: h('button', { class: 'btn sm primary', text: '+ Magia', onclick: addSpell }) },
      search,
      spells.length
        ? [h('div', { class: 'gr-spell-list' }, cards), none]
        : empty('✦', 'Nenhuma magia neste grimório', 'Adicione feitiços, rituais e encantamentos. Toque numa magia para editar; as setas mudam a ordem.', '+ Primeira magia', addSpell));

    return h('div', {}, head, tabs,
      h('div', { class: 'cols gr-cols' },
        h('div', { class: 'span-4 stack' }, detail, fieldsWin),
        h('div', { class: 'span-8' }, spellsWin)));
  }

  return { clean, screen, newGrimoire, newSpell };
})();
