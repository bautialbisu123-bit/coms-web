/* Motor v2 — interacciones y animación de las webs de consultorio (GSAP + ScrollTrigger + Lenis).
   Cada bloque se fija si su parte existe en la página: el mismo archivo sirve a COMS y a Myrna.
   "Menos movimiento" aquieta (sin scroll suave, sin cursor, sin fijados ni inclinación) pero no apaga. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  const anim = !!(G && ST);
  const pad = n => String(n).padStart(2, '0');
  if (anim) G.registerPlugin(ST);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);

  /* ---------- scroll suave ---------- */
  let lenis = null;
  if (anim && !calm && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    window.__lenis = lenis;   // para que otros scripts de la página puedan desplazar con el mismo scroll suave
    lenis.on('scroll', ST.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  const goTo = hash => {
    const t = hash === '#inicio' ? 0 : $(hash);
    if (t === null) return;
    if (lenis) return lenis.scrollTo(t, { offset: t === 0 ? 0 : -20, duration: 1.4 });
    scrollTo({ top: t === 0 ? 0 : t.getBoundingClientRect().top + scrollY - 20, behavior: calm ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const h = a.getAttribute('href');
    if (h !== '#inicio' && !$(h)) return;
    e.preventDefault(); setMenu(false); goTo(h); history.replaceState(null, '', h);
  });

  /* ---------- nav, barra de progreso, barra del celular ---------- */
  const nav = $('#nav'), dock = $('.dock'), waEl = $('#wa'), prog = $('.prog'), hero = $('#inicio');
  const burger = $('.burger'), menu = $('#menu');
  let lastY = 0, menuOpen = false;
  const onScroll = () => {
    const y = scrollY, h = hero ? hero.offsetHeight : 600;
    const max = root.scrollHeight - innerHeight;
    if (prog) prog.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (nav && !menuOpen) {
      if (y > 240 && y > lastY + 4) nav.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 240) nav.classList.remove('is-hidden');
    }
    dock && dock.classList.toggle('is-on', y > h * .6);
    waEl && waEl.classList.toggle('is-on', y > h * .6);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  const links = $$('.nav__links a');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  function setMenu(open) {
    if (!burger || !menu || open === menuOpen) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', !open);
    menu.inert = !open;
    root.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) nav && nav.classList.remove('is-hidden');
    if (open && anim) G.fromTo($$('nav a', menu), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .8, stagger: .05, ease: 'power3.out', delay: .18 });
  }
  burger && burger.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  /* ---------- cursor con etiqueta ---------- */
  const cur = $('.cur');
  if (cur && fine && !calm) {
    const dot = $('.cur__dot', cur), ring = $('.cur__ring', cur), lab = $('.cur__label', cur);
    let x = -100, y = -100, rx = x, ry = y, moving = false;
    const tick = () => {
      rx += (x - rx) * .18; ry += (y - ry) * .18;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > .2) requestAnimationFrame(tick); else moving = false;
    };
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY; dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (!moving) { moving = true; requestAnimationFrame(tick); }
    }, { passive: true });
    document.addEventListener('pointerover', e => {
      const l = e.target.closest('[data-cursor]');
      cur.classList.toggle('has-label', !!l);
      if (l) lab.textContent = l.dataset.cursor;
      cur.classList.toggle('is-link', !l && !!e.target.closest('a, button, summary, [role=tab]'));
    });
    document.addEventListener('pointerleave', () => cur.classList.add('is-off'));
    document.addEventListener('pointerenter', () => cur.classList.remove('is-off'));
  } else if (cur) cur.remove();

  /* ---------- imanes, inclinación y luz que sigue al puntero ---------- */
  if (fine && !calm) {
    $$('[data-magnetic]').forEach(el => {
      const k = +el.dataset.magnetic || .35;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * k}px, ${(e.clientY - r.top - r.height / 2) * k}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('[data-tilt]').forEach(el => {
      const k = +el.dataset.tilt || 6;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(1000px) rotateX(${(-py * k).toFixed(2)}deg) rotateY(${(px * k).toFixed(2)}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  document.addEventListener('pointermove', e => {
    const s = e.target.closest && e.target.closest('.spot');
    if (!s) return;
    const r = s.getBoundingClientRect();
    s.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    s.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- preguntas: acordeón animado, una abierta a la vez ---------- */
  const faqs = $$('.qa details');
  faqs.forEach(d => {
    const sum = $('summary', d), body = $('.qa__a', d);
    sum.addEventListener('click', e => {
      if (!anim) return;
      e.preventDefault();
      if (d.open) G.to(body, { height: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { d.open = false; body.style.height = ''; ST.refresh(); } });
      else {
        faqs.forEach(o => { if (o !== d && o.open) $('summary', o).click(); });
        d.open = true;
        G.fromTo(body, { height: 0 }, { height: 'auto', duration: .6, ease: 'power3.out', onComplete: () => { body.style.height = ''; ST.refresh(); } });
      }
    });
  });

  /* ---------- lista con foto que sigue al mouse ---------- */
  $$('[data-hl]').forEach(box => {
    const rows = $$('.hl__row', box), flo = $('.hl__float', box), imgs = flo ? $$('img', flo) : [];
    if (flo) document.body.appendChild(flo);   // fijo de verdad: fuera de cualquier contenedor animado
    let open = null;
    const setRow = (row, on) => {
      const body = $('.hl__body', row), btn = $('.hl__head', row);
      row.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', on);
      if (!anim) { body.style.height = on ? 'auto' : '0px'; return; }
      if (on) {
        G.fromTo(body, { height: 0 }, { height: 'auto', duration: .85, ease: 'power3.out', onComplete: () => { body.style.height = 'auto'; ST.refresh(); } });
        G.fromTo($$('.hl__in > *', row), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .08, ease: 'power3.out', delay: .1 });
      } else G.to(body, { height: 0, duration: .6, ease: 'power3.inOut', onComplete: () => ST.refresh() });
    };
    rows.forEach(r => $('.hl__head', r).addEventListener('click', () => {
      const was = open; if (open) { setRow(open, false); open = null; }
      if (was !== r) { setRow(r, true); open = r; hide(); }
    }));
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, on = false;
    const loop = () => {
      const dx = x - cx; cx += dx * .14; cy += (y - cy) * .14;
      const rot = Math.max(-10, Math.min(10, dx * .06));
      flo.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) rotate(${rot.toFixed(2)}deg)`;
      raf = on || Math.abs(dx) > .5 ? requestAnimationFrame(loop) : 0;
    };
    const show = i => {
      if (!flo || !fine || calm) return;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      if (!on) { cx = x; cy = y; }
      on = true; flo.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(loop);
    };
    function hide() { on = false; flo && flo.classList.remove('is-on'); }
    box.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
    rows.forEach((r, i) => {
      const head = $('.hl__head', r);
      head.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !r.classList.contains('is-open')) show(i); });
      head.addEventListener('pointerleave', hide);
    });
  });

  /* ---------- filtro por profesional ---------- */
  $$('[data-filter]').forEach(box => {
    const btns = $$('[data-f]', box), items = $$('[data-who]', box);
    btns.forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.f;
      btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      const vis = items.filter(it => f === 'all' || it.dataset.who.split(' ').includes(f));
      items.forEach(it => { it.hidden = !vis.includes(it); });
      if (anim) G.fromTo(vis, { opacity: 0, y: 26, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .6, stagger: .05, ease: 'power3.out', overwrite: true });
      ST && ST.refresh();
    }));
  });

  /* ---------- tira que se arrastra (con parallax dentro de cada foto) ---------- */
  $$('[data-drag]').forEach(box => {
    const track = $('.dg__track', box), cards = $$('.dg__c', box);
    const step = () => (cards[0]?.getBoundingClientRect().width || 300) + 16;
    $('[data-prev]', box)?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: calm ? 'auto' : 'smooth' }));
    $('[data-next]', box)?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: calm ? 'auto' : 'smooth' }));
    const par = () => {
      if (calm) return;
      const tr = track.getBoundingClientRect(), mid = tr.left + tr.width / 2;
      cards.forEach(c => {
        const r = c.getBoundingClientRect(), p = (r.left + r.width / 2 - mid) / tr.width;
        const im = $('img', c); if (im) im.style.transform = `translateX(${(-p * 9).toFixed(2)}%)`;
      });
    };
    track.addEventListener('scroll', par, { passive: true }); par(); addEventListener('resize', par);
    if (!fine) return;
    let down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', e => { if (e.button !== 0) return; down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 6) { track.classList.add('is-drag'); track.scrollLeft = sl - dx; }
    });
    addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => track.classList.remove('is-drag'), 0); });
    track.addEventListener('click', e => { if (moved > 6) e.preventDefault(); }, true);
  });

  /* ---------- WhatsApp flotante (menú si hay más de una sede) ---------- */
  const waMenu = $('#waMenu'), waBtn = waEl && $('.wa__btn', waEl);
  if (waEl && waMenu && waBtn) {
    const setWa = o => {
      waEl.classList.toggle('is-open', o); waMenu.hidden = !o;
      waBtn.setAttribute('aria-expanded', o); waBtn.setAttribute('aria-label', o ? 'Cerrar' : 'Escribir por WhatsApp');
      if (o) $('a', waMenu).focus({ preventScroll: true });
    };
    waBtn.addEventListener('click', () => setWa(waMenu.hidden));
    waMenu.addEventListener('click', e => { if (e.target.closest('a')) setWa(false); });
    document.addEventListener('click', e => { if (!waMenu.hidden && !waEl.contains(e.target)) setWa(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !waMenu.hidden) { setWa(false); waBtn.focus(); } });
  }

  /* ---------- loops que corren sólo mientras se ven ---------- */
  const vis = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-vis', e.isIntersecting)), { rootMargin: '10% 0px' });
  $$('.s, .hero, .zoom').forEach(s => vis.observe(s));
  const once = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); once.unobserve(e.target); } }), { threshold: .3 });
  $$('.pill3 li').forEach(li => once.observe(li));
  const drawIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-on'); drawIO.unobserve(e.target); } }), { threshold: .45 });
  $$('[data-draw]').forEach(el => drawIO.observe(el));
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-revealed'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal-img]').forEach(el => rio.observe(el));

  /* ---------- mosaico con centro: al pasar por una tarjeta, el centro lo nombra ---------- */
  $$('[data-core-box]').forEach(box => {
    const out = $('[data-core-out]', box); if (!out) return;
    const def = out.textContent;
    const set = txt => {
      box.classList.toggle('is-hl', txt !== def);
      if (anim) G.fromTo(out, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out' });
      out.textContent = txt;
    };
    $$('[data-core]', box).forEach(t => {
      t.addEventListener('pointerenter', () => set(t.dataset.core));
      t.addEventListener('pointerleave', () => set(def));
      t.addEventListener('focus', () => set(t.dataset.core));
      t.addEventListener('blur', () => set(def));
    });
  });
  onScroll();

  /* ============================================================
     Animación con GSAP
     ============================================================ */
  const pre = $('.pre');
  if (!anim) { pre && pre.remove(); root.classList.add('ready'); $$('[data-split]').forEach(el => el.classList.add('is-split')); return; }

  // parte un texto en palabras (y opcionalmente letras), respetando <em> y otros elementos
  const split = (el, mode) => {
    const out = [];
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'wd'; w.setAttribute('aria-hidden', 'true');
          if (mode === 'chars') [...part].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s); out.push(s); });
          else { const s = document.createElement('span'); s.className = 'ch'; s.textContent = part; w.appendChild(s); out.push(s); }
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el); el.classList.add('is-split');
    return out;
  };
  const D = calm ? .55 : 1;

  // títulos fuera de la portada: suben letra por letra al entrar
  $$('[data-split]').forEach(el => {
    if (el.closest('#inicio')) return;
    const m = el.dataset.split || 'words', parts = split(el, m);
    G.from(parts, { yPercent: 118, rotate: calm ? 0 : (m === 'chars' ? 7 : 4), duration: m === 'chars' ? 1 : 1.1, stagger: m === 'chars' ? .02 : .06, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  // bloques que aparecen
  G.set('[data-reveal]', { opacity: 0, y: 44 * D });
  ST.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: els => G.to(els, { opacity: 1, y: 0, duration: 1, stagger: .09, ease: 'power3.out', overwrite: true }) });

  // texto que entra en foco palabra por palabra
  $$('[data-focus]').forEach(el => {
    const units = [];
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) return frag.appendChild(document.createTextNode(' '));
          const s = document.createElement('span'); s.className = 'fw'; s.textContent = p; frag.appendChild(s); units.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) { n.classList.add('fw'); units.push(n); }
    });
    const tl = G.timeline({ scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: .6 } });
    units.forEach((u, i) => tl.to(u, { opacity: 1, filter: 'blur(0px)', duration: .4, ease: 'none' }, i * .22));
  });

  // cinta: corre sola y se acelera / cambia de sentido con el scroll
  $$('[data-mq]').forEach(box => {
    const track = $('.mq__track', box), g = $('.mq__g', track);
    while (track.scrollWidth < innerWidth * 2.4) track.appendChild(g.cloneNode(true));
    $$('.mq__g', track).slice(1).forEach(c => c.setAttribute('aria-hidden', 'true'));
    const w = g.getBoundingClientRect().width, rev = box.dataset.mq === 'r';
    const tw = G.fromTo(track, { x: rev ? -w : 0 }, { x: rev ? 0 : -w, duration: w / (calm ? 40 : 70), ease: 'none', repeat: -1 });
    if (calm) return;
    let target = 1;
    ST.create({ trigger: box, start: 'top bottom', end: 'bottom top', onUpdate: s => { target = s.direction * (1 + Math.min(Math.abs(s.getVelocity()) / 320, 5)); } });
    G.ticker.add(() => {
      const c = tw.timeScale(); tw.timeScale(c + (target - c) * .08);
      target += (Math.sign(target) - target) * .035;
    });
  });

  // carrusel horizontal fijado (escritorio); en el celular se desliza con el dedo
  $$('[data-hs]').forEach(sec => {
    const pin = $('.hs__pin', sec), track = $('.hs__track', sec), cards = $$('.hs__card', sec);
    const bar = $('.hs__bar', sec), num = $('[data-hs-n]', sec);
    const total = $('[data-hs-t]', sec); if (total) total.textContent = pad(cards.length);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-on'); }), { threshold: .5 });
    cards.forEach(c => io.observe(c));
    const setIdx = p => {
      bar && bar.style.setProperty('--p', (1 / cards.length + p * (1 - 1 / cards.length)).toFixed(3));
      num && (num.textContent = pad(Math.min(cards.length, Math.round(p * (cards.length - 1)) + 1)));
    };
    setIdx(0);
    G.matchMedia().add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      sec.classList.add('hs--on');
      const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth);
      G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .7, invalidateOnRefresh: true, onUpdate: s => setIdx(s.progress) } });
      return () => { sec.classList.remove('hs--on'); };
    });
    if (!sec.classList.contains('hs--on')) track.addEventListener('scroll', () => setIdx(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)), { passive: true });
  });

  // tarjetas que se apilan: la de atrás se achica y se apaga
  $$('[data-stack]').forEach(box => {
    const cards = $$('.stk__c', box);
    cards.forEach((c, i) => c.style.setProperty('--i', i));
    if (calm) return;
    cards.forEach((c, i) => {
      const next = cards[i + 1]; if (!next) return;
      G.to(c, { scale: .92 + i * .006, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true } });
    });
  });

  // sección fijada: el título se acerca y las imágenes flotan a distintas velocidades
  $$('[data-zoom]').forEach(sec => {
    const pinEl = $('.zoom__pin', sec), t = $('.zoom__t', sec);
    G.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      G.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=110%', pin: pinEl, scrub: true } }).fromTo(t, { scale: .7 }, { scale: 1, ease: 'none' });
      $$('.flo', sec).forEach(f => {
        const s = +f.dataset.speed || 1;
        G.fromTo(f, { y: innerHeight * .55 * s, rotate: -5 * s }, { y: -innerHeight * .55 * s, rotate: 5 * s, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom+=110% top', scrub: true } });
      });
    });
  });

  // parallax suave
  if (!calm) $$('[data-speed]').forEach(el => {
    if (el.classList.contains('flo')) return;
    G.fromTo(el, { yPercent: 0 }, { yPercent: -(+el.dataset.speed) * 12, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // contadores
  $$('[data-count]').forEach(el => {
    const o = { v: 0 };
    G.to(o, { v: +el.dataset.count, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => { el.textContent = Math.round(o.v); } });
  });

  // mosaicos y tarjetas en escalera. El final va explícito y se limpia al terminar: en las tarjetas con transición
  // de transform en el CSS, el from() tomaba como final la posición de arranque y quedaban 60 px corridas
  $$('[data-stagger]').forEach(w => {
    G.fromTo(w.children, { y: 60 * D, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .08, ease: 'power3.out', clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: w, start: 'top 86%' } });
  });

  // la palabra gigante del pie
  $$('[data-giant]').forEach(el => {
    const ch = split(el, 'chars');
    G.from(ch, { yPercent: 105, duration: 1.2, stagger: .04, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 95%' } });
  });

  // la portada se mueve un poco con el mouse
  if (hero && fine && !calm) {
    const layers = $$('[data-mouse]', hero).map(el => ({ el, k: +el.dataset.mouse, x: G.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }), y: G.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }) }));
    hero.addEventListener('pointermove', e => {
      const px = e.clientX / innerWidth - .5, py = e.clientY / innerHeight - .5;
      layers.forEach(l => { l.x(px * l.k); l.y(py * l.k); });
    });
  }
  if (hero) G.to('[data-hero-out]', { yPercent: 14 * D, opacity: .25, ease: 'none', scrollTrigger: { trigger: hero, start: '45% top', end: 'bottom top', scrub: true } });

  /* ---------- intro: contador → portada ---------- */
  const heroParts = $$('#inicio [data-split]').map(el => split(el, el.dataset.split || 'chars')).flat();
  const heroBits = $$('[data-hero]');
  G.set(heroParts, { yPercent: 118 });
  G.set(heroBits, { opacity: 0, y: 30 * D });
  lenis && lenis.stop();
  const seen = root.classList.contains('seen');
  try { sessionStorage.setItem(root.dataset.introKey || 'intro', '1'); } catch (e) {}
  const tl = G.timeline({ paused: true, defaults: { ease: 'power4.out' } });
  if (!seen && pre && pre.classList.contains('pre--logo')) {
    // intro sobria: el isotipo aparece, el nombre se enfoca letra por letra, una línea fina se abre
    // y el panel sube con el borde inferior curvo, descubriendo la portada
    const panel = $('.pre__panel', pre), inner = $('.pre__in', pre);
    G.set(panel, { '--curve': '0vh' });
    tl.fromTo($('.pre__mark', pre), { opacity: 0, scale: .82, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' }, 0)
      .fromTo($$('.pre__word span', pre), { opacity: 0, y: 16, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, stagger: .08, ease: 'power3.out' }, .3)
      .fromTo($('.pre__line', pre), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }, .55)
      .fromTo($('.pre__tag', pre), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .8, ease: 'power2.out' }, .85)
      .to(inner, { opacity: 0, y: -28, filter: 'blur(6px)', duration: .6, ease: 'power2.in' }, '+=.3')
      .to(panel, { yPercent: -100, '--curve': '24vh', duration: 1.15, ease: 'power4.inOut' }, '-=.25');
  } else if (!seen && pre) {
    const num = $('.pre__num span', pre), bar = $('.pre__bar i', pre), letters = $$('.pre__brand span:not(.sp)', pre), o = { v: 0 };
    G.set(letters, { y: 0, yPercent: 112 });
    tl.to(letters, { yPercent: 0, duration: .9, stagger: .045 }, 0)
      .to(o, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { num.textContent = Math.round(o.v); bar.style.transform = `scaleX(${o.v / 100})`; } }, 0)
      .to(letters, { yPercent: -112, duration: .55, stagger: .03, ease: 'power3.in' }, '+=.08')
      .to($$('.pre__num, .pre__sub, .pre__bar', pre), { opacity: 0, duration: .3 }, '<')
      .to($('.pre__p--a', pre), { yPercent: -100, duration: 1.05, ease: 'power4.inOut' }, '-=.12')
      .to($('.pre__p--b', pre), { yPercent: 100, duration: 1.05, ease: 'power4.inOut' }, '<');
  }
  tl.add(() => root.classList.add('ready'), seen ? 0 : '-=.75')
    .to(heroParts, { yPercent: 0, duration: 1.25, stagger: .022 }, '<')
    .to(heroBits, { opacity: 1, y: 0, duration: 1.05, stagger: .08, ease: 'power3.out' }, '<.25')
    .add(() => { pre && pre.remove(); lenis && lenis.start(); ST.refresh(); });

  let started = false;
  const start = () => { if (started) return; started = true; requestAnimationFrame(() => requestAnimationFrame(() => tl.play())); };
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]).then(start); else start();
  setTimeout(() => { if (!root.classList.contains('ready')) { tl.progress(1); } }, 8000);
  addEventListener('load', () => ST.refresh());
})();
