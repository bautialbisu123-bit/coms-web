/* COMS · modelo 4 — interacciones propias (se carga después de motor.js).
   El cielo, las fotos de fondo de la portada, las tarjetas que se dan vuelta, la trayectoria,
   el carrusel 3D, los círculos, la autoevaluación, los pasos, el celular, la galería
   y el buscador de preguntas. Cada bloque se fija si existe en la página. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  // las animaciones se muestran siempre, aunque el equipo pida "menos movimiento" (ver motor.js)
  const calm = false;
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
  // en modo claro el cielo es de día: un celeste grisáceo apagado (no blanco, para que no encandile)
  // que termina apenas cálido, como un amanecer suave
  const STOPS_LIGHT = [[0, '#cbd6e8', '#d8e0ed'], [.5, '#ced8e8', '#dbe2ee'], [.85, '#d5dae5', '#e2ddd6'], [1, '#dbd3c9', '#e5d9cc']].map(([p, a, b]) => [p, hex(a), hex(b)]);
  const skyAt = p => {
    const S = root.dataset.theme === 'dark' ? STOPS_DARK : STOPS_LIGHT;
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
  /* ---------- portada: fotos grandes de fondo que pasan de a una ----------
     Pasan solas cada 6,5 s. Cada foto se carga recién cuando se está viendo la anterior, así la portada
     abre rápido. Fuera de pantalla o con la pestaña oculta no avanzan. */
  const hero4 = $('.hero4'), slides = $('[data-slides]');
  if (hero4 && slides) {
    const imgs = $$('img', slides), DWELL = 6500;
    const load = im => { if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } };
    let cur = 0, onScreen = true;
    const show = i => {
      const k = (i + imgs.length) % imgs.length, im = imgs[k];
      load(im);
      (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => {
        cur = k;
        imgs.forEach((x, j) => x.classList.toggle('is-on', j === cur));
        load(imgs[(cur + 1) % imgs.length]); // la que sigue ya se va cargando
      });
    };
    load(imgs[1]);
    setInterval(() => { if (onScreen && !document.hidden) show(cur + 1); }, DWELL);
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(hero4);
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
      G.fromTo($$('.sign4__mark, .sign4__sub', sign), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: sign, start: 'top 80%' } });
    } else set(1);
  }

  if (ST) { ST.sort && ST.sort(); ST.refresh(); }
  addEventListener('load', () => { lastP = -1; sky && paintSky(); ST && ST.refresh(); });
})();
