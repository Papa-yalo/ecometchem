/* ==========================================================================
   EkoMetChem — site behaviour
   Sections: 1) language  2) mobile nav  3) materials grid  4) reveal-on-scroll
   5) contact form (demo)
   ========================================================================== */

const LANGS = ["en", "ru", "pl", "de", "it", "fr"];

/* ---------------------------------------------------------------
   1) LANGUAGE — auto-detect on first visit, then remember choice
   --------------------------------------------------------------- */
function detectLang() {
  const saved = localStorage.getItem("emc_lang");
  if (saved && LANGS.includes(saved)) return saved;

  const browserLang = (navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGS.includes(browserLang) ? browserLang : "en";
}

let currentLang = detectLang();

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem("emc_lang", lang);
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

  document.getElementById("langCurrentLabel").textContent = lang.toUpperCase();
  document.querySelectorAll(".lang-options button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  renderCategories();
  if (typeof loadNews === "function") loadNews();
  if (typeof renderDynamicBlocks === "function") renderDynamicBlocks();
  if (typeof renderMetalsTicker === "function") renderMetalsTicker();
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
  link.addEventListener("click", () => navEl.classList.remove("open"));
});

/* ---------------------------------------------------------------
   3) MATERIALS CATALOG (12 categories) + SEARCH + LIGHTBOX
   --------------------------------------------------------------- */
function renderCategories() {
  const grid = document.getElementById("categoryGrid");
  if (!grid) return;

  grid.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "element-tile";
    tile.innerHTML = `
      <div class="num">No. ${cat.code}</div>
      <div class="sym">${I18N[currentLang][cat.titleKey]}</div>
    `;
    tile.addEventListener("click", () => openCategory(cat));
    grid.appendChild(tile);
  });
}

const lightbox = document.getElementById("lightbox");
const lightboxGrid = document.getElementById("lightboxGrid");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxItems = document.getElementById("lightboxItems");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxBackdrop = document.getElementById("lightboxBackdrop");

function openCategory(cat) {
  lightboxTitle.textContent = I18N[currentLang][cat.titleKey];
  lightboxGrid.innerHTML = "";
  lightboxItems.innerHTML = cat.items.join(" · ") + " · " + I18N[currentLang].mat_more_items;
  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
}

lightboxClose?.addEventListener("click", closeLightbox);
lightboxBackdrop?.addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
});

/* ---- catalog search: matches item names across all 12 categories ---- */
const catSearchInput = document.getElementById("catSearch");
const catSearchResults = document.getElementById("catSearchResults");

catSearchInput?.addEventListener("input", () => {
  const q = catSearchInput.value.trim().toLowerCase();
  if (q.length < 2) {
    catSearchResults.hidden = true;
    catSearchResults.innerHTML = "";
    return;
  }

  const matches = [];
  CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      if (item.toLowerCase().includes(q)) matches.push({ item, cat });
    });
  });

  catSearchResults.innerHTML = "";
  if (matches.length === 0) {
    catSearchResults.innerHTML = `<div class="cat-search-empty">${I18N[currentLang].mat_no_results}</div>`;
  } else {
    matches.slice(0, 12).forEach(({ item, cat }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = `${item}<span>${I18N[currentLang][cat.titleKey]}</span>`;
      btn.addEventListener("click", () => {
        catSearchResults.hidden = true;
        catSearchInput.value = "";
        openCategory(cat);
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

/* ---------------------------------------------------------------
   5) CONTACT FORM — submits to Netlify Forms (built into this hosting,
   no external service needed). Netlify's build bot detects the
   data-netlify="true" attribute on the <form> in index.html and starts
   accepting submissions automatically after deploy — nothing to
   configure here. Submissions show up in the Netlify dashboard under
   the "Forms" tab; enable email notifications there
   (Site configuration → Forms → Form notifications).
   --------------------------------------------------------------- */
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const submitBtn = contactForm?.querySelector("button[type=submit]");

function encodeFormData(form) {
  return new URLSearchParams(new FormData(form)).toString();
}

contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = I18N[currentLang].form_sending;
  formStatus.classList.remove("show");

  try {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeFormData(contactForm),
    });

    if (response.ok) {
      formStatus.textContent = I18N[currentLang].form_success;
      contactForm.reset();
    } else {
      formStatus.textContent = I18N[currentLang].form_error;
    }
  } catch (err) {
    formStatus.textContent = I18N[currentLang].form_error;
  }

  formStatus.classList.add("show");
  submitBtn.disabled = false;
  submitBtn.textContent = originalLabel;
});

/* ---------------------------------------------------------------
   6) INDUSTRY NEWS — reads the pre-fetched cache from our own
   Netlify Function (netlify/functions/get-news.js). The function itself
   pulls from Mining.com, Kitco News and Google News on a schedule
   (see update-news.js) — the browser never talks to those sites directly,
   and never re-fetches on every visit.
   --------------------------------------------------------------- */
let newsCache = null;

async function loadNews() {
  const grid = document.getElementById("newsGrid");
  const status = document.getElementById("newsStatus");
  if (!grid) return;

  if (newsCache) {
    renderNews(newsCache);
    return;
  }

  status.textContent = I18N[currentLang].news_loading;
  status.style.display = "block";

  try {
    const res = await fetch("/.netlify/functions/get-news");
    const data = await res.json();

    if (!data.items || data.items.length === 0) throw new Error("empty cache");

    newsCache = data.items;
    renderNews(data.items);
  } catch (err) {
    status.textContent = I18N[currentLang].news_error;
    status.style.display = "block";
  }
}

function renderNews(items) {
  const grid = document.getElementById("newsGrid");
  const status = document.getElementById("newsStatus");
  status.style.display = "none";

  grid.querySelectorAll(".news-card").forEach((el) => el.remove());

  items.slice(0, 9).forEach((item) => {
    const card = document.createElement("a");
    card.className = "news-card";
    card.href = item.link;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const localeMap = { ru: "ru-RU", pl: "pl-PL", de: "de-DE", it: "it-IT", fr: "fr-FR", en: "en-GB" };
    const date = new Date(item.pubDate).toLocaleDateString(localeMap[currentLang] || "en-GB", {
      day: "numeric", month: "short",
    });

    card.innerHTML = `
      <div class="news-meta">${item.source} · ${date}</div>
      <h3>${item.title}</h3>
    `;
    grid.appendChild(card);
  });
}

/* ---------------------------------------------------------------
   6b) LME METALS TICKER — same caching pattern as the news block
   --------------------------------------------------------------- */
const METAL_LABELS = {
  aluminium: { en: "Aluminium", ru: "Алюминий", pl: "Aluminium", de: "Aluminium", it: "Alluminio", fr: "Aluminium" },
  copper: { en: "Copper", ru: "Медь", pl: "Miedź", de: "Kupfer", it: "Rame", fr: "Cuivre" },
  zinc: { en: "Zinc", ru: "Цинк", pl: "Cynk", de: "Zink", it: "Zinco", fr: "Zinc" },
  lead: { en: "Lead", ru: "Свинец", pl: "Ołów", de: "Blei", it: "Piombo", fr: "Plomb" },
  nickel: { en: "Nickel", ru: "Никель", pl: "Nikiel", de: "Nickel", it: "Nichel", fr: "Nickel" },
  tin: { en: "Tin", ru: "Олово", pl: "Cyna", de: "Zinn", it: "Stagno", fr: "Étain" },
};

let metalsCache = null;

async function loadMetalsTicker() {
  const ticker = document.getElementById("metalsTicker");
  if (!ticker) return;

  if (!metalsCache) {
    try {
      const res = await fetch("/.netlify/functions/get-metals");
      metalsCache = await res.json();
    } catch {
      metalsCache = { prices: {}, updatedAt: null };
    }
  }
  renderMetalsTicker();
}

function renderMetalsTicker() {
  const ticker = document.getElementById("metalsTicker");
  const caption = document.getElementById("tickerCaption");
  if (!ticker || !metalsCache) return;

  const entries = Object.entries(metalsCache.prices || {});
  if (entries.length === 0) {
    ticker.innerHTML = `<span class="ticker-loading">${I18N[currentLang].dyn_empty}</span>`;
    return;
  }

  ticker.innerHTML = entries
    .map(([metal, price]) => {
      const label = (METAL_LABELS[metal] && METAL_LABELS[metal][currentLang]) || metal;
      return `<span class="metal-item"><span class="metal-name">${label}</span><span class="metal-price">$${price.toLocaleString("en-US")}/t</span></span>`;
    })
    .join("");

  if (caption) {
    const localeMap = { ru: "ru-RU", pl: "pl-PL", de: "de-DE", it: "it-IT", fr: "fr-FR", en: "en-GB" };
    const updated = metalsCache.updatedAt
      ? new Date(metalsCache.updatedAt).toLocaleString(localeMap[currentLang] || "en-GB", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        })
      : "—";
    caption.textContent = `${I18N[currentLang].market_note} ${I18N[currentLang].market_updated}: ${updated}`;
  }
}

/* ---------------------------------------------------------------
   7) DYNAMIC BLOCKS — Актуальные предложения/закупки/услуги/требуются
   Content is managed by staff through the admin panel at /admin
   (Decap CMS) and stored as JSON files in this GitHub repo. The page
   reads that content straight from GitHub at load time — no backend,
   no database, no build step needed.
   --------------------------------------------------------------- */
const GITHUB_REPO = "Papa-yalo/ecometchem";
const GITHUB_BRANCH = "main";

async function fetchCollection(folder) {
  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/content/${folder}?ref=${GITHUB_BRANCH}`
    );
    if (!listRes.ok) return []; // folder doesn't exist yet = no entries yet
    const files = await listRes.json();
    if (!Array.isArray(files)) return [];

    const entries = await Promise.all(
      files
        .filter((f) => f.name.endsWith(".json"))
        .map(async (f) => {
          try {
            const res = await fetch(f.download_url);
            return await res.json();
          } catch {
            return null;
          }
        })
    );
    return entries.filter(Boolean);
  } catch {
    return [];
  }
}

function sortEntries(entries) {
  return entries
    .filter((e) => !e.hidden)
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
}

function formatEntryDate(dateStr) {
  if (!dateStr) return "";
  const localeMap = { ru: "ru-RU", pl: "pl-PL", de: "de-DE", it: "it-IT", fr: "fr-FR", en: "en-GB" };
  return new Date(dateStr).toLocaleDateString(localeMap[currentLang] || "en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function renderCardGrid(containerId, entries) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  const visible = sortEntries(entries);

  if (visible.length === 0) {
    grid.innerHTML = `<p class="dyn-status">${I18N[currentLang].dyn_empty}</p>`;
    return;
  }

  grid.innerHTML = "";
  visible.forEach((e) => {
    const card = document.createElement("div");
    card.className = "dyn-card" + (e.pinned ? " pinned" : "");
    const metaParts = [];
    if (e.quantity) metaParts.push(`<span>${I18N[currentLang].dyn_qty}: <strong>${e.quantity}</strong></span>`);
    if (e.country) metaParts.push(`<span>${I18N[currentLang].dyn_country}: <strong>${e.country}</strong></span>`);

    card.innerHTML = `
      ${e.pinned ? `<span class="pin-badge">${I18N[currentLang].dyn_pinned}</span>` : ""}
      ${e.photo ? `<img class="dyn-photo" src="${e.photo}" alt="${e.title || ""}" loading="lazy">` : ""}
      <div class="dyn-body">
        <h3>${e.title || ""}</h3>
        ${e.description ? `<p class="desc">${e.description}</p>` : ""}
        ${metaParts.length ? `<div class="dyn-meta">${metaParts.join("")}</div>` : ""}
        <span class="dyn-date">${formatEntryDate(e.date)}</span>
        <a class="btn btn-ghost" href="${e.link || "#contact"}" ${e.link ? 'target="_blank" rel="noopener"' : ""}>${I18N[currentLang].dyn_more}</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderSimpleList(containerId, entries) {
  const list = document.getElementById(containerId);
  if (!list) return;
  const visible = sortEntries(entries);

  if (visible.length === 0) {
    list.innerHTML = `<p class="dyn-status">${I18N[currentLang].dyn_empty}</p>`;
    return;
  }

  list.innerHTML = "";
  visible.forEach((e) => {
    const row = document.createElement("div");
    row.className = "dyn-list-item" + (e.pinned ? " pinned" : "");
    row.innerHTML = `
      <span class="txt">${e.pinned ? `<span class="pin-badge" style="position:static; margin-right:8px;">${I18N[currentLang].dyn_pinned}</span>` : ""}${e.title || ""}</span>
      <span class="dyn-date">${formatEntryDate(e.date)}</span>
    `;
    list.appendChild(row);
  });
}

let dynamicDataCache = null;

async function loadDynamicBlocks() {
  if (!document.getElementById("offersGrid")) return;

  const [offers, procurement, servicesActive, servicesNeeded] = await Promise.all([
    fetchCollection("offers"),
    fetchCollection("procurement"),
    fetchCollection("services-active"),
    fetchCollection("services-needed"),
  ]);

  dynamicDataCache = { offers, procurement, servicesActive, servicesNeeded };
  renderDynamicBlocks();
}

function renderDynamicBlocks() {
  if (!dynamicDataCache) return;
  const { offers, procurement, servicesActive, servicesNeeded } = dynamicDataCache;

  renderCardGrid("offersGrid", offers);
  renderCardGrid("procurementGrid", procurement);
  renderSimpleList("servicesActiveList", servicesActive);
  renderSimpleList("servicesNeededList", servicesNeeded);
  renderUpdatesFeed({ offers, procurement, servicesActive, servicesNeeded });
}

function renderUpdatesFeed(collections) {
  const feed = document.getElementById("updatesFeed");
  if (!feed) return;

  const typeMeta = {
    offers: { dot: "dot-green", labelKey: "updates_type_offer" },
    procurement: { dot: "dot-blue", labelKey: "updates_type_procurement" },
    servicesActive: { dot: "dot-orange", labelKey: "updates_type_service" },
    servicesNeeded: { dot: "dot-purple", labelKey: "updates_type_needed" },
  };

  let all = [];
  Object.keys(collections).forEach((key) => {
    collections[key]
      .filter((e) => !e.hidden)
      .forEach((e) => all.push({ ...e, _type: key }));
  });
  all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  all = all.slice(0, 10);

  if (all.length === 0) {
    feed.innerHTML = `<p class="dyn-status">${I18N[currentLang].dyn_empty}</p>`;
    return;
  }

  feed.innerHTML = "";
  all.forEach((e) => {
    const meta = typeMeta[e._type];
    const row = document.createElement("div");
    row.className = "update-row";
    row.innerHTML = `
      <span class="dyn-date">${formatEntryDate(e.date)}</span>
      <span class="txt"><span class="dot ${meta.dot}"></span> ${I18N[currentLang][meta.labelKey]} — <strong>${e.title || ""}</strong></span>
    `;
    feed.appendChild(row);
  });
}

/* ---------------------------------------------------------------
   8) GOOGLE ANALYTICS 4 + COOKIE CONSENT (GDPR)
   Analytics only loads after the visitor explicitly accepts — required
   for EU visitors under GDPR. Choice is remembered in localStorage.

   SETUP (one-time): create a free GA4 property at https://analytics.google.com,
   copy the Measurement ID (looks like G-XXXXXXXXXX), paste it below.
   --------------------------------------------------------------- */
const GA_MEASUREMENT_ID = "G-FHP1K3Q7DT";

function loadGoogleAnalytics() {
  if (GA_MEASUREMENT_ID.includes("XXXXXXXXXX")) return; // not configured yet

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
  const saved = localStorage.getItem(CONSENT_KEY);
  if (saved === "accepted") {
    loadGoogleAnalytics();
  } else if (saved !== "declined") {
    cookieBanner.hidden = false;
  }
}

cookieAccept?.addEventListener("click", () => {
  localStorage.setItem(CONSENT_KEY, "accepted");
  cookieBanner.hidden = true;
  loadGoogleAnalytics();
});

cookieDecline?.addEventListener("click", () => {
  localStorage.setItem(CONSENT_KEY, "declined");
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
loadNews();
loadDynamicBlocks();
loadMetalsTicker();
initConsent();
