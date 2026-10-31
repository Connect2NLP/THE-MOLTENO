// Landing page music: starts on the visitor's first tap (phones block sound until then).
(function () {
  var audio = document.getElementById("lpMusic");
  var btn = document.getElementById("musicToggle");
  var hint = document.getElementById("musicHint");
  if (!audio || !btn) return;
  var stopped = false;
  audio.volume = 0.8;

  var setState = function (playing) {
    btn.setAttribute("aria-pressed", String(playing));
    if (hint) hint.hidden = playing || stopped;
  };
  var start = function () {
    if (stopped) return;
    var p = audio.play();
    if (p && p.then) p.then(function () { setState(true); }).catch(function () { setState(false); });
  };

  var gestures = ["pointerup", "click", "touchend", "keydown"];
  var onGesture = function (ev) {
    if (stopped) return;
    if (ev && ev.target && ev.target.closest && ev.target.closest("#musicToggle")) return;
    if (!audio.paused) return remove();
    audio.play().then(function () { setState(true); remove(); }).catch(function () {
      audio.addEventListener("canplay", start, { once: true });
    });
  };
  var remove = function () { gestures.forEach(function (e) { window.removeEventListener(e, onGesture); }); };
  gestures.forEach(function (e) { window.addEventListener(e, onGesture, { passive: true }); });
  audio.addEventListener("canplay", start, { once: true });
  start();

  btn.addEventListener("click", function () {
    if (audio.paused) {
      stopped = false;
      audio.play().then(function () { setState(true); }).catch(function () { setState(false); });
    } else {
      stopped = true;
      audio.pause();
      setState(false);
    }
  });
})();
