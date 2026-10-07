(() => {
  'use strict';
  const root = document.documentElement;
  const bar = document.createElement('div');
  bar.className = 'emc-scroll-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  let queued = 0;
  function update() {
    queued = 0;
    const total = root.scrollHeight - innerHeight;
    const value = total > 0 ? Math.max(0, Math.min(1, scrollY / total)) : 0;
    bar.style.transform = `scaleX(${value})`;
  }
  const schedule = () => { if (!queued) queued = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive:true });
  addEventListener('resize', schedule, { passive:true });
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  document.addEventListener('emc:data', schedule); update();
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-emc-copy]');
    if (!button || button.disabled) return;
    const status = document.getElementById('emcCopyStatus');
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(button.dataset.emcCopy);
      if (status) status.textContent = I18N[currentLang].p_copied;
    } catch {
      if (status) status.textContent = I18N[currentLang].p_copy_failed;
    } finally { button.disabled = false; }
  });
  document.querySelector('.emc-skip')?.addEventListener('click', event => {
    const target = document.getElementById('top');
    if (!target) return;
    event.preventDefault(); target.tabIndex = -1;
    target.focus({ preventScroll:true });
    target.scrollIntoView({ block:'start', behavior:'auto' });
  });
})();
