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

const musicToggle = document.getElementById("musicToggle");
const bgMusic = document.getElementById("bgMusicPlayer");

if (musicToggle && bgMusic) {
  let userStopped = false;
  bgMusic.volume = 1;

  const setState = (playing) => {
    musicToggle.setAttribute("aria-pressed", String(playing));
  };

  const start = () => {
    if (userStopped) return;
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
    if (userStopped) return;
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
      bgMusic.play().then(() => setState(true)).catch(() => setState(false));
    } else {
      userStopped = true;
      bgMusic.pause();
      setState(false);
    }
  });
}

// Room photo slideshows: slow cross-fade; clicking the photo holds it still.
document.querySelectorAll("[data-slideshow]").forEach((root) => {
  const frame = root.querySelector(".slideshow__frame");
  const slides = [...root.querySelectorAll(".slide")];
  const dots = [...root.querySelectorAll(".slideshow__dot")];
  const status = root.querySelector(".slideshow__status");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INTERVAL = 5500;
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
