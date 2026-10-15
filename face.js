// AI face: a fixed companion whose eyes follow the cursor. It starts on the left,
// dodges text and the globe as you scroll, and hops to wherever you double-click.
// Click it to open a chat that answers questions about me (served by /api/chat).
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const face = document.createElement('button');
  face.type = 'button';
  face.className = 'ai-face';
  face.setAttribute('aria-label', 'Ask the assistant about Hayan');
  face.setAttribute('aria-expanded', 'false');
  face.setAttribute('aria-controls', 'ai-chat');
  face.innerHTML = '<span class="ai-body"><span class="ai-eye"></span><span class="ai-eye"></span></span>';
  document.body.appendChild(face);
  const body = face.querySelector('.ai-body');
  const eyes = face.querySelectorAll('.ai-eye');
  const nav = document.querySelector('.nav');
  const globe = document.querySelector('.globe');

  // ---- Chat panel ----
  const SUGGESTIONS = ['What is the Innovation Lab?', 'Tell me about the fraud research', 'What is Hayan looking for?'];
  const panel = document.createElement('section');
  panel.id = 'ai-chat';
  panel.className = 'ai-chat';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ask about Hayan');
  panel.innerHTML = `
    <header class="ai-chat-head">
      <p>Ask about Hayan</p>
      <button type="button" class="ai-close" aria-label="Close chat">×</button>
    </header>
    <div class="ai-log" aria-live="polite">
      <p class="ai-msg bot">Hi! I can answer questions about Hayan's work, research, and background.</p>
      <div class="ai-suggest">${SUGGESTIONS.map((q) => `<button type="button">${q}</button>`).join('')}</div>
    </div>
    <form class="ai-form">
      <input type="text" name="q" placeholder="Ask a question…" autocomplete="off" maxlength="1000" aria-label="Your question">
      <button type="submit" aria-label="Send">↑</button>
    </form>`;
  document.body.appendChild(panel);
  const log = panel.querySelector('.ai-log');
  const form = panel.querySelector('.ai-form');
  const input = form.elements.q;
  const send = form.querySelector('button');

  const isOpen = () => !panel.hidden;
  const phone = () => innerWidth < 810;
  const GAP = 14, SHEET_BOTTOM = 12; // SHEET_BOTTOM matches .ai-chat's bottom inset on phones

  // Desktop: the panel sits beside the face, on whichever side has more room, and travels with it
  const placePanel = (duration = 0, easing = 'ease') => {
    if (phone()) return; // a bottom sheet on phones, positioned by CSS
    const s = face.offsetWidth, e = edge();
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const right = pos.x + s / 2 < innerWidth / 2;
    const x = clamp(right ? pos.x + s + GAP : pos.x - GAP - w, e, innerWidth - w - e);
    const y = clamp(pos.y, e, innerHeight - h - e);
    panel.style.transition = duration && !reduce ? `opacity .25s, transform ${duration}ms ${easing}` : 'opacity .25s';
    panel.style.transform = `translate(${x}px, ${y}px)`;
  };

  // Phone: the face perches on top of the sheet
  const dockAbovePanel = (duration = 0) => {
    const s = face.offsetWidth;
    const top = innerHeight - SHEET_BOTTOM - panel.offsetHeight; // where the sheet ends up, not mid-slide
    place(innerWidth - s - edge(), top - s - 10, duration, 'cubic-bezier(.34, 1.35, .5, 1)');
  };

  // ---- Position ----
  const edge = () => (innerWidth < 810 ? 20 : 30);
  let pos = { x: 0, y: 0 };
  let busyUntil = 0;

  const place = (x, y, duration = 0, easing = 'ease') => {
    const s = face.offsetWidth, e = edge();
    pos = { x: clamp(x, e, innerWidth - s - e), y: clamp(y, e, innerHeight - s - e) };
    face.style.transition = duration && !reduce ? `opacity .4s, transform ${duration}ms ${easing}` : 'opacity .4s';
    face.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    busyUntil = performance.now() + (reduce ? 0 : duration);
    if (isOpen()) placePanel(duration, easing);
  };

  // ---- Text avoidance ----
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (!n.textContent.trim() || n.parentElement.closest('.ai-face, .ai-chat, .nav, script, style, .skip')
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  const range = document.createRange();
  const obstacles = () => {
    const rects = [];
    for (const n of textNodes) {
      const p = n.parentElement.getBoundingClientRect();
      if (p.bottom < 0 || p.top > innerHeight || !p.width) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width && r.height) rects.push(r);
    }
    rects.push(nav.getBoundingClientRect());
    if (globe) rects.push(globe.getBoundingClientRect());
    return rects;
  };

  const PAD = 10;
  const overlap = (x, y, s, rects) => {
    let area = 0;
    for (const r of rects) {
      const w = Math.min(x + s + PAD, r.right) - Math.max(x - PAD, r.left);
      const h = Math.min(y + s + PAD, r.bottom) - Math.max(y - PAD, r.top);
      if (w > 0 && h > 0) area += w * h;
    }
    return area;
  };

  // Move to the nearest spot with no text under it (or the least crowded one)
  const avoid = (duration = 500) => {
    if (isOpen()) return; // while chatting, the face stays put next to its panel
    const rects = obstacles(), s = face.offsetWidth, e = edge();
    if (!overlap(pos.x, pos.y, s, rects)) return;
    let best = null, bestScore = Infinity;
    const STEP = 16;
    for (let y = e; y <= innerHeight - s - e; y += STEP) {
      for (let x = e; x <= innerWidth - s - e; x += STEP) {
        const score = overlap(x, y, s, rects) * 50 + Math.hypot(x - pos.x, y - pos.y);
        if (score < bestScore) { bestScore = score; best = { x, y }; }
      }
    }
    if (best) place(best.x, best.y, duration, 'cubic-bezier(.34, 1.35, .5, 1)');
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (performance.now() >= busyUntil) avoid();
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('scrollend', () => avoid());
  addEventListener('resize', () => {
    if (isOpen() && phone()) dockAbovePanel();
    else place(pos.x, pos.y);
    avoid(0);
  });

  // ---- Double-click: hop there (the open chat comes along) ----
  addEventListener('dblclick', (e) => {
    if (e.target.closest('a, button, input, textarea, select, .ai-chat')) return;
    if (isOpen() && phone()) return;
    getSelection()?.removeAllRanges();
    const s = face.offsetWidth;
    place(e.clientX - s / 2, e.clientY - s / 2, 650, 'cubic-bezier(.45, 0, .55, 1)');
    if (!reduce) {
      body.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-60px) scale(1.04, .96)', offset: 0.45, easing: 'ease-in' },
        { transform: 'translateY(0) scale(1.1, .88)', offset: 0.88 },
        { transform: 'translateY(0) scale(1)' },
      ], { duration: 650, easing: 'ease-out' });
    }
  });

  // ---- Eyes follow the cursor ----
  const MAX_X = 9, MAX_Y = 7;
  let target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
  const tick = () => {
    cur.x += (target.x - cur.x) * 0.2;
    cur.y += (target.y - cur.y) * 0.2;
    eyes.forEach((el) => {
      el.style.setProperty('--ex', `${cur.x.toFixed(2)}px`);
      el.style.setProperty('--ey', `${cur.y.toFixed(2)}px`);
    });
    raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.05 ? requestAnimationFrame(tick) : 0;
  };
  addEventListener('pointermove', (e) => {
    const r = face.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, dist / 200); // ease toward the edge as the cursor gets farther away
    target = { x: (dx / dist) * MAX_X * reach, y: (dy / dist) * MAX_Y * reach };
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  // ---- Occasional blink ----
  if (!reduce) {
    const blink = () => {
      face.classList.add('blink');
      setTimeout(() => face.classList.remove('blink'), 120);
      setTimeout(blink, 2500 + Math.random() * 4000);
    };
    setTimeout(blink, 3000);
  }

  // ---- Open and close the chat ----
  const open = () => {
    panel.hidden = false;
    face.setAttribute('aria-expanded', 'true');
    face.classList.add('chatting');
    hideHint();
    if (phone()) dockAbovePanel(450);
    else placePanel();
    requestAnimationFrame(() => panel.classList.add('in'));
    input.focus({ preventScroll: true });
  };
  const close = () => {
    panel.classList.remove('in');
    panel.hidden = true;
    face.setAttribute('aria-expanded', 'false');
    face.classList.remove('chatting');
    face.focus({ preventScroll: true });
    avoid();
  };
  face.addEventListener('click', () => (isOpen() ? close() : open()));
  panel.querySelector('.ai-close').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });

  // ---- Conversation ----
  const history = [];
  let pending = false;

  const escape = (t) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Turn emails and bare or full URLs in the answer into links
  const LINK = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|((?:https?:\/\/)?(?:[\w-]+\.)+(?:com|edu|org|io|dev|net)(?:\/[^\s<]*[^\s<.,;:!?)])?)/gi;
  const linkify = (text) => escape(text).replace(LINK, (m, email) => (email
    ? `<a href="mailto:${m}">${m}</a>`
    : `<a href="${/^https?:/i.test(m) ? m : `https://${m}`}" target="_blank" rel="noopener">${m}</a>`));

  const bubble = (role, text = '') => {
    const p = document.createElement('p');
    p.className = `ai-msg ${role}`;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  };

  const ask = async (question) => {
    question = question.trim();
    if (!question || pending) return;
    pending = true;
    send.disabled = true;
    panel.querySelector('.ai-suggest')?.remove();
    bubble('user', question);
    history.push({ role: 'user', content: question });
    input.value = '';

    const reply = bubble('bot');
    reply.classList.add('typing');
    face.classList.add('thinking');
    let text = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        reply.classList.remove('typing');
        face.classList.remove('thinking');
        reply.textContent = text;
        log.scrollTop = log.scrollHeight;
      }
    } catch (err) {
      console.error(err);
      text = text || "I can't reach my brain right now. Try again in a moment, or email Hayan at saabh@whitman.edu.";
    }
    reply.classList.remove('typing');
    face.classList.remove('thinking');
    reply.innerHTML = linkify(text.trim());
    log.scrollTop = log.scrollHeight;
    history.push({ role: 'assistant', content: text.trim() });
    pending = false;
    send.disabled = false;
    if (isOpen()) input.focus({ preventScroll: true });
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  panel.querySelectorAll('.ai-suggest button').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));

  // ---- A one-time hint so people know the face talks ----
  const hint = document.createElement('p');
  hint.className = 'ai-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = 'Ask me about Hayan';
  document.body.appendChild(hint);
  let hintTimer = 0;
  const hideHint = () => { clearTimeout(hintTimer); hint.classList.remove('in'); };
  const showHint = () => {
    if (isOpen()) return;
    const s = face.offsetWidth;
    const right = pos.x + s / 2 < innerWidth / 2;
    hint.classList.toggle('left', !right);
    const x = right ? pos.x + s + 12 : pos.x - 12 - hint.offsetWidth;
    hint.style.transform = `translate(${x}px, ${pos.y + s / 2 - hint.offsetHeight / 2}px)`;
    hint.classList.add('in');
    hintTimer = setTimeout(hideHint, 5000);
  };
  addEventListener('scroll', hideHint, { passive: true });

  // ---- Start on the left, vertically centered ----
  place(0, (innerHeight - face.offsetHeight) / 2);
  avoid(0);
  requestAnimationFrame(() => face.classList.add('ready'));
  setTimeout(showHint, 1800);
})();
