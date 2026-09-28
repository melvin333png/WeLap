/* WeLap — interactions de la page d'accueil. Chargé en defer, aucune dépendance. */
(function () {
  "use strict";

  var reduced = window.WELAP_REDUCED_MOTION === true;

  /* Données de démonstration du hero (temps au tour en secondes) */
  var DEMO_LAPS = [104.812, 103.967, 104.305, 103.421, 103.88, 103.102];
  var SECTOR_SPLITS = [0.335, 0.31, 0.355]; // part de chaque secteur dans le tour
  var LAP_DURATION_MS = 8200; // durée réelle d'un tour animé
  var TRAIL_LENGTH = 180;
  var TOASTS = [
    { t: "Tour enregistré", s: "Session du jour, tour 1" },
    { t: "Nouveau meilleur tour", s: "−0.845 sur votre référence" },
    { t: "Tour enregistré", s: "Delta +0.338" },
    { t: "Classement Local", s: "Vous gagnez 2 places" },
    { t: "Tour enregistré", s: "Delta +0.459" },
    { t: "Challenge « Sous 1:43.5 »", s: "Objectif atteint" },
  ];

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec - m * 60;
    return m + ":" + (s < 10 ? "0" : "") + s.toFixed(3);
  }
  function fmtSector(sec) { return sec.toFixed(3); }
  function fmtDelta(d) { return (d <= 0 ? "−" : "+") + Math.abs(d).toFixed(3); }

  /* ================================================================
     HERO — circuit, voiture, chrono, secteurs, téléphone
     ================================================================ */
  function initHero() {
    var hero = document.querySelector("[data-hero]");
    if (!hero) return;
    var path = hero.querySelector(".track__base");
    var trail = hero.querySelector(".track__trail");
    var car = hero.querySelector(".track__car");
    var elNow = hero.querySelector("[data-t-now]");
    var elLap = hero.querySelector("[data-t-lap]");
    var elBest = hero.querySelector("[data-t-best]");
    var sectorEls = hero.querySelectorAll("[data-t-sector]");
    var phone = {
      best: hero.querySelector("[data-p-best]"),
      last: hero.querySelector("[data-p-last]"),
      delta: hero.querySelector("[data-p-delta]"),
      list: hero.querySelector("[data-p-laps]"),
      toast: hero.querySelector("[data-p-toast]"),
    };
    if (!path || !car) return;

    var len = path.getTotalLength();

    // Repères secteurs / ligne d'arrivée posés sur le tracé
    hero.querySelectorAll("[data-at]").forEach(function (mark) {
      var at = parseFloat(mark.getAttribute("data-at"));
      var p0 = path.getPointAtLength(at * len);
      var p1 = path.getPointAtLength(Math.min(len, at * len + 1));
      var ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) + Math.PI / 2;
      var dx = Math.cos(ang) * 18, dy = Math.sin(ang) * 18;
      var line = mark.querySelector("line");
      line.setAttribute("x1", (p0.x - dx).toFixed(1)); line.setAttribute("y1", (p0.y - dy).toFixed(1));
      line.setAttribute("x2", (p0.x + dx).toFixed(1)); line.setAttribute("y2", (p0.y + dy).toFixed(1));
      var label = mark.querySelector("text");
      if (label) { label.setAttribute("x", (p0.x + dx * 1.9).toFixed(1)); label.setAttribute("y", (p0.y + dy * 1.9 + 5).toFixed(1)); }
    });
    var lapIndex = 0;
    var best = Infinity;
    var bestSectors = [Infinity, Infinity, Infinity];
    var laps = [];
    var lapStart = 0;
    var sectorShown = [false, false, false];
    var running = false;
    var raf = 0;
    var pausedAt = 0;
    var toastTimer = 0;

    trail.style.strokeDasharray = TRAIL_LENGTH + " " + len;

    function placeCar(progress) {
      var p = path.getPointAtLength(progress * len);
      car.setAttribute("cx", p.x.toFixed(1));
      car.setAttribute("cy", p.y.toFixed(1));
      var head = progress * len;
      trail.style.strokeDashoffset = String(-(head - TRAIL_LENGTH));
    }

    function sectorTimes(lapTime) {
      return SECTOR_SPLITS.map(function (r) { return lapTime * r; });
    }

    function renderPhoneLaps() {
      if (!phone.list) return;
      var recent = laps.slice(-4).reverse();
      phone.list.innerHTML = recent.map(function (t, i) {
        var n = laps.length - i;
        var isBest = t === best;
        return '<li><span class="pos">T' + n + '</span><span>' + (isBest ? '<span class="ui-pill">Meilleur</span>' : "") +
          '</span><span class="t' + (isBest ? " orange" : "") + '">' + fmt(t) + "</span></li>";
      }).join("");
    }

    function showToast(i) {
      if (!phone.toast) return;
      var data = TOASTS[i % TOASTS.length];
      phone.toast.querySelector("b").textContent = data.t;
      phone.toast.querySelector("span").textContent = data.s;
      phone.toast.classList.add("is-shown");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () { phone.toast.classList.remove("is-shown"); }, 2600);
    }

    function completeLap(lapTime) {
      laps.push(lapTime);
      var prevBest = best;
      if (lapTime < best) best = lapTime;
      if (elBest) elBest.textContent = fmt(best);
      if (phone.best) phone.best.textContent = fmt(best);
      if (phone.last) phone.last.textContent = fmt(lapTime);
      if (phone.delta) {
        var d = isFinite(prevBest) ? lapTime - prevBest : 0;
        phone.delta.textContent = isFinite(prevBest) ? fmtDelta(d) : "—";
        phone.delta.className = "ui-mid " + (d <= 0 ? "ui-delta--neg" : "ui-delta--pos");
      }
      renderPhoneLaps();
      showToast(lapIndex);
    }

    function setSector(i, value) {
      var el = sectorEls[i];
      if (!el) return;
      el.textContent = fmtSector(value);
      el.classList.add("is-set");
      el.classList.toggle("is-best", value < bestSectors[i]);
      if (value < bestSectors[i]) bestSectors[i] = value;
    }

    function frame(now) {
      if (!running) return;
      var lapTime = DEMO_LAPS[lapIndex % DEMO_LAPS.length];
      var elapsed = now - lapStart;
      var progress = elapsed / LAP_DURATION_MS;

      if (progress >= 1) {
        var done = sectorTimes(lapTime);
        setSector(2, done[2]);
        completeLap(lapTime);
        lapIndex += 1;
        lapStart = now;
        sectorShown = [false, false, true];
        progress = 0;
        lapTime = DEMO_LAPS[lapIndex % DEMO_LAPS.length];
        if (elLap) elLap.textContent = "Tour " + (lapIndex + 1);
      }

      placeCar(progress);
      if (elNow) elNow.textContent = fmt(progress * lapTime);

      var sectors = sectorTimes(lapTime);
      if (!sectorShown[0] && progress >= SECTOR_SPLITS[0]) {
        sectorShown[0] = true;
        sectorEls[1].classList.remove("is-set", "is-best");
        sectorEls[2].classList.remove("is-set", "is-best");
        setSector(0, sectors[0]);
      }
      if (!sectorShown[1] && progress >= SECTOR_SPLITS[0] + SECTOR_SPLITS[1]) {
        sectorShown[1] = true;
        setSector(1, sectors[1]);
      }

      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      var now = performance.now();
      lapStart = pausedAt ? now - pausedAt : now;
      pausedAt = 0;
      raf = window.requestAnimationFrame(frame);
    }
    function stop() {
      if (!running) return;
      running = false;
      pausedAt = performance.now() - lapStart;
      window.cancelAnimationFrame(raf);
    }

    if (reduced) {
      // État statique lisible : un tour complet affiché, voiture posée.
      placeCar(0.62);
      completeLap(DEMO_LAPS[0]);
      completeLap(DEMO_LAPS[1]);
      var st = sectorTimes(DEMO_LAPS[1]);
      sectorEls.forEach(function (el, i) { el.textContent = fmtSector(st[i]); el.classList.add("is-set"); });
      if (elNow) elNow.textContent = fmt(DEMO_LAPS[1]);
      if (phone.toast) phone.toast.classList.remove("is-shown");
      window.clearTimeout(toastTimer);
      return;
    }

    // Tracé qui se dessine, puis départ
    hero.classList.add("is-drawing");
    placeCar(0);
    window.setTimeout(function () {
      hero.classList.add("is-live");
      observe();
    }, 1300);

    function observe() {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { e.isIntersecting && !document.hidden ? start() : stop(); });
        }, { threshold: 0.1 }).observe(hero);
      } else { start(); }
      document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    }

    // Profondeur : le téléphone suit la souris (pointeurs précis uniquement)
    var phoneWrap = hero.querySelector(".hero__phone");
    if (phoneWrap && window.matchMedia("(pointer: fine)").matches) {
      var pending = false;
      var rx = 6, ry = -16;
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        ry = -16 + x * 14;
        rx = 6 - y * 10;
        if (!pending) {
          pending = true;
          window.requestAnimationFrame(function () {
            phoneWrap.style.transform = "rotateY(" + ry.toFixed(2) + "deg) rotateX(" + rx.toFixed(2) + "deg) rotateZ(1deg)";
            pending = false;
          });
        }
      });
      hero.addEventListener("pointerleave", function () { phoneWrap.style.transform = ""; });
    }
  }

  /* ================================================================
     PARCOURS PRODUIT — téléphone sticky sur desktop
     ================================================================ */
  function initTour() {
    var tour = document.querySelector("[data-tour]");
    if (!tour) return;
    var steps = tour.querySelectorAll(".tour__step");
    var stageScreen = tour.querySelector(".tour__stage .phone__screen");
    var desktop = window.matchMedia("(min-width: 881px)");
    var screens = [];

    if (stageScreen) {
      steps.forEach(function (step, i) {
        var src = step.querySelector(".tour__inline .screen");
        if (!src) return;
        var clone = src.cloneNode(true);
        clone.inert = i !== 0;
        if (i === 0) clone.classList.add("is-active");
        stageScreen.appendChild(clone);
        screens.push(clone);
      });
    }

    function activate(i) {
      steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      screens.forEach(function (s, k) {
        s.classList.toggle("is-active", k === i);
        s.inert = k !== i;
      });
    }
    activate(0);

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && desktop.matches) activate(Array.prototype.indexOf.call(steps, e.target));
        });
      }, { rootMargin: "-45% 0px -45% 0px" });
      steps.forEach(function (s) { io.observe(s); });
    }
  }

  /* ================================================================
     CLASSEMENTS — onglets Global/Amis/Local/National + Auto/Moto
     ================================================================ */
  var HANDLES = ["@apex.hunter", "@late_braker", "@trail.brake", "@slipangle", "@kerb_rider", "@redline.fr", "@flat_out", "@double_apex"];
  var MY_POSITION = { global: 148, amis: 2, local: 6, national: 37 };
  var BASE_TIME = { auto: 101.6, moto: 98.9 };

  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
  }

  function renderBoard(board) {
    var scope = board.getAttribute("data-scope") || "global";
    var kind = board.getAttribute("data-kind") || "auto";
    var rand = seeded(scope + kind);
    var list = board.querySelector("[data-lb-list]");
    var me = MY_POSITION[scope];
    var rows = [];
    var t = BASE_TIME[kind] + (scope === "amis" ? 2.4 : scope === "local" ? 1.1 : scope === "national" ? 0.4 : 0);
    var shift = HANDLES.length ? Math.floor(rand() * HANDLES.length) : 0;
    var shown = me <= 4 ? 5 : 4;
    for (var i = 0; i < shown; i++) {
      t += 0.12 + rand() * 0.55;
      var pos = i + 1;
      var isMe = pos === me;
      rows.push('<li' + (isMe ? ' class="is-me"' : "") + '><span class="pos">' + pos + '</span><span>' +
        (isMe ? "Vous" : HANDLES[(i + shift) % HANDLES.length]) + '</span><span class="t">' + fmt(t) + "</span></li>");
    }
    if (me > shown) {
      rows.push('<li class="is-me"><span class="pos">' + me + '</span><span>Vous</span><span class="t">' + fmt(t + 1.7 + rand()) + "</span></li>");
    }
    list.innerHTML = rows.join("");
  }

  function initBoards() {
    document.querySelectorAll("[data-lb]").forEach(renderBoard);
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-lb-scope], [data-lb-kind]");
      if (!btn) return;
      var board = btn.closest("[data-lb]");
      if (!board) return;
      var attr = btn.hasAttribute("data-lb-scope") ? "data-lb-scope" : "data-lb-kind";
      var key = attr === "data-lb-scope" ? "data-scope" : "data-kind";
      board.setAttribute(key, btn.getAttribute(attr));
      board.querySelectorAll("[" + attr + "]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      renderBoard(board);
    });
  }

  /* ================================================================
     CONVERGENCE — mettre en pause l'animation SVG si mouvement réduit
     ================================================================ */
  function initConverge() {
    document.querySelectorAll("[data-converge]").forEach(function (svg) {
      if (typeof svg.pauseAnimations !== "function") return;
      if (reduced) { svg.pauseAnimations(); return; }
      if (!("IntersectionObserver" in window)) return;
      svg.pauseAnimations();
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations(); });
      }).observe(svg);
    });
  }

  /* ================================================================
     CHALLENGE — compte à rebours de démonstration (fin fictive relative)
     ================================================================ */
  function initChallenge() {
    var clock = document.querySelector("[data-countdown]");
    if (!clock) return;
    var end = Date.now() + ((12 * 24 + 5) * 3600 + 42 * 60) * 1000;
    var d = clock.querySelector("[data-d]"), h = clock.querySelector("[data-h]"), m = clock.querySelector("[data-m]"), s = clock.querySelector("[data-s]");
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      d.textContent = String(Math.floor(left / 86400));
      h.textContent = pad(Math.floor((left % 86400) / 3600));
      m.textContent = pad(Math.floor((left % 3600) / 60));
      s.textContent = pad(left % 60);
    }
    tick();
    if (!reduced) window.setInterval(tick, 1000);
  }

  initHero();
  initTour();
  initBoards();
  initConverge();
  initChallenge();
})();
