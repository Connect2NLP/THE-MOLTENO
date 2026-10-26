// Life at The Molteno: cinematic photo tour.
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
  const fsBtn = document.getElementById("tourFs");
  const closeBtn = document.getElementById("tourClose");
  const prevBtn = document.getElementById("tourPrev");
  const nextBtn = document.getElementById("tourNext");
  const againBtn = document.getElementById("tourAgain");

  const SLIDE_MS = 6200;
  const TITLE_MS = 4800;
  const steps = [{ t: "title" }, ...data.map((_, i) => ({ t: "slide", i })), { t: "end" }];
  const iconPause = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  const iconPlay = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>';

  tour.style.setProperty("--ms", SLIDE_MS + "ms");

  const slideEls = data.map((d, i) => {
    const el = document.createElement("div");
    el.className = "tour__slide" + (i % 2 ? " is-alt" : "");
    const img = new Image();
    img.alt = d.alt;
    img.decoding = "async";
    img.dataset.src = d.src;
    el.style.setProperty("--ms", (d.ms || SLIDE_MS) + "ms");
    if (d.layout === "spread") {
      el.classList.add("is-spread");
      const grid = document.createElement("div");
      grid.className = "tour__spread";
      img.className = "tour__main";
      grid.appendChild(img);
      for (let k = 0; k < (d.extras || 0); k++) {
        const ph = document.createElement("div");
        ph.className = "tour__ph";
        ph.setAttribute("role", "img");
        ph.setAttribute("aria-label", "Photo coming soon");
        ph.textContent = "Photo coming soon";
        grid.appendChild(ph);
      }
      el.appendChild(grid);
    } else {
      el.appendChild(img);
    }
    stage.appendChild(el);
    return el;
  });
  const segEls = data.map((d) => {
    const s = document.createElement("span");
    s.className = "tour__seg";
    s.style.setProperty("--ms", (d.ms || SLIDE_MS) + "ms");
    s.appendChild(document.createElement("i"));
    segsWrap.appendChild(s);
    return s;
  });

  let cur = 0;
  let timer = null;
  let startedAt = 0;
  let remaining = 0;
  let paused = false;
  let idleTimer = null;
  let captionToken = 0;
  let lastFocus = null;

  const load = (i) => {
    const img = slideEls[i] && slideEls[i].querySelector("img");
    if (img && !img.getAttribute("src")) img.src = img.dataset.src;
  };

  const run = () => {
    clearTimeout(timer);
    if (steps[cur].t === "end") return;
    startedAt = performance.now();
    timer = setTimeout(() => go(cur + 1), remaining);
  };

  const go = (n) => {
    cur = Math.max(0, Math.min(steps.length - 1, n));
    const s = steps[cur];
    clearTimeout(timer);

    slideEls.forEach((el, i) => el.classList.toggle("is-active", s.t === "slide" && s.i === i));
    tour.classList.toggle("has-long", s.t === "slide" && !!data[s.i].title);
    titleCard.classList.toggle("is-on", s.t === "title");
    endCard.classList.toggle("is-on", s.t === "end");

    const token = ++captionToken;
    caption.classList.remove("is-on");
    if (s.t === "slide") {
      load(s.i);
      load(s.i + 1);
      setTimeout(() => {
        if (token !== captionToken) return;
        captionNo.textContent = "No. " + String(s.i + 1).padStart(2, "0") + " / " + String(data.length).padStart(2, "0");
        const d = data[s.i];
        captionText.textContent = "";
        caption.classList.toggle("is-long", !!d.title);
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
          const bd = document.createElement("span");
          bd.className = "tour__body";
          bd.textContent = d.cap;
          captionText.appendChild(bd);
        } else {
          captionText.textContent = d.cap;
        }
        caption.classList.add("is-on");
      }, 900);
    }

    segEls.forEach((seg, i) => {
      seg.classList.remove("is-active", "is-done");
      if (s.t === "end" || (s.t === "slide" && i < s.i)) seg.classList.add("is-done");
      if (s.t === "slide" && i === s.i) {
        void seg.offsetWidth;
        seg.classList.add("is-active");
      }
    });

    prevBtn.style.visibility = cur <= 1 ? "hidden" : "visible";
    nextBtn.style.visibility = s.t === "end" ? "hidden" : "visible";

    remaining = s.t === "title" ? TITLE_MS : s.t === "slide" ? data[s.i].ms || SLIDE_MS : 0;
    if (!paused) run();
  };

  const setPaused = (p) => {
    if (p === paused) return;
    paused = p;
    tour.classList.toggle("is-paused", p);
    playBtn.innerHTML = p ? iconPlay : iconPause;
    playBtn.setAttribute("aria-label", p ? "Play" : "Pause");
    if (p) {
      clearTimeout(timer);
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    } else {
      run();
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
    document.body.style.overflow = "hidden";
    slideEls.forEach((el) => el.classList.remove("is-active"));
    load(0);
    load(1);
    setTimeout(() => go(0), 700);
    wake();
    closeBtn.focus();
  };

  const close = () => {
    clearTimeout(timer);
    captionToken++;
    tour.classList.remove("is-open", "is-idle");
    tour.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (document.fullscreenElement) document.exitFullscreen();
    setTimeout(() => {
      slideEls.forEach((el) => el.classList.remove("is-active"));
      titleCard.classList.remove("is-on");
      endCard.classList.remove("is-on");
      caption.classList.remove("is-on", "is-long");
      tour.classList.remove("has-long");
    }, 900);
    if (lastFocus) lastFocus.focus();
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  playBtn.addEventListener("click", () => setPaused(!paused));
  nextBtn.addEventListener("click", () => go(cur + 1));
  prevBtn.addEventListener("click", () => go(cur - 1));
  againBtn.addEventListener("click", () => { setPaused(false); go(0); });
  fsBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (tour.requestFullscreen) tour.requestFullscreen();
  });
  tour.addEventListener("mousemove", wake);
  tour.addEventListener("touchstart", wake, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (!tour.classList.contains("is-open")) return;
    wake();
    if (e.key === "Escape") close();
    else if (e.key === " " && e.target === document.body) { e.preventDefault(); setPaused(!paused); }
    else if (e.key === "ArrowRight") go(cur + 1);
    else if (e.key === "ArrowLeft" && cur > 1) go(cur - 1);
  });
})();
