/* ==========================================================================
   EcoMetChem — site behaviour
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
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    activeCat = btn.dataset.cat;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderMaterials();
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
   init
   --------------------------------------------------------------- */
applyLang(currentLang);
