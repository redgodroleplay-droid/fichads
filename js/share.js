/* Compartilhar a ficha por link criptografado.
   A ficha vira JSON, é comprimida (deflate) e cifrada com AES-GCM 256. O resultado vai
   no "#" do endereço, que o navegador nunca envia ao servidor. Só este site tem a chave
   para abrir; com senha opcional, só quem souber a senha consegue abrir.
   Formato (bytes): [versão=1][opções][sal 16][iv 12][dados cifrados] → base64url. */
(() => {
  const PREFIX = 'ficha=';
  const VERSION = 1, F_PASSWORD = 1, F_DEFLATE = 2;
  /* chave do site: mesmo texto em todas as cópias da ficha; nunca mude, ou os links antigos param de abrir */
  const SITE_KEY = 'ᛒᛖᛞᛁᚢᛖᚱᛖ·grimorio·sistema·2026·ᛟ';
  const DISCORD_MAX = 1900;   // mensagem do Discord: 2000 caracteres
  const MAILTO_MAX = 1800;    // vários programas de e-mail cortam endereços mailto longos

  const enc = new TextEncoder(), dec = new TextDecoder();
  const h = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (['value', 'checked', 'disabled', 'readOnly'].includes(k)) e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => c !== null && c !== undefined && c !== false && e.append(c.nodeType ? c : document.createTextNode(String(c))));
    return e;
  };
  const notify = (t, m) => window.App?.notify(t, m);

  /* ---------- bytes ↔ texto ---------- */
  function toB64url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64url(text) {
    const b = text.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '==='.slice((b.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function pipe(bytes, stream) {
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
  }
  const canDeflate = typeof CompressionStream === 'function';

  /* ---------- chave ---------- */
  async function keyFor(password, salt) {
    const base = await crypto.subtle.importKey('raw', enc.encode(SITE_KEY + '\u0000' + (password || '')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: password ? 250000 : 2000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function seal(obj, password) {
    if (!crypto.subtle) throw Error('Este navegador não permite criptografia nesta página.');
    let data = enc.encode(JSON.stringify(obj)), flags = password ? F_PASSWORD : 0;
    if (canDeflate) { data = await pipe(data, new CompressionStream('deflate-raw')); flags |= F_DEFLATE; }
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(password, salt), data));
    const out = new Uint8Array(2 + 16 + 12 + cipher.length);
    out.set([VERSION, flags]); out.set(salt, 2); out.set(iv, 18); out.set(cipher, 30);
    return toB64url(out);
  }
  /* devolve { needsPassword } ou o objeto aberto */
  function inspect(code) {
    const bytes = fromB64url(code);
    if (bytes.length < 31 || bytes[0] !== VERSION) throw Error('Este link não é de uma ficha deste site, ou é de uma versão mais nova.');
    return { bytes, needsPassword: !!(bytes[1] & F_PASSWORD) };
  }
  async function open(code, password) {
    const { bytes } = inspect(code);
    const flags = bytes[1];
    let data;
    try { data = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(18, 30) }, await keyFor(password, bytes.subarray(2, 18)), bytes.subarray(30))); }
    catch { throw Error(flags & F_PASSWORD ? 'Senha errada, ou o link foi cortado ao ser copiado.' : 'O link está incompleto ou foi alterado. Peça para copiarem de novo.'); }
    if (flags & F_DEFLATE) {
      if (typeof DecompressionStream !== 'function') throw Error('Atualize o navegador para abrir este link.');
      data = await pipe(data, new DecompressionStream('deflate-raw'));
    }
    return JSON.parse(dec.decode(data));
  }

  /* tira o código de um link inteiro, de "#ficha=…" ou do código puro */
  function extractCode(text) {
    const t = String(text || '').trim();
    const m = t.match(/ficha=([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{40,}$/.test(t)) return t;
    return null;
  }

  /* retratos: fora do link por padrão; se pedidos, vão numa versão pequena */
  function smallImage(dataUrl, size) {
    return new Promise(resolve => {
      if (!dataUrl) return resolve('');
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve('');
      img.src = dataUrl;
    });
  }
  async function payload(withPortraits) {
    const data = JSON.parse(JSON.stringify(Store.state));
    data.portrait = withPortraits ? await smallImage(data.portrait, 200) : '';
    for (const f of data.familiars || []) f.portrait = withPortraits ? await smallImage(f.portrait, 120) : '';
    return { format: 'bedivere-sistema', version: 2, sharedAt: new Date().toISOString(), data };
  }
  const linkFor = code => location.origin + location.pathname + '#' + PREFIX + code;

  /* ---------- diálogo: compartilhar ---------- */
  const dlg = h('dialog', { class: 'sys share-dlg', 'aria-labelledby': 'share-title' });
  document.body.append(dlg);
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  const frame = (title, orn, ...body) => h('section', { class: 'win' },
    h('div', { class: 'win-head' }, h('span', { class: 'orn', 'aria-hidden': 'true', text: orn }), h('h2', { class: 'win-title', id: 'share-title', text: title }), h('span', { class: 'spacer' }),
      h('button', { class: 'x', 'aria-label': 'Fechar', text: '×', onclick: () => dlg.close() })),
    ...body);
  const show = node => { dlg.replaceChildren(node); if (!dlg.open) dlg.showModal(); };

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
  }

  function openShare() {
    const s = Store.state;
    const portraits = h('input', { type: 'checkbox', id: 'share-portraits' });
    const pass = h('input', { class: 'input', type: 'password', id: 'share-pass', autocomplete: 'new-password', placeholder: 'Deixe vazio para abrir sem senha' });
    const out = h('div', { class: 'share-out', hidden: true });
    const gen = h('button', { class: 'btn primary', type: 'submit', text: 'Gerar link' });
    const form = h('form', { class: 'stack', style: 'gap:12px' },
      h('p', { class: 'muted', style: 'margin:0', text: 'A ficha inteira de ' + (s.name || 'seu personagem') + ' vai criptografada dentro do link. Quem abrir o link neste site pode carregar a ficha.' }),
      h('label', { class: 'row', style: 'font-size:14px' }, portraits, 'Incluir retratos (versão pequena; o link fica bem maior)'),
      h('label', { class: 'lbl', for: 'share-pass' }, 'Senha (opcional)', pass),
      h('p', { class: 'hint', style: 'margin:-6px 0 0', text: 'Com senha, só quem souber a senha consegue abrir. Envie a senha por outro canal.' }),
      gen, out);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      gen.disabled = true; gen.textContent = 'Cifrando…';
      try {
        const code = await seal(await payload(portraits.checked), pass.value);
        renderOut(linkFor(code), !!pass.value);
      } catch (err) { out.hidden = false; out.replaceChildren(h('p', { class: 'share-warn', text: 'Não foi possível gerar o link. ' + err.message })); }
      finally { gen.disabled = false; gen.textContent = 'Gerar de novo'; }
    });

    function renderOut(link, locked) {
      const name = s.name || 'personagem';
      const msg = 'Ficha de ' + name + ' (Grimório)' + (locked ? ' — pede senha' : '') + ':\n' + link;
      const size = link.length;
      const status = h('p', { class: 'hint', role: 'status', style: 'margin:0', text: size.toLocaleString('pt-BR') + ' caracteres' + (locked ? ' · protegido por senha' : '') });
      const say = t => { status.textContent = t; };
      const area = h('textarea', { class: 'area share-link', readOnly: true, rows: 3, 'aria-label': 'Link da ficha', value: link, onfocus: e => e.target.select() });
      const fileBlob = () => {
        const a = h('a', { href: URL.createObjectURL(new Blob([msg + '\n'], { type: 'text/plain' })), download: name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-ficha.grimorio.txt' });
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      const buttons = h('div', { class: 'share-actions' },
        h('button', { class: 'btn primary', type: 'button', text: '⧉ Copiar link', onclick: async () => say(await copy(link) ? 'Link copiado.' : 'Não deu para copiar sozinho: selecione o link acima e copie.') }),
        h('a', { class: 'btn', href: 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener' }, 'WhatsApp'),
        h('button', { class: 'btn', type: 'button', text: 'Discord', onclick: async () => {
          const ok = await copy(link);
          if (size > DISCORD_MAX) say('O link tem mais de 2.000 caracteres, maior que uma mensagem do Discord. Use “Baixar arquivo” e envie o arquivo no Discord.');
          else say(ok ? 'Link copiado. Cole no Discord.' : 'Selecione o link acima, copie e cole no Discord.');
        } }),
        h('a', { class: 'btn', href: 'mailto:?subject=' + encodeURIComponent('Ficha de ' + name) + '&body=' + encodeURIComponent(size > MAILTO_MAX ? 'Cole aqui o link da ficha (ele foi copiado).' : msg),
          onclick: () => { if (size > MAILTO_MAX) { copy(link); say('Link copiado: cole no corpo do e-mail. Ele é longo demais para ir sozinho.'); } } }, 'E-mail'),
        navigator.share ? h('button', { class: 'btn', type: 'button', text: 'Mais opções…', onclick: () => navigator.share({ title: 'Ficha de ' + name, text: msg }).catch(() => {}) }) : null,
        h('button', { class: 'btn', type: 'button', text: '⤓ Baixar arquivo', onclick: fileBlob }));
      out.hidden = false;
      out.replaceChildren(area, status,
        size > DISCORD_MAX ? h('p', { class: 'share-warn', text: 'Link grande para o Discord: lá, envie como arquivo. Para WhatsApp e e-mail ele serve.' }) : null,
        buttons);
    }
    show(frame('Compartilhar ficha', '✉', form));
    setTimeout(() => gen.focus(), 0);
  }

  /* ---------- diálogo: abrir ficha recebida ---------- */
  function openReceive(prefill) {
    const input = h('textarea', { class: 'area', rows: 3, id: 'recv-link', placeholder: 'Cole aqui o link ou o código da ficha', value: prefill || '' });
    const file = h('input', { type: 'file', accept: '.txt,text/plain', hidden: true });
    const status = h('p', { class: 'hint', role: 'status', style: 'margin:0' });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > 8 * 1024 * 1024) { status.textContent = 'Arquivo grande demais.'; return; }
      input.value = await f.text(); file.value = '';
      go();
    });
    const go = () => {
      const code = extractCode(input.value);
      if (!code) { status.textContent = 'Não encontrei uma ficha nesse texto. Cole o link inteiro.'; return; }
      receive(code);
    };
    show(frame('Abrir ficha compartilhada', '⚿',
      h('div', { class: 'stack', style: 'gap:12px' },
        h('label', { class: 'lbl', for: 'recv-link' }, 'Link ou código', input),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', text: 'Abrir', onclick: go }), h('button', { class: 'btn', type: 'button', text: 'Abrir arquivo .txt', onclick: () => file.click() }), file),
        status)));
    setTimeout(() => input.focus(), 0);
  }

  /* pede a senha se precisar, mostra o resumo e só substitui a ficha depois de confirmar */
  async function receive(code, cleanUrl) {
    const done = () => { if (cleanUrl) history.replaceState(null, '', location.pathname + location.search); };
    let info;
    try { info = inspect(code); }
    catch (err) { done(); show(frame('Link inválido', '⚠', h('p', { class: 'muted', text: err.message }))); return; }

    const tryOpen = async password => {
      try {
        const raw = await open(code, password);
        const next = Store.parseBackup(JSON.stringify(raw));
        confirmLoad(next, raw);
      } catch (err) {
        if (info.needsPassword) askPassword(err.message);
        else { done(); show(frame('Não foi possível abrir', '⚠', h('p', { class: 'muted', text: err.message }))); }
      }
    };
    const askPassword = errMsg => {
      const pass = h('input', { class: 'input', type: 'password', id: 'recv-pass', autocomplete: 'off' });
      const form = h('form', { class: 'stack', style: 'gap:12px' },
        h('p', { class: 'muted', style: 'margin:0', text: 'Esta ficha foi protegida com senha.' }),
        h('label', { class: 'lbl', for: 'recv-pass' }, 'Senha', pass),
        errMsg ? h('p', { class: 'share-warn', text: errMsg }) : null,
        h('button', { class: 'btn primary', text: 'Abrir' }));
      form.addEventListener('submit', e => { e.preventDefault(); if (pass.value) tryOpen(pass.value); });
      show(frame('Ficha protegida', '⚿', form));
      setTimeout(() => pass.focus(), 0);
    };
    const confirmLoad = (next, raw) => {
      const cur = Store.state;
      const facts = [
        'Nível ' + next.level + (next.classes ? ' · ' + next.classes : ''),
        next.abilities.length + ' habilidades · ' + next.techniques.length + ' técnicas · ' + next.tree.nodes.length + ' na árvore',
        next.familiars.length + ' familiares · ' + next.items.length + ' itens · ' + next.journal.length + ' anotações'
      ];
      const when = raw.sharedAt ? new Date(raw.sharedAt) : null;
      show(frame('Ficha recebida', '✦',
        h('div', { class: 'stack', style: 'gap:12px' },
          h('div', { class: 'share-card' },
            next.portrait ? h('img', { src: next.portrait, alt: '' }) : h('span', { class: 'share-sigil', 'aria-hidden': 'true', text: '✠' }),
            h('div', {}, h('strong', { text: next.name || 'Sem nome' }), facts.map(t => h('small', { text: t })),
              when && !isNaN(when) ? h('small', { text: 'Compartilhada em ' + when.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }) : null)),
          h('p', { class: 'share-warn', text: 'Carregar substitui a ficha deste navegador (' + (cur.name || 'sem nome') + ', nível ' + cur.level + '). Baixe a sua antes se quiser guardar.' }),
          h('div', { class: 'row' },
            h('button', { class: 'btn primary', type: 'button', text: 'Carregar esta ficha', onclick: () => { Store.replace(next); done(); dlg.close(); window.App?.render(); notify('Runas', 'Ficha de ' + (next.name || 'sem nome') + ' carregada.'); } }),
            h('button', { class: 'btn', type: 'button', text: 'Baixar a minha antes', onclick: () => Store.exportJson() }),
            h('button', { class: 'btn ghost', type: 'button', text: 'Cancelar', onclick: () => { done(); dlg.close(); } })))));
    };
    if (info.needsPassword) askPassword(); else tryOpen('');
  }

  /* link aberto direto: #ficha=… */
  function fromHash() {
    const hash = location.hash.slice(1);
    if (hash.startsWith(PREFIX)) receive(hash.slice(PREFIX.length), true);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();

  /* fechar o diálogo (Esc, ×, fora) também limpa o link do endereço, para não reabrir ao recarregar */
  dlg.addEventListener('close', () => { if (location.hash.startsWith('#' + PREFIX)) history.replaceState(null, '', location.pathname + location.search); });

  window.Share = { open: openShare, openReceive, seal, decode: open, extractCode };
})();
