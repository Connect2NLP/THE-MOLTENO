// Site shell: the soundtrack and page changes that never reload the page.
// The music player lives here and survives every page change, so the track never
// stops or restarts as visitors move around. Page scripts are re-run for each new page.
(function () {
  if (window.__moltenoShell) return;
  window.__moltenoShell = true;

  // ---- remember listeners that page scripts add to window/document, so they can be removed on the next page ----
  var tracked = [];
  var tracking = false;
  var nativeAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (tracking && (this === window || this === document)) tracked.push([this, type, fn, opts]);
    return nativeAdd.call(this, type, fn, opts);
  };
  var dropTracked = function () {
    tracked.forEach(function (t) { t[0].removeEventListener(t[1], t[2], t[3]); });
    tracked = [];
  };

  // ---- soundtrack ----
  (function () {
  // Background music: one soundtrack across the whole site. Every page carries the
  // player and button, the track picks up where the last page left off, and it
  // steps aside while the photo tour (which has its own music) is open.
  const MUSIC_KEY = "molteno-music";
  const readMusic = () => { try { return JSON.parse(sessionStorage.getItem(MUSIC_KEY)) || {}; } catch (e) { return {}; } };
  const writeMusic = (patch) => { try { sessionStorage.setItem(MUSIC_KEY, JSON.stringify(Object.assign(readMusic(), patch))); } catch (e) { /* storage blocked */ } };
  
  if (!document.getElementById("bgMusicPlayer")) {
    document.body.insertAdjacentHTML("beforeend", `
    <audio id="bgMusicPlayer" src="assets/audio/molteno-music.mp3" loop preload="auto"></audio>
    <button id="musicToggle" class="music-toggle" aria-label="Toggle background music" aria-pressed="false">
      <svg class="music-toggle__icon music-toggle__icon--muted" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>
        <line x1="16" y1="9" x2="21" y2="15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="21" y1="9" x2="16" y2="15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <svg class="music-toggle__icon music-toggle__icon--on" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>
        <path d="M16 9c1.2 1 1.9 2.1 1.9 3.5S17.2 15 16 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M18.2 6.8c2 1.6 3.1 3.5 3.1 5.7s-1.1 4.1-3.1 5.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>`);
  }
  
  const musicToggle = document.getElementById("musicToggle");
  const bgMusic = document.getElementById("bgMusicPlayer");
  
  if (musicToggle && bgMusic) {
    let userStopped = !!readMusic().stopped;
    let tourOpen = false;
    let fadeTimer = null;
    bgMusic.volume = 1;
  
    // Phones will not play sound until the visitor touches the page, so while
    // the music is off the button shows a small "Tap for music" hint.
    let hint = document.getElementById("musicHint");
    if (!hint) {
      hint = document.createElement("span");
      hint.id = "musicHint";
      hint.className = "music-hint";
      hint.textContent = "Tap for music";
      document.body.appendChild(hint);
    }
    const setState = (playing) => {
      musicToggle.setAttribute("aria-pressed", String(playing));
      hint.hidden = playing || userStopped;
    };
    hint.hidden = userStopped;
  
    // Carry on from where the previous page stopped.
    const resumeAt = readMusic().t;
    if (resumeAt > 0) {
      const seek = () => { try { bgMusic.currentTime = resumeAt; } catch (e) { /* not seekable yet */ } };
      if (bgMusic.readyState >= 1) seek(); else bgMusic.addEventListener("loadedmetadata", seek, { once: true });
    }
    const save = () => writeMusic({ t: bgMusic.currentTime });
    bgMusic.addEventListener("timeupdate", () => { if (Math.round(bgMusic.currentTime * 4) % 4 === 0) save(); });
    window.addEventListener("pagehide", save);
  
    const fadeTo = (target, ms, done) => {
      clearInterval(fadeTimer);
      const from = bgMusic.volume;
      const t0 = performance.now();
      fadeTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        bgMusic.volume = Math.max(0, Math.min(1, from + (target - from) * k));
        if (k >= 1) { clearInterval(fadeTimer); if (done) done(); }
      }, 40);
    };
  
    const start = () => {
      if (userStopped || tourOpen) return;
      const attempt = bgMusic.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.then(() => setState(true)).catch(() => setState(false));
      }
    };
  
    // Try to start straight away. Browsers block sound until the visitor
    // interacts with the page, so if that happens, keep trying on every real
    // interaction (click, tap, key press) until playback actually starts.
    const gestures = ["pointerdown", "pointerup", "click", "touchend", "keydown"];
    const onGesture = (ev) => {
      if (userStopped || tourOpen) return;
      if (ev && ev.target && ev.target.closest && ev.target.closest("#musicToggle")) return;
      if (!bgMusic.paused) return removeGestures();
      bgMusic.play().then(() => {
        setState(true);
        removeGestures();
      }).catch(() => {
        // Not loaded yet on a slow phone connection: try again once it is.
        bgMusic.addEventListener("canplay", start, { once: true });
      });
    };
    const removeGestures = () => gestures.forEach((e) => window.removeEventListener(e, onGesture));
    gestures.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    bgMusic.addEventListener("canplay", start, { once: true });
    start();
  
    musicToggle.addEventListener("click", () => {
      if (bgMusic.paused) {
        userStopped = false;
        writeMusic({ stopped: false });
        bgMusic.volume = 1;
        bgMusic.play().then(() => setState(true)).catch(() => setState(false));
      } else {
        userStopped = true;
        writeMusic({ stopped: true });
        bgMusic.pause();
        setState(false);
      }
    });
  
    // The photo tour has its own soundtrack: fade the site music out while it
    // plays and bring it back when the tour closes.
    window.addEventListener("molteno:tour-open", () => {
      tourOpen = true;
      fadeTo(0, 700, () => { if (tourOpen) bgMusic.pause(); });
    });
    window.addEventListener("molteno:tour-close", () => {
      tourOpen = false;
      if (userStopped) return;
      bgMusic.volume = 0;
      bgMusic.play().then(() => { setState(true); fadeTo(1, 1800); }).catch(() => {});
    });
  }
  
  
  })();

  // ---- page changes without a reload ----
  var cache = {};
  var busy = false;
  var isJs = function (s) { var t = (s.getAttribute("type") || "").toLowerCase(); return !t || t === "text/javascript" || t === "module"; };
  var isShell = function (s) { return /shell.js/.test(s.getAttribute("src") || ""); };
  var text = function (src) {
    if (!cache[src]) cache[src] = fetch(src).then(function (r) { if (!r.ok) throw new Error(src); return r.text(); });
    return cache[src];
  };
  var runScripts = function (list) {
    return list.reduce(function (p, s) {
      return p.then(function () {
        var src = s.getAttribute("src");
        return (src ? text(new URL(src, location.href).href) : Promise.resolve(s.textContent)).then(function (code) {
          try { new Function(code)(); } catch (e) { console.error(e); }
        });
      });
    }, Promise.resolve());
  };
  var sameDoc = function (a, b) { return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search; };
  var audio = function () { return document.getElementById("bgMusicPlayer"); };
  var btn = function () { return document.getElementById("musicToggle"); };

  var swap = function (url, doc) {
    document.title = doc.title;
    document.head.querySelectorAll("style, script[type=\"application/ld+json\"]").forEach(function (n) { n.remove(); });
    doc.head.querySelectorAll("style, script[type=\"application/ld+json\"]").forEach(function (n) { document.head.appendChild(document.importNode(n, true)); });
    ["meta[name=description]", "link[rel=canonical]"].forEach(function (sel) {
      var cur = document.head.querySelector(sel), next = doc.head.querySelector(sel);
      if (cur && next) cur.replaceWith(document.importNode(next, true));
      else if (next) document.head.appendChild(document.importNode(next, true));
      else if (cur) cur.remove();
    });
    var keep = [audio(), btn()];
    Array.prototype.slice.call(document.body.children).forEach(function (el) { if (keep.indexOf(el) < 0) el.remove(); });
    var frag = document.createDocumentFragment();
    var scripts = [];
    Array.prototype.slice.call(doc.body.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === "SCRIPT" && isJs(n)) { if (!isShell(n)) scripts.push(n); return; }
      frag.appendChild(document.importNode(n, true));
    });
    document.body.insertBefore(frag, keep[0]);
    document.body.className = doc.body.className;
    document.body.style.overflow = "";
    return scripts;
  };

  var go = function (url, push) {
    if (busy) return;
    busy = true;
    fetch(url.href).then(function (r) {
      if (!r.ok || !/html/.test(r.headers.get("content-type") || "")) throw new Error("not a page");
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      if (!doc.querySelector(".site-header")) throw new Error("not a site page");
      dropTracked();
      var scripts = swap(url, doc);
      if (push) history.pushState({ soft: true }, "", url.href);
      window.scrollTo(0, 0);
      tracking = true;
      return runScripts(scripts).then(function () {
        if (url.hash) {
          var el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
          if (el) el.scrollIntoView();
        }
        window.dispatchEvent(new Event("molteno:page"));
      });
    }).catch(function () {
      location.href = url.href;
    }).then(function () { busy = false; });
  };

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/.html$/.test(url.pathname)) return;
    if (sameDoc(url, location)) {
      if (url.hash) return; // in-page anchor: the browser handles it
      e.preventDefault();
      window.scrollTo(0, 0);
      return;
    }
    e.preventDefault();
    go(url, true);
  });

  window.addEventListener("popstate", function () {
    go(new URL(location.href), false);
  });
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  tracking = true;
})();
