/* COMS · modelo 4 — interacciones propias (se carga después de motor.js).
   El cielo y el reloj, el muro de fotos, las tarjetas que se dan vuelta, la trayectoria,
   el carrusel 3D, los círculos, la autoevaluación, los pasos, el celular, la galería
   y el buscador de preguntas. Cada bloque se fija si existe en la página. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  const pad = n => String(n).padStart(2, '0');
  const lenis = () => window.__lenis;

  /* ---------- el cielo: del anochecer (23:00) al amanecer (07:00) ---------- */
  const sky = $('.sky4'), clock = $('.clock');
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  // [avance, color de arriba, color de abajo]
  const STOPS = [[0, '#050c22', '#0b1940'], [.35, '#081537', '#13285a'], [.65, '#0f2350', '#2a4683'], [.85, '#284a8c', '#7d95c4'], [1, '#7f9fd3', '#e8d9cf']].map(([p, a, b]) => [p, hex(a), hex(b)]);
  const STOPS_DARK = [[0, '#050c22', '#0b1940'], [.4, '#071331', '#112450'], [.75, '#0b1c44', '#1c3468'], [1, '#132a5c', '#3a4f86']].map(([p, a, b]) => [p, hex(a), hex(b)]);
  const skyAt = p => {
    const S = root.dataset.theme === 'dark' ? STOPS_DARK : STOPS;
    let i = 0; while (i < S.length - 2 && p > S[i + 1][0]) i++;
    const [p0, a0, b0] = S[i], [p1, a1, b1] = S[i + 1], t = Math.min(1, Math.max(0, (p - p0) / (p1 - p0)));
    return [mix(a0, a1, t), mix(b0, b1, t)];
  };
  const phoneTimes = $$('[data-phone-time]');
  let lastP = -1;
  const paintSky = () => {
    const max = root.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (Math.abs(p - lastP) < .0008) return;
    lastP = p;
    const [a, b] = skyAt(p);
    sky.style.setProperty('--sky-a', rgb(a)); sky.style.setProperty('--sky-b', rgb(b));
    sky.style.setProperty('--stars', Math.max(0, 1 - Math.max(0, p - .55) / .35).toFixed(3));
    const mins = Math.round((23 * 60 + p * 8 * 60) / 5) * 5 % (24 * 60);
    const hhmm = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
    phoneTimes.forEach(el => { el.textContent = hhmm; });
    if (!clock) return;
    clock.classList.toggle('is-on', scrollY > innerHeight * .6);
    $('.clock__t', clock).textContent = hhmm;
    $('.clock__l', clock).textContent = p < .12 ? 'Anochece' : p < .55 ? 'De noche' : p < .85 ? 'Madrugada' : 'Amanece';
    clock.style.setProperty('--p', p.toFixed(3));
    const day = Math.max(0, (p - .72) / .28);
    clock.style.setProperty('--moon-o', (1 - day).toFixed(3)); clock.style.setProperty('--moon-y', (day * -22).toFixed(1) + 'px');
    clock.style.setProperty('--sun-o', day.toFixed(3)); clock.style.setProperty('--sun-y', ((1 - day) * 22).toFixed(1) + 'px');
  };
  if (sky) { addEventListener('scroll', paintSky, { passive: true }); addEventListener('resize', () => { lastP = -1; paintSky(); }); paintSky(); }

  /* ---------- modo oscuro: botón en la barra; se recuerda la elección en este navegador ---------- */
  const temaBtn = $('[data-tema]');
  if (temaBtn) {
    const setUI = () => {
      const dark = root.dataset.theme === 'dark';
      temaBtn.setAttribute('aria-pressed', dark);
      temaBtn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    };
    const apply = dark => {
      root.dataset.theme = dark ? 'dark' : 'light';
      try { localStorage.setItem('coms-tema', root.dataset.theme); } catch (e) {}
      setUI();
      if (sky) { lastP = -1; paintSky(); }
    };
    temaBtn.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      if (!document.startViewTransition || calm) { apply(dark); return; }
      const r = temaBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const tr = document.startViewTransition(() => apply(dark));
      tr.ready.then(() => root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 800, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      )).catch(() => {});
    });
    setUI();
  }
  /* ---------- muro de fotos: cada columna se duplica para que el loop no se corte ---------- */
  $$('.wall__track').forEach(t => { [...t.children].forEach(img => t.appendChild(img.cloneNode(true))); });

  /* ---------- el muro con los videos de los congresos ----------
     Pocos reproductores (cada clip dos veces, desfasado) y cada cuadro del muro dibuja uno en un canvas
     con su propio encuadre, centrado en la persona. Si los videos no cargan, quedan las fotos. */
  const wv = $('[data-wall-video]'), hero4 = $('.hero4');
  const wclips = wv ? (wv.dataset.src || '').split(',').map(s => s.trim()).filter(Boolean) : [];
  // también con "menos movimiento" activado: los videos son la portada (se pueden pausar con el botón)
  if (wclips.length && hero4) {
    const btn = $('.hero4__vbtn', hero4);
    // dónde está la persona en cada clip (x y, de 0 a 1), para que ningún encuadre la deje afuera
    const focus = (wv.dataset.focus || '').split(',').map(s => s.trim().split(/\s+/).map(Number));
    const players = [];
    wclips.forEach((src, k) => [0, .5].forEach(off => {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.dataset.off = off; v.dataset.k = k; v.src = src;
      wv.appendChild(v); players.push(v);
    }));
    const tiles = [];
    let live = false, paused = false, onScreen = true, pending = players.length, last = 0;
    const size = () => tiles.forEach(t => {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      t.c.width = Math.max(1, Math.round(t.c.offsetWidth * d)); t.c.height = Math.max(1, Math.round(t.c.offsetHeight * d));
    });
    const draw = now => {
      if (onScreen && !paused && !document.hidden && now - last > 33) {
        last = now;
        for (const t of tiles) {
          const v = t.v;
          if (v.readyState < 2 || !v.videoWidth) continue;
          const vw = v.videoWidth, vh = v.videoHeight, cw = t.c.width, ch = t.c.height;
          const s = Math.max(cw / vw, ch / vh) * t.z, sw = cw / s, sh = ch / s;
          const [fx = .5, fy = .45] = focus[+v.dataset.k] || [];
          const sx = Math.min(vw - sw, Math.max(0, (fx + t.jx) * vw - sw / 2));
          const sy = Math.min(vh - sh, Math.max(0, (fy + t.jy) * vh - sh / 2));
          t.ctx.drawImage(v, sx, sy, sw, sh, 0, 0, cw, ch);
        }
      }
      requestAnimationFrame(draw);
    };
    const start = () => {
      if (live || !players.length) return;
      live = true;
      // los cuadros vecinos (arriba, abajo y al costado) muestran clips distintos, con zoom y encuadre propios.
      // Cada columna repite su secuencia de 4 cuadros igual que las fotos, para que el loop no salte.
      const byClip = {};
      players.forEach(v => { (byClip[v.dataset.k] = byClip[v.dataset.k] || []).push(v); });
      const keys = Object.keys(byClip), SEQ = [0, 1, 0, 2];
      $$('.wall__track').forEach((track, col) => {
        $$('img', track).forEach((img, p) => {
          const q = p % 4, k = keys[(SEQ[q] + col) % keys.length], vs = byClip[k];
          const c = document.createElement('canvas');
          c.className = 'wall__v'; c.setAttribute('aria-hidden', 'true');
          const n = q * 4 + col;
          tiles.push({ c, ctx: c.getContext('2d'), v: vs[(q + col) % vs.length], z: 1 + ((n * 37) % 26) / 100, jx: (((n * 53) % 17) - 8) / 100, jy: (((n * 29) % 13) - 6) / 100 });
          img.after(c); img.classList.add('is-off');
        });
      });
      size(); hero4.classList.add('has-video'); btn.hidden = false;
      players.forEach(v => { if (v.duration) v.currentTime = v.duration * +v.dataset.off; v.play().catch(() => {}); });
      requestAnimationFrame(draw);
    };
    players.slice().forEach(v => {
      v.addEventListener('loadeddata', () => { if (--pending <= 0) start(); }, { once: true });
      v.addEventListener('error', () => { players.splice(players.indexOf(v), 1); v.remove(); if (--pending <= 0) start(); }, { once: true });
    });
    setTimeout(() => { if (!live && players.some(v => v.readyState >= 2)) { players.splice(0, players.length, ...players.filter(v => v.readyState >= 2)); start(); } }, 6000);
    addEventListener('resize', size);
    const setPaused = p => {
      paused = p; hero4.classList.toggle('is-paused', p);
      players.forEach(v => p ? v.pause() : v.play().catch(() => {}));
      btn.classList.toggle('is-paused', p); btn.setAttribute('aria-label', p ? 'Reproducir los videos' : 'Pausar los videos');
    };
    btn.addEventListener('click', () => setPaused(!paused));
    // fuera de pantalla no se reproducen (ahorra batería y datos)
    new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (live && !paused) players.forEach(v => onScreen ? v.play().catch(() => {}) : v.pause());
    }).observe(hero4);
  }
  /* ---------- equipo: tarjetas que se dan vuelta ---------- */
  const flips = $$('.flip');
  flips.forEach(f => {
    const front = $('.flip__front', f), back = $('.flip__back', f);
    const set = on => {
      f.classList.toggle('is-flipped', on); front.setAttribute('aria-expanded', on);
      back.inert = !on; front.tabIndex = on ? -1 : 0;
      if (on) setTimeout(() => $('.flip__close', f).focus({ preventScroll: true }), 450);
    };
    back.inert = true;
    front.addEventListener('click', () => set(true));
    $('.flip__close', f).addEventListener('click', () => { set(false); front.focus({ preventScroll: true }); });
    f.addEventListener('keydown', e => { if (e.key === 'Escape' && f.classList.contains('is-flipped')) { set(false); front.focus(); } });
    // con el mouse: se vuelve a la foto al salir de la tarjeta
    f.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && f.classList.contains('is-flipped')) set(false); });
  });

  /* ---------- trayectoria: se iluminan los antecedentes de la médica elegida ---------- */
  $$('[data-tr]').forEach(box => {
    const btns = $$('[data-who]', box), items = $$('[data-w]', box);
    let pinned = null;
    const hl = who => {
      box.classList.toggle('has-hl', !!who);
      items.forEach(li => li.classList.toggle('is-dim', !!who && !li.dataset.w.split(' ').includes(who)));
    };
    btns.forEach(b => {
      b.addEventListener('click', () => {
        pinned = pinned === b.dataset.who ? null : b.dataset.who;
        btns.forEach(x => x.setAttribute('aria-pressed', x.dataset.who === pinned));
        hl(pinned);
      });
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hl(b.dataset.who); });
      b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hl(pinned); });
    });
  });

  /* ---------- especialidades: carrusel 3D ---------- */
  $$('[data-cf]').forEach(box => {
    const cards = $$('.cf__card', box), dots = $('.cf__dots', box), n = cards.length;
    let cur = 0;
    dots.innerHTML = cards.map((c, i) => `<button type="button" aria-label="${$('.cf__t', c).textContent}"></button>`).join('');
    const dbs = $$('button', dots);
    const narrow = () => innerWidth < 900;
    const layout = () => {
      cards.forEach((c, i) => {
        let o = i - cur; if (o > n / 2) o -= n; if (o < -n / 2) o += n;
        const a = Math.abs(o), k = narrow() ? 88 : 62;
        c.style.transform = `translateX(${o * k}%) translateZ(${-a * 220}px) rotateY(${-o * 26}deg)`;
        c.style.zIndex = 10 - a;
        c.style.opacity = a > 2 ? 0 : (narrow() && a ? .35 : 1);
        c.style.filter = a ? `brightness(${1 - a * .25})` : '';
        c.style.pointerEvents = a > 2 ? 'none' : '';
        c.classList.toggle('is-active', a === 0);
        c.setAttribute('aria-hidden', a !== 0);
        $$('a', c).forEach(l => { l.tabIndex = a ? -1 : 0; });   // sólo la del frente se recorre con el teclado
      });
      dbs.forEach((d, i) => d.setAttribute('aria-current', i === cur));
      // el dibujo de la tarjeta del frente se vuelve a trazar
      cards.forEach((c, i) => c.classList.remove('is-on'));
      const act = cards[cur]; void act.offsetWidth; act.classList.add('is-on');
    };
    const go = i => { cur = (i + n) % n; layout(); };
    cards.forEach((c, i) => c.addEventListener('click', () => { if (i !== cur) go(i); }));
    dbs.forEach((d, i) => d.addEventListener('click', () => go(i)));
    $('[data-prev]', box).addEventListener('click', () => go(cur - 1));
    $('[data-next]', box).addEventListener('click', () => go(cur + 1));
    box.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); });
    // arrastrar o deslizar
    const stage = $('.cf__stage', box);
    let sx = null, moved = false;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; moved = false; });
    addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) { moved = true; go(cur + (dx < 0 ? 1 : -1)); }
    });
    stage.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    addEventListener('resize', layout);
    layout();
    cards[cur].classList.remove('is-on');
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); cards[cur].classList.add('is-on'); } }, { threshold: .35 }).observe(box);
  });

  /* ---------- cómo trabajamos: los círculos responden a la lista ---------- */
  $$('[data-venn]').forEach(box => {
    const its = $$('.venn__it', box);
    let auto = 0, k = -1, timer = 0, hold = false;
    const set = i => { k = i; its.forEach((b, j) => b.classList.toggle('is-on', j === i)); if (i < 0) delete box.dataset.on; else box.dataset.on = i; };
    its.forEach((b, i) => {
      b.addEventListener('pointerenter', () => { hold = true; set(i); });
      b.addEventListener('pointerleave', () => { hold = false; });
      b.addEventListener('focus', () => { hold = true; set(i); });
      b.addEventListener('blur', () => { hold = false; });
      b.addEventListener('click', () => set(i));
    });
    // mientras se ve, recorre las cuatro disciplinas solo
    const loop = () => { clearTimeout(timer); timer = setTimeout(() => { if (!hold && box.classList.contains('is-vis') && !document.hidden) set((k + 1) % its.length); loop(); }, 2600); };
    new IntersectionObserver(([e]) => { box.classList.toggle('is-vis', e.isIntersecting); if (e.isIntersecting && k < 0) set(0); }, { threshold: .3 }).observe(box);
    loop();
  });

  /* ---------- ¿te pasa? autoevaluación de señales (no diagnostica: orienta a consultar) ---------- */
  $$('[data-chk]').forEach(box => {
    const opts = $$('.chk__o', box), fill = $('.chk__ring', box), cnt = $('.chk__count b', box), m0 = $('.chk__m0', box), m1 = $('.chk__m1', box);
    const upd = () => {
      const n = opts.filter(o => o.getAttribute('aria-pressed') === 'true').length;
      fill.style.setProperty('--off', (1 - n / opts.length).toFixed(3));
      cnt.textContent = n; m0.hidden = n > 0; m1.hidden = n === 0;
      if (n && G && !calm) G.fromTo(m1, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' });
    };
    opts.forEach(o => o.addEventListener('click', () => { o.setAttribute('aria-pressed', o.getAttribute('aria-pressed') !== 'true'); upd(); }));
    upd();
  });

  /* ---------- recorrido: los pasos avanzan solos mientras se ven ---------- */
  $$('[data-stp]').forEach(box => {
    const tabs = $$('[role=tab]', box), panels = $$('[role=tabpanel]', box), line = $('.stp__line', box);
    const STEP = 4200;
    let cur = 0, t0 = 0, raf = 0, hold = false, vis = false;
    const show = (i, focus) => {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === cur); t.tabIndex = k === cur ? 0 : -1; t.classList.toggle('is-done', k < cur); });
      panels.forEach((p, k) => { p.hidden = k !== cur; });
      if (G && !calm) G.fromTo(panels[cur].children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .7, stagger: .08, ease: 'power3.out' });
      if (focus) tabs[cur].focus();
      t0 = performance.now();
    };
    const tick = now => {
      if (vis && !hold && !document.hidden) {
        const f = Math.min(1, (now - t0) / STEP);
        line.style.setProperty('--p', ((cur + f) / (tabs.length - 1)).toFixed(4));
        if (f >= 1) show(cur + 1);
      } else t0 = now - (Number(line.dataset.f || 0) * STEP);
      raf = requestAnimationFrame(tick);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
      });
    });
    box.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hold = true; line.dataset.f = Math.min(1, (performance.now() - t0) / STEP); } });
    box.addEventListener('pointerleave', () => { hold = false; });
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis) t0 = performance.now(); }, { threshold: .4 }).observe(box);
    show(0);
    if (!calm) raf = requestAnimationFrame(tick); else line.style.setProperty('--p', 1);
  });

  /* ---------- pacientes: el celular muestra la herramienta elegida ---------- */
  $$('[data-app]').forEach(box => {
    const tabs = $$('[role=tab]', box), scrs = $$('[role=tabpanel]', box);
    let cur = 0;
    const show = (i, focus) => {
      const prev = cur; cur = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === cur); t.tabIndex = k === cur ? 0 : -1; });
      scrs.forEach((s, k) => { s.hidden = k !== cur; });
      if (G && !calm && prev !== cur) {
        const dir = cur > prev ? 1 : -1;
        G.fromTo(scrs[cur], { xPercent: 30 * dir, opacity: 0 }, { xPercent: 0, opacity: 1, duration: .6, ease: 'power3.out' });
        G.fromTo($$('.scr__ico, .scr__t, .scr__d', scrs[cur]), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .06, ease: 'power3.out', delay: .1 });
      }
      if (focus) tabs[cur].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && i !== cur) show(i); });
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
      });
    });
  });

  /* ---------- novedades: galería con visor ---------- */
  const lb = $('#lb');
  $$('[data-gal]').forEach(box => {
    const its = $$('.gal__it', box);
    if (!lb || !its.length) return;
    const img = $('.lb__img', lb);
    let cur = 0, opener = null;
    const fill = i => {
      cur = (i + its.length) % its.length;
      const it = its[cur], src = $('img', it);
      img.src = src.currentSrc || src.src; img.alt = src.alt;
      $('.lb__n', lb).textContent = `${pad(cur + 1)} / ${pad(its.length)}`;
      $('.lb__date', lb).textContent = it.dataset.date || '';
      $('.lb__t', lb).textContent = it.dataset.t || '';
      $('.lb__x2', lb).textContent = it.dataset.x || '';
      if (G && !calm) G.fromTo([img, $('figcaption', lb)], { opacity: 0 }, { opacity: 1, duration: .45, ease: 'power2.out' });
    };
    its.forEach((it, i) => it.addEventListener('click', () => {
      opener = it; fill(i); lb.showModal(); lenis() && lenis().stop(); document.body.style.overflow = 'hidden';
    }));
    $('.lb__nav--p', lb).addEventListener('click', () => fill(cur - 1));
    $('.lb__nav--n', lb).addEventListener('click', () => fill(cur + 1));
    $('.lb__x', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') fill(cur + 1); if (e.key === 'ArrowLeft') fill(cur - 1); });
    lb.addEventListener('close', () => { lenis() && lenis().start(); document.body.style.overflow = ''; opener && opener.focus({ preventScroll: true }); });
  });

  /* ---------- preguntas: buscador que filtra mientras escribís ---------- */
  const qs = $('[data-qs]');
  if (qs) {
    const items = $$('.qa details'), none = $('.qs__none');
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const texts = items.map(d => norm(d.textContent));
    qs.addEventListener('input', () => {
      const q = norm(qs.value.trim()), words = q.split(/\s+/).filter(Boolean);
      let hits = 0;
      items.forEach((d, i) => {
        const ok = !words.length || words.every(w => texts[i].includes(w));
        d.hidden = !ok; d.classList.toggle('is-hit', ok && words.length > 0); if (ok) hits++;
      });
      none.hidden = hits > 0;
      ST && ST.refresh();
    });
  }

  /* ---------- pie: el cierre. La luz sube y "COMS" se abre mientras llegás al final ---------- */
  const sign = $('[data-sign]');
  if (sign) {
    const set = p => sign.style.setProperty('--p', p.toFixed(3));
    if (G && ST && !calm) {
      ST.create({ trigger: sign, start: 'top bottom', end: 'bottom bottom', scrub: .8, onUpdate: s => set(s.progress) });
      G.fromTo($$('.sign4__word span', sign), { opacity: 0, yPercent: 30, filter: 'blur(10px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.4, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: sign, start: 'top 85%' } });
      G.fromTo($$('.sign4__mark, .sign4__sub, .sign4__time', sign), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: sign, start: 'top 80%' } });
    } else set(1);
  }

  if (ST) { ST.sort && ST.sort(); ST.refresh(); }
  addEventListener('load', () => { lastP = -1; sky && paintSky(); ST && ST.refresh(); });
})();
