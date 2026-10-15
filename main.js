(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nav menu
  const nav = document.querySelector('.nav');
  const burger = nav.querySelector('.burger');
  const setOpen = (open) => {
    nav.dataset.open = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setOpen(nav.dataset.open !== 'true'));
  nav.querySelectorAll('.nav-menu a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });

  // Split text into word spans, keeping <br> and entities intact
  const splitWords = (el) => {
    const nodes = [...el.childNodes];
    el.textContent = '';
    nodes.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) { el.appendChild(node); return; }
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        el.appendChild(s);
      });
    });
    return el.querySelectorAll('.w');
  };

  document.querySelectorAll('[data-split]').forEach((el) => {
    splitWords(el).forEach((w, i) => w.style.setProperty('--d', `${i * 0.06}s`));
  });

  // Hero name vaporizes as you scroll: the solid letters break into a grid of dots,
  // the dots drift up like vapor and pour into the nav, which condenses in its place
  const title = document.querySelector('#hero-title');
  if (title && !reduce) {
    const sub = document.querySelector('.hero-sub');
    const letters = [];
    title.querySelectorAll('.w').forEach((w) => {
      const text = w.textContent;
      w.textContent = '';
      [...text].forEach((c) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        w.appendChild(s);
        letters.push(s);
      });
    });

    const canvas = document.createElement('canvas');
    canvas.className = 'vapor';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let dpr = 1, ink = '';
    let dots = null, step = 6; // { x, y (page coords), delay, swirl, tx, ty (0..1 within the nav) }

    const sizeCanvas = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ink = getComputedStyle(title).color;
    };

    // Draw the letters off-screen exactly where they sit on the page, then keep a dot wherever there is ink
    const sample = () => {
      const off = document.createElement('canvas');
      off.width = innerWidth;
      off.height = Math.ceil(title.getBoundingClientRect().bottom + scrollY + 20);
      const o = off.getContext('2d');
      const cs = getComputedStyle(title);
      const fs = parseFloat(cs.fontSize);
      o.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      const m = o.measureText('H');
      const A = m.fontBoundingBoxAscent ?? fs * 0.9, D = m.fontBoundingBoxDescent ?? fs * 0.22;
      letters.forEach((el) => {
        const r = el.getBoundingClientRect();
        o.fillText(el.textContent, r.left, r.top + scrollY + (r.height - (A + D)) / 2 + A);
      });
      step = Math.max(3, Math.round(fs / 34));
      const px = o.getImageData(0, 0, off.width, off.height).data;
      const out = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if (px[(y * off.width + x) * 4 + 3] < 128) continue;
          out.push({
            x: x + step / 2, y: y + step / 2,
            delay: Math.random() * 0.25,
            swirl: (Math.random() - 0.5) * 2,
            tx: Math.random(), ty: Math.random(),
          });
        }
      }
      dots = out;
    };

    const ease = (t) => t * t * (3 - 2 * t);
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    let ticking = false;
    const update = () => {
      ticking = false;
      const p = clamp01(scrollY / (title.closest('.hero').offsetHeight * 0.75));

      // 0 -> .2: solid letters crossfade into touching squares, which shrink into separate dots
      const a = ease(clamp01(p / 0.2));
      title.style.opacity = p > 0 ? 1 - a : '';

      // The line under the name blurs away with it
      const f = ease(clamp01(p / 0.3));
      const ss = sub ? sub.style : {};
      ss.transition = p > 0 ? 'none' : '';
      ss.opacity = p > 0 ? 1 - f : '';
      ss.filter = p > 0 ? `blur(${f * 8}px)` : '';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (p > 0 && p < 1) {
        if (!dots) sample();
        const n = nav.getBoundingClientRect();
        const pad = 6;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = ink;
        const size0 = step * (1 - 0.7 * a);
        for (const d of dots) {
          // .15 -> 1: each dot rises toward its own spot inside the nav, curling sideways on the way
          const k = ease(clamp01((p - 0.15 - d.delay) / 0.55));
          const hx = d.x, hy = d.y - scrollY;
          const tx = n.left + pad + d.tx * (n.width - pad * 2);
          const ty = n.top + pad + d.ty * (n.height - pad * 2);
          const curl = Math.sin(k * Math.PI) * d.swirl * 90;
          const x = hx + (tx - hx) * k + curl;
          const y = hy + (ty - hy) * k - Math.sin(k * Math.PI) * 40;
          const sz = size0 * (1 - 0.4 * k);
          ctx.globalAlpha = a * (1 - ease(clamp01((k - 0.75) / 0.25)) * clamp01((p - 0.6) / 0.25));
          ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
      }

      // .6 -> 1: the nav condenses as the dots arrive
      const c = ease(clamp01((p - 0.6) / 0.4));
      nav.style.setProperty('--nav-o', c);
      nav.style.setProperty('--nav-b', `${(1 - c) * 10}px`);
      nav.style.setProperty('--nav-s', 0.9 + 0.1 * c);
      nav.classList.toggle('is-hidden', c === 0);
      if (c === 0) setOpen(false);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    const reset = () => { dots = null; sizeCanvas(); update(); };
    sizeCanvas();
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', reset);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reset);
    document.fonts && document.fonts.ready.then(reset);
  }

  // Stagger siblings that reveal together
  document.querySelectorAll('.rows, .skill-grid, .about-right').forEach((group) => {
    group.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--d', `${0.1 + i * 0.08}s`));
  });

  // Windows: one project or role at a time; arrows, tabs, arrow keys and swipes switch between them
  document.querySelectorAll('[data-window]').forEach((win) => {
    const slides = [...win.querySelectorAll('.slide')];
    const tabs = [...win.querySelectorAll('.win-tab')];
    const view = win.querySelector('.win-view');
    const count = win.querySelector('.win-count');
    const pad = (n) => String(n).padStart(2, '0');
    let index = 0;

    const fit = () => { view.style.height = `${slides[index].offsetHeight}px`; };
    const go = (n) => {
      index = (n + slides.length) % slides.length;
      slides.forEach((s, i) => {
        s.classList.toggle('is-active', i === index);
        s.classList.toggle('is-before', i < index);
        s.inert = i !== index;
        s.setAttribute('aria-hidden', i !== index);
      });
      tabs.forEach((t, i) => t.setAttribute('aria-current', i === index));
      const tab = tabs[index], strip = tab?.parentElement;
      if (tab && strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({ left: tab.offsetLeft - strip.offsetLeft - 8, behavior: 'smooth' }); // only the tab strip, never the page
      }
      count.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
      fit();
    };

    win.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => go(index + Number(b.dataset.dir))));
    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    win.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    });

    let startX = null;
    view.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') startX = e.clientX; });
    view.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    });
    view.addEventListener('pointercancel', () => { startX = null; });

    addEventListener('resize', fit);
    document.fonts && document.fonts.ready.then(fit);
    go(0);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  document.querySelectorAll('.reveal, [data-split]').forEach((el) => io.observe(el));

  // Manifesto: words fill in as you scroll through the pinned section
  const scrub = document.querySelector('[data-scrub]');
  if (scrub && !reduce) {
    const words = splitWords(scrub);
    const section = scrub.closest('.manifesto');
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = section.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.25) / (total + innerHeight * 0.25)));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }
})();
