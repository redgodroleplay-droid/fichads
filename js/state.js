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
    journal: [],
    /* familiares: [{ name, kind, bond, portrait, hp, maxhp, ac, speed, attrs[6], notes, abilities: [{ name, cost, text, uses, usesMax, reset }] }] */
    familiars: [],
    /* árvore de habilidades: nós com ramo, nível, custo e pré-requisitos (ids) */
    tree: { points: 0, nodes: [] }   // nodes: [{ id, name, branch, tier, cost, req: [], text, unlocked }]
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
  /* A validação corrige os objetos NO LUGAR. Criar cópias aqui fazia a tela continuar
     editando o objeto antigo: só a primeira letra de um nome chegava a ser salva. */
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const keep = (arr, ok) => { for (let i = arr.length - 1; i >= 0; i--) if (!ok(arr[i])) arr.splice(i, 1); return arr; };
  const fill = (o, def) => { for (const k of Object.keys(def)) if (!(k in o) || o[k] === null || o[k] === undefined) o[k] = def[k]; return o; };
  const PORTRAIT = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
  const ID = /^[a-z0-9]{1,24}$/;
  function cleanAbility(a) {
    fill(a, { name: '', cost: '', text: '', uses: 0, usesMax: 0, reset: 'long' });
    a.usesMax = Rules.clamp(Rules.int(a.usesMax, 0), 0, 30);
    a.uses = Rules.clamp(Rules.int(a.uses, 0), 0, a.usesMax);
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
    keep(s.conditions, c => Rules.CONDITIONS.includes(c));
    if (!Array.isArray(s.promise.seals)) s.promise.seals = [];
    if (!PORTRAIT.test(s.portrait) || s.portrait.length > 1500000) s.portrait = '';
    keep(s.items, i => isObj(i) && typeof i.name === 'string').forEach(i => {
      i.qty = Math.max(0, Rules.int(i.qty, 1));
      const g = Rules.gearInfo(i);
      if (g) {
        i.pd = Rules.clamp(Rules.int(i.pd, g.max), 0, g.max);
        if (!Array.isArray(i.combat)) i.combat = [];
        if (!Array.isArray(i.log)) i.log = [];
      }
    });
    keep(s.quests, isObj).forEach(q => { fill(q, { title: '', type: 'secundaria', text: '' }); if (!Array.isArray(q.objectives)) q.objectives = []; });
    if (!isObj(s.skillInfo)) s.skillInfo = {};
    keep(s.customSkills, isObj).forEach(k => {
      fill(k, { name: '', note: '' });
      k.attr = Rules.clamp(Rules.int(k.attr, 0), 0, 5); k.level = Rules.clamp(Rules.int(k.level, 0), 0, 2); k.extra = Rules.int(k.extra, 0);
    });
    keep(s.journal, isObj).forEach(j => { fill(j, { title: '', date: '', text: '', kind: 'registro', pinned: false }); if (!Array.isArray(j.items)) j.items = []; });
    keep(s.abilities, isObj).forEach(a => { cleanAbility(a); fill(a, { branch: '' }); });
    keep(s.techniques, isObj).forEach(t => { cleanAbility(t); fill(t, { action: 'acao', range: '', damage: '' }); });
    keep(s.titles, isObj).forEach(t => fill(t, { name: '', rarity: 'comum', source: '', benefit: '' }));
    /* familiares */
    keep(s.familiars, isObj).forEach(f => {
      fill(f, { name: '', kind: '', bond: '', portrait: '', hp: 1, maxhp: 1, ac: 10, speed: '', notes: '' });
      ['name', 'kind', 'bond', 'speed', 'notes'].forEach(k => { f[k] = String(f[k]).slice(0, 20000); });
      f.maxhp = Math.max(1, Rules.int(f.maxhp, 1));
      f.hp = Rules.clamp(Rules.int(f.hp, f.maxhp), 0, f.maxhp);
      f.ac = Rules.int(f.ac, 10);
      f.attrs = (Array.isArray(f.attrs) && f.attrs.length === 6 ? f.attrs : [10, 10, 10, 10, 10, 10]).map(n => Rules.clamp(Rules.int(n, 10), 1, 30));
      if (typeof f.portrait !== 'string' || !PORTRAIT.test(f.portrait) || f.portrait.length > 400000) f.portrait = '';
      if (!Array.isArray(f.abilities)) f.abilities = [];
      keep(f.abilities, isObj).forEach(cleanAbility);
    });
    /* árvore de habilidades */
    if (!isObj(s.tree)) s.tree = { points: 0, nodes: [] };
    s.tree.points = Math.max(0, Rules.int(s.tree.points, 0));
    if (!Array.isArray(s.tree.nodes)) s.tree.nodes = [];
    const seen = new Set();
    keep(s.tree.nodes, n => isObj(n) && ID.test(n.id) && !seen.has(n.id) && seen.add(n.id)).forEach(n => {
      fill(n, { name: '', branch: '', text: '', tier: 1, cost: 1, unlocked: false });
      n.tier = Rules.clamp(Rules.int(n.tier, 1), 1, 10);
      n.cost = Rules.clamp(Rules.int(n.cost, 1), 0, 99);
      n.unlocked = n.unlocked === true;
      if (!Array.isArray(n.req)) n.req = [];
      keep(n.req, r => r !== n.id && seen.has(r));
    });
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
