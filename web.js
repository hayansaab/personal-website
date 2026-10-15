// Background web: thin lines strung between randomly scattered points, so the
// pattern is irregular and lines cross each other. Swells run through it in
// several directions at once like a choppy sea, and every point also bobs on its
// own. Points are springs tied to the points they connect to, so the cursor drags
// the web and the disturbance ripples outward before settling back.
(() => {
  const canvas = document.createElement('canvas');
  canvas.className = 'web';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GAP = 72;           // average px between points
  const RADIUS = 180;       // cursor reach
  const NEAREST = 4;        // short links per point
  const LONG = 0.22;        // chance a point also throws a long line across its neighbours
  // Swells travelling in different directions: [angle, wavelength px, speed, amplitude px]
  const SWELLS = [
    [0.3, 560, 1.3, 22],
    [2.2, 420, 1.6, 16],
    [4.0, 700, 1.0, 24],
    [5.3, 320, 2.1, 10],
    [1.2, 240, 2.6, 6],
  ].map(([a, len, speed, amp]) => ({ kx: Math.cos(a) * 2 * Math.PI / len, ky: Math.sin(a) * 2 * Math.PI / len, speed, amp, dx: -Math.sin(a), dy: Math.cos(a) }));
  const ALPHAS = [1, 0.6, 0.3];   // lines come in three strengths

  let w = 0, h = 0, dpr = 1, n = 0;
  let bx, by, ox, oy, vx, vy, px, py, bob; // base pos, spring offset, velocity, drawn pos, own wobble
  let links = [], nbrs = [];               // links bucketed by strength; neighbour lists for springs
  let color = '';
  const mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, last: 0 };

  const readColor = () => { color = getComputedStyle(document.documentElement).getPropertyValue('--web').trim(); };

  const build = () => {
    // Jittered grid: even coverage, but no visible rows or columns
    const pad = GAP * 2;
    const cols = Math.ceil((w + pad * 2) / GAP), rows = Math.ceil((h + pad * 2) / GAP);
    const xs = [], ys = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      xs.push(-pad + (c + 0.5 + (Math.random() - 0.5) * 0.9) * GAP);
      ys.push(-pad + (r + 0.5 + (Math.random() - 0.5) * 0.9) * GAP);
    }
    n = xs.length;
    bx = Float32Array.from(xs); by = Float32Array.from(ys);
    ox = new Float32Array(n); oy = new Float32Array(n);
    vx = new Float32Array(n); vy = new Float32Array(n);
    px = new Float32Array(n); py = new Float32Array(n);
    bob = Array.from({ length: n }, () => ({ fx: 0.4 + Math.random() * 0.9, fy: 0.4 + Math.random() * 0.9, p: Math.random() * 6.28, a: 4 + Math.random() * 8 }));

    const seen = new Set();
    const buckets = ALPHAS.map(() => []);
    nbrs = Array.from({ length: n }, () => []);
    const link = (i, j) => {
      const key = i < j ? i * n + j : j * n + i;
      if (i === j || seen.has(key)) return;
      seen.add(key);
      buckets[Math.floor(Math.random() * ALPHAS.length)].push(i, j);
      nbrs[i].push(j); nbrs[j].push(i);
    };
    for (let i = 0; i < n; i++) {
      // Candidates from the surrounding few grid cells
      const near = [];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const d = Math.hypot(bx[j] - bx[i], by[j] - by[i]);
        if (d < GAP * 3.2) near.push([d, j]);
      }
      near.sort((a, b) => a[0] - b[0]);
      near.slice(0, NEAREST).forEach(([, j]) => link(i, j));
      // A longer strand that skips over neighbours, so lines cross
      if (Math.random() < LONG) {
        const far = near.filter(([d]) => d > GAP * 1.8);
        if (far.length) link(i, far[Math.floor(Math.random() * far.length)][1]);
      }
    }
    links = buckets.map((b) => Uint32Array.from(b));
  };

  let builtW = 0, builtH = 0;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Mobile toolbars resize the viewport while scrolling; only reshuffle the web
    // when it no longer covers the screen
    if (w !== builtW || h > builtH) { build(); builtW = w; builtH = h; }
  };

  const step = (t) => {
    const time = t / 1000;

    // Cursor: push points along the cursor's motion and slightly outward
    const speed = Math.min(Math.hypot(mouse.vx, mouse.vy), 40);
    for (let i = 0; i < n; i++) {
      const dx = px[i] - mouse.x, dy = py[i] - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > RADIUS * RADIUS) continue;
      const d = Math.sqrt(d2) || 1;
      const f = (1 - d / RADIUS) ** 2;
      vx[i] += (mouse.vx * 0.14 + dx / d * speed * 0.1) * f;
      vy[i] += (mouse.vy * 0.14 + dy / d * speed * 0.1) * f;
    }
    mouse.vx *= 0.8; mouse.vy *= 0.8;

    // Springs: pull toward linked points (so ripples spread), pull home, damp
    for (let i = 0; i < n; i++) {
      const nb = nbrs[i];
      let sx = 0, sy = 0;
      for (let k = 0; k < nb.length; k++) { sx += ox[nb[k]]; sy += oy[nb[k]]; }
      const m = nb.length || 1;
      vx[i] += (sx / m - ox[i]) * 0.16 - ox[i] * 0.015;
      vy[i] += (sy / m - oy[i]) * 0.16 - oy[i] * 0.015;
      vx[i] *= 0.95; vy[i] *= 0.95;
    }

    for (let i = 0; i < n; i++) {
      ox[i] += vx[i]; oy[i] += vy[i];
      // Sum of travelling swells; each displaces across its direction of travel
      // and a little along it, which gives the rolling, criss-cross sea look
      let sx = 0, sy = 0;
      for (const s of SWELLS) {
        const ph = bx[i] * s.kx + by[i] * s.ky - time * s.speed;
        const a = Math.sin(ph) * s.amp, b = Math.cos(ph) * s.amp * 0.5;
        sx += s.dx * a + s.dy * b;
        sy += s.dy * a - s.dx * b;
      }
      const o = bob[i];
      sx += Math.sin(time * o.fx + o.p) * o.a;
      sy += Math.cos(time * o.fy + o.p * 1.3) * o.a;
      px[i] = bx[i] + sx + ox[i];
      py[i] = by[i] + sy + oy[i];
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    links.forEach((l, b) => {
      ctx.globalAlpha = ALPHAS[b];
      ctx.beginPath();
      for (let k = 0; k < l.length; k += 2) {
        ctx.moveTo(px[l[k]], py[l[k]]);
        ctx.lineTo(px[l[k + 1]], py[l[k + 1]]);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  };

  const frame = (t) => { step(t); draw(); requestAnimationFrame(frame); };

  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - mouse.last < 100 && mouse.x > -1e3) {
      mouse.vx = e.clientX - mouse.x; mouse.vy = e.clientY - mouse.y;
    }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.last = now;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  window.addEventListener('resize', () => { resize(); if (reduce) { step(0); draw(); } });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColor(); if (reduce) draw(); });

  readColor();
  resize();
  if (reduce) { step(0); draw(); } else requestAnimationFrame(frame);
})();
