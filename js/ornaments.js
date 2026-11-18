/* Ornamentos em SVG com traço "à mão": linhas levemente tortas, runas do futhark,
   selos e cantos. Tudo é desenhado uma vez (estático); o único movimento é feito
   por camadas HTML (opacidade/rotação), que a GPU compõe sem redesenhar o SVG. */
const Orn = (() => {
  const FUTHARK = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  const NS = 'http://www.w3.org/2000/svg';
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  const f = n => Math.round(n * 10) / 10;

  /* linha torta: pontos com pequeno desvio perpendicular, suavizados com curvas */
  function wobble(r, x1, y1, x2, y2, amp, step) {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / step));
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, off = i === 0 || i === n ? 0 : (r() - 0.5) * 2 * amp;
      pts.push([x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off]);
    }
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1], [x, y] = pts[i];
      d += ` Q${f(px)} ${f(py)} ${f((px + x) / 2)} ${f((py + y) / 2)}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${f(last[0])} ${f(last[1])}`;
  }
  /* retângulo torto (cantos que não fecham perfeitamente, como desenhado à mão) */
  function wobbleRect(r, x, y, w, h, amp, step) {
    const j = () => (r() - 0.5) * amp * 1.6;
    return [
      wobble(r, x + j(), y + j(), x + w + j(), y + j(), amp, step),
      wobble(r, x + w + j(), y - 2 + j(), x + w + j(), y + h + j(), amp, step),
      wobble(r, x + w + 2 + j(), y + h + j(), x + j(), y + h + j(), amp, step),
      wobble(r, x + j(), y + h + 2 + j(), x + j(), y - 1 + j(), amp, step)
    ].join(' ');
  }
  /* selo rúnico: dois círculos tortos e runas em volta */
  function sealMarkup(r, cx, cy, rad, runes, size) {
    let out = '';
    const circle = (rr, amp) => {
      let d = '';
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2, k = rr + (i === n ? 0 : (r() - 0.5) * amp);
        d += (i ? ' L' : 'M') + f(cx + Math.cos(a) * k) + ' ' + f(cy + Math.sin(a) * k);
      }
      return `<path d="${d}" class="o-line"/>`;
    };
    out += circle(rad, rad * 0.06) + circle(rad * 0.74, rad * 0.05);
    for (let i = 0; i < runes; i++) {
      const a = (i / runes) * Math.PI * 2 - Math.PI / 2, rr = rad * 0.87;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      out += `<text x="${f(x)}" y="${f(y)}" class="o-rune" font-size="${size}" text-anchor="middle" dominant-baseline="central" transform="rotate(${f(a * 180 / Math.PI + 90 + (r() - 0.5) * 14)} ${f(x)} ${f(y)})">${FUTHARK[Math.floor(r() * FUTHARK.length)]}</text>`;
    }
    return out;
  }
  const svgEl = (w, h, cls, inner) => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false">${inner}</svg>`;

  /* ---------- Moldura da página ---------- */
  const frame = document.createElement('div');
  frame.className = 'rune-frame';
  frame.setAttribute('aria-hidden', 'true');
  const sparkLayer = document.createElement('div');
  sparkLayer.className = 'rune-sparks';
  frame.append(sparkLayer);
  let runeSpots = [];

  function drawFrame() {
    /* a moldura fica entre o topo (HUD + faixa da Promessa) e a barra de abas do celular */
    const strip = document.querySelector('.oath-strip'), tabs = document.querySelector('.tabs');
    const small = window.innerWidth < 860;
    frame.style.top = (strip ? Math.round(strip.getBoundingClientRect().bottom) : 0) + 'px';
    frame.style.bottom = (small && tabs && getComputedStyle(tabs).position === 'fixed' ? Math.round(tabs.getBoundingClientRect().height) : 0) + 'px';
    const w = frame.clientWidth, h = frame.clientHeight;
    if (w < 50 || h < 50) return;
    const o = small ? 5 : 10, band = small ? 13 : 22;     // linha de fora e largura da faixa de runas
    const r = rng(1993 + Math.round(w / 50));
    const amp = small ? 1.2 : 2;
    let inner = '';
    inner += `<path d="${wobbleRect(r, o, o, w - o * 2, h - o * 2, amp, 60)}" class="o-line strong"/>`;
    inner += `<path d="${wobbleRect(r, o + band, o + band, w - (o + band) * 2, h - (o + band) * 2, amp * 0.8, 70)}" class="o-line"/>`;
    /* runas ao longo da faixa, com rotação e espaçamento irregulares */
    runeSpots = [];
    const mid = o + band / 2, size = small ? 9 : 13, gap = small ? 34 : 44, c = small ? 40 : 64;
    const place = (x, y, rot) => {
      const ch = FUTHARK[Math.floor(r() * FUTHARK.length)];
      runeSpots.push([x, y, ch, rot]);
      inner += `<text x="${f(x)}" y="${f(y)}" class="o-rune" font-size="${size}" text-anchor="middle" dominant-baseline="central" transform="rotate(${f(rot)} ${f(x)} ${f(y)})">${ch}</text>`;
    };
    for (let x = c; x < w - c; x += gap + (r() - 0.5) * 14) { place(x, mid + (r() - 0.5) * 2, (r() - 0.5) * 16); place(x + gap / 2, h - mid + (r() - 0.5) * 2, 180 + (r() - 0.5) * 16); }
    for (let y = c; y < h - c; y += gap + (r() - 0.5) * 14) { place(mid + (r() - 0.5) * 2, y, -90 + (r() - 0.5) * 16); place(w - mid + (r() - 0.5) * 2, y + gap / 2, 90 + (r() - 0.5) * 16); }
    /* selos nos cantos */
    const sr = small ? 15 : 24;
    for (const [cx, cy] of [[mid + 4, mid + 4], [w - mid - 4, mid + 4], [mid + 4, h - mid - 4], [w - mid - 4, h - mid - 4]]) {
      inner += `<circle cx="${cx}" cy="${cy}" r="${sr + 3}" class="o-fill"/>` + sealMarkup(r, cx, cy, sr, 8, small ? 6 : 8);
      inner += `<text x="${cx}" y="${cy}" class="o-rune core" font-size="${small ? 11 : 16}" text-anchor="middle" dominant-baseline="central">ᛟ</text>`;
    }
    const old = frame.querySelector('svg');
    const holder = document.createElement('div');
    holder.innerHTML = svgEl(w, h, 'rune-frame-svg', inner);
    if (old) old.replaceWith(holder.firstChild); else frame.prepend(holder.firstChild);
  }
  /* uma runa da moldura acende por vez (camada HTML: só opacidade, sem redesenhar o SVG) */
  function spark() {
    if (!runeSpots.length || document.hidden) return;
    const [x, y, ch, rot] = runeSpots[Math.floor(Math.random() * runeSpots.length)];
    const s = document.createElement('i');
    s.textContent = ch;
    s.style.cssText = `left:${x}px;top:${y}px;transform:translate(-50%,-50%) rotate(${rot}deg);font-size:${window.innerWidth < 860 ? 9 : 13}px`;
    sparkLayer.append(s);
    setTimeout(() => s.remove(), 2600);
  }
  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(drawFrame, 150); });
  document.body.append(frame);
  /* espera a interface montar (HUD e abas) e as fontes carregarem */
  setTimeout(drawFrame, 0);
  document.fonts?.ready.then(drawFrame);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(spark, 1400);

  /* ---------- Peças para as telas ---------- */
  /* divisor rúnico torto sob os títulos */
  let dividerSeed = 7;
  function divider() {
    const r = rng(dividerSeed++ * 97 + 13);
    const w = 420, h = 26, cy = 13;
    let inner = `<path d="${wobble(r, 4, cy, 170, cy, 1.6, 22)}" class="o-line"/><path d="${wobble(r, 250, cy, 416, cy, 1.6, 22)}" class="o-line"/>`;
    inner += `<path d="${wobble(r, 30, cy + 4, 160, cy + 3, 1, 26)}" class="o-line faint"/><path d="${wobble(r, 260, cy + 3, 390, cy + 4, 1, 26)}" class="o-line faint"/>`;
    inner += `<path d="M210 2 L222 ${cy} L210 24 L198 ${cy} Z" class="o-line strong o-fill"/>`;
    inner += `<text x="210" y="${cy + 0.5}" class="o-rune core" font-size="11" text-anchor="middle" dominant-baseline="central">${FUTHARK[Math.floor(r() * FUTHARK.length)]}</text>`;
    [182, 238].forEach(x => { inner += `<text x="${x}" y="${cy}" class="o-rune" font-size="10" text-anchor="middle" dominant-baseline="central">${FUTHARK[Math.floor(r() * FUTHARK.length)]}</text>`; });
    inner += `<circle cx="4" cy="${cy}" r="2.2" class="o-dot"/><circle cx="416" cy="${cy}" r="2.2" class="o-dot"/>`;
    const d = document.createElement('div');
    d.className = 'rune-divider';
    d.innerHTML = svgEl(w, h, '', inner);
    return d;
  }
  /* moldura torta para o retrato */
  function portraitFrame() {
    const r = rng(4242);
    const w = 200, h = 250;
    let inner = `<path d="${wobbleRect(r, 4, 4, w - 8, h - 8, 1.8, 26)}" class="o-line strong"/>`;
    inner += `<path d="${wobbleRect(r, 10, 10, w - 20, h - 20, 1.2, 30)}" class="o-line faint"/>`;
    for (const [x, y] of [[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]]) {
      inner += `<circle cx="${x}" cy="${y}" r="9" class="o-fill"/><circle cx="${x}" cy="${y}" r="9" class="o-line"/>`;
      inner += `<text x="${x}" y="${y}" class="o-rune core" font-size="10" text-anchor="middle" dominant-baseline="central">${FUTHARK[Math.floor(r() * FUTHARK.length)]}</text>`;
    }
    [[w / 2, 6], [w / 2, h - 6]].forEach(([x, y]) => { inner += `<text x="${x}" y="${y}" class="o-rune" font-size="9" text-anchor="middle" dominant-baseline="central">ᛜ ᛟ ᛜ</text>`; });
    const d = document.createElement('div');
    d.className = 'portrait-frame';
    d.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${inner}</svg>`;
    return d;
  }
  /* selo grande para o fundo do juramento */
  function seal() {
    const r = rng(777);
    let inner = sealMarkup(r, 150, 150, 140, 16, 18) + sealMarkup(r, 150, 150, 78, 10, 13);
    inner += `<path d="${wobble(r, 150, 20, 150, 280, 2, 40)}" class="o-line faint"/><path d="${wobble(r, 20, 150, 280, 150, 2, 40)}" class="o-line faint"/>`;
    const d = document.createElement('div');
    d.className = 'oath-seal';
    d.innerHTML = svgEl(300, 300, '', inner);
    return d;
  }
  return { divider, portraitFrame, seal };
})();
window.Orn = Orn;
