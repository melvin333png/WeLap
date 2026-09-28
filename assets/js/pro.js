/* WeLap Pro — démonstration interactive du parcours QR code. */
(function () {
  "use strict";

  var demo = document.querySelector("[data-demo]");
  if (!demo) return;

  var screens = demo.querySelectorAll("[data-demo-screen]");
  var bars = demo.querySelectorAll(".demo__progress i");
  var caption = demo.querySelector("[data-demo-caption]");
  var startBtn = demo.querySelector("[data-demo-start]");
  var replayBtn = demo.querySelector("[data-demo-replay]");
  var STEP_MS = window.WELAP_REDUCED_MOTION ? 3200 : 2400;
  var CAPTIONS = [
    "Le pilote ouvre WeLap et scanne le QR code de fin de session.",
    "Son résultat rejoint son profil : temps, position, kart, session.",
    "WeLap compare avec ses visites précédentes : nouveau record personnel.",
    "Il se situe dans le classement du mois. Il a déjà un objectif pour sa prochaine visite.",
  ];
  var timer = null;
  var step = 0;

  function show(i) {
    step = i;
    screens.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
    bars.forEach(function (b, k) { b.classList.toggle("on", k <= i); });
    if (caption) caption.textContent = CAPTIONS[i];
  }

  function run() {
    window.clearTimeout(timer);
    show(0);
    startBtn.disabled = true;
    replayBtn.hidden = true;
    var next = function () {
      if (step >= screens.length - 1) {
        startBtn.disabled = false;
        replayBtn.hidden = false;
        return;
      }
      timer = window.setTimeout(function () { show(step + 1); next(); }, step === 0 ? 1600 : STEP_MS);
    };
    next();
  }

  var phoneEl = demo.querySelector(".demo__phone");
  startBtn.addEventListener("click", function () {
    run();
    // Sur mobile le téléphone est sous le tableau : on l'amène à l'écran
    if (phoneEl && window.matchMedia("(max-width: 960px)").matches) {
      phoneEl.scrollIntoView({ behavior: window.WELAP_REDUCED_MOTION ? "auto" : "smooth", block: "center" });
    }
  });
  replayBtn.addEventListener("click", run);
})();
