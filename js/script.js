/* ==========================================================================
   EkoMetChem — site behaviour
   Sections: 1) language  2) mobile nav  3) materials grid  4) reveal-on-scroll
   5) contact form (demo)
   ========================================================================== */

const LANGS = ["en", "ru"];

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
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
  });

  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  renderMaterials();
  if (typeof loadNews === "function") loadNews();
}

document.querySelectorAll(".lang-toggle button").forEach((btn) => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang));
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
   3) MATERIALS GRID (element-table signature section)
   --------------------------------------------------------------- */
let activeCat = "waste";

const marketNoteKey = { waste: "mat_waste_note", metal: "mat_metal_note" };

function renderMaterials() {
  const grid = document.getElementById("elementGrid");
  if (!grid) return;

  grid.innerHTML = "";
  const items = MATERIALS.filter((m) => m.cat === activeCat);

  items.forEach((m, i) => {
    const tile = document.createElement("div");
    tile.className = `element-tile cat-${m.cat}`;
    tile.tabIndex = 0;
    tile.innerHTML = `
      <div class="num">No. ${String(i + 1).padStart(2, "0")}</div>
      <div class="sym">${m.code}</div>
      <div class="name">${m[currentLang]}</div>
      <div class="tip">${m[currentLang]}</div>
    `;
    grid.appendChild(tile);
  });

  const note = document.getElementById("marketNote");
  if (note && marketNoteKey[activeCat]) {
    note.textContent = I18N[currentLang][marketNoteKey[activeCat]];
  }
}

const marketPanel = document.getElementById("marketPanel");
const servicesPanel = document.getElementById("servicesPanel");

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    const cat = btn.dataset.cat;

    if (cat === "services") {
      marketPanel.hidden = true;
      servicesPanel.hidden = false;
    } else {
      servicesPanel.hidden = true;
      marketPanel.hidden = false;
      activeCat = cat;
      renderMaterials();
    }
  });
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
   5) CONTACT FORM (demo only — no backend wired up yet)
   To make this send real emails, the simplest options are:
     - Formspree (https://formspree.io) — set the <form action="..."> to
       your Formspree endpoint and remove the preventDefault() below.
     - EmailJS (https://www.emailjs.com) — send via their JS SDK here.
   See README.md for step-by-step instructions.
   --------------------------------------------------------------- */
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

contactForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  formStatus.textContent =
    currentLang === "ru"
      ? "Демо-режим: форма пока не подключена к почте. Инструкция в README.md."
      : "Demo mode: this form isn't wired up to an inbox yet. See README.md.";
  formStatus.classList.add("show");
  contactForm.reset();
});

/* ---------------------------------------------------------------
   6) INDUSTRY NEWS — via rss2json.com (free tier, needs an API key)

   SETUP (one-time):
     1. Create a free account at https://rss2json.com (no credit card)
     2. Copy your API key from the dashboard
     3. Paste it below as RSS2JSON_API_KEY
   Free tier covers ~10 000 requests/month — plenty for a site like this.
   The feed itself is Google News RSS filtered by "metallurgy" — swap the
   FEED_URL for any other metals/recycling trade feed if you prefer.
   --------------------------------------------------------------- */
const RSS2JSON_API_KEY = "16i4arleuhjyb9z5ec0sf8u8j7ncdwluxae0x1pk"; // <-- replace with your key

const NEWS_FEEDS = {
  en: "https://news.google.com/rss/search?q=metallurgy+OR+%22non-ferrous+metals%22&hl=en-US&gl=US&ceid=US:en",
  ru: "https://news.google.com/rss/search?q=металлургия&hl=ru&gl=RU&ceid=RU:ru",
};

let newsCache = {};

async function loadNews() {
  const grid = document.getElementById("newsGrid");
  const status = document.getElementById("newsStatus");
  if (!grid) return;

  if (RSS2JSON_API_KEY.includes("YOUR_RSS2JSON_KEY")) {
    status.textContent =
      currentLang === "ru"
        ? "Новости пока не подключены: вставьте свой ключ rss2json.com в js/script.js (RSS2JSON_API_KEY)."
        : "News isn't connected yet: paste your rss2json.com key into js/script.js (RSS2JSON_API_KEY).";
    return;
  }

  if (newsCache[currentLang]) {
    renderNews(newsCache[currentLang]);
    return;
  }

  status.textContent = I18N[currentLang].news_loading;
  status.style.display = "block";

  try {
    const feedUrl = encodeURIComponent(NEWS_FEEDS[currentLang]);
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}&api_key=${RSS2JSON_API_KEY}&count=6`);
    const data = await res.json();

    if (data.status !== "ok" || !data.items?.length) throw new Error("empty feed");

    newsCache[currentLang] = data.items;
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

  items.slice(0, 6).forEach((item) => {
    const card = document.createElement("a");
    card.className = "news-card";
    card.href = item.link;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const date = new Date(item.pubDate).toLocaleDateString(currentLang === "ru" ? "ru-RU" : "en-GB", {
      day: "numeric", month: "short",
    });
    const source = item.author || (new URL(item.link).hostname.replace("www.", ""));

    card.innerHTML = `
      <div class="news-meta">${source} · ${date}</div>
      <h3>${item.title}</h3>
    `;
    grid.appendChild(card);
  });
}

/* ---------------------------------------------------------------
   init
   --------------------------------------------------------------- */
applyLang(currentLang);
loadNews();
