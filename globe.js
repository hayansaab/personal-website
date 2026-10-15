// Scroll-driven dotted globe for the journey section.
// Syria -> Hong Kong -> Walla Walla.
(() => {
  const canvas = document.querySelector('.globe');
  const section = document.querySelector('.journey');
  if (!canvas || !section || !window.d3) return;

  const steps = [...section.querySelectorAll('.step')];
  const ctx = canvas.getContext('2d');

  // [lon, lat]
  const stops = [
    { name: 'Syria', at: [36.29, 33.51] },
    { name: 'Hong Kong', at: [114.17, 22.30], label: 'left' },
    { name: 'Walla Walla', at: [-118.34, 46.06] },
  ];

  const projection = d3.geoOrthographic().clipAngle(90).precision(0.3);
  const path = d3.geoPath(projection, ctx);
  const graticule = d3.geoGraticule10();
  const legs = stops.slice(1).map((s, i) => d3.geoInterpolate(stops[i].at, s.at));

  let dots = [];      // [lon, lat] points on land
  let size = 0, dpr = 1, colors = {};

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const readColors = () => {
    colors = { sphere: css('--card'), ink: css('--on-card'), hair: css('--on-card-hair') };
  };

  // Rasterise land into an equirectangular bitmap, then sample a dot grid from it.
  const buildDots = (land) => {
    const W = 720, H = 360;
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    const eq = d3.geoEquirectangular().fitSize([W, H], { type: 'Sphere' });
    octx.beginPath();
    d3.geoPath(eq, octx)(land);
    octx.fill();
    const px = octx.getImageData(0, 0, W, H).data;
    const onLand = (p) => {
      const [x, y] = eq(p);
      return px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 128;
    };
    const grid = (step, lon0, lon1, lat0, lat1) => {
      const out = [];
      for (let lat = lat0; lat <= lat1; lat += step) {
        const lonStep = step / Math.max(Math.cos(lat * Math.PI / 180), 0.2);
        for (let lon = lon0; lon < lon1; lon += lonStep) if (onLand([lon, lat])) out.push([lon, lat]);
      }
      return out;
    };
    dots = grid(1.6, -180, 180, -84, 84);
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = Math.round(Math.min(r.width, r.height));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    projection.translate([size / 2, size / 2]);
    draw();
  };

  // Continuous position along the journey: 0 = Syria, 1 = Hong Kong, 2 = Walla Walla.
  // Negative while the section is still approaching, so the globe spins in.
  const progress = () => {
    // On phones the globe pins above the steps, so track the middle of the space below it
    const stacked = matchMedia('(max-width: 809px)').matches;
    const pinned = stacked ? canvas.parentElement.parentElement : canvas.parentElement;
    const g = pinned.getBoundingClientRect();
    const mid = stacked ? (Math.max(g.bottom, 0) + window.innerHeight) / 2 : window.innerHeight / 2;
    const centers = steps.map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    if (mid <= centers[0]) {
      const lead = window.innerHeight * 1.2;
      return -Math.min(1, (centers[0] - mid) / lead);
    }
    for (let i = 0; i < centers.length - 1; i++) {
      if (mid < centers[i + 1]) return i + (mid - centers[i]) / (centers[i + 1] - centers[i]);
    }
    return centers.length - 1;
  };

  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  let t = 0;

  const centerAt = (t) => {
    if (t <= 0) {
      const [lon, lat] = stops[0].at;
      return [lon - t * 140, lat * (1 + t)]; // spin in from the east and tilt up
    }
    const i = Math.min(Math.floor(t), legs.length - 1);
    return legs[i](ease(Math.min(1, t - i)));
  };

  // Partial great-circle arc, f in 0..1
  const arc = (leg, f) => {
    const n = 64, coords = [];
    for (let k = 0; k <= n * f; k++) coords.push(leg(k / n));
    coords.push(leg(f));
    ctx.beginPath(); path({ type: 'LineString', coordinates: coords });
    ctx.stroke();
  };

  const dot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

  const draw = () => {
    if (!size) return;
    const R = size / 2 - 2;
    const [lon, lat] = centerAt(t);
    projection.scale(R).rotate([-lon, -lat * 0.75]);
    const center = [lon, lat * 0.75];
    const visible = (p, margin = 0) => d3.geoDistance(p, center) <= Math.PI / 2 - margin;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath(); ctx.arc(size / 2, size / 2, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = colors.sphere;
    ctx.fill();

    // Graticule
    ctx.beginPath(); path(graticule);
    ctx.strokeStyle = colors.hair; ctx.lineWidth = 1; ctx.stroke();

    // Land dots, fading toward the limb
    ctx.fillStyle = colors.ink;
    const r = Math.max(1, size / 420);
    for (const d of dots) {
      const dist = d3.geoDistance(d, center);
      if (dist > Math.PI / 2) continue;
      const [x, y] = projection(d);
      ctx.globalAlpha = 0.15 + 0.4 * Math.cos(dist);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;

    // Route legs drawn up to the current position
    ctx.lineCap = 'round';
    ctx.strokeStyle = colors.ink; ctx.lineWidth = 2;
    legs.forEach((leg, i) => {
      const f = clamp01(t - i);
      if (f > 0) arc(leg, f);
    });

    const fontSize = Math.max(12, Math.round(size / 36));
    ctx.font = `500 ${fontSize}px Archivo, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';

    // Stops along the main route
    const active = Math.max(0, Math.min(stops.length - 1, Math.round(t)));
    stops.forEach((s, i) => {
      if (i > Math.ceil(t) || !visible(s.at, 0.05)) return;
      const [x, y] = projection(s.at);
      const isActive = i === active;
      if (isActive) { ctx.fillStyle = colors.hair; dot(x, y, 12); }
      ctx.fillStyle = colors.ink;
      dot(x, y, isActive ? 5.5 : 4);
      if (i > active || d3.geoDistance(s.at, center) > 1.2) return;
      ctx.globalAlpha = isActive ? 1 : 0.6;
      ctx.textAlign = s.label === 'left' ? 'right' : 'left';
      ctx.fillText(s.name, x + (s.label === 'left' ? -16 : 16), y);
      ctx.globalAlpha = 1;
    });

    ctx.restore();
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    t = progress();
    const active = Math.max(0, Math.min(steps.length - 1, Math.round(t)));
    steps.forEach((el, i) => el.classList.toggle('is-active', i === active));
    draw();
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  readColors();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { resize(); update(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); draw(); });
  resize();
  update();

  // Land data is optional: without it the globe still shows the sphere, grid and route.
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json')
    .then((r) => r.json())
    .then((world) => {
      buildDots(topojson.feature(world, world.objects.land));
      draw();
    })
    .catch(() => {});
  document.fonts && document.fonts.ready.then(draw);
})();
