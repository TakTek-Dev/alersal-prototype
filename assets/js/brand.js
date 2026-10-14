/* الإرسال — brand book demos */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restart = el => { el.classList.remove('acquire'); void el.getBoundingClientRect(); el.classList.add('acquire'); };

  // replay the signal acquisition (and the cover's construction lines)
  $$('.js-replay').forEach(b => b.addEventListener('click', () => {
    $$(b.dataset.target).forEach(restart);
    const g = $('.specimen .guides');
    if (g && b.closest('.cover')) { const c = g.cloneNode(true); g.replaceWith(c); }
  }));

  // tune: the needle visits each station and settles back
  const stage = $('.js-tune');
  if (stage) {
    const needle = $('i', stage), labels = $$('.labels span', stage);
    const x = s => { const r = s.getBoundingClientRect(), sr = stage.getBoundingClientRect(); return r.left + r.width / 2 - sr.left - 1.5; };
    const go = s => { labels.forEach(l => l.classList.toggle('on', l === s)); needle.style.setProperty('--x', x(s) + 'px'); };
    const settle = () => go(labels[0]);
    settle(); addEventListener('resize', settle);
    let timers = [];
    $('.js-tune-btn').addEventListener('click', () => {
      timers.forEach(clearTimeout);
      const seq = [labels[2], labels[1], labels[3], labels[0]];
      timers = seq.map((s, i) => setTimeout(() => go(s), reduce ? 0 : i * 700));
    });
  }
  // the idea card's mini tuner sits on its first label
  $$('.idea .tune-stage').forEach(st => {
    const i = $('i', st), first = $('.labels span', st);
    const place = () => { const r = first.getBoundingClientRect(), sr = st.getBoundingClientRect(); i.style.setProperty('--x', (r.left + r.width / 2 - sr.left - 1.5) + 'px'); };
    place(); addEventListener('resize', place);
  });

  // arrival of a new item
  const arr = $('.js-arrive');
  const arrBtn = $('.js-arrive-btn');
  if (arr && arrBtn) arrBtn.addEventListener('click', () => {
    arr.classList.remove('in', 'fresh'); void arr.offsetWidth; arr.classList.add('in', 'fresh');
    setTimeout(() => arr.classList.remove('fresh'), 1800);
  });

  // chapter list follows the reader
  const toc = $$('.bk-toc a');
  if ('IntersectionObserver' in window && toc.length) {
    const map = new Map(toc.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { toc.forEach(a => a.classList.remove('on')); const a = map.get(e.target.id); if (a) a.classList.add('on'); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
})();
