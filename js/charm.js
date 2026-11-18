/* Corrente com adaga pendurada no topo da tela: a marca de ladino da ficha.
   Pêndulo duplo leve (corrente + adaga com atraso), empurrado pela rolagem,
   pelo mouse que passa perto e pelo toque. Só mexe em transform (barato para a GPU)
   e não bloqueia cliques: apenas a adaga recebe toque. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const LINKS = 9;

  /* elos alternados (de frente e de lado) */
  let chain = '';
  for (let i = 0; i < LINKS; i++) {
    const y = i * 13;
    chain += i % 2
      ? `<rect x="8.6" y="${y}" width="2.8" height="16" rx="1.4" fill="url(#ch-side)"/>`
      : `<rect x="5" y="${y}" width="10" height="16" rx="5" fill="none" stroke="url(#ch-front)" stroke-width="2.6"/>`;
  }
  const chainH = LINKS * 13 + 3;

  const svg = `
  <svg class="charm-svg" viewBox="0 0 60 ${chainH + 170}" width="60" height="${chainH + 170}" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="ch-front" x1="0" x2="1"><stop offset="0" stop-color="#6c7896"/><stop offset=".45" stop-color="#eef3ff"/><stop offset="1" stop-color="#5b6684"/></linearGradient>
      <linearGradient id="ch-side" x1="0" x2="1"><stop offset="0" stop-color="#8d98b3"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#6c7896"/></linearGradient>
      <linearGradient id="blade" x1="0" x2="1"><stop offset="0" stop-color="#9fb3d9"/><stop offset=".48" stop-color="#f4f8ff"/><stop offset=".52" stop-color="#c3d2ee"/><stop offset="1" stop-color="#7f93bd"/></linearGradient>
      <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fc4ff" stop-opacity=".2"/><stop offset=".5" stop-color="#7fc4ff"/><stop offset="1" stop-color="#bfe3ff"/></linearGradient>
      <linearGradient id="grip" x1="0" x2="1"><stop offset="0" stop-color="#0b1122"/><stop offset=".5" stop-color="#1b2850"/><stop offset="1" stop-color="#0b1122"/></linearGradient>
      <linearGradient id="glint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="blade-clip"><path d="M24.5 88 L35.5 88 L33.5 150 L30 166 L26.5 150 Z"/></clipPath>
    </defs>
    <!-- prego / argola no topo -->
    <rect x="22" y="0" width="16" height="5" rx="2" fill="#2a3450" stroke="#8d98b3" stroke-width="1"/>
    <g class="charm-chain" style="transform-origin:30px 3px">
      <g transform="translate(20 4)">${chain}</g>
      <!-- adaga presa ao último elo -->
      <g class="charm-dagger" style="transform-origin:30px ${chainH + 4}px">
        <g transform="translate(0 ${chainH - 6})">
          <circle cx="30" cy="12" r="6" fill="none" stroke="url(#ch-front)" stroke-width="2.6"/>
          <circle cx="30" cy="12" r="2" fill="#7fc4ff"/>
          <rect x="27" y="17" width="6" height="4" rx="1" fill="#c9d3e3"/>
          <!-- empunhadura com faixas -->
          <rect x="26.5" y="21" width="7" height="44" rx="3" fill="url(#grip)" stroke="#36415f" stroke-width=".8"/>
          <g stroke="#8d98b3" stroke-opacity=".55" stroke-width="1.1">${Array.from({ length: 8 }, (_, k) => `<path d="M26.5 ${25 + k * 5} L33.5 ${28 + k * 5}"/>`).join('')}</g>
          <!-- guarda em cruz gótica -->
          <path d="M10 70 h40 v5 h-40 z" fill="url(#ch-front)"/>
          <path d="M8 66 l4 6.5 -4 6.5 -3-6.5z M52 66 l3 6.5 -3 6.5 -4-6.5z" fill="#d4dceb"/>
          <circle cx="30" cy="72.5" r="4.2" fill="#2f6bff" stroke="#e8efff" stroke-width="1.2"/>
          <circle cx="29" cy="71.4" r="1.2" fill="#fff" opacity=".9"/>
          <!-- lâmina -->
          <path d="M24.5 78 L35.5 78 L33.5 140 L30 156 L26.5 140 Z" transform="translate(0 0)" fill="url(#blade)"/>
          <path d="M29.4 80 L30.6 80 L30.4 138 L29.6 138 Z" fill="#7f93bd" opacity=".7"/>
          <path d="M35.5 78 L33.5 140 L30 156" fill="none" stroke="url(#edge)" stroke-width="1.4"/>
          <path d="M24.5 78 L26.5 140 L30 156" fill="none" stroke="url(#edge)" stroke-width="1" opacity=".6"/>
          <g clip-path="url(#blade-clip)" transform="translate(0 -10)"><rect class="charm-glint" x="20" y="60" width="20" height="26" fill="url(#glint)"/></g>
        </g>
      </g>
    </g>
  </svg>`;

  const root = document.createElement('div');
  root.className = 'charm';
  root.innerHTML = svg + '<button class="charm-hit" type="button" aria-label="Balançar a adaga" title="Balançar"></button>';
  document.body.append(root);
  const chainEl = root.querySelector('.charm-chain');
  const daggerEl = root.querySelector('.charm-dagger');
  const hit = root.querySelector('.charm-hit');

  /* ---------- Física ---------- */
  let a1 = 0, v1 = 0;   // corrente (rad)
  let a2 = 0, v2 = 0;   // adaga, relativo à corrente
  let last = performance.now(), t = 0, running = false;
  const K1 = 14, C1 = 1.4, K2 = 26, C2 = 2.6, COUPLE = 0.9;

  function kick(force) {
    v1 += force;
    v2 -= force * COUPLE;
    start();
  }
  function step(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    t += dt;
    const calm = document.body.classList.contains('calm') || reduced.matches;
    /* vento leve contínuo: a adaga nunca fica totalmente parada */
    const wind = calm ? 0 : Math.sin(t * 0.9) * 0.18 + Math.sin(t * 2.3) * 0.06;
    const acc1 = -K1 * a1 - C1 * v1 + wind;
    const acc2 = -K2 * a2 - C2 * v2 - acc1 * 0.35;
    v1 += acc1 * dt; a1 += v1 * dt;
    v2 += acc2 * dt; a2 += v2 * dt;
    a1 = Math.max(-0.9, Math.min(0.9, a1));
    a2 = Math.max(-0.8, Math.min(0.8, a2));
    chainEl.style.transform = `rotate(${a1}rad)`;
    daggerEl.style.transform = `rotate(${a2}rad)`;
    const still = calm && Math.abs(a1) + Math.abs(v1) + Math.abs(a2) + Math.abs(v2) < 0.002;
    if (document.hidden || still) { running = false; return; }
    requestAnimationFrame(step);
  }
  function start() {
    if (running || reduced.matches) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  }

  /* rolagem: um tranco proporcional à velocidade */
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    kick(Math.max(-1.2, Math.min(1.2, dy * 0.012)));
  }, { passive: true });

  /* mouse passando perto empurra para o lado do movimento */
  let lastX = null;
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = hit.getBoundingClientRect();
    const dx = lastX === null ? 0 : e.clientX - lastX;
    lastX = e.clientX;
    const near = e.clientX > r.left - 40 && e.clientX < r.right + 40 && e.clientY > r.top - 140 && e.clientY < r.bottom + 20;
    if (near && dx) kick(Math.max(-0.5, Math.min(0.5, dx * 0.02)));
  }, { passive: true });

  /* toque: balanço forte e um brilho na lâmina */
  hit.addEventListener('click', () => {
    kick((Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 0.6));
    glint();
  });

  const glintEl = root.querySelector('.charm-glint');
  function glint() {
    root.classList.remove('shine');
    void glintEl.getBoundingClientRect();
    root.classList.add('shine');
  }
  /* brilho espontâneo de tempos em tempos */
  (function loopGlint() {
    setTimeout(() => { if (!document.hidden && !reduced.matches) glint(); loopGlint(); }, 6000 + Math.random() * 5000);
  })();

  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  /* entra com um balanço, como se tivesse acabado de ser pendurada */
  setTimeout(() => kick(0.9), 400);
  start();
})();
