/* الإرسال — documentary site. Plain JS, no dependencies. */
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const norm = s => String(s || '').replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const results = n => n === 1 ? 'نتيجة واحدة' : n === 2 ? 'نتيجتان' : n <= 10 ? `${n} نتائج` : `${n} نتيجة`;
  const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

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
      const target = $('.hd-logo .ersal-mark');
      const m = mark.getBoundingClientRect(), t = target && target.getBoundingClientRect();
      const inView = t && t.width > 0 && t.bottom > 0 && t.top < innerHeight;
      if (!inView || !mark.animate) {
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
  // the header mark's teeth rise once per visit when the loader did not play
  const hdMark = $('.hd-logo .ersal-mark');
  if (hdMark && !reduce && !loading) {
    let seen = null; try { seen = sessionStorage.getItem('ersal:acq'); } catch (e) {}
    if (!seen) { hdMark.classList.add('acquire'); try { sessionStorage.setItem('ersal:acq', '1'); } catch (e) {} }
  }

  /* ---------- photos fade in as they load ---------- */
  if (!reduce) $$('.ph img').forEach(img => {
    if (img.complete) return;
    img.classList.add('img-wait');
    const done = () => img.classList.remove('img-wait');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });

  /* ---------- mobile menu ---------- */
  const menuBtn = $('.js-menu'), hd = $('.hd');
  if (menuBtn && hd) {
    const setOpen = on => {
      hd.classList.toggle('menu-open', on);
      menuBtn.setAttribute('aria-expanded', String(on));
      menuBtn.setAttribute('aria-label', on ? 'إغلاق القائمة' : 'القائمة');
      document.body.style.overflow = on ? 'hidden' : '';
      if (on) { const a = $('.hd-nav a', hd); if (a) a.focus(); }
    };
    menuBtn.addEventListener('click', () => setOpen(!hd.classList.contains('menu-open')));
    addEventListener('keydown', e => { if (e.key === 'Escape' && hd.classList.contains('menu-open')) { setOpen(false); menuBtn.focus(); } });
    matchMedia('(min-width: 1024px)').addEventListener('change', ev => { if (ev.matches) setOpen(false); });
  }

  /* ---------- contact sheet: the editor's red pick follows the eye ---------- */
  $$('.js-sheet').forEach(sheet => {
    const grid = $('.sheet-grid', sheet), pick = $('.sheet-pick', sheet), cap = $('.js-sheet-cap', sheet);
    const frames = $$('.fr', grid);
    if (!frames.length || !pick) return;
    const home = frames.find(f => f.classList.contains('is-pick')) || null;
    pick.innerHTML = '<svg aria-hidden="true"><polygon points=""/></svg>';
    const poly = $('polygon', pick), svg = $('svg', pick);
    let current = null;
    function place(fr, instant) {
      const visible = fr && fr.offsetParent !== null;
      if (!visible) { pick.classList.remove('on'); current = null; return; }
      const ph = $('.ph', fr), g = sheet.getBoundingClientRect(), r = ph.getBoundingClientRect();
      const w = r.width + 10, h = r.height + 10, cx = h * 0.1836;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      // RTL page, LTR geometry: the slanted edge is the frame's left side, like the logo's strokes
      poly.setAttribute('points', `${cx},1.5 ${w - 1.5},1.5 ${w - 1.5},${h - 1.5} 1.5,${h - 1.5}`);
      if (instant || reduce) pick.style.transition = 'none';
      pick.style.setProperty('--pw', r.width + 'px');
      pick.style.setProperty('--phh', r.height + 'px');
      pick.style.setProperty('--px', (r.left - g.left) + 'px');
      pick.style.setProperty('--py', (r.top - g.top) + 'px');
      pick.classList.add('on');
      if (instant || reduce) { void pick.offsetWidth; pick.style.transition = ''; }
      if (cap && fr.dataset.cap) cap.textContent = fr.dataset.cap;
      current = fr;
    }
    const start = home || (sheet.classList.contains('sheet-lead') ? frames[0] : null);
    if (start) place(start, true); else if (cap) cap.hidden = true;
    frames.forEach(fr => {
      const a = $('a', fr);
      fr.addEventListener('pointerenter', () => { if (cap) cap.hidden = false; place(fr); });
      a.addEventListener('focus', () => { if (cap) cap.hidden = false; place(fr); });
    });
    grid.addEventListener('pointerleave', () => { if (start) place(start); else { pick.classList.remove('on'); if (cap) cap.hidden = true; } });
    addEventListener('resize', debounce(() => { if (current) place(current, true); }));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (current) place(current, true); });
  });

  /* ---------- lists: search, category tabs, sort and pages (works without JS: all items show) ---------- */
  $$('.js-list').forEach(list => {
    const size = +(list.dataset.size || 0);
    const items = $$('.js-items > *', list);
    const groups = $$('.js-items', list);
    const q = $('.js-q', list), sort = $('.js-sort', list), tabsEl = $('.js-tabs', list);
    const tabs = tabsEl ? $$('.tab', tabsEl) : [];
    const key = tabsEl && tabsEl.dataset.key === 'type' ? 'type' : 'cat';
    const pager = $('.js-pager', list), count = $('.js-count', list), empty = $('.js-empty', list);
    const featWrap = $('.js-feat-wrap', list), featId = list.dataset.feat;
    const params = new URLSearchParams(location.search);
    const state = { v: params.get('c') || 'all', q: params.get('q') || '', s: params.get('s') || 'new', p: +(params.get('p') || 1) };
    if (!tabs.some(t => t.dataset.v === state.v)) state.v = 'all';
    if (q) q.value = state.q;
    if (sort) sort.value = ['new', 'old', 'views'].includes(state.s) ? state.s : 'new';
    const match = el => {
      if (state.v !== 'all') {
        if (key === 'type') {
          if (state.v === 'urgent' ? el.dataset.urgent !== '1' : el.dataset.type !== state.v) return false;
        } else if (el.dataset.cat !== state.v) return false;
      }
      if (state.q) { const words = norm(state.q).split(/\s+/).filter(Boolean); const hay = norm(el.dataset.q); if (!words.every(w => hay.includes(w))) return false; }
      return true;
    };
    function render(scroll) {
      const plain = state.v === 'all' && !state.q;
      if (featWrap) featWrap.hidden = !plain;
      let shown = items.filter(el => match(el) && !(plain && featId && el.dataset.id === featId));
      if (sort) {
        const s = sort.value;
        shown.sort((a, b) => s === 'old' ? a.dataset.t - b.dataset.t : s === 'views' ? b.dataset.v - a.dataset.v : b.dataset.t - a.dataset.t);
        const parent = groups[0];
        shown.forEach(el => parent.appendChild(el));
      }
      const pages = size ? Math.max(1, Math.ceil(shown.length / size)) : 1;
      state.p = Math.min(Math.max(1, state.p), pages);
      const page = size ? shown.slice((state.p - 1) * size, state.p * size) : shown;
      const on = new Set(page);
      items.forEach(el => { el.hidden = !on.has(el); });
      // day groups in the news list hide when empty
      groups.forEach(g => { const sec = g.closest('.w-day'); if (sec) sec.hidden = !$$(':scope > :not([hidden])', g).length; });
      if (empty) empty.hidden = shown.length > 0;
      const filtered = state.q || state.v !== 'all';
      if (count) count.textContent = !shown.length ? '' : [filtered ? results(shown.length) : '', size && pages > 1 ? `الصفحة ${state.p} من ${pages}` : ''].filter(Boolean).join('، ');
      if (pager) {
        if (pages <= 1) pager.innerHTML = '';
        else {
          const link = (p, label, extra = '') => `<a href="?${qs(p)}" data-p="${p}" ${extra}>${label}</a>`;
          let h = state.p > 1 ? link(state.p - 1, '<svg class="ic"><use href="#i-back"/></svg><span class="sr">الصفحة السابقة</span>', 'rel="prev"') : '<span class="off" aria-hidden="true"><svg class="ic"><use href="#i-back"/></svg></span>';
          for (let p = 1; p <= pages; p++) h += p === state.p ? `<span aria-current="page">${p}</span>` : link(p, p);
          h += state.p < pages ? link(state.p + 1, '<svg class="ic"><use href="#i-fwd"/></svg><span class="sr">الصفحة التالية</span>', 'rel="next"') : '<span class="off" aria-hidden="true"><svg class="ic"><use href="#i-fwd"/></svg></span>';
          pager.innerHTML = h;
        }
      }
      tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.v === state.v)));
      history.replaceState(null, '', location.pathname + (qs(state.p) ? '?' + qs(state.p) : '') + location.hash);
      if (scroll) { const top = (list.querySelector('.sec') || list).getBoundingClientRect().top + scrollY - 90; if (top < scrollY) scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' }); }
    }
    function qs(p) {
      const o = new URLSearchParams();
      if (state.v !== 'all') o.set('c', state.v);
      if (state.q) o.set('q', state.q);
      if (sort && sort.value !== 'new') o.set('s', sort.value);
      if (p > 1) o.set('p', p);
      return o.toString();
    }
    tabs.forEach(t => t.addEventListener('click', () => { state.v = t.dataset.v; state.p = 1; render(); }));
    if (q) q.addEventListener('input', debounce(() => { state.q = q.value.trim(); state.p = 1; render(); }, 160));
    if (sort) sort.addEventListener('change', () => { state.p = 1; render(); });
    if (pager) pager.addEventListener('click', ev => { const a = ev.target.closest('a[data-p]'); if (!a) return; ev.preventDefault(); state.p = +a.dataset.p; render(true); });
    render();
  });

  /* ---------- copy link ---------- */
  $$('.js-copy').forEach(b => b.addEventListener('click', async () => {
    const l = $('.js-copy-l', b);
    try { await navigator.clipboard.writeText(b.dataset.url); l.textContent = 'تم نسخ الرابط'; b.classList.add('is-done'); }
    catch (e) { l.textContent = 'انسخه من شريط العنوان'; }
    setTimeout(() => { l.textContent = 'نسخ الرابط'; b.classList.remove('is-done'); }, 2200);
  }));

  /* ---------- video: the clip plays inside the receiver ---------- */
  $$('.js-vp').forEach(vp => {
    const v = $('.js-vp-video', vp), big = $('.js-vp-big', vp), play = $('.js-vp-play', vp), mute = $('.js-vp-mute', vp), full = $('.js-vp-full', vp);
    const scale = $('.js-vp-scale', vp), fill = $('.vp-fill', scale), ticks = $('.vp-ticks', scale), cur = $('.js-vp-cur', vp), durEl = $('.js-vp-dur', vp);
    const D0 = +vp.dataset.dur || 0;
    const dur = () => v.duration || D0;
    // the scrub scale: a hairline per second, taller at 5s and 10s; time runs right to left
    function drawTicks() {
      const w = scale.clientWidth, h = scale.clientHeight, dpr = window.devicePixelRatio || 1, T = dur() || 1;
      const snap = x => Math.round(x * dpr) / dpr + 0.5 / dpr;
      let s = `<line class="base" x1="0" x2="${w}" y1="${h - .5}" y2="${h - .5}"/>`;
      const step = T > 50 ? 2 : 1;
      for (let t = 0; t <= T; t += step) { const x = snap(w - t / T * w), tall = t % 10 === 0 ? 12 : t % 5 === 0 ? 8 : 4; s += `<line class="${t % 10 === 0 ? 'v' : ''}" x1="${x}" x2="${x}" y1="${h - tall}" y2="${h}"/>`; }
      ticks.setAttribute('viewBox', `0 0 ${w} ${h}`); ticks.innerHTML = s;
    }
    const sync = () => {
      const d = dur(), p = d ? v.currentTime / d : 0;
      fill.style.setProperty('--p', (p * 100).toFixed(2) + '%');
      cur.textContent = fmtT(v.currentTime);
      scale.setAttribute('aria-valuenow', String(Math.round(p * 100)));
      scale.setAttribute('aria-valuetext', `${fmtT(v.currentTime)} من ${fmtT(d)}`);
    };
    const setPlaying = on => { play.setAttribute('aria-pressed', String(on)); play.setAttribute('aria-label', on ? 'إيقاف مؤقت' : 'تشغيل'); vp.classList.toggle('playing', on); };
    const start = () => { const p = v.play(); if (p) p.catch(() => setPlaying(false)); };
    const toggle = () => { if (v.paused) start(); else v.pause(); };
    v.addEventListener('play', () => setPlaying(true));
    v.addEventListener('pause', () => setPlaying(false));
    v.addEventListener('ended', () => setPlaying(false));
    v.addEventListener('timeupdate', sync);
    v.addEventListener('loadedmetadata', () => { durEl.textContent = fmtT(v.duration); drawTicks(); sync(); });
    big.addEventListener('click', start);
    play.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    mute.addEventListener('click', () => { v.muted = !v.muted; mute.setAttribute('aria-pressed', String(v.muted)); mute.setAttribute('aria-label', v.muted ? 'تشغيل الصوت' : 'كتم الصوت'); });
    full.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (vp.requestFullscreen) vp.requestFullscreen(); });
    const seekTo = x => { const r = scale.getBoundingClientRect(), p = Math.max(0, Math.min(1, (r.right - x) / r.width)); v.currentTime = p * dur(); sync(); };
    scale.addEventListener('pointerdown', e => { scale.setPointerCapture(e.pointerId); seekTo(e.clientX); });
    scale.addEventListener('pointermove', e => { if (scale.hasPointerCapture(e.pointerId)) seekTo(e.clientX); });
    const nudge = s => { v.currentTime = Math.max(0, Math.min(dur(), v.currentTime + s)); sync(); };
    scale.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(5); } if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-5); } });
    // page keys apply only when one player is on the page
    if ($$('.js-vp').length === 1) addEventListener('keydown', e => {
      const el = e.target.closest ? e.target : document.body;
      if (el.closest('input, textarea, select, [role="slider"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === ' ' && el.closest('button, a')) return; // a focused control keeps its own Space
      if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(5); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-5); }
      else if (k === 'm') mute.click();
      else if (k === 'f') full.click();
    });
    drawTicks(); sync();
    addEventListener('resize', debounce(drawTicks));
  });

  /* ---------- album: one transmission, many frames ---------- */
  $$('.js-album').forEach(stage => {
    const reel = $('.js-track', stage), n = $('.js-al-n', stage), prev = $('.js-al-prev', stage), next = $('.js-al-next', stage);
    const frames = $$('.al-ph', reel), total = frames.length;
    let k = 0;
    const edge = () => reel.getBoundingClientRect().right - (parseFloat(getComputedStyle(reel).paddingInlineStart) || 0);
    const current = () => {
      const E = edge(), room = reel.scrollWidth - reel.clientWidth;
      if (room > 2 && Math.abs(reel.scrollLeft) >= room - 2) return total - 1;
      let best = 0, d = Infinity;
      frames.forEach((f, j) => { const dd = Math.abs(f.getBoundingClientRect().right - E); if (dd < d) { d = dd; best = j; } });
      return best;
    };
    const mark = j => {
      k = j == null ? current() : j;
      n.innerHTML = `<b>${k + 1}</b><span> / ${total}</span>`;
      prev.disabled = k === 0; next.disabled = k === total - 1;
    };
    const go = (j, instant) => {
      j = Math.max(0, Math.min(total - 1, j));
      const dx = frames[j].getBoundingClientRect().right - edge();
      reel.scrollBy({ left: dx, behavior: instant || reduce ? 'instant' : 'smooth' }); // 'auto' would inherit the track's CSS smooth scrolling
      mark(j); // the counter answers the click at once; scrolling settles it afterwards
    };
    reel.addEventListener('scroll', debounce(() => mark(), 80), { passive: true });
    prev.addEventListener('click', () => go(k - 1));
    next.addEventListener('click', () => go(k + 1));
    // RTL: the next photo sits to the left, so ArrowLeft moves forward
    if (!$('.js-vp')) addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(k + 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(k - 1); }
    });
    mark(0);
    addEventListener('resize', debounce(() => go(k, true)));
  });

  /* ---------- sliders: arrows, drag, and a tuning-scale progress line ---------- */
  $$('.js-slider').forEach(sl => {
    const track = $('.js-track', sl), bar = $('.sl-progress i', sl);
    const prev = $('.js-prev', sl), next = $('.js-next', sl);
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

  /* ---------- search ---------- */
  const sbox = $('.js-search');
  if (sbox) {
    let index = [];
    try { index = JSON.parse($('#search-index').textContent); } catch (e) {}
    const input = $('.js-sq', sbox), out = $('.js-results', sbox), countEl = $('.js-scount', sbox);
    const q0 = new URLSearchParams(location.search).get('q') || '';
    input.value = q0;
    const mark = (t, words) => { let h = esc(t); words.forEach(w => { if (!w) return; const i = norm(t).indexOf(w); if (i >= 0 && norm(t).length === t.length) h = esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + w.length)) + '</mark>' + esc(t.slice(i + w.length)); }); return h; };
    function run() {
      const raw = input.value.trim(), words = norm(raw).split(/\s+/).filter(Boolean);
      if (!words.length) { out.innerHTML = ''; countEl.textContent = ''; return; }
      const hits = index.filter(r => { const h = norm(r.t); return words.every(w => h.includes(w)); });
      countEl.textContent = hits.length ? `${results(hits.length)} لـ«${raw}»` : `لا نتائج لـ«${raw}». جرّب كلمة أقصر أو اسم قرية.`;
      out.innerHTML = hits.slice(0, 60).map((r, n) => `<li><a href="${esc(r.h)}"${/^https?:/.test(r.h) ? ' rel="noopener"' : ''}>${r.i ? `<span class="ph r11"><img src="${esc(r.i)}" alt=""${n > 5 ? ' loading="lazy"' : ''}></span>` : '<span class="ph r11"></span>'}<span><span class="r-t">${words.length === 1 ? mark(r.t, words) : esc(r.t)}</span><span class="meta"><span>${esc(r.k)}</span>${r.d ? `<span>${esc(r.d)}</span>` : ''}</span></span></a></li>`).join('');
      const u = new URL(location.href); if (raw) u.searchParams.set('q', raw); else u.searchParams.delete('q'); history.replaceState(null, '', u);
    }
    input.addEventListener('input', debounce(run, 140));
    $('.search-form', sbox).addEventListener('submit', e => { e.preventDefault(); run(); });
    run();
  }
})();
