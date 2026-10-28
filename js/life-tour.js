// Life at The Molteno: cinematic photo tour, cut to the beat of the music.
//
// The music is a steady 125 bpm. The film is built from that beat grid:
// every photo is on screen for a whole number of bars, and each change begins
// half a beat early so the picture lands exactly on the beat. The music is the
// master clock, so pausing, seeking and looping always stay in time.
(() => {
  const openBtn = document.getElementById("tourOpen");
  const tour = document.getElementById("tour");
  const dataEl = document.getElementById("tourData");
  if (!openBtn || !tour || !dataEl) return;

  const data = JSON.parse(dataEl.textContent);
  const stage = document.getElementById("tourStage");
  const caption = document.getElementById("tourCaption");
  const captionNo = document.getElementById("tourNo");
  const captionText = document.getElementById("tourText");
  const segsWrap = document.getElementById("tourSegs");
  const titleCard = document.getElementById("tourTitle");
  const endCard = document.getElementById("tourEnd");
  const playBtn = document.getElementById("tourPlay");
  const soundBtn = document.getElementById("tourSound");
  const fsBtn = document.getElementById("tourFs");
  const closeBtn = document.getElementById("tourClose");
  const prevBtn = document.getElementById("tourPrev");
  const nextBtn = document.getElementById("tourNext");
  const againBtn = document.getElementById("tourAgain");

  // ---- beat grid (measured from assets/audio/tour-music.mp3) ----
  const MUSIC_URL = "assets/audio/tour-music.mp3";
  const BEAT = 0.48006;          // seconds per beat (about 125 bpm)
  const B0 = 0.1508;             // time of the first beat in the file
  const LOOP_BEATS = 168;        // 42 bars: a clean loop point
  const LOOP_START = B0;
  const LOOP_END = B0 + LOOP_BEATS * BEAT;
  const LOOP_LEN = LOOP_END - LOOP_START;
  const LEAD = BEAT / 2;         // start each change half a beat early
  const MUSIC_VOLUME = 0.7;
  const TRANSITIONS = ["dissolve", "push", "zoom", "wipe", "blur", "iris", "glow"];
  const beatTime = (k) => B0 + k * BEAT;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- timeline: how many bars each photo stays ----
  const textLen = (d) => (d.title || "").length + (d.subtitle || "").length + (d.cap || "").length;
  const barsFor = (d) => {
    if (d.bars) return d.bars;
    const chars = (d.title || "").length + (d.subtitle || "").length + (d.cap || "").length;
    const seconds = 1.2 + chars / 22;
    const bars = Math.max(2, Math.ceil(seconds / (4 * BEAT)));
    return d.layout === "spread" ? Math.min(bars, 12) : bars;
  };
  const steps = [{ t: "title", start: 0, beats: 8 }];
  let cursor = 8;
  data.forEach((d, i) => {
    const beats = barsFor(d) * 4;
    steps.push({ t: "slide", i, start: cursor, beats });
    cursor += beats;
  });
  steps.push({ t: "end", start: cursor, beats: 0 });
  const stepStart = (n) => beatTime(steps[n].start);

  const iconPause = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  const iconPlay = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>';

  // ---- mosaic: choose the order and row breaks that make the photos as large as possible ----
  const bestMosaic = (ratios, W, H, gap) => {
    const n = ratios.length;
    const perms = [];
    const permute = (arr, used, cur) => {
      if (cur.length === arr.length) { perms.push(cur.slice()); return; }
      for (let i = 0; i < arr.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.push(arr[i]);
        permute(arr, used, cur);
        cur.pop(); used[i] = false;
      }
    };
    permute([...ratios.keys()], [], []);
    let best = null;
    perms.forEach((p) => {
      for (let mask = 0; mask < (1 << (n - 1)); mask++) {
        const rows = [];
        let row = [p[0]];
        for (let i = 1; i < n; i++) {
          if ((mask >> (i - 1)) & 1) { rows.push(row); row = [p[i]]; } else row.push(p[i]);
        }
        rows.push(row);
        const invS = rows.map((r) => 1 / r.reduce((s, i) => s + ratios[i], 0));
        const A = invS.reduce((a, b) => a + b, 0);
        const Bv = H - gap * (rows.length - 1) + gap * rows.reduce((s, r, k) => s + (r.length - 1) * invS[k], 0);
        let Wt = Bv / A;
        if (Wt > W) Wt = W;
        const hs = rows.map((r, k) => (Wt - gap * (r.length - 1)) * invS[k]);
        if (hs.some((v) => v < 20)) continue;
        // Favour balanced layouts: the sum of log-areas punishes tiny tiles far more than a plain total.
        let area = 0;
        rows.forEach((r, k) => r.forEach((i) => { area += Math.log(hs[k] * hs[k] * ratios[i]); }));
        if (p[0] === 0) area += 0.02; // prefer the original photo first
        if (!best || area > best.area) best = { area, rows, hs };
      }
    });
    return best;
  };
  const layoutMosaic = (el) => {
    const m = el._mosaic;
    if (!m) return;
    const box = m.root;
    const W = box.clientWidth;
    const H = box.clientHeight;
    if (!W || !H) return;
    const gap = parseFloat(getComputedStyle(box).rowGap) || 22;
    const best = bestMosaic(m.ratios, W, H, gap);
    if (!best) return;
    box.textContent = "";
    best.rows.forEach((r, k) => {
      const rowEl = document.createElement("div");
      rowEl.className = "tour__row";
      r.forEach((i) => {
        const tile = m.tiles[i];
        tile.style.width = Math.floor(best.hs[k] * m.ratios[i]) + "px";
        tile.style.height = Math.floor(best.hs[k]) + "px";
        rowEl.appendChild(tile);
      });
      box.appendChild(rowEl);
    });
  };

  // ---- build slides and progress segments ----
  const slideEls = data.map((d, i) => {
    const el = document.createElement("div");
    el.className = "tour__slide" + (i % 2 ? " is-alt" : "");
    const img = new Image();
    img.alt = d.alt;
    img.decoding = "async";
    img.dataset.src = d.src;
    const stepMs = steps[i + 1].beats * BEAT * 1000;
    el.style.setProperty("--ms", Math.round(stepMs + 900) + "ms");
    if (d.layout === "spread") {
      el.classList.add("is-spread");
      const grid = document.createElement("div");
      grid.className = "tour__spread";
      if ((d.photos || []).length + (d.extras || 0) === 3) grid.classList.add("tour__spread--three");
      if ((d.photos || []).length + (d.extras || 0) === 5) grid.classList.add("tour__spread--five");
      img.className = "tour__main";
      grid.appendChild(img);
      let cellIndex = 0;
      (d.photos || []).forEach((p) => {
        const cell = document.createElement("div");
        cell.className = "tour__ph has-photo";
        cell.style.setProperty("--k", ++cellIndex);
        const pi = new Image();
        pi.alt = p.alt;
        pi.decoding = "async";
        pi.dataset.src = p.src;
        cell.appendChild(pi);
        grid.appendChild(cell);
      });
      for (let k = 0; k < (d.extras || 0); k++) {
        const ph = document.createElement("div");
        ph.className = "tour__ph";
        ph.style.setProperty("--k", ++cellIndex);
        ph.setAttribute("role", "img");
        ph.setAttribute("aria-label", "Photo coming soon");
        ph.textContent = "Photo coming soon";
        grid.appendChild(ph);
      }
      el.appendChild(grid);
    } else if (d.layout === "mosaic") {
      el.classList.add("is-mosaic");
      const rootEl = document.createElement("div");
      rootEl.className = "tour__mosaic";
      const items = [{ img, ratio: d.ratio }];
      (d.photos || []).forEach((p) => {
        const pi = new Image();
        pi.alt = p.alt;
        pi.decoding = "async";
        pi.dataset.src = p.src;
        items.push({ img: pi, ratio: p.ratio });
      });
      const tiles = items.map((it, k) => {
        const tile = document.createElement("div");
        tile.className = "tour__tile";
        tile.style.setProperty("--k", k);
        tile.appendChild(it.img);
        return tile;
      });
      tiles.forEach((t) => rootEl.appendChild(t));
      el.appendChild(rootEl);
      el._mosaic = { root: rootEl, tiles, ratios: items.map((it) => it.ratio) };
    } else {
      el.appendChild(img);
    }
    stage.appendChild(el);
    return el;
  });
  const segEls = data.map((_, i) => {
    const s = document.createElement("span");
    s.className = "tour__seg";
    s.style.setProperty("--ms", Math.round(steps[i + 1].beats * BEAT * 1000) + "ms");
    s.appendChild(document.createElement("i"));
    segsWrap.appendChild(s);
    return s;
  });

  const load = (i) => {
    if (!slideEls[i]) return;
    slideEls[i].querySelectorAll("img").forEach((img) => {
      if (!img.getAttribute("src")) img.src = img.dataset.src;
    });
  };

  // ---- audio: Web Audio so the loop is sample-accurate and the clock is exact ----
  let ctx = null;
  let gain = null;
  let source = null;
  let buffer = null;
  let bufferPromise = null;
  let bytesPromise = null;
  let audioClock = false;   // true while the music is the clock
  let F0 = 0;               // film time when the current source started
  let c0 = 0;               // audio-context time when it started
  let muted = false;

  const fetchBytes = () => {
    if (!bytesPromise) bytesPromise = fetch(MUSIC_URL).then((r) => r.arrayBuffer());
    return bytesPromise;
  };
  const decode = (ac, bytes) =>
    new Promise((resolve, reject) => {
      const copy = bytes.slice(0);
      const p = ac.decodeAudioData(copy, resolve, reject);
      if (p && p.catch) p.catch(reject);
    });
  const loadBuffer = () => {
    if (!bufferPromise) {
      bufferPromise = fetchBytes().then((b) => decode(ctx, b)).then((buf) => { buffer = buf; return buf; });
      bufferPromise.catch(() => {});
    }
    return bufferPromise;
  };
  const ensureContext = () => {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
  };
  const stopSource = () => {
    if (source) {
      try { source.stop(); } catch (e) { /* already stopped */ }
      try { source.disconnect(); } catch (e) { /* ignore */ }
      source = null;
    }
    audioClock = false;
  };
  const startSource = (f) => {
    if (!ctx || !buffer) return;
    stopSource();
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = LOOP_START;
    source.loopEnd = LOOP_END;
    source.connect(gain);
    let pos = f;
    if (pos >= LOOP_END) pos = LOOP_START + ((pos - LOOP_START) % LOOP_LEN);
    source.start(0, Math.max(0, pos));
    F0 = f;
    c0 = ctx.currentTime;
    audioClock = true;
  };
  const rampGain = (target, seconds) => {
    if (!gain) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(target, now + seconds);
  };

  // ---- film state ----
  let isOpen = false;
  let paused = false;
  let F = 0;                // film time in seconds
  let cur = -1;
  let lastTs = 0;
  let raf = null;
  let idleTimer = null;
  let captionToken = 0;
  let lastFocus = null;

  const show = (n) => {
    cur = n;
    const s = steps[n];
    // A different transition for each photo, cycling through the set.
    const tr = reduceMotion || s.t !== "slide" ? "dissolve" : TRANSITIONS[s.i % TRANSITIONS.length];
    slideEls.forEach((el, i) => {
      const on = s.t === "slide" && s.i === i;
      const was = el.classList.contains("is-active");
      if (on && !was) {
        el.classList.add("tr-" + tr);
        setTimeout(() => el.classList.remove("tr-" + tr), 900);
      } else if (!on && was) {
        el.classList.add("is-leaving", "lv-" + tr);
        setTimeout(() => el.classList.remove("is-leaving", "lv-" + tr), 900);
      }
      el.classList.toggle("is-active", on);
    });
    tour.classList.toggle("has-long", s.t === "slide" && !!data[s.i].title);
    tour.classList.toggle("has-xlong", s.t === "slide" && !!data[s.i].title && textLen(data[s.i]) > 500);
    if (s.t === "slide" && slideEls[s.i]._mosaic) layoutMosaic(slideEls[s.i]);
    titleCard.classList.toggle("is-on", s.t === "title");
    endCard.classList.toggle("is-on", s.t === "end");

    const token = ++captionToken;
    caption.classList.remove("is-on");
    if (s.t === "slide") {
      load(s.i);
      load(s.i + 1);
      setTimeout(() => {
        if (token !== captionToken) return;
        const d = data[s.i];
        captionNo.textContent = "No. " + String(s.i + 1).padStart(2, "0") + " / " + String(data.length).padStart(2, "0");
        captionText.textContent = "";
        caption.classList.toggle("is-long", !!d.title);
        caption.classList.toggle("is-xlong", !!d.title && textLen(d) > 500);
        if (d.title) {
          const hd = document.createElement("span");
          hd.className = "tour__h";
          hd.textContent = d.title;
          captionText.appendChild(hd);
          if (d.subtitle) {
            const sb = document.createElement("span");
            sb.className = "tour__sub";
            sb.textContent = d.subtitle;
            captionText.appendChild(sb);
          }
          d.cap.split("\n\n").forEach((para) => {
            const bd = document.createElement("span");
            bd.className = "tour__body";
            bd.textContent = para;
            captionText.appendChild(bd);
          });
          if (d.emblem === "crown") {
            const em = document.createElement("span");
            em.className = "tour__emblem";
            em.setAttribute("aria-hidden", "true");
            em.innerHTML = '<svg viewBox="0 0 64 40" fill="currentColor"><path d="M4 8l14 12 14-16 14 16 14-12-6 28H10z"/><circle cx="4" cy="7" r="3.2"/><circle cx="32" cy="3.5" r="3.2"/><circle cx="60" cy="7" r="3.2"/></svg>';
            captionText.insertBefore(em, captionText.firstChild);
          }
        } else {
          captionText.textContent = d.cap;
        }
        caption.classList.add("is-on");
      }, Math.round(BEAT * 1000));
    }

    segEls.forEach((seg, i) => {
      seg.classList.remove("is-active", "is-done");
      if (s.t === "end" || (s.t === "slide" && i < s.i)) seg.classList.add("is-done");
      if (s.t === "slide" && i === s.i) {
        void seg.offsetWidth;
        seg.classList.add("is-active");
      }
    });

    prevBtn.style.visibility = n <= 1 ? "hidden" : "visible";
    nextBtn.style.visibility = s.t === "end" ? "hidden" : "visible";
  };

  const seekToStep = (n) => {
    n = Math.max(0, Math.min(steps.length - 1, n));
    F = stepStart(n);
    if (ctx && buffer && isOpen) startSource(F);
    show(n);
  };

  const tick = (ts) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    if (!isOpen || paused) return;

    if (audioClock && ctx && ctx.state === "running") F = F0 + (ctx.currentTime - c0);
    else if (!audioClock) F += dt;

    let idx = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (F >= stepStart(i) - LEAD) { idx = i; break; }
    }
    if (idx !== cur) show(idx);
  };

  const setPaused = (p) => {
    if (p === paused) return;
    paused = p;
    tour.classList.toggle("is-paused", p);
    playBtn.innerHTML = p ? iconPlay : iconPause;
    playBtn.setAttribute("aria-label", p ? "Play" : "Pause");
    if (ctx) {
      if (p) ctx.suspend();
      else ctx.resume();
    }
  };

  const wake = () => {
    tour.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => tour.classList.add("is-idle"), 3200);
  };

  const open = () => {
    lastFocus = document.activeElement;
    paused = false;
    tour.classList.remove("is-paused");
    playBtn.innerHTML = iconPause;
    tour.classList.add("is-open");
    tour.setAttribute("aria-hidden", "false");
    window.dispatchEvent(new Event("molteno:tour-open"));
    document.body.style.overflow = "hidden";
    slideEls.forEach((el) => el.classList.remove("is-active"));
    load(0);
    load(1);

    isOpen = true;
    F = 0;
    cur = -1;
    lastTs = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);

    // The click that opened the tour lets the browser play sound.
    ensureContext();
    if (ctx) {
      ctx.resume();
      loadBuffer()
        .then(() => {
          if (!isOpen) return;
          startSource(F);
          rampGain(muted ? 0 : MUSIC_VOLUME, 2.5);
        })
        .catch(() => { /* no sound: the film still runs on its own clock */ });
    }
    wake();
    closeBtn.focus();
  };

  const close = () => {
    isOpen = false;
    captionToken++;
    tour.classList.remove("is-open", "is-idle");
    tour.setAttribute("aria-hidden", "true");
    window.dispatchEvent(new Event("molteno:tour-close"));
    document.body.style.overflow = "";
    if (document.fullscreenElement) document.exitFullscreen();
    if (ctx) {
      ctx.resume();
      rampGain(0, 0.9);
      setTimeout(() => {
        if (!isOpen) {
          stopSource();
          ctx.suspend();
        }
      }, 1000);
    }
    setTimeout(() => {
      if (isOpen) return;
      slideEls.forEach((el) => el.classList.remove("is-active"));
      titleCard.classList.remove("is-on");
      endCard.classList.remove("is-on");
      caption.classList.remove("is-on", "is-long", "is-xlong");
      tour.classList.remove("has-long", "has-xlong");
    }, 900);
    if (lastFocus) lastFocus.focus();
  };

  // Start fetching the music as soon as someone shows interest.
  ["pointerenter", "focus", "touchstart"].forEach((evt) => openBtn.addEventListener(evt, fetchBytes, { once: true, passive: true }));

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  playBtn.addEventListener("click", () => setPaused(!paused));
  nextBtn.addEventListener("click", () => seekToStep(cur + 1));
  prevBtn.addEventListener("click", () => seekToStep(cur - 1));
  againBtn.addEventListener("click", () => {
    setPaused(false);
    seekToStep(0);
  });
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      muted = !muted;
      soundBtn.setAttribute("aria-pressed", String(muted));
      soundBtn.setAttribute("aria-label", muted ? "Unmute music" : "Mute music");
      if (ctx && gain) rampGain(muted ? 0 : MUSIC_VOLUME, 0.25);
    });
  }
  fsBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (tour.requestFullscreen) tour.requestFullscreen();
  });
  window.addEventListener("resize", () => {
    slideEls.forEach((el) => { if (el._mosaic && el.classList.contains("is-active")) layoutMosaic(el); });
  });
  tour.addEventListener("mousemove", wake);
  tour.addEventListener("touchstart", wake, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (!tour.classList.contains("is-open")) return;
    wake();
    if (e.key === "Escape") close();
    else if (e.key === " " && e.target === document.body) { e.preventDefault(); setPaused(!paused); }
    else if (e.key === "ArrowRight") seekToStep(cur + 1);
    else if (e.key === "ArrowLeft" && cur > 1) seekToStep(cur - 1);
  });

  // exposed for testing
  window.__tour = { steps, BEAT, B0, getF: () => F, isAudio: () => audioClock };
})();
