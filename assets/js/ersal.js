/* الإرسال — the receiver. Plain JS, no dependencies. */
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const D = window.ERSAL || null;
  const CUT = Math.tan(10.4 * Math.PI / 180);
  const debounce = (fn, ms = 120) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
  const plural = n => n === 1 ? 'خبر واحد' : n === 2 ? 'خبران' : n <= 10 ? `${n} أخبار` : `${n} خبرا`;

  /* ---------- theme: day / night broadcast ---------- */
  const themeBtns = $$('.js-theme');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  function syncTheme() {
    const d = isDark();
    themeBtns.forEach(b => {
      b.dataset.dark = d ? '1' : '0';
      b.setAttribute('aria-label', d ? 'الوضع النهاري' : 'الوضع الليلي');
      const l = $('.js-theme-label', b); if (l) l.textContent = d ? 'بث نهاري' : 'بث ليلي';
    });
  }
  themeBtns.forEach(b => b.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    store.set('ersal:theme', root.dataset.theme);
    syncTheme();
    document.dispatchEvent(new CustomEvent('ersal:theme'));
  }));
  syncTheme();

  /* ---------- logo: the teeth rise once per visit ---------- */
  $$('.js-acquire, .mast .ersal-mark').forEach(mark => {
    if (reduce) return;
    let seen = null; try { seen = sessionStorage.getItem('ersal:acq'); } catch (e) {}
    if (mark.classList.contains('js-acquire') || !seen) {
      mark.classList.add('acquire');
      try { sessionStorage.setItem('ersal:acq', '1'); } catch (e) {}
    }
  });

  /* ---------- carrier wave: contour lines from the cover ---------- */
  function carrier(el) {
    const n = +el.dataset.lines || 14, amp = +el.dataset.amp || 20;
    const W = 1600, H = 400;
    let paths = '';
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const y0 = H * (0.08 + 0.84 * f);
      const a = amp * (0.35 + 0.65 * Math.sin(Math.PI * f));
      let d = '';
      for (let x = 0; x <= W * 2; x += 16) {
        const t = (x / W) * Math.PI * 2; // periodic over W, so a 50% shift loops seamlessly
        const y = y0 + a * Math.sin(t * 2 + i * 0.32) + a * 0.55 * Math.sin(t * 3 - i * 0.21 + 1.3) + a * 0.25 * Math.sin(t * 5 + f * 2);
        d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
      }
      paths += `<path d="${d}"/>`;
    }
    el.innerHTML = `<svg viewBox="0 0 ${W * 2} ${H}" preserveAspectRatio="none" focusable="false">${paths}</svg>`;
  }
  $$('.carrier').forEach(carrier);

  /* ---------- the tuner: ticks drawn at device pixels, a needle that glides ---------- */
  const tuner = $('.tuner');
  if (tuner) {
    const inner = $('.tuner-in', tuner), list = $('.tuner-list', tuner), needle = $('.needle', tuner), ticks = $('.tuner-ticks', tuner);
    const links = $$('a', list);
    const current = links.find(a => a.getAttribute('aria-current') === 'page') || links[0];
    const mobile = matchMedia('(max-width: 860px)');
    const centerX = a => { const r = a.getBoundingClientRect(), ir = inner.getBoundingClientRect(); return r.left + r.width / 2 - ir.left; };
    const place = a => { if (!mobile.matches) needle.style.setProperty('--nx', (centerX(a) - 1.5).toFixed(1) + 'px'); };
    function drawTicks() {
      if (mobile.matches) { ticks.innerHTML = ''; return; }
      const dpr = window.devicePixelRatio || 1, ir = inner.getBoundingClientRect(), tr = ticks.getBoundingClientRect();
      const w = tr.width, snap = x => Math.round(x * dpr) / dpr + 0.5 / dpr;
      const majors = links.map(a => centerX(a) - (tr.left - ir.left));
      let out = '';
      for (let x = 0; x <= w; x += 9) {
        if (majors.some(m => Math.abs(m - x) < 4.5)) continue;
        const h = (Math.round(x / 9) % 5 === 0) ? 7 : 4;
        out += `<line x1="${snap(x)}" x2="${snap(x)}" y1="${14 - h}" y2="14"/>`;
      }
      majors.forEach(m => { out += `<line class="major" x1="${snap(m)}" x2="${snap(m)}" y1="1" y2="14"/>`; });
      ticks.setAttribute('viewBox', `0 0 ${w} 14`);
      ticks.innerHTML = out;
    }
    links.forEach(a => {
      a.addEventListener('pointerenter', () => { place(a); a.classList.add('tuned'); });
      a.addEventListener('pointerleave', () => a.classList.remove('tuned'));
      a.addEventListener('focus', () => place(a));
    });
    list.addEventListener('focusout', e => { if (!list.contains(e.relatedTarget)) place(current); });
    // phone: the list scrolls under a fixed needle; whatever sits under it is tuned
    let raf = 0;
    list.addEventListener('scroll', () => {
      if (!mobile.matches || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const lr = list.getBoundingClientRect(), mid = lr.left + lr.width / 2;
        let best = null, bd = 1e9;
        links.forEach(a => { const r = a.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = a; } });
        links.forEach(a => a.classList.toggle('tuned', a === best));
      });
    }, { passive: true });
    // scroll-spy: the needle retunes to the section in view, and back home between stations
    let tunedTo = current;
    const stations = links.map(a => [a, (a.getAttribute('href') || '').startsWith('#') && document.getElementById(a.getAttribute('href').slice(1))]).filter(([, s]) => s);
    if ('IntersectionObserver' in window && stations.length) {
      const live = new Set();
      const io = new IntersectionObserver(es => {
        es.forEach(e => e.isIntersecting ? live.add(e.target) : live.delete(e.target));
        const hit = stations.find(([, s]) => live.has(s));
        tunedTo = hit ? hit[0] : current;
        if (!list.matches(':hover')) place(tunedTo);
      }, { rootMargin: '-35% 0px -55% 0px' });
      stations.forEach(([, s]) => io.observe(s));
    }
    list.addEventListener('pointerleave', () => place(tunedTo));
    function layout() {
      drawTicks(); place(tunedTo);
      if (mobile.matches) {
        const lr = list.getBoundingClientRect(), r = current.getBoundingClientRect();
        list.scrollLeft += (r.left + r.width / 2) - (lr.left + lr.width / 2);
        current.classList.add('tuned');
      }
      requestAnimationFrame(() => tuner.classList.add('is-ready'));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    layout();
    addEventListener('resize', debounce(layout));
  }

  /* ---------- a station head marks its own station on the tuner's scale (only sections the tuner carries) ---------- */
  function markStations() {
    const list = $('.tuner-list');
    if (!list) return;
    const lr = list.getBoundingClientRect();
    $$('.station').forEach(st => {
      const sc = $('.scale', st), host = st.closest('[id]');
      const link = host && $(`.tuner-list a[href="#${host.id}"]`);
      if (!sc || !link || !lr.width || matchMedia('(max-width: 860px)').matches) { if (sc) sc.style.setProperty('--pos-on', '0'); return; }
      const r = link.getBoundingClientRect();
      sc.style.setProperty('--pos', ((lr.right - (r.left + r.width / 2)) / lr.width * 100).toFixed(1) + '%');
      sc.style.setProperty('--pos-on', '1');
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markStations);
  markStations();
  addEventListener('resize', debounce(markStations, 200));

  /* ---------- Ramallah clock (live only on the edition's own day) ---------- */
  const clock = $('.js-clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hebron' });
    const tick = () => { const now = new Date(); if (day.format(now) === '2026-10-14') clock.textContent = fmt.format(now); };
    tick(); setInterval(tick, 20000);
  }

  /* ---------- since your last visit ---------- */
  const log = $('.js-log');
  if (log) {
    const rows = $$('.log-item', log), ids = rows.map(li => +li.dataset.id);
    const last = +(store.get('ersal:lastSeen') || 0);
    if (last && ids[0] > last) {
      let marked = false;
      rows.forEach(li => {
        if (+li.dataset.id > last) li.classList.add('fresh');
        else if (!marked) { const d = document.createElement('li'); d.className = 'since'; d.textContent = 'وقفت هنا في زيارتك السابقة'; li.before(d); marked = true; }
      });
    }
    setTimeout(() => store.set('ersal:lastSeen', String(ids[0])), 2500);
  }

  /* ---------- pulse: every transmission over 46 hours ---------- */
  const spec = $('.js-spectrum');
  if (spec && D) {
    const DAYS = { 12: 'الإثنين', 13: 'الثلاثاء', 14: 'الأربعاء' };
    const tip = document.createElement('div'); tip.className = 'spec-tip'; spec.appendChild(tip);
    let bars = [];
    function draw() {
      const W = spec.clientWidth, H = spec.clientHeight;
      let data = D.spectrum.map(d => ({ ...d, span: 30 }));
      if (W < 640) {
        const agg = [];
        for (let i = 0; i < data.length; i += 2) agg.push({ t: data[i].t, n: data[i].n + (data[i + 1] ? data[i + 1].n : 0), span: 60 });
        data = agg;
      }
      const n = data.length, max = Math.max(...data.map(d => d.n));
      const top = 40, bottom = 30, plotH = H - top - bottom, base = H - bottom;
      const lean = plotH * CUT, usable = W - lean - 2, step = usable / n, bw = Math.max(2, step * 0.6);
      const xOf = k => W - lean - (k + 1) * step + (step - bw) / 2; // time runs right → left
      let g = `<svg viewBox="0 0 ${W} ${H}" style="direction:ltr" focusable="false"><defs><linearGradient id="pulse-handover"><stop offset="0" stop-color="var(--grad-a)"/><stop offset="1" stop-color="var(--grad-b)"/></linearGradient></defs>`;
      g += `<g class="axis"><line x1="0" x2="${W}" y1="${base + .5}" y2="${base + .5}"/></g>`;
      bars = [];
      let burstMin = 1e9, burstMax = -1, burstTop = base;
      data.forEach((d, k) => {
        const x = xOf(k), h = d.n ? Math.max(3, d.n / max * plotH) : 2, o = h * CUT;
        const burst = d.t >= '2026-10-13T10:00' && d.t < '2026-10-13T14:30';
        if (burst) { burstMin = Math.min(burstMin, x); burstMax = Math.max(burstMax, x + bw + o); burstTop = Math.min(burstTop, base - h); }
        const cls = 'bar' + (d.n === 0 ? ' zero' : '') + (burst ? ' burst' : '');
        g += `<path class="${cls}" d="M${x.toFixed(1)} ${base}L${(x + bw).toFixed(1)} ${base}L${(x + bw + o).toFixed(1)} ${(base - h).toFixed(1)}L${(x + o).toFixed(1)} ${(base - h).toFixed(1)}Z"/>`;
        bars.push({ x, x2: x + bw + o, d });
        const hh = d.t.slice(11, 16), dd = +d.t.slice(8, 10);
        if (hh === '00:00') g += `<g class="day"><line x1="${(x + bw + step * .2).toFixed(1)}" x2="${(x + bw + step * .2).toFixed(1)}" y1="${top - 26}" y2="${base}" stroke-dasharray="2 3"/><text x="${(x + bw - 4).toFixed(1)}" y="${top - 14}" text-anchor="end">${DAYS[dd]}</text></g>`;
        else if (/^(03|06|09|12|15|18|21):00$/.test(hh) && (W >= 640 || /^(06|12|18):00$/.test(hh))) g += `<g class="axis"><line x1="${(x + bw / 2).toFixed(1)}" x2="${(x + bw / 2).toFixed(1)}" y1="${base}" y2="${base + 5}"/><text x="${(x + bw / 2).toFixed(1)}" y="${base + 19}" text-anchor="middle">${hh}</text></g>`;
        if (k === 0) g += `<g class="day"><text x="${(W - 2).toFixed(1)}" y="${top - 14}" text-anchor="end">${DAYS[dd]}</text></g>`;
      });
      if (burstMax > 0) {
        const y = burstTop - 12;
        g += `<a href="#raid" class="bracket"><path d="M${burstMin.toFixed(1)} ${y + 6}V${y}H${burstMax.toFixed(1)}V${y + 6}"/><text x="${((burstMin + burstMax) / 2).toFixed(1)}" y="${y - 8}" text-anchor="middle">اقتحام وسط رام الله</text></a>`;
      }
      g += '</svg>';
      spec.innerHTML = g; spec.appendChild(tip);
    }
    spec.addEventListener('pointermove', e => {
      const r = spec.getBoundingClientRect(), x = e.clientX - r.left;
      const b = bars.find(b => x >= b.x - 2 && x <= b.x2 + 2);
      if (!b) { tip.classList.remove('on'); return; }
      const t = b.d.t, dd = +t.slice(8, 10), from = t.slice(11, 16);
      const endM = (+from.slice(0, 2) * 60 + +from.slice(3, 5) + b.d.span) % 1440;
      const to = String(Math.floor(endM / 60)).padStart(2, '0') + ':' + String(endM % 60).padStart(2, '0');
      tip.innerHTML = `<b>${b.d.n ? plural(b.d.n) : 'لا أخبار'}</b><br>${DAYS[dd]} <span class="ltr">${from}–${to}</span>`;
      tip.style.left = (b.x + (b.x2 - b.x) / 2 - tip.offsetWidth) + 'px';
      tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, b.x + (b.x2 - b.x) / 2 - tip.offsetWidth / 2)) + 'px';
      tip.style.transform = 'translateY(-100%)';
      tip.style.top = '18px';
      tip.classList.add('on');
    });
    spec.addEventListener('pointerleave', () => tip.classList.remove('on'));
    draw();
    addEventListener('resize', debounce(draw));
  }

  /* ---------- replay the raid as it was transmitted ---------- */
  const deck = $('.js-deck');
  if (deck) {
    const items = $$('.rp-item', deck);
    const toMin = s => +s.slice(0, 2) * 60 + +s.slice(3, 5);
    const mins = items.map(li => toMin($('time', li).textContent));
    const t0 = mins[0], t1 = mins[mins.length - 1], DUR = 24000;
    const clockEl = $('.js-deck-clock', deck), scale = $('.js-deck-scale', deck), fill = $('.deck-fill', deck), ticks = $('.deck-ticks', deck);
    const btn = $('.js-deck-play', deck), label = $('span', btn), list = $('.rp-list', deck);
    let raf = 0, start = 0, playing = false, lastLit = -2;
    const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.floor(m % 60)).padStart(2, '0');
    // one hairline per transmission, placed on its minute; time runs right → left
    function drawScale() {
      const w = scale.clientWidth, h = scale.clientHeight, dpr = window.devicePixelRatio || 1;
      const snap = x => Math.round(x * dpr) / dpr + 0.5 / dpr;
      let s = `<line class="base" x1="0" x2="${w}" y1="${h - .5}" y2="${h - .5}"/>`;
      mins.forEach((m, i) => {
        const x = snap(w - (m - t0) / (t1 - t0) * w), tall = items[i].querySelector('.rp-v') ? 14 : 9;
        s += `<line class="${tall > 9 ? 'v' : ''}" x1="${x}" x2="${x}" y1="${h - tall}" y2="${h}"/>`;
      });
      ticks.setAttribute('viewBox', `0 0 ${w} ${h}`);
      ticks.innerHTML = s;
    }
    function render(m, follow = true) {
      clockEl.textContent = fmt(m);
      fill.style.setProperty('--p', ((m - t0) / (t1 - t0) * 100).toFixed(2) + '%');
      let lit = -1;
      items.forEach((li, i) => { const on = mins[i] <= m; li.classList.toggle('lit', on); if (on) lit = i; });
      scale.setAttribute('aria-valuenow', String(Math.max(0, lit)));
      scale.setAttribute('aria-valuetext', `${fmt(m)}، ${lit + 1} من ${items.length}`);
      if (lit !== lastLit) {
        items.forEach((li, i) => li.classList.toggle('now', i === lit));
        if (follow && lit >= 0 && list.scrollHeight > list.clientHeight + 2) { const li = items[lit]; list.scrollTop = li.offsetTop - list.clientHeight / 2 + li.offsetHeight / 2; }
        lastLit = lit;
      }
    }
    // scrub by pointer or keys: the deck shows the broadcast up to that minute
    const scrubTo = clientX => {
      const r = scale.getBoundingClientRect(), p = Math.max(0, Math.min(1, (r.right - clientX) / r.width));
      deck.classList.add('playing'); render(t0 + p * (t1 - t0));
    };
    scale.addEventListener('pointerdown', e => { if (playing) stop(); scale.setPointerCapture(e.pointerId); scrubTo(e.clientX); });
    scale.addEventListener('pointermove', e => { if (scale.hasPointerCapture(e.pointerId)) scrubTo(e.clientX); });
    scale.addEventListener('keydown', e => {
      const keys = { ArrowLeft: 1, ArrowUp: 1, ArrowRight: -1, ArrowDown: -1, Home: -999, End: 999 };
      if (!(e.key in keys)) return;
      e.preventDefault(); if (playing) stop();
      const i = Math.max(0, Math.min(items.length - 1, lastLit + keys[e.key]));
      deck.classList.add('playing'); render(mins[i]);
    });
    drawScale(); addEventListener('resize', debounce(drawScale));
    const more = $('.js-rp-more', deck);
    if (more) more.addEventListener('click', () => { deck.classList.add('expanded'); items[8] && items[8].querySelector('a').focus(); });
    function frame(ts) {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / DUR);
      render(t0 + p * (t1 - t0));
      if (p < 1) raf = requestAnimationFrame(frame); else finish();
    }
    function play() { deck.classList.add('playing'); playing = true; start = 0; lastLit = -2; label.textContent = 'إيقاف'; btn.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(frame); }
    function finish() { playing = false; label.textContent = 'أعد البث'; btn.setAttribute('aria-pressed', 'false'); setTimeout(() => { if (!playing) deck.classList.remove('playing'); }, 1600); }
    function stop() { cancelAnimationFrame(raf); playing = false; deck.classList.remove('playing'); label.textContent = 'أعد البث'; btn.setAttribute('aria-pressed', 'false'); }
    btn.addEventListener('click', () => playing ? stop() : play());
  }

  /* ---------- wide coverage: a spike map of Ramallah and al-Bireh on an OSM base ---------- */
  const cov = $('.js-cov');
  if (cov && D && D.map) {
    const M = D.map, tip = $('.js-cov-tip'), listEl = $('.js-cov-list');
    const NB_AT = { 'محافظة نابلس': [.66, .05], 'محافظة سلفيت': [.2, .1], 'محافظة أريحا والأغوار': [.88, .6], 'محافظة القدس': [.3, .9] };
    M.neighbours.forEach(n => { const at = NB_AT[n.name]; if (at) { n.x = M.w * at[0]; n.y = M.h * at[1]; } });
    const NOW = new Date(D.now + ':00+03:00');
    const byName = new Map(D.places.map(p => [p.name, p]));
    const xy = new Map(M.places.map(p => [p.name, p]));
    const fresh = p => (NOW - new Date(`2026-10-${p.last.day}T${p.last.time}:00+03:00`)) / 36e5 <= 6;
    const when = p => (p.last.day === 14 ? '' : p.last.day === 13 ? 'أمس ' : 'الإثنين ') + p.last.time;
    const max = Math.max(...D.places.map(p => p.n));
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function draw() {
      const k = M.w / Math.max(cov.clientWidth, 1); // viewBox units per CSS pixel
      const fs = 12.5 * k, small = 10.5 * k, sw = 5.5 * k;
      let s = `<svg viewBox="0 0 ${M.w} ${M.h}" style="direction:ltr" focusable="false">`;
      M.neighbours.forEach(n => { s += `<path class="nb" d="${n.d}"/>`; });
      s += `<path class="gov" d="${M.gov}"/><path class="rd2" d="${M.roads.secondary}"/><path class="rd1" d="${M.roads.primary}"/>`;
      M.neighbours.forEach(n => { s += `<text class="nb-l" x="${n.x}" y="${n.y}" text-anchor="middle" font-size="${small}">${n.name}</text>`; });
      const [cx, cy] = M.center;
      [5, 10, 20].forEach(km => {
        const r = km * M.kmpx, ly = cy + r * .7071 + 12 * k;
        s += `<circle class="ring" cx="${cx}" cy="${cy}" r="${r}"/>`;
        if (ly < M.h - 44 * k && cx - r * .7071 > 60 * k) s += `<text class="ring-l" direction="rtl" x="${cx - r * .7071 - 3 * k}" y="${cy + r * .7071 + 12 * k}" font-size="${small}">${km} كم</text>`;
      });
      if (!reduce) s += `<circle class="wave" cx="${cx}" cy="${cy}" r="${20 * M.kmpx}"/><circle class="wave w2" cx="${cx}" cy="${cy}" r="${20 * M.kmpx}"/>`;
      // labels: largest first, keep only what fits
      const boxes = [{ x1: cx - 6 * k, x2: cx + 96 * k, y1: cy - 8 * k, y2: cy + 24 * k }];
      const hit = b => b.x1 < 0 || b.x2 > M.w || b.y1 < 0 || boxes.some(o => !(b.x2 < o.x1 || b.x1 > o.x2 || b.y2 < o.y1 || b.y1 > o.y2));
      const order = D.places.slice().sort((a, b) => b.n - a.n);
      const hOf = p => (14 + Math.sqrt(p.n) * 15) * k * .62;
      // labels may cross other thin spikes (they carry a halo) but never another label, the station or a governorate name
      M.neighbours.forEach(n => { const w = n.name.length * 5.6 * k; boxes.push({ x1: n.x - w / 2, x2: n.x + w / 2, y1: n.y - 12 * k, y2: n.y + 3 * k }); });
      const spikes = []; // placed largest-first, painted smallest-first so big labels stay on top
      order.forEach(p => {
        const q = xy.get(p.name); if (!q) return;
        const h = hOf(p), o = h * CUT;
        const top = q.y - h;
        let lab = '';
        const narrow = cov.clientWidth < 520;
        if (narrow ? order.indexOf(p) < 8 : p.n >= 2) {
          const tw = (p.name.length * 6.6 + 4) * k, th = 15 * k; // names only: counts live in the list and the tooltip
          const cands = [
            { x1: q.x + o + 5 * k, y1: top - 2 * k, a: 'start' },
            { x1: q.x - 6 * k - tw, y1: top - 2 * k, a: 'end' },
            { x1: q.x + 7 * k, y1: q.y - th * .5, a: 'start' },
            { x1: q.x - 7 * k - tw, y1: q.y - th * .5, a: 'end' },
            { x1: q.x + o + 5 * k, y1: top - th - 2 * k, a: 'start' },
            { x1: q.x - 6 * k - tw, y1: top - th - 2 * k, a: 'end' },
            { x1: q.x + 7 * k, y1: q.y + 2 * k, a: 'start' },
            { x1: q.x - 7 * k - tw, y1: q.y + 2 * k, a: 'end' }
          ];
          for (const c of cands) {
            const b = { x1: c.x1, x2: c.x1 + tw, y1: c.y1, y2: c.y1 + th };
            if (!hit(b)) {
              boxes.push(b);
              const tx = c.a === 'start' ? b.x1 : b.x2;
              lab = `<text class="lbl" x="${tx.toFixed(1)}" y="${(b.y2 - 3 * k).toFixed(1)}" font-size="${fs}"${c.a === 'end' ? ' text-anchor="end"' : ''}>${p.name}</text>`;
              break;
            }
          }
        }
        const f = fresh(p) ? ' fresh' : '';
        spikes.push(`<g class="pt${f}" tabindex="0" role="button" data-n="${esc(p.name)}" aria-label="${esc(p.name)}: ${plural(p.n)}، آخرها ${when(p)}">`
          + `<path class="spike" d="M${(q.x - sw / 2).toFixed(1)} ${q.y}L${(q.x + sw / 2).toFixed(1)} ${q.y}L${(q.x + sw / 2 + o).toFixed(1)} ${top.toFixed(1)}L${(q.x - sw / 2 + o).toFixed(1)} ${top.toFixed(1)}Z"/>`
          + `<circle class="base" cx="${q.x}" cy="${q.y}" r="${2.6 * k}"/>${lab}</g>`);
      });
      s += spikes.reverse().join('');
      s += `<g class="stn"><circle cx="${cx}" cy="${cy}" r="${5 * k}"/><path d="M${cx - 2 * k} ${cy}L${cx + 2 * k} ${cy}L${cx + 2 * k + 16 * k * CUT} ${cy - 16 * k}L${cx - 2 * k + 16 * k * CUT} ${cy - 16 * k}Z"/><text x="${cx + 9 * k}" y="${cy + 18 * k}" font-size="${fs}">شارع الإرسال</text></g>`;
      // north arrow + scale bar + attribution, cartographic furniture
      const pad = 18 * k;
      s += `<g class="north"><path d="M${M.w - pad - 6 * k} ${pad + 34 * k}L${M.w - pad} ${pad + 34 * k}L${M.w - pad + 26 * k * CUT} ${pad + 8 * k}L${M.w - pad - 6 * k + 26 * k * CUT} ${pad + 8 * k}Z"/><text x="${M.w - pad + 2 * k}" y="${pad}" text-anchor="middle" font-size="${small}">شمال</text></g>`;
      const sb = 5 * M.kmpx, sx = pad, sy = M.h - pad - 10 * k;
      s += `<g class="scalebar"><line x1="${sx}" x2="${sx + sb}" y1="${sy}" y2="${sy}"/><line x1="${sx}" x2="${sx}" y1="${sy - 5 * k}" y2="${sy}"/><line x1="${sx + sb}" x2="${sx + sb}" y1="${sy - 5 * k}" y2="${sy}"/><line x1="${sx + sb / 2}" x2="${sx + sb / 2}" y1="${sy - 3 * k}" y2="${sy}"/><text direction="rtl" x="${sx + sb}" y="${sy + 14 * k}" font-size="${small}" text-anchor="start">5 كم</text></g>`;
      s += `<text class="attr" x="${M.w - pad}" y="${M.h - pad + 4 * k}" text-anchor="end" font-size="${9.5 * k}">© OpenStreetMap contributors</text>`;
      s += '</svg>';
      cov.innerHTML = s;
      $$('.pt', cov).forEach(g => {
        g.addEventListener('pointerenter', () => show(g.dataset.n));
        g.addEventListener('focus', () => show(g.dataset.n));
        g.addEventListener('click', () => show(g.dataset.n));
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(g.dataset.n); } });
      });
    }
    function show(name) {
      const p = byName.get(name), q = xy.get(name); if (!p || !q) return;
      $$('.pt', cov).forEach(g => g.classList.toggle('on', g.dataset.n === name));
      $$('.cov-row', listEl).forEach(r => r.classList.toggle('on', r.dataset.n === name));
      tip.innerHTML = `<b>${esc(p.name)}</b><div class="meta">${plural(p.n)} · آخر إشارة <time>${when(p)}</time></div>${esc(p.last.title)}`;
      tip.hidden = false;
      const W = cov.clientWidth, sc = W / M.w, px = q.x * sc, py = q.y * sc;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(0, Math.min(W - tw, px - tw / 2)) + 'px';
      tip.style.top = (py - th - 18 > 0 ? py - th - 18 : py + 16) + 'px';
    }
    const hide = () => { tip.hidden = true; $$('.pt', cov).forEach(g => g.classList.remove('on')); $$('.cov-row', listEl).forEach(r => r.classList.remove('on')); };
    cov.addEventListener('pointerleave', hide);
    // ranked list: the eight places heard most
    listEl.innerHTML = D.places.slice().sort((a, b) => b.n - a.n).slice(0, 8).map(p =>
      `<li class="cov-row${fresh(p) ? ' fresh' : ''}" data-n="${esc(p.name)}"><span class="n">${esc(p.name)}<small>آخر إشارة ${when(p)}</small></span><span class="c">${p.n}</span><span class="m" aria-hidden="true"><i style="--v:${(p.n / max * 100).toFixed(1)}%"></i></span></li>`).join('');
    $$('.cov-row', listEl).forEach(r => { r.addEventListener('pointerenter', () => show(r.dataset.n)); r.addEventListener('pointerleave', hide); });
    draw();
    addEventListener('resize', debounce(draw, 150));
    document.addEventListener('ersal:theme', draw);
  }

  /* ---------- sliders: arrows, drag, and a tuning-scale progress line ---------- */
  $$('.js-slider').forEach(sl => {
    const track = $('.js-track', sl), bar = $('.sl-progress i', sl);
    const host = sl.closest('section') || document;
    const prev = $('.js-prev', host), next = $('.js-next', host);
    const rtl = getComputedStyle(track).direction === 'rtl';
    const step = () => Math.max(track.clientWidth * .85, 160);
    const go = dir => track.scrollBy({ left: (rtl ? -1 : 1) * dir * step(), behavior: reduce ? 'auto' : 'smooth' });
    if (prev) prev.addEventListener('click', () => go(-1));
    if (next) next.addEventListener('click', () => go(1));
    function sync() {
      const room = track.scrollWidth - track.clientWidth;
      const x = Math.abs(track.scrollLeft);
      const fits = room <= 2;
      sl.classList.toggle('fits', fits);
      sl.classList.toggle('more-start', x > 2);
      sl.classList.toggle('more-end', !fits && x < room - 2);
      if (bar) { const w = fits ? 100 : track.clientWidth / track.scrollWidth * 100; bar.style.setProperty('--w', w.toFixed(2) + '%'); bar.style.setProperty('--x', (fits ? 0 : x / room * (100 - w)).toFixed(2) + '%'); }
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = fits || x >= room - 2;
    }
    track.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', debounce(sync));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
    addEventListener('load', sync);
    sync();
    // mouse drag; touch keeps native swipe
    if (matchMedia('(pointer: fine)').matches) {
      sl.classList.add('can-drag');
      let x0 = 0, s0 = 0, moved = false, down = false, swallow = false;
      track.addEventListener('click', ev => { if (swallow) { ev.preventDefault(); ev.stopPropagation(); } }, true);
      track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft; });
      addEventListener('pointermove', e => {
        if (!down) return;
        const dx = e.clientX - x0;
        if (!moved && Math.abs(dx) > 6) { moved = true; sl.classList.add('dragging'); }
        if (moved) track.scrollLeft = s0 - dx;
      });
      addEventListener('pointerup', () => {
        if (!down) return; down = false;
        if (moved) { sl.classList.remove('dragging'); swallow = true; setTimeout(() => { swallow = false; }, 0); }
      });
      track.addEventListener('dragstart', e => e.preventDefault());
    }
  });
})();
