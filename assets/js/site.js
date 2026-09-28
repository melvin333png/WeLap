/* WeLap — scripts partagés (toutes les pages). Aucune dépendance. */

/* ------------------------------------------------------------------
   CONFIGURATION — le seul endroit à modifier pour les liens stores.
   Les boutons stores du HTML contiennent déjà ces liens (fonctionnent sans JS) ;
   ce bloc les synchronise si tu changes une URL ici.
   ------------------------------------------------------------------ */
window.WELAP_CONFIG = {
  appStoreUrl: "https://apps.apple.com/fr/app/welap/id6781696001",
  googlePlayUrl: "https://play.google.com/store/apps/details?id=com.welap.app",
  contactEmail: "contact.welap@gmail.com",
};

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!reduceMotion.matches) root.classList.add("motion");
  window.WELAP_REDUCED_MOTION = reduceMotion.matches;

  /* ---------- Navigation ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 12); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = nav.querySelector(".nav__toggle");
    var menu = nav.querySelector(".nav__menu");
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    };
    if (toggle && menu) {
      toggle.addEventListener("click", function () { setOpen(!nav.classList.contains("is-open")); });
      menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
      });
    }
  }

  /* ---------- Reveal au scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Liens stores ---------- */
  var cfg = window.WELAP_CONFIG;
  document.querySelectorAll("[data-store]").forEach(function (el) {
    var url = el.getAttribute("data-store") === "ios" ? cfg.appStoreUrl : cfg.googlePlayUrl;
    if (url) el.setAttribute("href", url);
  });

  /* ---------- Année ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Boucle animée (home + pro) ---------- */
  document.querySelectorAll("[data-loop]").forEach(function (loop) {
    var nodes = loop.querySelectorAll(".loop__node");
    var items = loop.querySelectorAll(".loop__list li");
    var progress = loop.querySelector(".loop__progress");
    var count = nodes.length;
    if (!count) return;
    var length = progress ? progress.getTotalLength() : 0;
    if (progress) { progress.style.strokeDasharray = String(length); progress.style.strokeDashoffset = String(length); }
    var index = 0;
    var timer = null;

    var show = function (i) {
      index = i;
      nodes.forEach(function (n, k) { n.classList.toggle("is-active", k === i); });
      items.forEach(function (n, k) { n.classList.toggle("is-active", k === i); });
      if (progress) {
        progress.style.transition = i === 0 ? "none" : "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)";
        progress.style.strokeDashoffset = String(length - (length * i) / count);
      }
    };
    var start = function () {
      if (timer || reduceMotion.matches) return;
      timer = window.setInterval(function () { show((index + 1) % count); }, 1900);
    };
    var stop = function () { window.clearInterval(timer); timer = null; };

    show(0);
    if (reduceMotion.matches && progress) progress.style.strokeDashoffset = "0";

    // Interaction : survol / focus / tap sur une étape
    items.forEach(function (li, k) {
      li.addEventListener("mouseenter", function () { stop(); show(k); });
      li.addEventListener("click", function () { stop(); show(k); });
    });
    loop.addEventListener("mouseleave", start);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.3 }).observe(loop);
    } else { start(); }
  });

  /* ---------- Sélecteur de langue (pages légales, conservé de l'ancien site) ---------- */
  var langButtons = document.querySelectorAll("[data-set-lang]");
  if (langButtons.length) {
    var applyLang = function (lang) {
      document.querySelectorAll("[data-lang-block]").forEach(function (b) { b.hidden = b.getAttribute("data-lang-block") !== lang; });
      langButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang)); });
      root.setAttribute("lang", lang);
      try { localStorage.setItem("welap-lang", lang); } catch (e) { /* stockage indisponible */ }
    };
    var saved = "fr";
    try { saved = localStorage.getItem("welap-lang") || "fr"; } catch (e) { /* stockage indisponible */ }
    applyLang(saved === "en" ? "en" : "fr");
    langButtons.forEach(function (b) { b.addEventListener("click", function () { applyLang(b.getAttribute("data-set-lang")); }); });
  }
})();
