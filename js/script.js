/* ==========================================================================
   EkoMetChem — site behaviour
   Sections: 0) safe URL helper  1) language  2) mobile nav  3) catalog + modal
   4) reveal  5) contact form  6) news  7) dynamic blocks (offers etc.)
   8) analytics/consent  9) UI polish. Video control lives in js/emc-media.js.
   ========================================================================== */

const LANGS = ["en", "ru", "pl", "de", "it", "fr", "tr", "es"];
const LOCALES = { ru: "ru-RU", pl: "pl-PL", de: "de-DE", it: "it-IT", fr: "fr-FR", tr: "tr-TR", es: "es-ES", en: "en-GB" };

/* 0) Only plain http(s) links and local /assets images are ever used from CMS/RSS data. */
function emcSafeUrl(value, { image = false } = {}) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || /[\u0000-\u001f\u007f\\]/.test(raw) || raw.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw, location.origin);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (image && (url.origin !== location.origin || !url.pathname.startsWith("/assets/"))) return null;
    return url.href;
  } catch { return null; }
}

/* ---------------------------------------------------------------
   1) LANGUAGE — auto-detect on first visit, then remember choice
   --------------------------------------------------------------- */
function detectLang() {
  let saved;
  try { saved = localStorage.getItem("emc_lang"); } catch {}
  if (saved && LANGS.includes(saved)) return saved;

  const browserLang = (navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGS.includes(browserLang) ? browserLang : "en";
}

let currentLang = detectLang();

function applyLang(lang) {
  currentLang = lang;
  try { localStorage.setItem("emc_lang", lang); } catch {}
  document.documentElement.setAttribute("lang", lang);

  const dict = I18N[lang];

  document.title = `EkoMetChem — ${dict.hero_h1}`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && dict.meta_description) metaDesc.setAttribute("content", dict.meta_description);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
  });
  document.querySelectorAll("[data-emc-copy]").forEach((el) => {
    el.setAttribute("aria-label", `${dict.p_copy}: ${el.dataset.emcCopy}`);
  });
  document.querySelector(".to-top")?.setAttribute("aria-label", dict.p_top);

  const label = document.getElementById("langCurrentLabel");
  if (label) label.textContent = lang.toUpperCase();
  document.querySelectorAll(".lang-options button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  renderCategories();
  renderNews();
  renderDynamicBlocks();
  renderFormState();
  refreshLightbox();
}

/* dropdown open/close + selection */
const langDropdown = document.getElementById("langDropdown");
const langCurrentBtn = document.getElementById("langCurrentBtn");

langCurrentBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = langDropdown.classList.toggle("open");
  langCurrentBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

document.querySelectorAll(".lang-options button").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyLang(btn.dataset.lang);
    langDropdown.classList.remove("open");
    langCurrentBtn.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (e) => {
  if (langDropdown && !langDropdown.contains(e.target)) {
    langDropdown.classList.remove("open");
    langCurrentBtn?.setAttribute("aria-expanded", "false");
  }
});

/* ---------------------------------------------------------------
   2) MOBILE NAV
   --------------------------------------------------------------- */
const navEl = document.querySelector(".nav");
const menuToggle = document.querySelector(".menu-toggle");

menuToggle?.addEventListener("click", () => {
  const isOpen = navEl.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    navEl.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

/* ---------------------------------------------------------------
   3) MATERIALS CATALOG (12 categories) + SEARCH + ACCESSIBLE MODAL
   --------------------------------------------------------------- */
function renderCategories() {
  const grid = document.getElementById("categoryGrid");
  if (!grid || typeof CATEGORIES === "undefined") return;

  grid.replaceChildren();
  CATEGORIES.forEach((cat) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "element-tile";
    const num = document.createElement("div");
    num.className = "num";
    num.textContent = `No. ${cat.code}`;
    const sym = document.createElement("div");
    sym.className = "sym";
    sym.textContent = I18N[currentLang][cat.titleKey];
    tile.append(num, sym);
    tile.addEventListener("click", () => openCategory(cat));
    grid.appendChild(tile);
  });
}

const lightbox = document.getElementById("lightbox");
const lightboxPanel = lightbox?.querySelector(".lightbox-panel");
const lightboxGrid = document.getElementById("lightboxGrid");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxItems = document.getElementById("lightboxItems");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxBackdrop = document.getElementById("lightboxBackdrop");

let lbView = null;        // what is currently shown: {type:"cat",cat} or {type:"detail",entry,kind}
let lbEpoch = 0;          // invalidates late translation answers
let lbReturnFocus = null; // element that had focus before the dialog opened
let lbInert = [];         // [element, previous inert value]

if (lightboxPanel) {
  lightboxPanel.setAttribute("role", "dialog");
  lightboxPanel.setAttribute("aria-modal", "true");
  lightboxPanel.setAttribute("aria-labelledby", "lightboxTitle");
}

function lbOpen(returnEl) {
  if (!lightbox) return;
  if (lightbox.hidden) {
    lbReturnFocus = returnEl || document.activeElement;
    lbInert = [];
    [...document.body.children].forEach((el) => {
      if (el === lightbox || el.tagName === "SCRIPT" || el.tagName === "NOSCRIPT") return;
      lbInert.push([el, el.inert]);
      el.inert = true;
    });
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightboxClose?.focus({ preventScroll: true });
  }
}

function closeLightbox({ restoreFocus = true } = {}) {
  if (!lightbox || lightbox.hidden) return;
  lbEpoch++;
  lbView = null;
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  lbInert.forEach(([el, prev]) => { el.inert = prev; });
  lbInert = [];
  const target = lbReturnFocus;
  lbReturnFocus = null;
  if (!restoreFocus) return;
  if (target && target.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
  else if (target && catSearchResults?.contains(target)) catSearchInput?.focus({ preventScroll: true });
}

lightboxClose?.addEventListener("click", () => closeLightbox());
lightboxBackdrop?.addEventListener("click", () => closeLightbox());
document.addEventListener("keydown", (e) => {
  if (!lightbox || lightbox.hidden) return;
  if (e.key === "Escape") { closeLightbox(); return; }
  if (e.key === "Tab") {
    const nodes = [...lightboxPanel.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter((n) => n.getClientRects().length);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || !lightboxPanel.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !lightboxPanel.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  }
});

function refreshLightbox() {
  if (!lightbox || lightbox.hidden || !lbView) return;
  if (lbView.type === "cat") renderCategoryView(lbView.cat);
  else renderDetailView(lbView.entry, lbView.kind);
}

function openCategory(cat, returnEl) {
  if (!lightbox) return;
  lbView = { type: "cat", cat };
  renderCategoryView(cat);
  lbOpen(returnEl);
}

function renderCategoryView(cat) {
  const t = I18N[currentLang];
  lbEpoch++;
  lightboxTitle.textContent = t[cat.titleKey];
  lightboxGrid.replaceChildren();
  lightboxGrid.classList.remove("single");
  lightboxItems.replaceChildren();
  const items = document.createElement("ul");
  items.className = "emc2-items";
  cat.items.forEach((name) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = name;
    const ask = document.createElement("button");
    ask.type = "button";
    ask.className = "emc-ask";
    ask.textContent = t.p_request;
    ask.setAttribute("aria-label", `${t.p_request}: ${name}`);
    ask.addEventListener("click", () => emcStartInquiry(name, "catalog"));
    li.append(label, ask);
    items.appendChild(li);
  });
  const note = document.createElement("p");
  note.textContent = t.mat_more_items;
  lightboxItems.append(items, note);
}

/* Put the chosen position into the contact form message and jump to the form. */
function emcStartInquiry(title, kind = "catalog") {
  const field = document.getElementById("f-message");
  if (!field) return;
  const t = I18N[currentLang];
  const key = { offers: "p_buy", procurement: "p_supply", servicesActive: "p_service",
    servicesNeeded: "p_partner", catalog: "p_inquiry" }[kind] || "p_inquiry";
  const context = `${t[key]}: ${String(title || "").trim()}`;
  if (!field.value.split(/\r?\n/).some((line) => line.trim() === context))
    field.value = field.value.trimEnd() + (field.value.trim() ? "\n\n" : "") + context + "\n";
  closeLightbox({ restoreFocus: false });
  document.getElementById("contact")?.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"
  });
  field.focus({ preventScroll: true });
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ---- catalog search: matches item names across all 12 categories ---- */
const catSearchInput = document.getElementById("catSearch");
const catSearchResults = document.getElementById("catSearchResults");

catSearchInput?.addEventListener("input", () => {
  const q = catSearchInput.value.trim().toLowerCase();
  if (q.length < 2) {
    catSearchResults.hidden = true;
    catSearchResults.replaceChildren();
    return;
  }

  const matches = [];
  CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      if (item.toLowerCase().includes(q)) matches.push({ item, cat });
    });
  });

  catSearchResults.replaceChildren();
  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cat-search-empty";
    empty.textContent = I18N[currentLang].mat_no_results;
    catSearchResults.appendChild(empty);
  } else {
    matches.slice(0, 12).forEach(({ item, cat }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.append(document.createTextNode(item));
      const span = document.createElement("span");
      span.textContent = I18N[currentLang][cat.titleKey];
      btn.appendChild(span);
      btn.addEventListener("click", () => {
        catSearchResults.hidden = true;
        catSearchInput.value = "";
        openCategory(cat, catSearchInput);
      });
      catSearchResults.appendChild(btn);
    });
  }
  catSearchResults.hidden = false;
});

document.addEventListener("click", (e) => {
  if (catSearchResults && !catSearchInput.contains(e.target) && !catSearchResults.contains(e.target)) {
    catSearchResults.hidden = true;
  }
});

/* ---------------------------------------------------------------
   4) REVEAL ON SCROLL
   --------------------------------------------------------------- */
if ("IntersectionObserver" in window) {
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
} else {
 document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
}

/* ---------------------------------------------------------------
   5) CONTACT FORM — Netlify Forms (detected by data-netlify="true").
   Explicit states: idle | sending | success | error. No automatic retry
   (a repeated POST could create a duplicate request).
   --------------------------------------------------------------- */
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const submitBtn = contactForm?.querySelector("button[type=submit]");
let formState = "idle";
let formErrorKind = "error"; // "error" = server refused, "unknown" = could not confirm

function renderFormState() {
  if (!contactForm || !submitBtn) return;
  const t = I18N[currentLang];
  contactForm.dataset.state = formState;
  submitBtn.textContent = formState === "sending" ? t.form_sending : t.form_submit;
  submitBtn.disabled = formState === "sending";
  submitBtn.setAttribute("aria-busy", formState === "sending" ? "true" : "false");
  let text = "";
  if (formState === "sending") text = t.form_sending;
  else if (formState === "success") text = t.p_success;
  else if (formState === "error") text = formErrorKind === "unknown" ? t.p_send_unknown : t.form_error;
  formStatus.textContent = text;
  formStatus.classList.toggle("show", !!text);
}

contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (formState === "sending") return;
  if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }

  const body = new URLSearchParams(new FormData(contactForm)).toString();
  const fields = [...contactForm.querySelectorAll("input:not([type=hidden]):not([type=checkbox]), textarea")];
  fields.forEach((f) => { f.readOnly = true; });
  formState = "sending";
  renderFormState();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (response.ok) {
      formState = "success";
      contactForm.reset();
      trackEvent("generate_lead", { form: "contact" });
    } else {
      formState = "error";
      formErrorKind = "error";
    }
  } catch (err) {
    formState = "error";
    formErrorKind = "unknown";
  } finally {
    clearTimeout(timer);
    fields.forEach((f) => { f.readOnly = false; });
    renderFormState();
  }
});

/* ---------------------------------------------------------------
   6) INDUSTRY NEWS — pre-fetched cache from our Netlify Function
   (get-news → update-news). One request at a time, 10 s timeout,
   first 3 items, "show more" up to 9. If there is nothing to show
   the whole news section is hidden.
   --------------------------------------------------------------- */
let newsItems = null;
let newsDone = false;
let newsPromise = null;
let newsExpanded = false;
const NEWS_MIN = 3, NEWS_MAX = 9;

function loadNews() {
  if (!document.getElementById("newsGrid")) return Promise.resolve();
  if (newsItems) return Promise.resolve();
  if (newsPromise) return newsPromise;
  newsPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/.netlify/functions/get-news", { signal: controller.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.items)) throw new Error("schema");
      const clean = data.items
        .filter((i) => i && typeof i.title === "string" && i.title.trim() && emcSafeUrl(i.link))
        .slice(0, NEWS_MAX);
      if (!clean.length) throw new Error("empty");
      newsItems = clean;
    } catch (err) {
      newsItems = null;
    } finally {
      clearTimeout(timer);
      newsPromise = null;
      newsDone = true;
      renderNews();
    }
  })();
  return newsPromise;
}

function renderNews() {
  const grid = document.getElementById("newsGrid");
  const section = document.getElementById("news");
  if (!grid) return;
  const status = document.getElementById("newsStatus");
  const more = document.getElementById("newsMore");
  const t = I18N[currentLang];

  if (!newsItems) {
    if (!newsDone) {                // not finished yet: show the loading line
      if (status) { status.textContent = t.news_loading; status.style.display = "block"; }
    } else if (section) {           // finished with nothing usable: hide the block
      section.hidden = true;
    }
    if (more) more.hidden = true;
    return;
  }

  if (section) section.hidden = false;
  if (status) status.style.display = "none";
  grid.querySelectorAll(".news-card").forEach((el) => el.remove());

  const shown = newsExpanded ? newsItems : newsItems.slice(0, NEWS_MIN);
  shown.forEach((item) => {
    const card = document.createElement("a");
    card.className = "news-card";
    card.href = emcSafeUrl(item.link);
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    const d = new Date(item.pubDate);
    const date = Number.isFinite(d.getTime())
      ? d.toLocaleDateString(LOCALES[currentLang] || "en-GB", { day: "numeric", month: "short" }) : "";
    const meta = document.createElement("div");
    meta.className = "news-meta";
    meta.textContent = [item.source, date].filter(Boolean).join(" · ");
    const title = document.createElement("h3");
    title.textContent = item.title;
    card.append(meta, title);
    grid.appendChild(card);
  });

  if (more) {
    more.hidden = newsItems.length <= NEWS_MIN;
    more.textContent = newsExpanded ? t.p_less_news : t.p_more_news;
    more.setAttribute("aria-expanded", newsExpanded ? "true" : "false");
  }
}

document.getElementById("newsMore")?.addEventListener("click", () => {
  newsExpanded = !newsExpanded;
  renderNews();
});

/* ---------------------------------------------------------------
   7) DYNAMIC BLOCKS — offers / procurement / services lists.
   Data comes from /content/index.json (built on every deploy from the
   CMS files) through js/emc-content.js. Everything is inserted as text.
   --------------------------------------------------------------- */
const DYN_BLOCKS = {
  offersGrid: "offers",
  procurementGrid: "procurement",
  servicesActiveList: "servicesActive",
  servicesNeededList: "servicesNeeded",
};
let renderEpoch = 0;

function sortEntries(entries) {
  const time = (e) => { const v = Date.parse(e.date || ""); return Number.isFinite(v) ? v : -Infinity; };
  return entries
    .filter((e) => !e.hidden)
    .slice()
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      const ta = time(a), tb = time(b);
      if (ta === tb) return 0;
      return tb > ta ? 1 : -1;
    });
}

function formatEntryDate(dateStr) {
  const v = new Date(dateStr);
  if (!dateStr || !Number.isFinite(v.getTime())) return "—";
  return v.toLocaleDateString(LOCALES[currentLang] || "en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Warsaw",
  });
}

function formatFetchedAt(ts) {
  return new Date(ts).toLocaleString(LOCALES[currentLang] || "en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw",
  });
}

function dynMessage(list, text, withRetry) {
  const wrap = document.createElement("div");
  wrap.className = "dyn-status emc-status";
  const p = document.createElement("p");
  p.textContent = text;
  p.style.margin = "0 0 8px";
  wrap.appendChild(p);
  if (withRetry) {
    const t = I18N[currentLang];
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-ghost btn-sm";
    retry.textContent = t.p_retry;
    retry.addEventListener("click", () => window.EMCContent?.load());
    const contact = document.createElement("a");
    contact.className = "btn btn-ghost btn-sm";
    contact.href = "#contact";
    contact.textContent = t.nav_contact;
    const row = document.createElement("div");
    row.className = "emc-status-actions";
    row.append(retry, contact);
    wrap.appendChild(row);
  }
  return wrap;
}

function renderOfferList(containerId, entries, kind, staleState) {
  const list = document.getElementById(containerId);
  if (!list) return;
  const t = I18N[currentLang];
  const token = renderEpoch, lang = currentLang;
  const visible = sortEntries(entries);
  list.setAttribute("aria-busy", "false");
  list.replaceChildren();

  if (staleState) {
    const note = dynMessage(list, `${t.p_stale} · ${formatFetchedAt(staleState.fetchedAt)}`, true);
    list.appendChild(note);
  }
  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className = "dyn-status";
    empty.textContent = t.p_empty;
    list.appendChild(empty);
    return;
  }

  visible.forEach((e) => {
    const row = document.createElement("div");
    row.className = "dyn-list-item" + (e.pinned ? " pinned" : "");

    const open = document.createElement("button");
    open.type = "button";
    open.className = "dyn-open";

    const photo = emcSafeUrl(e.photo, { image: true });
    if (photo) {
      const img = document.createElement("img");
      img.className = "emc-thumb";
      img.src = photo;
      img.alt = "";
      img.width = 52; img.height = 52;
      img.loading = "lazy"; img.decoding = "async";
      open.appendChild(img);
    }

    const txt = document.createElement("span");
    txt.className = "txt";
    if (e.pinned) {
      const pin = document.createElement("span");
      pin.className = "pin-badge";
      pin.style.cssText = "position:static; margin-right:8px;";
      pin.textContent = t.dyn_pinned;
      txt.appendChild(pin);
    }
    const titleEl = document.createElement("span");
    titleEl.textContent = e.title || "";
    txt.appendChild(titleEl);

    const date = document.createElement("span");
    date.className = "dyn-date";
    date.textContent = formatEntryDate(e.date);

    const more = document.createElement("span");
    more.className = "btn btn-ghost btn-sm";
    more.setAttribute("aria-hidden", "true");
    more.textContent = t.dyn_more;

    open.setAttribute("aria-label", `${e.title || ""}: ${t.dyn_more}`);
    open.append(txt, date, more);
    open.addEventListener("click", () => openOfferDetail(e, kind, open));
    row.appendChild(open);
    list.appendChild(row);

    if (currentLang !== "ru" && e.title) {
      translateText(e.title, lang).then((translated) => {
        if (token !== renderEpoch || lang !== currentLang || !titleEl.isConnected) return;
        titleEl.textContent = translated;
        open.setAttribute("aria-label", `${translated}: ${I18N[lang].dyn_more}`);
      });
    }
  });
}

function openOfferDetail(e, kind, returnEl) {
  if (!lightbox) return;
  lbView = { type: "detail", entry: e, kind };
  renderDetailView(e, kind);
  lbOpen(returnEl);
}

function renderDetailView(e, kind) {
  const t = I18N[currentLang];
  const lang = currentLang;
  const epoch = ++lbEpoch;
  lightboxTitle.textContent = e.title || "";
  lightboxGrid.replaceChildren();
  const photo = emcSafeUrl(e.photo, { image: true });
  lightboxGrid.classList.toggle("single", !!photo);
  if (photo) {
    const img = document.createElement("img");
    img.src = photo;
    img.alt = e.title || "";
    img.decoding = "async";
    lightboxGrid.appendChild(img);
  }

  lightboxItems.replaceChildren();
  let descEl = null;
  if (e.description) {
    descEl = document.createElement("p");
    descEl.className = "emc-text-description";
    descEl.style.margin = "0 0 12px";
    descEl.textContent = e.description;
    lightboxItems.appendChild(descEl);
  }
  const meta = [];
  if (e.quantity) meta.push([t.dyn_qty, e.quantity]);
  if (e.country) meta.push([t.dyn_country, e.country]);
  if (meta.length) {
    const p = document.createElement("p");
    p.style.margin = "0 0 12px";
    meta.forEach(([label, value], i) => {
      if (i) p.append(" · ");
      p.append(`${label}: `);
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.textContent = value;
      p.appendChild(mark);
    });
    lightboxItems.appendChild(p);
  }
  const dateP = document.createElement("p");
  dateP.style.cssText = "margin:0 0 16px; opacity:.7;";
  dateP.textContent = formatEntryDate(e.date);
  lightboxItems.appendChild(dateP);

  const actions = document.createElement("div");
  actions.className = "emc-actions";
  const ask = document.createElement("button");
  ask.type = "button";
  ask.className = "btn btn-primary";
  ask.textContent = t.hero_cta_primary;
  ask.addEventListener("click", () => emcStartInquiry(e.title, kind || "catalog"));
  actions.appendChild(ask);
  const href = emcSafeUrl(e.link);
  if (href) {
    const ext = document.createElement("a");
    ext.className = "btn btn-ghost";
    ext.href = href;
    ext.target = "_blank";
    ext.rel = "noopener noreferrer";
    ext.textContent = t.dyn_more;
    actions.appendChild(ext);
  }
  lightboxItems.appendChild(actions);

  if (lang !== "ru") {
    if (e.title) translateText(e.title, lang).then((tr) => {
      if (epoch === lbEpoch && lang === currentLang) lightboxTitle.textContent = tr;
    });
    if (e.description && descEl) translateText(e.description, lang).then((tr) => {
      if (epoch === lbEpoch && lang === currentLang && descEl.isConnected) descEl.textContent = tr;
    });
  }
}

/* ---------------------------------------------------------------
   7b) AUTO-TRANSLATE — CMS texts are typed in Russian; for other
   languages they are translated on the fly (MyMemory) and cached.
   Duplicate requests share one promise; 8 s timeout; on any failure
   the original text is shown.
   --------------------------------------------------------------- */
let translationCache = {};
try {
  translationCache = JSON.parse(localStorage.getItem("emc_translations") || "{}");
} catch {
  translationCache = {};
}
const translationPending = new Map();

function saveTranslationCache() {
  try {
    localStorage.setItem("emc_translations", JSON.stringify(translationCache));
  } catch {
    /* storage full or unavailable — not critical */
  }
}

function translateText(text, targetLang) {
  if (!text || targetLang === "ru") return Promise.resolve(text);
  const key = `${targetLang}::${text}`;
  if (translationCache[key]) return Promise.resolve(translationCache[key]);
  if (translationPending.has(key)) return translationPending.get(key);

  const job = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|${targetLang}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      const translated = data && data.responseData && data.responseData.translatedText;
      if (typeof translated === "string" && translated && data.responseStatus === 200) {
        translationCache[key] = translated;
        saveTranslationCache();
        return translated;
      }
    } catch {
      /* translation service unreachable — fall back to original text */
    } finally {
      clearTimeout(timer);
      translationPending.delete(key);
    }
    return text;
  })();
  translationPending.set(key, job);
  return job;
}

function renderDynamicBlocks() {
  renderEpoch++;
  const state = window.EMCContent?.getState();
  if (!state) return;
  const t = I18N[currentLang];
  const live = document.getElementById("emcLive");
  let announce = "";

  for (const [id, key] of Object.entries(DYN_BLOCKS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (state.data && state.status !== "error") {
      renderOfferList(id, state.data[key], key, state.status === "stale" ? state : null);
    } else if (state.status === "error") {
      el.setAttribute("aria-busy", "false");
      el.replaceChildren(dynMessage(el, t.p_load_error, true));
      announce = t.p_load_error;
    } else {
      el.setAttribute("aria-busy", "true");
      if (!el.querySelector(".dyn-list-item")) {
        const p = document.createElement("p");
        p.className = "dyn-status";
        p.textContent = t.p_loading;
        el.replaceChildren(p);
      }
    }
  }
  if (state.status === "stale") announce = t.p_stale;
  if (live) live.textContent = announce;
}

function loadDynamicBlocks() {
  if (!Object.keys(DYN_BLOCKS).some((id) => document.getElementById(id))) return;
  window.EMCContent?.load();
}

/* ---------------------------------------------------------------
   8) GOOGLE ANALYTICS 4 + COOKIE CONSENT (GDPR)
   Analytics only loads after the visitor explicitly accepts — required
   for EU visitors under GDPR. Choice is remembered in localStorage.

   SETUP (one-time): create a free GA4 property at https://analytics.google.com,
   copy the Measurement ID (looks like G-XXXXXXXXXX), paste it below.
   --------------------------------------------------------------- */
const GA_MEASUREMENT_ID = "G-FHP1K3Q7DT";

let gaLoaded = false;
function loadGoogleAnalytics() {
  if (gaLoaded || GA_MEASUREMENT_ID.includes("XXXXXXXXXX")) return; // once only
  gaLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
}

function trackEvent(name, params) {
  if (typeof window.gtag === "function") window.gtag("event", name, params || {});
}

const cookieBanner = document.getElementById("cookieBanner");
const cookieAccept = document.getElementById("cookieAccept");
const cookieDecline = document.getElementById("cookieDecline");
const CONSENT_KEY = "emc_cookie_consent";

function initConsent() {
  if (!cookieBanner) return;
  let saved = null;
  try { saved = localStorage.getItem(CONSENT_KEY); } catch {}
  if (saved === "accepted") {
    loadGoogleAnalytics();
  } else if (saved !== "declined") {
    cookieBanner.hidden = false;
  }
}

cookieAccept?.addEventListener("click", () => {
  try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch {}
  cookieBanner.hidden = true;
  loadGoogleAnalytics();
});

cookieDecline?.addEventListener("click", () => {
  try { localStorage.setItem(CONSENT_KEY, "declined"); } catch {}
  cookieBanner.hidden = true;
});

/* ---- event tracking: "Подробнее" clicks + catalog search ---- */
document.addEventListener("click", (e) => {
  const link = e.target.closest(".dyn-card .btn, .dyn-card a");
  if (link) {
    const title = link.closest(".dyn-card")?.querySelector("h3")?.textContent || "";
    trackEvent("click_learn_more", { item_title: title });
  }
});

let searchTrackTimer;
document.getElementById("catSearch")?.addEventListener("input", (e) => {
  clearTimeout(searchTrackTimer);
  const q = e.target.value.trim();
  if (q.length < 2) return;
  searchTrackTimer = setTimeout(() => {
    trackEvent("search", { search_term: q });
  }, 800);
});

/* ---------------------------------------------------------------
   init
   --------------------------------------------------------------- */
applyLang(currentLang);
window.EMCContent?.subscribe((state) => {
  renderDynamicBlocks();
  if (state.status === "ready" || state.status === "stale") document.dispatchEvent(new Event("emc:data"));
});
loadNews();
loadDynamicBlocks();
initConsent();

/* ============================================================
   UI POLISH: glass header, active menu, back-to-top
   ============================================================ */
(function initUiPolish() {
  const header = document.querySelector(".site-header");
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.type = "button";
  toTop.setAttribute("aria-label", I18N[currentLang].p_top);
  toTop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(toTop);

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) header.classList.toggle("scrolled", y > 20);
      toTop.classList.toggle("show", y > 700);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if ("IntersectionObserver" in window && links.length) {
    const map = new Map();
    links.forEach((a) => {
      const sec = document.querySelector(a.getAttribute("href"));
      if (sec) map.set(sec, a);
    });
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((l) => l.classList.remove("active"));
            map.get(en.target)?.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    map.forEach((_, sec) => spy.observe(sec));
  }
})();
