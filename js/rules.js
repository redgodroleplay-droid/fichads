/* Regras do RPG da mesa (as mesmas da ficha da Lucy), sem nenhuma interface.
   Atributos, proficiência, XP por nível, dados, perícias e Durabilidade de Armas e Armaduras. */
const Rules = (() => {
  const mod = n => Math.floor((Number(n) - 10) / 2);
  const signed = n => (n >= 0 ? '+' + n : String(n));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const int = (v, d = 0) => {
    if (v === undefined || v === null || String(v).trim() === '') return d;
    const n = Math.floor(Number(String(v).replace(',', '.')));
    return Number.isFinite(n) ? n : d;
  };

  /* ---------- Atributos e perícias ---------- */
  const ATTRS = [
    ['FOR', 'Força'], ['DES', 'Destreza'], ['CON', 'Constituição'],
    ['INT', 'Inteligência'], ['SAB', 'Sabedoria'], ['CAR', 'Carisma']
  ];
  const SKILLS = [
    ['Acrobacia', 1], ['Arcanismo', 3], ['Atletismo', 0], ['Atuação', 5], ['Enganação', 5], ['Furtividade', 1],
    ['História', 3], ['Intimidação', 5], ['Intuição', 4], ['Investigação', 3], ['Lidar com animais', 4], ['Medicina', 4],
    ['Natureza', 3], ['Percepção', 4], ['Persuasão', 5], ['Prestidigitação', 1], ['Religião', 3], ['Sobrevivência', 4]
  ];
  const CONDITIONS = ['Amedrontado', 'Agarrado', 'Atordoado', 'Caído', 'Cego', 'Concentrando', 'Envenenado', 'Exausto', 'Incapacitado', 'Invisível', 'Paralisado', 'Surdo'];

  /* ---------- Progressão (tabela de XP da mesa) ---------- */
  const XP = [0, 1200, 3600, 10800, 26000, 56000, 92000, 136000, 192000, 256000, 340000, 400000, 480000, 560000, 660000, 780000, 900000, 1060000, 1220000, 1420000];
  const pbFor = level => 2 + Math.floor((Math.max(1, level) - 1) / 4);
  const levelForXp = xp => XP.reduce((lvl, need, i) => (xp >= need ? i + 1 : lvl), 1);

  /* ---------- Dados ---------- */
  function die(sides) {
    const a = new Uint32Array(1), limit = Math.floor(4294967296 / sides) * sides;
    do crypto.getRandomValues(a); while (a[0] >= limit);
    return a[0] % sides + 1;
  }
  /* Expressão como "1d20+DES+PB" ou "2d6+3". tokens: { FOR, DES, …, PB, NIV } → números */
  function rollExpr(expr, tokens) {
    const src = String(expr).toUpperCase()
      .replace(/\b(FOR|DES|CON|INT|SAB|CAR|PB|NIV)\b/g, k => signed(tokens[k] || 0))
      .replace(/\s+/g, '').replace(/\+\+/g, '+').replace(/\+-|-\+/g, '-').replace(/--/g, '+').replace(/^\+/, '');
    const term = /([+-]?)(?:(\d*)D(\d+)|(\d+))/gy;
    let total = 0, consumed = 0, match, d20 = null;
    const parts = [];
    while (consumed < src.length && (match = term.exec(src))) {
      consumed = term.lastIndex;
      const sign = match[1] === '-' ? -1 : 1;
      if (match[3]) {
        const count = clamp(Number(match[2] || 1), 1, 100), sides = clamp(Number(match[3]), 2, 1000);
        const results = Array.from({ length: count }, () => die(sides));
        if (sides === 20 && count === 1 && d20 === null) d20 = results[0];
        total += sign * results.reduce((a, b) => a + b, 0);
        parts.push((sign < 0 ? '− ' : parts.length ? '+ ' : '') + count + 'd' + sides + ' [' + results.join(', ') + ']');
      } else {
        total += sign * Number(match[4]);
        parts.push((sign < 0 ? '− ' : parts.length ? '+ ' : '') + match[4]);
      }
    }
    if (!src || consumed !== src.length) return null;
    return { total, detail: parts.join(' '), d20 };
  }
  const firstDice = text => (String(text || '').match(/\d*d\d+(?:\s*[+-]\s*(?:\d*d\d+|\d+|FOR|DES|CON|INT|SAB|CAR|PB|NIV))*/i) || [])[0];

  /* ---------- Durabilidade de Armas e Armaduras ---------- */
  const GEAR = {
    'w-improv': { kind: 'weapon', label: 'Arma improvisada', pd: 10 },
    'w-wood': { kind: 'weapon', label: 'Arma simples de madeira', pd: 20 },
    'w-metal': { kind: 'weapon', label: 'Arma simples de metal', pd: 34 },
    'w-martial': { kind: 'weapon', label: 'Arma marcial', pd: 46 },
    'w-heavy': { kind: 'weapon', label: 'Arma pesada de duas mãos', pd: 60 },
    'a-light': { kind: 'armor', label: 'Armadura leve', pd: 25 },
    'a-medium': { kind: 'armor', label: 'Armadura média', pd: 40 },
    'a-heavy': { kind: 'armor', label: 'Armadura pesada', pd: 60 },
    'shield': { kind: 'shield', label: 'Escudo', pd: 35 }
  };
  const RARITY = {
    comum: { label: 'Comum', bonus: 0, cut: 0 },
    incomum: { label: 'Incomum', bonus: 25, cut: 1 },
    raro: { label: 'Raro', bonus: 50, cut: 2 },
    'muito-raro': { label: 'Muito raro', bonus: 83, cut: 3 },
    lendario: { label: 'Lendário', bonus: 125, cut: 5 },
    artefato: { label: 'Artefato', bonus: 0, cut: 0, immune: true }
  };
  const STATE_LABEL = { conservado: 'Conservado', desgastado: 'Desgastado', danificado: 'Danificado', critico: 'Crítico', quebrado: 'Quebrado', artefato: 'Artefato' };
  const EVENTS = {
    weapon: [['use', 'Atacou neste combate', 1, true], ['crit', 'Acerto crítico', 2], ['fumble', 'Falha crítica (1 natural)', 5], ['hard', 'Golpeou superfície resistente', 3], ['parry', 'Aparou golpe devastador', 5]],
    armor: [['use', 'Portador sofreu dano', 1, true], ['critIn', 'Recebeu acerto crítico', 3], ['down', 'Portador caiu a 0 PV', 5], ['corrode', 'Corrosão / destruição material', 3]],
    shield: [['use', 'Portador foi alvo de ataque', 1, true], ['critIn', 'Crítico atingiu o escudo', 3], ['block', 'Bloqueou impacto destrutivo', 5]]
  };
  function gearInfo(item) {
    const g = item && GEAR[item.gear];
    if (!g) return null;
    const rarity = RARITY[item.rarity] || RARITY.comum;
    return { ...g, rarity, max: g.pd + rarity.bonus, immune: !!rarity.immune, magic: (item.rarity || 'comum') !== 'comum' };
  }
  function stateOf(pd, max) {
    if (pd <= 0) return 'quebrado';
    const pct = Math.floor(pd * 100 / max);
    return pct > 50 ? 'conservado' : pct > 25 ? 'desgastado' : pct > 10 ? 'danificado' : 'critico';
  }
  const accelerate = net => (net > 0 ? Math.ceil(net * 11 / 10) : 0);
  const sunder = damage => Math.min(10, Math.max(1, Math.floor(Math.max(0, damage) / 4)));
  function resolveCombat(pd, max, events, cut, immune) {
    const raw = events.reduce((a, e) => a + e.n, 0);
    if (immune) return { raw, cut: 0, net: 0, final: 0, after: pd, broke: false, reason: 'Artefato: não sofre desgaste convencional.' };
    let cum = 0, reason = '';
    for (const e of events) {
      const before = pd - Math.max(0, cum - cut);
      cum += e.n;
      const now = pd - Math.max(0, cum - cut);
      if (reason || before <= 0) continue;
      if (stateOf(before, max) === 'critico' && e.n >= 5) reason = 'Estava Crítico e perdeu ' + e.n + ' PD de uma só fonte (' + e.label + ').';
      else if (now <= 0) reason = 'Chegou a 0 PD em: ' + e.label + '.';
    }
    const net = Math.max(0, raw - cut), final = accelerate(net);
    const after = reason ? 0 : Math.max(0, pd - final);
    if (!reason && after === 0 && pd > 0) reason = 'Chegou a 0 PD com o Desgaste Acelerado.';
    return { raw, cut, net, final, after, broke: after === 0 && pd > 0, reason };
  }
  function penalties(kind, st, magic) {
    const ac = kind === 'armor' ? 'CA da armadura −1.' : 'Bônus de CA do escudo −1.';
    if (st === 'danificado') return [kind === 'weapon' ? '−1 nas jogadas de dano (mínimo 1).' : ac];
    if (st === 'critico') return [kind === 'weapon' ? '−1 no ataque e no dano.' : ac, 'Perder 5+ PD de uma só fonte o quebra na hora.'];
    if (st === 'quebrado') return [
      kind === 'weapon' ? 'Não funciona como arma da categoria; fragmentos = arma improvisada.' : kind === 'armor' ? 'Não dá a CA base; mantém peso e desvantagens.' : 'Não concede bônus de CA.',
      ...(magic ? ['Propriedades mágicas suspensas até o reparo.'] : []), 'Só um profissional pode restaurar.'];
    return [st === 'desgastado' ? 'Marcas evidentes, sem penalidades.' : 'Sem penalidades.'];
  }
  const repairCost = (price, restored) => (price > 0 && restored > 0 ? Math.max(1, Math.round(price * 0.01 * restored / 10 * 100) / 100) : null);

  return { mod, signed, clamp, int, ATTRS, SKILLS, CONDITIONS, XP, pbFor, levelForXp, die, rollExpr, firstDice,
    GEAR, RARITY, STATE_LABEL, EVENTS, gearInfo, stateOf, accelerate, sunder, resolveCombat, penalties, repairCost };
})();
