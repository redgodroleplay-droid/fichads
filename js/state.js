/* Estado do personagem: ficha em branco (só o nome e o retrato do Bedivere),
   salvamento local e backup JSON. Tudo o mais o jogador preenche. */
const Store = (() => {
  const KEY = 'bedivere-sistema-v2';
  const FORMAT = 'bedivere-sistema';

  const defaults = () => ({
    version: 2,
    name: 'Bedivere', epithet: '', title: '', portrait: '',
    classes: '', affinity: '', race: '', background: '', age: '', height: '', gender: '', speed: '',
    level: 1, xp: 0, autoProf: true, prof: 2,
    hp: 10, maxhp: 10, tempHp: 0, mana: 0, maxMana: 0, ac: 10,
    attrs: [10, 10, 10, 10, 10, 10],
    skillLevels: {}, training: '',
    skillInfo: {},        // { "Furtividade": { note, extra } }
    customSkills: [],     // [{ name, attr, level, note, extra }]
    conditions: [], gold: 0,
    abilities: [],
    techniques: [],       // [{ name, action, range, cost, damage, text, uses, usesMax, reset }]
    titles: [],           // [{ name, rarity, source, benefit }] — o ativo fica em `title`
    items: [],
    quests: [],
    /* A Promessa evolui só por feitos: cada selo é aceso pelo jogador ou pelo mestre. */
    promise: { oath: '', to: '', seals: [] },
    curse: { label: '', stage: 0, max: 10, notes: '' },
    lore: [],
    relations: [],
    personality: [], strengths: [], weaknesses: [], quotes: [],
    journal: []
  });

  /* Junta o que veio salvo com os padrões, aceitando só tipos compatíveis. */
  function merge(base, data) {
    if (Array.isArray(base)) return Array.isArray(data) ? data.filter(v => v !== null && v !== undefined) : base;
    if (base && typeof base === 'object') {
      const out = { ...base };
      if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
      for (const k of Object.keys(data)) {
        if (!(k in base)) { if (['string', 'number', 'boolean', 'object'].includes(typeof data[k])) out[k] = data[k]; continue; }
        const b = base[k], v = data[k];
        if (typeof b === 'number') out[k] = Number.isFinite(v) ? v : b;
        else if (typeof b === 'string') out[k] = typeof v === 'string' ? v.slice(0, 50000) : b;
        else if (typeof b === 'boolean') out[k] = typeof v === 'boolean' ? v : b;
        else out[k] = merge(b, v);
      }
      return out;
    }
    return data ?? base;
  }
  function sanitize(s) {
    s.attrs = (Array.isArray(s.attrs) && s.attrs.length === 6 ? s.attrs : defaults().attrs).map(n => Rules.clamp(Rules.int(n, 10), 1, 30));
    s.level = Rules.clamp(Rules.int(s.level, 1), 1, 20);
    s.xp = Math.max(0, Rules.int(s.xp, 0));
    s.maxhp = Math.max(1, Rules.int(s.maxhp, 1));
    s.hp = Rules.clamp(Rules.int(s.hp, s.maxhp), 0, s.maxhp);
    s.maxMana = Math.max(0, Rules.int(s.maxMana, 0));
    s.mana = Rules.clamp(Rules.int(s.mana, 0), 0, s.maxMana);
    s.tempHp = Math.max(0, Rules.int(s.tempHp, 0));
    if (s.autoProf) s.prof = Rules.pbFor(s.level);
    s.conditions = s.conditions.filter(c => Rules.CONDITIONS.includes(c));
    if (!Array.isArray(s.promise.seals)) s.promise.seals = [];
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s.portrait) || s.portrait.length > 1500000) s.portrait = '';
    s.items = s.items.filter(i => i && typeof i.name === 'string').map(i => {
      const out = { ...i, qty: Math.max(0, Rules.int(i.qty, 1)) };
      const g = Rules.gearInfo(out);
      if (g) {
        out.pd = Rules.clamp(Rules.int(out.pd, g.max), 0, g.max);
        if (!Array.isArray(out.combat)) out.combat = [];
        if (!Array.isArray(out.log)) out.log = [];
      }
      return out;
    });
    s.quests = s.quests.filter(q => q && typeof q === 'object').map(q => ({ title: '', type: 'secundaria', text: '', ...q, objectives: Array.isArray(q.objectives) ? q.objectives : [] }));
    if (!s.skillInfo || typeof s.skillInfo !== 'object' || Array.isArray(s.skillInfo)) s.skillInfo = {};
    s.customSkills = s.customSkills.filter(k => k && typeof k === 'object').map(k => ({ name: '', note: '', ...k, attr: Rules.clamp(Rules.int(k.attr, 0), 0, 5), level: Rules.clamp(Rules.int(k.level, 0), 0, 2), extra: Rules.int(k.extra, 0) }));
    s.journal = s.journal.filter(j => j && typeof j === 'object').map(j => ({ title: '', date: '', text: '', kind: 'registro', pinned: false, ...j, items: Array.isArray(j.items) ? j.items : [] }));
    s.curse.max = Rules.clamp(Rules.int(s.curse.max, 10), 1, 20);
    s.curse.stage = Rules.clamp(Rules.int(s.curse.stage, 0), 0, s.curse.max);
    return s;
  }

  let state;
  try { state = sanitize(merge(defaults(), JSON.parse(localStorage.getItem(KEY)))); }
  catch { state = sanitize(defaults()); }

  const listeners = new Set();
  function save() {
    sanitize(state);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    listeners.forEach(fn => fn(state));
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify({ format: FORMAT, version: 2, exportedAt: new Date().toISOString(), data: state }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    const slug = (state.name || 'ficha').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ficha';
    a.href = url; a.download = slug + '-ficha-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function parseBackup(text) {
    const raw = JSON.parse(text);
    if (!raw || raw.format !== FORMAT || !raw.data || typeof raw.data !== 'object') throw Error('Arquivo não é um backup desta ficha.');
    return sanitize(merge(defaults(), raw.data));
  }
  function replace(next) { state = next; save(); }
  function reset() { state = sanitize(defaults()); save(); }

  return { get state() { return state; }, save, onChange: fn => listeners.add(fn), exportJson, parseBackup, replace, reset, KEY };
})();
