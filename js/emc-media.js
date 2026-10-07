(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const conn = navigator.connection;
  const items = [...document.querySelectorAll('video[data-src]')].map(v => ({
    v, near: false, ratio: 0, url: null, pending: false, blocked: false, serial: 0
  }));
  const lite = () => reduce.matches || !!conn?.saveData ||
    ['slow-2g', '2g'].includes(conn?.effectiveType);
  let selected = new Set();
  function sync() {
    selected = new Set((lite() || document.hidden ? [] : items)
      .filter(x => x.ratio > 0).sort((a, b) => b.ratio - a.ratio).slice(0, 2));
    for (const x of items) {
      const v = x.v;
      if (lite()) {
        v.pause();
        if (v.hasAttribute('src')) {
          x.serial++; v.removeAttribute('src'); v.load(); x.blocked = false;
        }
        continue;
      }
      if (!document.hidden && x.near && !v.hasAttribute('src')) {
        x.url ||= mobile.matches && v.dataset.srcMobile ? v.dataset.srcMobile : v.dataset.src;
        v.src = x.url; v.load();
      }
      if (!selected.has(x)) { v.pause(); continue; }
      if (x.pending || x.blocked || !v.paused || !v.hasAttribute('src')) continue;
      x.pending = true;
      const serial = x.serial;
      Promise.resolve().then(() => v.play()).catch(() => {
        if (serial === x.serial) x.blocked = true;
      }).finally(() => {
        x.pending = false;
        if (serial !== x.serial || !selected.has(x) || lite() || document.hidden) v.pause();
        if (serial !== x.serial && selected.has(x) && !lite() && !document.hidden) sync();
      });
    }
  }
  if (!('IntersectionObserver' in window)) return; // Posters remain.
  const near = new IntersectionObserver(entries => {
    for (const e of entries) {
      const x = items.find(x => x.v === e.target); x.near = e.isIntersecting;
    }
    sync();
  }, { rootMargin: '200px 0px' });
  const visible = new IntersectionObserver(entries => {
    for (const e of entries) {
      const x = items.find(x => x.v === e.target);
      if (e.isIntersecting && x.ratio === 0) x.blocked = false;
      x.ratio = e.isIntersecting ? e.intersectionRatio : 0;
    }
    sync();
  }, { threshold: [0, .01, .25, .5, .75, 1] });
  for (const x of items) {
    // WebKit drops the poster once src is removed, so keep it as a background too.
    if (x.v.poster) x.v.style.background = `url("${x.v.poster}") center / cover no-repeat`;
    x.v.muted = true; near.observe(x.v); visible.observe(x.v);
    x.v.addEventListener('error', () => { x.blocked = true; x.v.pause(); });
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) items.forEach(x => { x.blocked = false; });
    sync();
  });
  reduce.addEventListener('change', sync);
  conn?.addEventListener?.('change', sync);
  sync();
})();
