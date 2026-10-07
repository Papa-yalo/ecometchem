(() => {
  'use strict';
  const keys = ['offers', 'procurement', 'servicesActive', 'servicesNeeded'];
  const cacheKey = 'emc_content_v1';
  let active = null, epoch = 0;
  let state = { status: 'idle', data: null, fetchedAt: null, error: null };
  const listeners = new Set();
  function validate(data) {
    if (!data || data.schemaVersion !== 1 ||
        !Number.isFinite(Date.parse(data.generatedAt))) throw Error('schema');
    for (const key of keys) {
      if (!Array.isArray(data[key])) throw Error('schema');
      for (const e of data[key]) {
        if (!e || typeof e !== 'object' || Array.isArray(e) ||
            typeof e.title !== 'string' || typeof e._id !== 'string' ||
            (e.hidden != null && typeof e.hidden !== 'boolean') ||
            (e.pinned != null && typeof e.pinned !== 'boolean')) throw Error('schema');
        for (const field of ['description', 'photo', 'quantity', 'country', 'link', 'date'])
          if (e[field] != null && typeof e[field] !== 'string') throw Error('schema');
        if (e.date && !Number.isFinite(Date.parse(e.date))) throw Error('schema');
      }
    }
    return data;
  }
  function emit(next) { state = next; for (const fn of listeners) fn(state); }
  function readCache() {
    try {
      const saved = JSON.parse(localStorage.getItem(cacheKey));
      const age = Date.now() - saved.fetchedAt;
      if (!Number.isFinite(age) || age < 0 || age > 86400000) return null;
      validate(saved.data); return saved;
    } catch { return null; }
  }
  function load() {
    if (active) return active;
    const mine = ++epoch;
    emit({ ...state, status: 'loading', error: null });
    active = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('/content/index.json', {
          signal: controller.signal, cache: 'no-cache'
        });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const data = validate(await response.json());
        if (mine !== epoch) return;
        const fetchedAt = Date.now();
        try { localStorage.setItem(cacheKey, JSON.stringify({ data, fetchedAt })); } catch {}
        emit({ status: 'ready', data, fetchedAt, error: null });
      } catch (error) {
        if (mine !== epoch) return;
        const saved = readCache();
        emit({ status: saved ? 'stale' : 'error', data: saved?.data || null,
          fetchedAt: saved?.fetchedAt || null, error: error.name === 'AbortError' ? 'timeout' : 'network' });
      } finally { clearTimeout(timer); }
    })().finally(() => { active = null; });
    return active;
  }
  window.EMCContent = {
    load, getState: () => state,
    subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); }
  };
})();
