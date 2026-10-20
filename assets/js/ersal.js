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
    const flip = () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      store.set('ersal:theme', root.dataset.theme);
      syncTheme();
      document.dispatchEvent(new CustomEvent('ersal:theme'));
    };
    if (document.startViewTransition && !reduce) document.startViewTransition(flip); else flip();
  }));
  syncTheme();

  /* ---------- loader: search → lock → the mark flies into the header ---------- */
  const loader = document.getElementById('ersal-loader');
  const loading = !!loader && root.classList.contains('is-loading');
  let isLoaded = false;
  function loaded() {
    if (isLoaded) return; isLoaded = true;
    root.classList.remove('is-loading');
    if (loader) loader.remove();
    try { sessionStorage.setItem('ersal:loader', '1'); sessionStorage.setItem('ersal:acq', '1'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('ersal:ready'));
  }
  const whenReady = fn => (loading && !isLoaded) ? document.addEventListener('ersal:ready', fn, { once: true }) : fn();
  if (loading) {
    const t0 = performance.now(), mark = $('.ld-mark', loader);
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise(r => setTimeout(r, 2200))])
      .then(() => new Promise(r => setTimeout(r, Math.max(0, 700 - (performance.now() - t0)))))
      .then(() => {
        // lock from wherever each tooth is in its search, so the bars never jump
        $$('.m-bar', loader).forEach(b => {
          const m = getComputedStyle(b).transform.match(/matrix\(([^)]+)\)/);
          b.style.setProperty('--from', Math.max(.06, m ? parseFloat(m[1].split(',')[3]) : .06).toFixed(3));
        });
        loader.classList.add('is-locked');
        setTimeout(fly, 540);
      });
    function fly() {
      loader.classList.add('is-leaving');
      const target = $('.mast .brand .ersal-mark, .bk-bar .mini .ersal-mark');
      const m = mark.getBoundingClientRect(), t = target && target.getBoundingClientRect();
      const inView = t && t.width > 0 && t.bottom > 0 && t.top < innerHeight;
      if (!inView || !mark.animate) { // page restored mid-scroll: no target to land on, just clear
        if (mark.animate) mark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
        setTimeout(loaded, 520);
        return;
      }
      mark.animate(
        [{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${t.left - m.left}px, ${t.top - m.top}px) scale(${t.width / m.width})` }],
        { duration: 600, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' }
      ).onfinish = loaded;
      setTimeout(loaded, 900); // a throttled tab may never deliver onfinish
    }
  }

  /* ---------- photos fade in as they load ---------- */
  if (!reduce) $$('.ph img').forEach(img => {
    if (img.complete) return;
    img.classList.add('img-wait');
    const done = () => img.classList.remove('img-wait');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });

  /* ---------- logo: the teeth rise once per visit (the loader already did it on first load) ---------- */
  $$('.js-acquire, .mast .ersal-mark').forEach(mark => {
    if (reduce || (loading && !mark.classList.contains('js-acquire'))) return;
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
    const itemSec = (() => { if (!$('.js-item') || !D) return null; const id = +(new URLSearchParams(location.search).get('id') || 129959); const x = D.items.find(i => i.id === id); return x && x.sec; })();
    if (itemSec) { const a = links.find(l => l.dataset.k === itemSec); if (a) a.setAttribute('aria-current', 'page'); }
    // pages that are not stations (about, privacy, search, 404) have no current link: the needle parks off the dial
    const current = links.find(a => a.getAttribute('aria-current') === 'page') || null;
    const lost = !!$('.lost');
    if (!current) tuner.classList.add('off-station');
    const mobile = matchMedia('(max-width: 860px)');
    const centerX = a => { const r = a.getBoundingClientRect(), ir = inner.getBoundingClientRect(); return r.left + r.width / 2 - ir.left; };
    const parkX = () => {
      if (lost && links.length > 4) return (centerX(links[3]) + centerX(links[4])) / 2; // between two stations: out of tune
      const ir = inner.getBoundingClientRect(), tr = ticks.getBoundingClientRect();
      return tr.left - ir.left + 6; // the far end of the dial
    };
    const place = a => {
      needle.classList.toggle('off', !a);
      needle.classList.toggle('hunting', !a && lost && !reduce);
      if (!mobile.matches) needle.style.setProperty('--nx', ((a ? centerX(a) : parkX()) - 1.5).toFixed(1) + 'px');
    };
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
    const stations = links.map(a => { const h = a.getAttribute('href') || '', id = a.dataset.anchor || (h.startsWith('#') && h.slice(1)); return [a, id && document.getElementById(id)]; }).filter(([, s]) => s);
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
      drawTicks();
      needle.style.transition = 'none'; place(tunedTo); void needle.offsetWidth; needle.style.transition = '';
      if (mobile.matches && current) {
        const lr = list.getBoundingClientRect(), r = current.getBoundingClientRect();
        list.scrollLeft += (r.left + r.width / 2) - (lr.left + lr.width / 2);
        current.classList.add('tuned');
      }
    }
    const fontsSettled = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
    fontsSettled.then(() => { layout(); markStations(); });
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', debounce(() => { layout(); markStations(); }));
    layout();
    addEventListener('resize', debounce(layout));
    if (loading && !reduce && !mobile.matches) {
      // the loader handed over: sweep from the far end of the dial onto the current station
      whenReady(() => {
        const ir = inner.getBoundingClientRect(), tr = ticks.getBoundingClientRect();
        needle.style.transition = 'none';
        needle.style.setProperty('--nx', (tr.left - ir.left).toFixed(1) + 'px');
        tuner.classList.add('is-ready');
        void needle.offsetWidth;
        needle.style.transition = 'transform .9s var(--ease-tune), opacity .2s ease';
        place(tunedTo);
        let cleared = false;
        const clear = () => { if (!cleared) { cleared = true; needle.style.transition = ''; } };
        needle.addEventListener('transitionend', clear, { once: true });
        // a throttled or hidden tab may never run the sweep: land the needle anyway
        setTimeout(() => { if (cleared) return; cleared = true; needle.style.transition = 'none'; place(tunedTo); void needle.offsetWidth; needle.style.transition = ''; }, 1100);
      });
    } else {
      fontsSettled.then(() => tuner.classList.add('is-ready'));
    }
  }

  /* ---------- a station head marks its own station on the tuner's scale (only sections the tuner carries) ---------- */
  function markStations() {
    const list = $('.tuner-list');
    if (!list) return;
    const lr = list.getBoundingClientRect();
    $$('.station').forEach(st => {
      const sc = $('.scale', st), host = st.closest('[id]');
      const link = host && ($(`.tuner-list a[data-anchor="${host.id}"]`) || $(`.tuner-list a[href="#${host.id}"]`));
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
      let marked = false, since = null;
      rows.forEach(li => {
        if (+li.dataset.id > last) li.classList.add('fresh');
        else if (!marked) { since = document.createElement('li'); since.className = 'since'; since.textContent = 'وقفت هنا في زيارتك السابقة'; li.before(since); marked = true; }
      });
      if (!reduce) {
        const fresh = rows.filter(li => li.classList.contains('fresh')).slice(0, 3);
        if (loading) fresh.forEach(li => li.classList.add('arrive-wait'));
        whenReady(() => {
          fresh.slice().reverse().forEach((li, i) => {
            li.style.setProperty('--d', (120 + i * 120) + 'ms');
            li.classList.remove('arrive-wait');
            li.classList.add('arrive');
            li.addEventListener('animationend', () => { li.classList.remove('arrive'); li.style.removeProperty('--d'); }, { once: true });
          });
          if (since) since.classList.add('draw');
        });
      }
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
      const raidSeries = spec.dataset.series === 'raid' && D.raidPulse;
      const span0 = raidSeries ? 5 : 30;
      let data = (raidSeries ? D.raidPulse : D.spectrum).map(d => ({ ...d, span: span0 }));
      if (W < 640) {
        const agg = [];
        for (let i = 0; i < data.length; i += 2) agg.push({ t: data[i].t, n: data[i].n + (data[i + 1] ? data[i + 1].n : 0), span: span0 * 2 });
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
        const burst = !raidSeries && d.t >= '2026-10-13T10:00' && d.t < '2026-10-13T14:30';
        if (burst) { burstMin = Math.min(burstMin, x); burstMax = Math.max(burstMax, x + bw + o); burstTop = Math.min(burstTop, base - h); }
        const cls = 'bar' + (d.n === 0 ? ' zero' : '') + (burst ? ' burst' : '');
        g += `<path class="${cls}" style="--d:${Math.round(k / Math.max(1, n - 1) * 600)}ms" d="M${x.toFixed(1)} ${base}L${(x + bw).toFixed(1)} ${base}L${(x + bw + o).toFixed(1)} ${(base - h).toFixed(1)}L${(x + o).toFixed(1)} ${(base - h).toFixed(1)}Z"/>`;
        bars.push({ x, x2: x + bw + o, d });
        const hh = d.t.slice(11, 16), dd = +d.t.slice(8, 10);
        if (hh === '00:00') g += `<g class="day"><line x1="${(x + bw + step * .2).toFixed(1)}" x2="${(x + bw + step * .2).toFixed(1)}" y1="${top - 26}" y2="${base}" stroke-dasharray="2 3"/><text x="${(x + bw - 4).toFixed(1)}" y="${top - 14}" text-anchor="end">${DAYS[dd]}</text></g>`;
        else if (raidSeries ? (/:00$/.test(hh) || (W >= 640 && /:30$/.test(hh))) : (/^(03|06|09|12|15|18|21):00$/.test(hh) && (W >= 640 || /^(06|12|18):00$/.test(hh)))) g += `<g class="axis"><line x1="${(x + bw / 2).toFixed(1)}" x2="${(x + bw / 2).toFixed(1)}" y1="${base}" y2="${base + 5}"/><text x="${(x + bw / 2).toFixed(1)}" y="${base + 19}" text-anchor="middle">${hh}</text></g>`;
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
      const i = bars.findIndex(b => x >= b.x - 2 && x <= b.x2 + 2), b = bars[i];
      const paths = $$('.bar', spec);
      paths.forEach((pth, j) => pth.classList.toggle('hot', j === i));
      if (!b) { tip.classList.remove('on'); return; }
      const t = b.d.t, dd = +t.slice(8, 10), from = t.slice(11, 16);
      const endM = (+from.slice(0, 2) * 60 + +from.slice(3, 5) + b.d.span) % 1440;
      const to = String(Math.floor(endM / 60)).padStart(2, '0') + ':' + String(endM % 60).padStart(2, '0');
      tip.innerHTML = `<b>${b.d.n ? plural(b.d.n) : 'لا أخبار'}</b><br>${DAYS[dd]} <span class="ltr">${from}–${to}</span>`;
      tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, b.x + (b.x2 - b.x) / 2 - tip.offsetWidth / 2)) + 'px';
      tip.style.transform = 'translateY(-100%)';
      tip.style.top = '18px';
      tip.classList.add('on');
    });
    spec.addEventListener('pointerleave', () => { tip.classList.remove('on'); $$('.bar', spec).forEach(pth => pth.classList.remove('hot')); });
    let pulseSeen = true;
    const pulseKey = 'ersal:pulse:' + (spec.dataset.series || 'day');
    try { pulseSeen = !!sessionStorage.getItem(pulseKey); } catch (e) {}
    if (!reduce && !pulseSeen && 'IntersectionObserver' in window) spec.classList.add('pre');
    draw();
    if (spec.classList.contains('pre')) whenReady(() => {
      const io = new IntersectionObserver(es => {
        if (!es.some(en => en.isIntersecting)) return;
        io.disconnect();
        spec.classList.replace('pre', 'acquire');
        try { sessionStorage.setItem(pulseKey, '1'); } catch (e) {}
        setTimeout(() => spec.classList.remove('acquire'), 1300);
      }, { threshold: .35 });
      io.observe(spec);
      // no observer callbacks (hidden tab, headless capture): if the chart is on screen, show it still
      setTimeout(() => { const r = spec.getBoundingClientRect(); if (spec.classList.contains('pre') && r.top < innerHeight && r.bottom > 0) { io.disconnect(); spec.classList.remove('pre'); } }, 1500);
    });
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
    let shown = '';
    function render(m, follow = true) {
      const label = fmt(m);
      if (label !== shown) { shown = label; clockEl.textContent = label; }
      fill.style.setProperty('--p', ((m - t0) / (t1 - t0) * 100).toFixed(2) + '%');
      let lit = -1;
      items.forEach((li, i) => { const on = mins[i] <= m; li.classList.toggle('lit', on); if (on) lit = i; });
      scale.setAttribute('aria-valuenow', String(Math.max(0, lit)));
      if (scale.dataset.lit !== String(lit) || scale.dataset.t !== label) { scale.dataset.lit = String(lit); scale.dataset.t = label; scale.setAttribute('aria-valuetext', `${label}، ${lit + 1} من ${items.length}`); }
      if (lit !== lastLit) {
        items.forEach((li, i) => li.classList.toggle('now', i === lit));
        if (follow && lit >= 0 && list.scrollHeight > list.clientHeight + 2) {
          const li = items[lit], top = li.offsetTop - list.clientHeight / 2 + li.offsetHeight / 2;
          list.scrollTo({ top, behavior: playing && !reduce ? 'smooth' : 'auto' });
        }
        lastLit = lit;
      }
    }
    // scrub by pointer or keys: the deck shows the broadcast up to that minute
    const scrubTo = clientX => {
      const r = scale.getBoundingClientRect(), p = Math.max(0, Math.min(1, (r.right - clientX) / r.width));
      deck.classList.add('playing'); render(t0 + p * (t1 - t0));
    };
    scale.addEventListener('pointerdown', e => { if (playing) stop(); deck.classList.add('scrubbing'); scale.setPointerCapture(e.pointerId); scrubTo(e.clientX); });
    scale.addEventListener('lostpointercapture', () => deck.classList.remove('scrubbing'));
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

  /* ---------- shared map layers: governorates, roads, and the cartographic furniture ---------- */
  const mapBase = (M, k, small) => M.neighbours.map(n => `<path class="nb" d="${n.d}"/>`).join('')
    + `<path class="gov" d="${M.gov}"/><path class="rd2" d="${M.roads.secondary}"/><path class="rd1" d="${M.roads.primary}"/>`
    + M.neighbours.map(n => `<text class="nb-l" x="${n.x}" y="${n.y}" text-anchor="middle" font-size="${small}">${n.name}</text>`).join('');
  const mapFurniture = (M, k, small) => {
    const pad = 18 * k, sb = 5 * M.kmpx, sx = pad, sy = M.h - pad - 10 * k;
    return `<g class="north"><path d="M${M.w - pad - 6 * k} ${pad + 34 * k}L${M.w - pad} ${pad + 34 * k}L${M.w - pad + 26 * k * CUT} ${pad + 8 * k}L${M.w - pad - 6 * k + 26 * k * CUT} ${pad + 8 * k}Z"/><text x="${M.w - pad + 2 * k}" y="${pad}" text-anchor="middle" font-size="${small}">شمال</text></g>`
      + `<g class="scalebar"><line x1="${sx}" x2="${sx + sb}" y1="${sy}" y2="${sy}"/><line x1="${sx}" x2="${sx}" y1="${sy - 5 * k}" y2="${sy}"/><line x1="${sx + sb}" x2="${sx + sb}" y1="${sy - 5 * k}" y2="${sy}"/><line x1="${sx + sb / 2}" x2="${sx + sb / 2}" y1="${sy - 3 * k}" y2="${sy}"/><text direction="rtl" x="${sx + sb}" y="${sy + 14 * k}" font-size="${small}" text-anchor="start">5 كم</text></g>`
      + `<text class="attr" x="${M.w - pad}" y="${M.h - pad + 4 * k}" text-anchor="end" font-size="${9.5 * k}">© OpenStreetMap contributors</text>`;
  };

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
      s += mapBase(M, k, small);
      const [cx, cy] = M.center;
      [5, 10, 20].forEach(km => {
        const r = km * M.kmpx, ly = cy + r * .7071 + 12 * k;
        s += `<circle class="ring" cx="${cx}" cy="${cy}" r="${r}"/>`;
        if (ly < M.h - 44 * k && cx - r * .7071 > 60 * k) s += `<text class="ring-l" direction="rtl" x="${cx - r * .7071 - 3 * k}" y="${cy + r * .7071 + 12 * k}" font-size="${small}">${km} كم</text>`;
      });
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
      s += mapFurniture(M, k, small);
      s += '</svg>';
      cov.innerHTML = s;
      if (!reduce) {
        const pos = `left:${(cx / M.w * 100).toFixed(2)}%;top:${(cy / M.h * 100).toFixed(2)}%;width:${(40 * M.kmpx / M.w * 100).toFixed(2)}%`;
        cov.insertAdjacentHTML('beforeend', `<span class="cov-wave" style="${pos}" aria-hidden="true"></span><span class="cov-wave w2" style="${pos}" aria-hidden="true"></span>`);
      }
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

  /* ---------- roads map: checkpoints on the governorate, coloured by what gets through ---------- */
  const rmap = $('.js-roads-map');
  if (rmap && D && D.map && D.checkpoints) {
    const M = D.map;
    const cls = s => s === 'مغلق' ? 'closed' : s === 'سالك' ? 'open' : 'mid';
    function drawRoads() {
      const k = M.w / Math.max(rmap.clientWidth, 1), fs = 12.5 * k, small = 10.5 * k;
      let s = `<svg viewBox="0 0 ${M.w} ${M.h}" style="direction:ltr" focusable="false"><defs><linearGradient id="cp-handover"><stop offset="0" stop-color="var(--grad-a)"/><stop offset="1" stop-color="var(--grad-b)"/></linearGradient></defs>`;
      s += mapBase(M, k, small);
      const boxes = M.neighbours.map(n => { const w = n.name.length * 5.6 * k; return { x1: n.x - w / 2, x2: n.x + w / 2, y1: n.y - 12 * k, y2: n.y + 3 * k }; });
      const hit = b => b.x1 < 0 || b.x2 > M.w || boxes.some(o => !(b.x2 < o.x1 || b.x1 > o.x2 || b.y2 < o.y1 || b.y1 > o.y2));
      D.checkpoints.forEach(c => {
        const h = 26 * k, w = 10 * k, o = h * CUT;
        const tw = c.name.length * 6.4 * k, th = 15 * k;
        let lab = '';
        // every checkpoint gets a label (shown on hover / focus / row hover); only the closed ones stay visible, so only they avoid each other
        for (const cand of [{ x1: c.x + o + 6 * k, a: 'start' }, { x1: c.x - 6 * k - tw, a: 'end' }, { x1: c.x + o + 6 * k, a: 'start', force: true }]) {
          const b = { x1: cand.x1, x2: cand.x1 + tw, y1: c.y - h, y2: c.y - h + th };
          if (cand.force || c.status !== 'مغلق' || !hit(b)) { if (c.status === 'مغلق') boxes.push(b); lab = `<text x="${(cand.a === 'start' ? b.x1 : b.x2).toFixed(1)}" y="${(b.y2 - 3 * k).toFixed(1)}" font-size="${fs}"${cand.a === 'end' ? ' text-anchor="end"' : ''}>${c.name}</text>`; break; }
        }
        s += `<g class="cp ${cls(c.status)}${c.age_h > 24 ? ' stale' : ''}" data-n="${c.name}" tabindex="0" role="button" aria-label="${c.name}: ${c.status}"><path d="M${(c.x - w / 2).toFixed(1)} ${c.y}L${(c.x + w / 2).toFixed(1)} ${c.y}L${(c.x + w / 2 + o).toFixed(1)} ${(c.y - h).toFixed(1)}L${(c.x - w / 2 + o).toFixed(1)} ${(c.y - h).toFixed(1)}Z"/>${lab}</g>`;
      });
      s += mapFurniture(M, k, small) + '</svg>';
      rmap.innerHTML = s;
      $$('.cp', rmap).forEach(g => {
        const go = () => {
          const row = $$('.rb-row').find(r => $('.rb-name', r).firstChild.textContent.trim() === g.dataset.n);
          if (!row) return;
          row.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
          row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1400);
        };
        g.addEventListener('click', go);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    }
    drawRoads();
    addEventListener('resize', debounce(drawRoads, 150));
    document.addEventListener('ersal:theme', drawRoads);
    $$('.rb-row').forEach(r => {
      const name = $('.rb-name', r).firstChild.textContent.trim();
      r.addEventListener('pointerenter', () => $$('.cp', rmap).forEach(g => g.classList.toggle('on', g.dataset.n === name)));
      r.addEventListener('pointerleave', () => $$('.cp', rmap).forEach(g => g.classList.remove('on')));
    });
  }

  /* ---------- filters: live log and roads board ---------- */
  function filterGroup(btnSel, itemSel, test, empty) {
    const btns = $$(btnSel); if (!btns.length) return;
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      let shown = 0;
      $$(itemSel).forEach(it => { const ok = b.dataset.f === 'all' || test(it, b.dataset.f); it.hidden = !ok; if (ok) shown++; });
      if (empty) empty.hidden = shown > 0;
    }));
  }
  filterGroup('.js-lf', '.js-lb .lb-item:not(.pinned)', (it, f) => f === 'health' ? it.dataset.src === 'health' : it.dataset.kind === f);
  filterGroup('.js-rf', '.js-rb .rb-row', (it, f) => f === 'حاجز' ? (it.dataset.status === 'حاجز' || it.dataset.status === 'أزمة') : it.dataset.status === f, $('.rb-empty'));

  /* ---------- report a checkpoint (prototype: nothing is sent) ---------- */
  const rep = $('.js-report');
  if (rep) rep.addEventListener('submit', e => {
    e.preventDefault();
    const place = rep.elements.place, msg = $('.rep-msg', rep);
    if (!place.value.trim()) {
      place.setAttribute('aria-invalid', 'true'); place.focus();
      msg.className = 'rep-msg err'; msg.textContent = 'اكتب اسم الحاجز أو المكان أولا.';
      return;
    }
    place.removeAttribute('aria-invalid');
    msg.className = 'rep-msg';
    msg.textContent = `نسخة العرض لا ترسل البلاغات. في الموقع يصل بلاغ «${place.value.trim()}: ${rep.elements.st.value}» إلى الدسك للمراجعة قبل ظهوره في اللوحة.`;
  });

  /* ---------- section: older items open on demand ---------- */
  $$('.js-more-btn').forEach(b => {
    const list = b.previousElementSibling; if (!list) return;
    if (list.children.length <= 10) { b.hidden = true; return; }
    b.textContent = `عرض كل الأخبار (${list.children.length})`;
    b.addEventListener('click', () => { list.classList.add('open'); b.hidden = true; const a = list.children[10] && list.children[10].querySelector('a'); if (a) a.focus(); });
  });

  /* ---------- article: copy link and reading progress ---------- */
  $$('.js-copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href.split('#')[0].replace(/[?&]theme=(light|dark)/, '')); b.classList.add('done'); b.setAttribute('aria-label', 'تم نسخ الرابط'); setTimeout(() => { b.classList.remove('done'); b.setAttribute('aria-label', 'نسخ رابط الخبر'); }, 1800); } catch (e) {}
  }));
  const prog = $('.read-progress i'), storyEl = $('.story-page');
  if (prog && storyEl) {
    const upd = () => {
      const r = storyEl.getBoundingClientRect(), total = r.height - innerHeight * .6;
      prog.style.setProperty('--p', Math.max(0, Math.min(1, -r.top / Math.max(total, 1))).toFixed(3));
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', debounce(upd)); upd();
  }

  /* ---------- search: tune the log to a word ---------- */
  const sform = $('.js-search');
  if (sform && D) {
    const input = $('#q', sform), out = $('.js-results'), status = $('#sq-status'), empty = $('.sq-empty'), bar = $('.sq-bar');
    // Arabic-insensitive matching: no tashkeel, one alef, ta marbuta ~ ha, alef maqsura ~ ya
    const norm = s => String(s).replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const DAYS = { 12: 'الإثنين ', 13: 'أمس ', 14: '' };
    const PFX = { 'عاجل': 'urgent', 'مصادر محلية': 'src', 'مصادر صحفية': 'src', 'وزارة الصحة': 'src', 'حالة الطقس': 'src' };
    const index = D.items.map(i => ({ i, hay: norm([i.label, i.hook, i.title, i.place].join(' ')) }));
    let filter = 'all';
    // light the match inside the original text, mapping normalized offsets back
    function mark(text, q) {
      if (!q) return esc(text);
      const map = []; let n = '';
      for (let k = 0; k < text.length; k++) { const c = norm(text[k]); for (let j = 0; j < c.length; j++) { map.push(k); n += c[j]; } }
      const at = n.indexOf(q);
      if (at < 0) return esc(text);
      const a = map[at], b = map[at + q.length - 1] + 1;
      return esc(text.slice(0, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>' + esc(text.slice(b));
    }
    function row(i, q) {
      const m = i.photo || i.thumb;
      const pfx = i.label ? `<span class="pfx ${PFX[i.label] || ''}">${esc(i.label)}<span class="sr">:</span></span>` : '';
      return `<li class="log-item" data-l="${i.level}"><time class="log-t" datetime="${i.dt}">${DAYS[i.day] || ''}${i.time}</time>`
        + `<span class="sig" data-l="${i.level}" role="img" aria-label="قوة الإشارة ${i.level} من 3"><i></i><i></i><i></i></span>`
        + `<a class="log-body" href="${esc(i.url)}"><span class="log-h">${pfx}${mark(i.title, q)}</span>${i.place ? `<span class="log-place">${mark(i.place, q)}</span>` : ''}</a>`
        + (m ? `<span class="log-ph"><img src="${m}" alt="" loading="lazy" width="96" height="96">${i.video ? '<span class="play-s"></span>' : ''}</span>` : '') + '</li>';
    }
    function run(push) {
      const raw = input.value.trim(), q = norm(raw);
      if (push) { const u = new URL(location.href); if (raw) u.searchParams.set('q', raw); else u.searchParams.delete('q'); history.replaceState(null, '', u); }
      if (!q) { out.innerHTML = ''; bar.hidden = true; empty.hidden = true; status.textContent = ''; return; }
      let hits = index.filter(x => x.hay.includes(q)).map(x => x.i);
      const total = hits.length;
      if (filter === 'video') hits = hits.filter(i => i.video);
      else if (filter === 'photo') hits = hits.filter(i => i.photo);
      else if (filter === 'urgent') hits = hits.filter(i => i.label === 'عاجل');
      bar.hidden = total === 0;
      empty.hidden = total > 0;
      out.innerHTML = hits.slice(0, 80).map(i => row(i, q)).join('');
      status.innerHTML = total ? `<b>${total}</b> ${total === 1 ? 'خبر' : total === 2 ? 'خبران' : total <= 10 ? 'أخبار' : 'خبرا'} عن «${esc(raw)}»${filter !== 'all' ? ` · المعروض ${hits.length}` : ''}` : '';
    }
    const q0 = new URLSearchParams(location.search).get('q');
    if (q0) input.value = q0;
    input.addEventListener('input', debounce(() => run(true), 160));
    sform.addEventListener('submit', e => { e.preventDefault(); run(true); input.blur(); });
    $$('.js-sf').forEach(b => b.addEventListener('click', () => {
      filter = b.dataset.f;
      $$('.js-sf').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      run(false);
    }));
    run(false);
    if (!q0) input.focus({ preventScroll: true });
  }

  /* ---------- contact form (prototype: nothing is sent) ---------- */
  const contact = $('.js-contact');
  if (contact) contact.addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('.rep-msg', contact);
    const missing = ['name', 'reach', 'msg'].map(n => contact.elements[n]).filter(f => !f.value.trim());
    ['name', 'reach', 'msg'].forEach(n => contact.elements[n].removeAttribute('aria-invalid'));
    if (missing.length) {
      missing.forEach(f => f.setAttribute('aria-invalid', 'true'));
      missing[0].focus();
      msg.className = 'rep-msg err'; msg.textContent = 'أكمل الحقول المطلوبة: الاسم، وطريقة التواصل، والرسالة.';
      return;
    }
    msg.className = 'rep-msg'; msg.textContent = 'نسخة العرض لا ترسل الرسائل. في الموقع تصل رسالتك إلى فريق الإرسال.';
  });

  /* ---------- single item: one transmission, its place and its hour ---------- */
  const itemEl = $('.js-item');
  if (itemEl && D) {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const byId = new Map(D.items.map(i => [i.id, i]));
    const chron = D.items.slice().sort((a, b) => a.dt < b.dt ? -1 : 1);
    const want = +(new URLSearchParams(location.search).get('id') || 0);
    const it = byId.get(want) || byId.get(129959) || D.items[0];
    const DAYN = { 12: 'الإثنين 12', 13: 'الثلاثاء 13', 14: 'الأربعاء 14' };
    const LEVEL = { 1: 'إشارة أولى', 2: 'متابعة', 3: 'إشارة كاملة' };
    const PFXC = { 'عاجل': 'urgent', 'مصادر محلية': 'src', 'مصادر صحفية': 'src', 'وزارة الصحة': 'src', 'حالة الطقس': 'src' };
    const SEC = { ramallah: ['section.html', 'رام الله والبيرة'], quds: ['quds.html', 'القدس والأقصى'], westbank: ['westbank.html', 'الضفة'] };
    const sig = l => `<span class="sig" data-l="${l}" aria-hidden="true"><i></i><i></i><i></i></span>`;
    const pfx = i => i.label ? `<span class="pfx ${PFXC[i.label] || ''}">${esc(i.label)}<span class="sr">:</span></span>` : '';
    const whenS = i => (i.day === 14 ? '' : i.day === 13 ? 'أمس ' : 'الإثنين ') + i.time;
    const PLAYI = '<span class="play" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></svg></span>';

    document.title = `${it.title} – شبكة الإرسال`;
    const sec = SEC[it.sec];
    $('.js-it-crumbs').innerHTML = `<a href="home.html">الرئيسية</a>${sec ? `<a href="${sec[0]}">${sec[1]}</a>` : ''}<span aria-current="page">${esc(it.place || 'خبر')}</span>`;
    $('.js-it-time').textContent = it.time;
    $('.js-it-time').setAttribute('datetime', it.dt);
    $('.js-it-sig').innerHTML = sig(it.level);
    $('.js-it-level').textContent = LEVEL[it.level];
    $('.js-it-meta').innerHTML = `${pfx(it)}<time datetime="${it.dt}">${DAYN[it.day]} تشرين الأول 2026</time>${it.place ? `<span class="place">${esc(it.place)}</span>` : ''}`;
    $('.js-it-h').innerHTML = (it.hook ? `<span class="hook">${esc(it.hook)}</span>` : '') + esc(it.title);
    const m = it.photo || it.thumb;
    if (m) {
      const count = it.count > 1 ? `<span class="count plate ghost">${it.count} صور</span>` : '';
      // local clips and full albums open inside the site; the rest go to Telegram
      const local = it.clip ? `video.html?id=${it.id}` : it.album ? `album.html?id=${it.id}` : '';
      $('.js-it-media').innerHTML = `<figure class="it-media${it.video ? ' is-video' : ''}"><a class="ph" href="${local || esc(it.tg)}"${local ? '' : ' rel="noopener"'}><img src="${m}" alt="">${it.video ? PLAYI : ''}${count}</a>`
        + `<figcaption>${it.clip ? 'شاهد المقطع في مشغل الإرسال' : it.video ? 'المقطع على قناة الإرسال في تلغرام' : it.album ? `${it.count} صور، افتح الألبوم كاملا` : it.count > 1 ? `${it.count} صور، الألبوم كاملا على تلغرام` : 'تصوير: شبكة الإرسال'}</figcaption></figure>`;
    } else if (it.video) {
      $('.js-it-media').innerHTML = it.clip
        ? `<a class="it-clip" href="video.html?id=${it.id}">${PLAYI}<span>مقطع فيديو<small>شاهده في مشغل الإرسال</small></span></a>`
        : `<a class="it-clip" href="${esc(it.tg)}" rel="noopener">${PLAYI}<span>مقطع فيديو<small>يفتح على قناة الإرسال في تلغرام</small></span></a>`;
    } else {
      $('.js-it-media').innerHTML = '<p class="it-text-only">خبر نصي، كما نشره الدسك.</p>';
    }
    if (it.rows && it.rows.length) {
      const lv = s => /سالك/.test(s) ? 3 : /مغلق/.test(s) ? 1 : 2;
      $('.js-it-media').insertAdjacentHTML('beforeend', '<ul class="it-rows">' + it.rows.map(r => { const st = (r.match(/(سالك|مغلق|حاجز|أزمة)$/) || [])[1] || ''; const name = st ? r.slice(0, -st.length).trim() : r; return `<li data-status="${st}"><span class="sig${st === 'مغلق' ? ' closed' : ''}" data-l="${lv(st)}" aria-hidden="true"><i></i><i></i><i></i></span><span class="n">${esc(name)}</span><b>${esc(st)}</b></li>`; }).join('') + '</ul>');
    }
    $('.js-it-tg').href = it.tg;
    const story = $('.js-it-story');
    if (it.story === 'live') { story.innerHTML = `هذا الخبر جزء من <a href="live.html#t${it.id}">التغطية المباشرة لاقتحام وسط رام الله</a>.`; story.hidden = false; }
    else if (it.story === 'article') { story.innerHTML = `اقرأ القصة كاملة: <a href="article.html">اقتحام مؤسسة الضمير</a>.`; story.hidden = false; }
    // older / newer transmission
    const k = chron.indexOf(it);
    const pnRow = (x, rel) => `<li class="log-item" data-l="${x.level}"><time class="log-t" datetime="${x.dt}">${whenS(x)}</time>${sig(x.level)}<a class="log-body" href="${x.url}"><span class="log-h"><span class="sr">${rel}: </span>${pfx(x)}${esc(x.title)}</span>${x.place ? `<span class="log-place">${esc(x.place)}</span>` : ''}</a></li>`;
    $('.js-it-pn').innerHTML = [chron[k + 1] && pnRow(chron[k + 1], 'الخبر الأحدث'), chron[k - 1] && pnRow(chron[k - 1], 'الخبر الأقدم')].filter(Boolean).join('');
    // the same place, this item marked
    const same = it.place ? D.items.filter(x => x.place === it.place) : [];
    $('.js-it-place-h').textContent = it.place ? `من ${it.place}` : 'من المكان نفسه';
    if (same.length <= 1) $('.js-it-line').closest('section').hidden = true;
    $('.js-it-line').innerHTML = same.length > 1 ? same.slice(0, 9).map(x =>
      `<li class="${x === it ? 'here' : ''}" data-l="${x.level}"><time datetime="${x.dt}">${whenS(x)}</time>${sig(x.level)}`
      + (x === it ? `<span aria-current="true">${esc(x.title)}<small>أنت هنا</small></span>` : `<a href="${x.url}">${esc(x.title)}</a>`) + '</li>').join('')
      : '<li class="none">لا أخبار أخرى من هذا المكان في اليومين الأخيرين.</li>';
    // the same hour, elsewhere
    const t0 = new Date(it.dt + ':00+03:00').getTime();
    const hour = D.items.filter(x => x !== it && x.place !== it.place && Math.abs(new Date(x.dt + ':00+03:00').getTime() - t0) <= 36e5).slice(0, 5);
    $('.js-it-hour').innerHTML = hour.length ? hour.map(x =>
      `<li class="log-item" data-l="${x.level}"><time class="log-t" datetime="${x.dt}">${whenS(x)}</time>${sig(x.level)}<a class="log-body" href="${x.url}"><span class="log-h">${pfx(x)}${esc(x.title)}</span>${x.place ? `<span class="log-place">${esc(x.place)}</span>` : ''}</a></li>`).join('')
      : '<li class="none">لا أخبار أخرى في الساعة نفسها.</li>';
    // share targets for this item
    const here = location.href.split('#')[0];
    $$('.js-share').forEach(a => {
      const u = encodeURIComponent(here), t = encodeURIComponent(it.title);
      a.href = a.dataset.net === 'wa' ? `https://wa.me/?text=${t}%20${u}` : a.dataset.net === 'tg' ? `https://t.me/share/url?url=${u}&text=${t}` : `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    });
  }

  /* ---------- shared helpers for the media and archive pages ---------- */
  const H = (() => {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const PFXC = { 'عاجل': 'urgent', 'مصادر محلية': 'src', 'مصادر صحفية': 'src', 'وزارة الصحة': 'src', 'حالة الطقس': 'src' };
    const sig = l => `<span class="sig" data-l="${l}" aria-hidden="true"><i></i><i></i><i></i></span>`;
    const pfx = i => i.label ? `<span class="pfx ${PFXC[i.label] || ''}">${esc(i.label)}<span class="sr">:</span></span>` : '';
    const whenS = i => (i.day === 14 ? '' : i.day === 13 ? 'أمس ' : 'الإثنين ') + i.time;
    const DAYN = { 12: 'الإثنين 12', 13: 'الثلاثاء 13', 14: 'الأربعاء 14' };
    const row = (i, mark) => {
      const m = i.photo || i.thumb;
      return `<li class="log-item" data-l="${i.level}"><time class="log-t" datetime="${i.dt}">${i.time}</time>${sig(i.level)}`
        + `<a class="log-body" href="${i.url}"><span class="log-h">${pfx(i)}${mark ? mark(i.title) : esc(i.title)}</span>${i.place ? `<span class="log-place">${esc(i.place)}</span>` : ''}</a>`
        + (m ? `<span class="log-ph"><img src="${m}" alt="" loading="lazy" width="96" height="96">${i.video ? '<span class="play-s"></span>' : ''}</span>` : '') + '</li>';
    };
    const norm = s => String(s).replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
    return { esc, sig, pfx, whenS, DAYN, row, norm };
  })();
  const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- album: one transmission, many frames ---------- */
  const albumEl = $('.js-album');
  if (albumEl && D && D.albums) {
    const ids = Object.keys(D.albums).map(Number).filter(k => D.albums[k].length > 1);
    const q = new URLSearchParams(location.search), want = +(q.get('id') || 0);
    const id = ids.includes(want) ? want : ids[0];
    const it = D.items.find(i => i.id === id), pics = D.albums[id];
    document.title = `${it.title} – ألبوم – شبكة الإرسال`;
    $('.js-al-crumbs').innerHTML = `<a href="home.html">الرئيسية</a><a href="${it.url}">${H.esc(it.place || 'الخبر')}</a><span aria-current="page">ألبوم ${pics.length} صور</span>`;
    $('.js-al-time').textContent = it.time; $('.js-al-time').setAttribute('datetime', it.dt);
    $('.js-al-sig').innerHTML = H.sig(it.level);
    $('.js-al-count').textContent = `${pics.length} صور`;
    $('.js-al-h').textContent = it.title;
    $('.js-al-meta').innerHTML = `${H.pfx(it)}<time datetime="${it.dt}">${H.DAYN[it.day]} تشرين الأول 2026</time>${it.place ? `<span class="place">${H.esc(it.place)}</span>` : ''}`;
    $('.js-al-item').href = it.url; $('.js-al-tg').href = it.tg;
    const reel = $('.js-al-strip'), n = $('.js-al-n');
    // every frame carries the logo cut, measured from its own height so portrait and landscape share one angle
    reel.innerHTML = pics.map(([src, w, h], j) => `<li class="al-ph" style="--ar:${w} / ${h};--cx:${(18.36 * h / w).toFixed(2)}%"><img src="${src}" alt="${H.esc(it.title)}، الصورة ${j + 1} من ${pics.length}" width="${w}" height="${h}"${j > 1 ? ' loading="lazy"' : ''} draggable="false"></li>`).join('');
    const frames = $$('.al-ph', reel);
    let k = 0;
    // which frame sits at the start edge (the right, in RTL); at the far end the last frame counts
    const edge = () => reel.getBoundingClientRect().right - (parseFloat(getComputedStyle(reel).paddingInlineStart) || 0);
    const current = () => {
      const E = edge(), room = reel.scrollWidth - reel.clientWidth;
      if (room > 2 && Math.abs(reel.scrollLeft) >= room - 2) return frames.length - 1;
      let best = 0, d = Infinity;
      frames.forEach((f, j) => { const dd = Math.abs(f.getBoundingClientRect().right - E); if (dd < d) { d = dd; best = j; } });
      return best;
    };
    const mark = j => {
      k = j == null ? current() : j;
      n.innerHTML = `<b>${k + 1}</b><span> / ${pics.length}</span>`;
      frames.forEach((f, j) => f.classList.toggle('on', j === k));
      $('.js-al-prev').disabled = k === 0; $('.js-al-next').disabled = k === frames.length - 1;
      const u = new URL(location.href); u.searchParams.set('id', id); u.searchParams.set('n', k + 1); history.replaceState(null, '', u);
    };
    const go = (j, instant) => {
      j = Math.max(0, Math.min(frames.length - 1, j));
      const dx = frames[j].getBoundingClientRect().right - edge();
      reel.scrollBy({ left: dx, behavior: instant || reduce ? 'instant' : 'smooth' }); // 'auto' would inherit the track's CSS smooth scrolling
      mark(j); // the counter answers the click at once; scrolling settles it afterwards
    };
    reel.addEventListener('scroll', debounce(() => mark(), 80), { passive: true });
    $('.js-al-prev').addEventListener('click', () => go(k - 1));
    $('.js-al-next').addEventListener('click', () => go(k + 1));
    // RTL: the next photo sits to the left, so ArrowLeft moves forward
    addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(k + 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(k - 1); }
    });
    const start = Math.max(0, Math.min(pics.length - 1, +(q.get('n') || 1) - 1));
    go(start, true); mark();
    addEventListener('resize', debounce(() => go(k, true)));
    $('.js-al-more').innerHTML = ids.filter(x => x !== id).map(x => {
      const a = D.items.find(i => i.id === x), p = D.albums[x];
      return `<li><a href="album.html?id=${x}"><span class="ph"><img src="${p[0][0]}" alt="" loading="lazy"><span class="plate ghost al-c">${p.length} صور</span></span><span class="meta">${H.sig(a.level)}<time datetime="${a.dt}">${H.whenS(a)}</time></span><span class="reel-h">${H.esc(a.title)}</span></a></li>`;
    }).join('');
  }

  /* ---------- video: the clip plays inside the receiver ---------- */
  const videoEl = $('.js-video');
  if (videoEl && D && D.clips) {
    const ids = Object.keys(D.clips).map(Number);
    const want = +(new URLSearchParams(location.search).get('id') || 0);
    const id = ids.includes(want) ? want : ids[0];
    const it = D.items.find(i => i.id === id), c = D.clips[id];
    const v = $('.js-vp-video'), frame = $('.js-vp-frame'), big = $('.js-vp-big'), play = $('.js-vp-play'), mute = $('.js-vp-mute'), full = $('.js-vp-full');
    const scale = $('.js-vp-scale'), fill = $('.vp-fill', scale), ticks = $('.vp-ticks', scale), cur = $('.js-vp-cur'), dur = $('.js-vp-dur');
    document.title = `${it.title} – شاهد – شبكة الإرسال`;
    frame.classList.toggle('portrait', c.h > c.w);
    frame.style.setProperty('--ar', `${c.w} / ${c.h}`);
    frame.style.setProperty('--arn', (c.w / c.h).toFixed(4));
    v.src = c.src; v.poster = c.poster;
    v.setAttribute('aria-label', it.title);
    $('.js-vp-crumbs').innerHTML = `<a href="home.html">الرئيسية</a><a href="watch.html">شاهد</a><span aria-current="page">${H.esc(it.place || 'مقطع')}</span>`;
    $('.js-vp-time').textContent = it.time; $('.js-vp-time').setAttribute('datetime', it.dt);
    $('.js-vp-sig').innerHTML = H.sig(it.level);
    $('.js-vp-meta').innerHTML = `${H.pfx(it)}<time datetime="${it.dt}">${H.DAYN[it.day]} تشرين الأول 2026</time>${it.place ? `<span class="place">${H.esc(it.place)}</span>` : ''}`;
    $('.js-vp-h').innerHTML = (it.hook ? `<span class="hook">${H.esc(it.hook)}</span>` : '') + H.esc(it.title);
    $('.js-vp-item').href = it.url; $('.js-vp-tg').href = it.tg;
    dur.textContent = fmtT(c.dur);
    // the scrub scale: one hairline per second, a tall tick every five; time runs right → left
    function drawTicks() {
      const w = scale.clientWidth, h = scale.clientHeight, dpr = window.devicePixelRatio || 1, D2 = c.dur || 1;
      const snap = x => Math.round(x * dpr) / dpr + 0.5 / dpr;
      let s = `<line class="base" x1="0" x2="${w}" y1="${h - .5}" y2="${h - .5}"/>`;
      const step = D2 > 50 ? 2 : 1;
      for (let t = 0; t <= D2; t += step) { const x = snap(w - t / D2 * w), tall = t % 10 === 0 ? 12 : t % 5 === 0 ? 8 : 4; s += `<line class="${t % 10 === 0 ? 'v' : ''}" x1="${x}" x2="${x}" y1="${h - tall}" y2="${h}"/>`; }
      ticks.setAttribute('viewBox', `0 0 ${w} ${h}`); ticks.innerHTML = s;
    }
    const sync = () => {
      const d = v.duration || c.dur, p = d ? v.currentTime / d : 0;
      fill.style.setProperty('--p', (p * 100).toFixed(2) + '%');
      cur.textContent = fmtT(v.currentTime);
      scale.setAttribute('aria-valuenow', String(Math.round(p * 100)));
      scale.setAttribute('aria-valuetext', `${fmtT(v.currentTime)} من ${fmtT(d)}`);
    };
    const setPlaying = on => {
      play.setAttribute('aria-pressed', String(on)); play.setAttribute('aria-label', on ? 'إيقاف مؤقت' : 'تشغيل');
      frame.classList.toggle('playing', on);
    };
    const play_ = () => { const p = v.play(); if (p) p.catch(() => setPlaying(false)); };
    const toggle = () => { if (v.paused) play_(); else v.pause(); };
    v.addEventListener('play', () => setPlaying(true));
    v.addEventListener('pause', () => setPlaying(false));
    v.addEventListener('ended', () => setPlaying(false));
    v.addEventListener('timeupdate', sync);
    v.addEventListener('loadedmetadata', () => { dur.textContent = fmtT(v.duration); sync(); });
    big.addEventListener('click', play_);
    play.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    mute.addEventListener('click', () => { v.muted = !v.muted; mute.setAttribute('aria-pressed', String(v.muted)); mute.setAttribute('aria-label', v.muted ? 'تشغيل الصوت' : 'كتم الصوت'); });
    full.addEventListener('click', () => { const t = frame.closest('.vp-stage'); if (document.fullscreenElement) document.exitFullscreen(); else if (t.requestFullscreen) t.requestFullscreen(); });
    const seekTo = x => { const r = scale.getBoundingClientRect(), p = Math.max(0, Math.min(1, (r.right - x) / r.width)); v.currentTime = p * (v.duration || c.dur); sync(); };
    scale.addEventListener('pointerdown', e => { scale.setPointerCapture(e.pointerId); seekTo(e.clientX); });
    scale.addEventListener('pointermove', e => { if (scale.hasPointerCapture(e.pointerId)) seekTo(e.clientX); });
    const nudge = s => { v.currentTime = Math.max(0, Math.min((v.duration || c.dur), v.currentTime + s)); sync(); };
    scale.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(5); } if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-5); } });
    addEventListener('keydown', e => {
      const el = e.target.closest ? e.target : document.body;
      if (el.closest('input, textarea, select, [role="slider"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k2 = e.key.toLowerCase();
      if (k2 === ' ' && el.closest('button, a')) return; // a focused control keeps its own Space
      if (k2 === ' ' || k2 === 'k') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(5); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-5); }
      else if (k2 === 'm') mute.click();
      else if (k2 === 'f') full.click();
    });
    drawTicks(); sync();
    addEventListener('resize', debounce(drawTicks));
    $('.js-vp-more').innerHTML = ids.filter(x => x !== id).slice(0, 6).map(x => {
      const a = D.items.find(i => i.id === x), cc = D.clips[x];
      return `<li class="reel"><a href="video.html?id=${x}"><span class="ph"><img src="${cc.poster}" alt="" loading="lazy"><span class="play" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></svg></span><span class="dur">${fmtT(cc.dur)}</span></span>`
        + `<span class="meta">${H.sig(a.level)}<time datetime="${a.dt}">${H.whenS(a)}</time>${a.place ? `<span class="place">${H.esc(a.place)}</span>` : ''}</span><span class="reel-h">${H.esc(a.title)}</span></a></li>`;
    }).join('');
  }

  /* ---------- archive: the broadcast by the clock, or tuned to a tag ---------- */
  const archEl = $('.js-archive');
  if (archEl && D) {
    const q = new URLSearchParams(location.search);
    const tag = q.get('tag');
    const DAYS = [[14, 'الأربعاء 14'], [13, 'الثلاثاء 13'], [12, 'الإثنين 12']];
    const day = +(q.get('day') || 14);
    const TAGS = D.tags || {};
    const tagWords = tag ? (TAGS[tag] || [tag]).map(H.norm) : null;
    const hit = i => { const s = H.norm([i.hook, i.title, i.place].join(' ')); return tagWords.some(w => s.includes(w)); };
    const items = tag ? D.items.filter(hit) : D.items.filter(i => i.day === day);
    const plural = n => n === 1 ? 'خبر واحد' : n === 2 ? 'خبران' : n <= 10 ? `${n} أخبار` : `${n} خبرا`;
    $('.js-ar-days').innerHTML = DAYS.map(([d, name]) => {
      const n = D.items.filter(i => i.day === d).length, on = !tag && d === day;
      return `<a class="plate ghost${on ? ' on' : ''}" href="archive.html?day=${d}"${on ? ' aria-current="page"' : ''}>${name} <span class="num">${n}</span></a>`;
    }).join('');
    $('.js-ar-tags').innerHTML = '<span>وسوم:</span>' + Object.keys(TAGS).map(t => `<a href="archive.html?tag=${encodeURIComponent(t)}"${t === tag ? ' aria-current="page" class="on"' : ''}>${H.esc(t)}</a>`).join('');
    if (tag) {
      document.title = `${tag} – أرشيف البث – شبكة الإرسال`;
      $('.js-ar-crumbs').innerHTML = `<a href="home.html">الرئيسية</a><a href="archive.html">أرشيف البث</a><span aria-current="page">${H.esc(tag)}</span>`;
      $('.js-ar-h').textContent = tag;
      $('.js-ar-sum').innerHTML = items.length ? `${plural(items.length).replace(/^(\d+)/, '<b class="num">$1</b>')} ${items.length > 2 ? 'تحمل' : 'يحمل'} هذا الوسم منذ الإثنين 12 تشرين الأول.` : 'لا أخبار بهذا الوسم منذ الإثنين 12 تشرين الأول.';
    } else {
      const name = DAYS.find(d => d[0] === day);
      $('.js-ar-sum').innerHTML = `<b class="num">${items.length}</b> خبرا يوم ${name ? name[1] : ''} تشرين الأول 2026${day === 12 ? '، منذ عصر اليوم' : day === 14 ? '، حتى الظهر' : ''}.`;
    }
    // group: by hour for a day, by day for a tag
    const groups = new Map();
    items.forEach(i => { const key = tag ? i.day : +i.time.slice(0, 2); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
    const keys = [...groups.keys()].sort((a, b) => b - a);
    const markWord = s => {
      if (!tagWords) return H.esc(s);
      let out = H.esc(s);
      (TAGS[tag] || [tag]).forEach(w => { out = out.split(H.esc(w)).join(`<mark>${H.esc(w)}</mark>`); });
      return out;
    };
    $('.js-ar-log').innerHTML = keys.map(key => {
      const list = groups.get(key);
      const head = tag ? (DAYS.find(d => d[0] === key) || [0, ''])[1] + ' تشرين الأول' : `${String(key).padStart(2, '0')}:00`;
      return `<section class="ar-hour" id="h-${key}" aria-labelledby="hh-${key}"><div class="station"><h2 id="hh-${key}">${head}</h2><span class="scale" aria-hidden="true"></span><span class="note">${plural(list.length)}</span></div><ol class="log-list">${list.map(i => H.row(i, tag ? markWord : null)).join('')}</ol></section>`;
    }).join('') || '<p class="sq-empty-h ar-empty">لا إشارة هنا.</p>';
    // the side summary: how the signal arrived (levels) and where it came from (places)
    const side = $('.js-ar-side');
    if (side && items.length) {
      const LV = [[1, 'عاجل نصي'], [2, 'متابعة ومصادر'], [3, 'صورة وفيديو']];
      const pc = new Map(); items.forEach(i => { if (i.place) pc.set(i.place, (pc.get(i.place) || 0) + 1); });
      const top = [...pc].sort((a, b) => b[1] - a[1]).slice(0, 8), pmax = top.length ? top[0][1] : 1;
      let html = `<section><h2 class="ar-side-h">كيف وصلت الإشارة</h2><dl class="ar-levels">${LV.map(([l, name]) => `<div><dt>${H.sig(l)}${name}</dt><dd class="num">${items.filter(i => i.level === l).length}</dd></div>`).join('')}</dl></section>`;
      if (top.length) html += `<section><h2 class="ar-side-h">أكثر الأماكن بثا</h2><ol class="ar-places${pmax === 1 ? ' flat' : ''}">${top.map(([p, c2]) => `<li><a href="search.html?q=${encodeURIComponent(p)}"><span class="n">${H.esc(p)}</span><i style="--v:${(c2 / pmax * 100).toFixed(1)}%"></i><b class="num">${c2}</b></a></li>`).join('')}</ol></section>`;
      if (tag) {
        const near = Object.keys(TAGS).filter(t => t !== tag).map(t => { const ws = TAGS[t].map(H.norm); return [t, items.filter(i => { const s = H.norm([i.hook, i.title, i.place].join(' ')); return ws.some(w => s.includes(w)); }).length]; }).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (near.length) html += `<section><h2 class="ar-side-h">وسوم قريبة</h2><p class="ar-near">${near.map(([t, c2]) => `<a href="archive.html?tag=${encodeURIComponent(t)}">${H.esc(t)} <span class="num">${c2}</span></a>`).join('')}</p></section>`;
      }
      side.innerHTML = html;
    }
    // the 24-hour dial (day view only): bars per hour, a click tunes to that hour
    const dial = $('.js-ar-dial');
    if (tag) { dial.hidden = true; }
    else {
      const counts = Array.from({ length: 24 }, (_, h) => (groups.get(h) || []).length), max = Math.max(1, ...counts);
      dial.innerHTML = '<ol class="ar-hours">' + counts.map((n, h) => `<li><a href="#h-${h}" class="${n ? '' : 'empty'}" aria-label="الساعة ${String(h).padStart(2, '0')}:00، ${n ? plural(n) : 'لا أخبار'}"${n ? '' : ' tabindex="-1" aria-disabled="true"'}><i style="--v:${(n / max * 100).toFixed(1)}%"></i><span>${h % 3 === 0 ? String(h).padStart(2, '0') : ''}</span></a></li>`).join('') + '</ol>';
    }
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
      if (bar) {
        const w = fits ? 100 : track.clientWidth / track.scrollWidth * 100, W = bar.parentElement.clientWidth;
        const xPx = fits ? 0 : (W - W * w / 100) * x / room;
        bar.style.setProperty('--w', w.toFixed(2) + '%');
        bar.style.setProperty('--tx', (rtl ? -xPx : xPx).toFixed(1) + 'px');
      }
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
