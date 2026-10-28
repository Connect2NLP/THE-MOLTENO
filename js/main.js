const header = document.getElementById('siteHeader');

if (header) {
  const onScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

const navToggle = document.getElementById('navToggle');

if (navToggle && header) {
  const closeMenu = () => {
    header.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  header.querySelectorAll('.nav a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

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

  const setState = (playing) => {
    musicToggle.setAttribute("aria-pressed", String(playing));
  };

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
  const onGesture = () => {
    if (userStopped || tourOpen) return;
    if (!bgMusic.paused) return removeGestures();
    bgMusic.play().then(() => {
      setState(true);
      removeGestures();
    }).catch(() => {});
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

// Room photo slideshows: slow cross-fade; clicking the photo holds it still.
document.querySelectorAll("[data-slideshow]").forEach((root) => {
  const frame = root.querySelector(".slideshow__frame");
  const slides = [...root.querySelectorAll(".slide")];
  const dots = [...root.querySelectorAll(".slideshow__dot")];
  const status = root.querySelector(".slideshow__status");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INTERVAL = 3500;
  let index = 0;
  let timer = null;
  let held = false;
  let visible = false;

  const show = (n) => {
    slides[index].classList.remove("is-active");
    dots[index].classList.remove("is-active");
    dots[index].removeAttribute("aria-current");
    index = (n + slides.length) % slides.length;
    slides[index].classList.add("is-active");
    dots[index].classList.add("is-active");
    dots[index].setAttribute("aria-current", "true");
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
    root.classList.remove("is-playing");
  };
  const play = () => {
    if (reduceMotion || held || !visible || timer) return;
    root.classList.add("is-playing");
    timer = setInterval(() => show(index + 1), INTERVAL);
  };
  const hold = () => {
    held = true;
    stop();
    if (status) status.textContent = "Held \u00b7 click to play";
  };
  const resume = () => {
    held = false;
    if (status) status.textContent = "Click the photo to hold it";
    play();
  };
  const toggle = () => {
    if (reduceMotion) return show(index + 1);
    held ? resume() : hold();
  };

  frame.addEventListener("click", toggle);
  frame.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
  dots.forEach((dot, n) => {
    dot.addEventListener("click", () => {
      show(n);
      hold();
    });
  });

  // Only run while the room is on screen.
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) play();
    else stop();
  }, { threshold: 0.35 }).observe(root);
});

// Life at The Molteno: gentle reveals and a photo viewer.
(() => {
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach((el) => {
      const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("reveal")) : [];
      el.style.setProperty("--d", Math.min(siblings.indexOf(el), 5) * 110 + "ms");
      io.observe(el);
    });
  }

  const box = document.getElementById("lightbox");
  if (!box) return;
  const img = box.querySelector(".lightbox__img");
  const cap = box.querySelector(".lightbox__caption");
  let items = [];
  let current = 0;
  let lastFocus = null;

  const render = (n, instant) => {
    const fig = items[n];
    const src = fig.querySelector("img");
    const text = fig.querySelector("figcaption");
    const apply = () => {
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = text ? text.textContent : "";
      img.classList.remove("is-fading");
      cap.classList.remove("is-fading");
    };
    if (instant) return apply();
    img.classList.add("is-fading");
    cap.classList.add("is-fading");
    setTimeout(apply, 380);
  };
  const open = (fig) => {
    items = [...document.querySelectorAll(".life-item")].filter((f) => f.querySelector("img"));
    current = items.indexOf(fig);
    lastFocus = document.activeElement;
    render(current, true);
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    box.querySelector(".lightbox__btn--close").focus();
  };
  const close = () => {
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };
  const step = (d) => {
    current = (current + d + items.length) % items.length;
    render(current);
  };

  document.addEventListener("click", (e) => {
    const fig = e.target.closest(".life-item");
    if (fig && fig.querySelector("img") && e.target.tagName === "IMG") open(fig);
  });
  box.querySelector(".lightbox__btn--close").addEventListener("click", close);
  box.querySelector(".lightbox__btn--prev").addEventListener("click", () => step(-1));
  box.querySelector(".lightbox__btn--next").addEventListener("click", () => step(1));
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
})();
