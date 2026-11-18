/* Entrada: noite numa floresta tomada por cristais negros, o castelo de Avalon ao longe.
   Uma pena de fênix desce em brasas azuis; ao tocar o chão, os cristais trincam,
   as janelas do castelo acendem e o Sistema desperta. */
const Scene = (() => {
  /* aleatório com semente: a paisagem sai sempre igual */
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

  function trees(r, y, count, hMin, hMax, fill) {
    let out = '';
    for (let i = 0; i < count; i++) {
      const x = (i / count) * 1700 - 50 + r() * 30, hgt = hMin + r() * (hMax - hMin), w = hgt * (0.32 + r() * 0.12);
      out += `<path d="M${x} ${y} L${x + w / 2} ${y - hgt} L${x + w} ${y} Z" fill="${fill}"/>`;
    }
    return `<g>${out}<rect x="0" y="${y - 2}" width="1600" height="${902 - y}" fill="${fill}"/></g>`;
  }
  /* aglomerado de cristais: lascas altas com borda azul */
  function cluster(r, cx, base, n, scale, cracks) {
    let shards = '', crackPaths = '';
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * 220 * scale, hgt = (90 + r() * 260) * scale, w = (22 + r() * 34) * scale;
      const lean = (r() - 0.5) * 60 * scale, tip = x + lean;
      shards += `<path class="crystal" d="M${x - w / 2} ${base} L${x - w * 0.35 + lean * 0.5} ${base - hgt * 0.7} L${tip} ${base - hgt} L${x + w * 0.4 + lean * 0.5} ${base - hgt * 0.72} L${x + w / 2} ${base} Z" fill="url(#cg)" stroke="#7fc4ff" stroke-opacity=".38" stroke-width="1.2"/>`;
      shards += `<path d="M${tip} ${base - hgt} L${x + lean * 0.2} ${base}" stroke="#bfe3ff" stroke-opacity=".12" stroke-width="1"/>`;
      if (cracks && i % 2 === 0) {
        const len = Math.round(hgt * 0.9);
        let d = `M${tip} ${base - hgt + 6}`, yy = base - hgt + 6, xx = tip;
        for (let k = 0; k < 4; k++) { xx += (r() - 0.5) * w * 0.8; yy += hgt * 0.2; d += ` L${xx} ${yy}`; }
        crackPaths += `<path class="crack" d="${d}" style="--len:${len};--cd:${(r() * 0.4).toFixed(2)}s"/>`;
      }
    }
    return shards + crackPaths;
  }
  function castle() {
    /* castelo gótico pequeno, no alto da colina à direita */
    const body = 'M1040 520 L1040 430 L1052 430 L1052 410 L1064 410 L1064 430 L1080 430 L1080 380 L1072 380 L1086 330 L1100 380 L1092 380 L1092 430 L1120 430 L1120 350 L1110 350 L1128 280 L1146 350 L1136 350 L1136 430 L1164 430 L1164 395 L1156 395 L1170 352 L1184 395 L1176 395 L1176 430 L1196 430 L1196 412 L1208 412 L1208 430 L1220 430 L1220 520 Z';
    const lights = [[1083, 395], [1125, 370], [1131, 395], [1168, 405], [1060, 450], [1100, 452], [1150, 455], [1200, 450], [1127, 320]]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="7" rx="2"/>`).join('');
    /* deslocado para perto do centro: no celular só o meio da cena aparece */
    return `<g class="castle" transform="translate(-180 0)"><path d="M960 560 Q1130 470 1320 560 Z" fill="#081026"/><path d="${body}" fill="#060c20"/><g class="castle-lights">${lights}</g></g>`;
  }
  function svg({ intro }) {
    const r = rng(3231);
    return `<svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050d"/><stop offset=".55" stop-color="#0a1638"/><stop offset=".8" stop-color="#1b2a5e"/><stop offset="1" stop-color="#2a2f66"/></linearGradient>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c2448"/><stop offset=".5" stop-color="#090c1c"/><stop offset="1" stop-color="#020308"/></linearGradient>
        <radialGradient id="moon"><stop offset="0" stop-color="#eef4ff"/><stop offset=".6" stop-color="#bcd2ff" stop-opacity=".9"/><stop offset="1" stop-color="#7fa7ff" stop-opacity="0"/></radialGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02030a" stop-opacity="0"/><stop offset="1" stop-color="#02030a"/></linearGradient>
      </defs>
      ${intro ? '<rect width="1600" height="900" fill="url(#sky)"/>' : ''}
      <circle cx="1010" cy="170" r="${intro ? 110 : 90}" fill="url(#moon)" opacity="${intro ? 0.85 : 0.35}"/>
      <path d="M0 560 L180 470 L330 520 L520 430 L700 510 L860 450 L1010 520 L1200 440 L1400 510 L1600 450 L1600 900 L0 900 Z" fill="#0a1430" opacity=".9"/>
      ${castle()}
      ${trees(r, 640, 46, 90, 170, '#060b1c')}
      ${trees(r, 720, 34, 140, 240, '#03060f')}
      ${cluster(r, 160, 905, 9, 1.25, intro)}
      ${cluster(r, 1460, 905, 9, 1.2, intro)}
      ${cluster(r, 590, 912, 6, 0.95, intro)}
      ${cluster(r, 1030, 912, 6, 0.95, intro)}
      ${intro ? cluster(r, 800, 915, 4, 0.6, true) : ''}
      <rect x="0" y="700" width="1600" height="200" fill="url(#fade)"/>
    </svg>`;
  }
  return { svg };
})();

const Intro = (() => {
  const featherSvg = `<svg viewBox="0 0 60 200" aria-hidden="true"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cfe6ff"/><stop offset="1" stop-color="#3d74ff"/></linearGradient></defs>
    <path d="M30 8 C54 40 57 92 45 148 C41 168 35 182 30 190 C25 182 19 168 15 148 C3 92 6 40 30 8 Z" fill="url(#fg)" opacity=".95"/>
    <path d="M30 8 L30 198" stroke="#ffffff" stroke-width="2"/>
    <g stroke="#ffffff" stroke-opacity=".55" stroke-width="1"><path d="M30 40 L46 30"/><path d="M30 60 L50 48"/><path d="M30 82 L52 70"/><path d="M30 104 L50 94"/><path d="M30 126 L46 118"/><path d="M30 40 L14 30"/><path d="M30 60 L10 48"/><path d="M30 82 L8 70"/><path d="M30 104 L10 94"/><path d="M30 126 L14 118"/></g></svg>`;
  let el = null, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ember(x, y, burst) {
    if (!el) return;
    const e = document.createElement('i');
    e.className = 'ember';
    const a = Math.random() * Math.PI * 2, dist = burst ? 80 + Math.random() * 260 : 20 + Math.random() * 50;
    e.style.cssText = `left:${x}px;top:${y}px;--x:${Math.cos(a) * dist}px;--y:${(burst ? Math.sin(a) * dist - 120 : 40 + Math.random() * 60)}px;--t:${burst ? 1.4 + Math.random() * 1.4 : 1 + Math.random()}s`;
    el.append(e);
    setTimeout(() => e.remove(), 3000);
  }
  function type(node, text, speed) {
    return new Promise(resolve => {
      if (reduced()) { node.textContent = text; return resolve(); }
      let i = 0;
      node.classList.add('caret');
      const tick = () => {
        if (!el) return resolve();
        node.textContent = text.slice(0, ++i);
        if (i < text.length) later(tick, speed); else { node.classList.remove('caret'); resolve(); }
      };
      tick();
    });
  }
  async function awaken() {
    if (!el || el.classList.contains('awake')) return;
    el.classList.add('touched', 'awake');
    const s = Store.state;
    const lines = el.querySelector('.lines');
    const items = [
      ['p', 'Uma pena de fênix tocou o solo de cristal.', 18],
      ['p', 'Portador reconhecido:', 22],
      ['p nm', (s.name || 'Bedivere').toUpperCase(), 60],
      s.promise.oath ? ['q', s.promise.oath, 20] : ['p', 'Seu juramento ainda não foi escrito.', 20]
    ];
    for (const [tag, text, speed] of items) {
      const [t, cls] = tag.split(' ');
      const n = document.createElement(t);
      if (cls) n.className = cls;
      lines.append(n);
      await type(n, text, speed);
      if (!el) return;
    }
    const btn = el.querySelector('.accept');
    btn.hidden = false;
    btn.focus();
  }
  function close() {
    if (!el) return;
    const node = el;
    el = null;
    timers.forEach(clearTimeout); timers = [];
    document.removeEventListener('keydown', onKey);
    node.classList.add('leaving');
    setTimeout(() => node.remove(), reduced() ? 0 : 800);
    document.body.style.overflow = '';
    setTimeout(() => window.App?.notify('Runas', 'Bem-vindo de volta, ' + (Store.state.name || 'Bedivere') + '.'), 500);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function play() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'intro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Entrada da ficha');
    let stars = '';
    for (let i = 0; i < 70; i++) stars += `<i style="left:${Math.random() * 100}%;top:${Math.random() * 55}%;--t:${2 + Math.random() * 4}s;--d:${-Math.random() * 4}s"></i>`;
    el.innerHTML = `<div class="sky-stars" aria-hidden="true">${stars}</div>${Scene.svg({ intro: true })}
      <div class="mist" style="bottom:12%" aria-hidden="true"></div><div class="mist" style="bottom:0;animation-duration:24s" aria-hidden="true"></div>
      <div class="feather">${featherSvg}</div><div class="shock" aria-hidden="true"></div><div class="flash" aria-hidden="true"></div>
      <div class="intro-window"><section class="win"><div class="win-head"><span class="orn">✠</span><h2 class="win-title">As runas despertaram</h2></div>
        <div class="lines" aria-live="polite"></div>
        <button class="btn primary accept" hidden>Abrir o grimório</button></section></div>
      <span class="intro-hint">Esc para pular</span>
      <button class="btn ghost sm intro-skip">Pular ›</button>`;
    document.body.append(el);
    document.body.style.overflow = 'hidden';
    el.querySelector('.intro-skip').onclick = close;
    el.querySelector('.accept').onclick = close;
    document.addEventListener('keydown', onKey);
    el.querySelector('.intro-skip').focus({ preventScroll: true });

    if (reduced()) { awaken(); return; }
    /* brasas seguindo a pena */
    const feather = el.querySelector('.feather');
    const trail = setInterval(() => {
      if (!el || el.classList.contains('touched')) return clearInterval(trail);
      const b = feather.getBoundingClientRect();
      ember(b.left + b.width / 2 + (Math.random() - 0.5) * b.width, b.top + b.height * 0.8, false);
    }, 90);
    timers.push(trail);
    later(() => {
      if (!el) return;
      el.classList.add('touched');
      const b = feather.getBoundingClientRect();
      for (let i = 0; i < 46; i++) ember(b.left + b.width / 2, b.top + b.height * 0.85, true);
    }, 4600);
    later(awaken, 5900);
  }
  return { play };
})();
window.Scene = Scene;
window.Intro = Intro;
