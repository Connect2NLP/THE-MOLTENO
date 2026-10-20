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

  // Try to start straight away. Browsers often block sound until the visitor
  // interacts with the page, so if that happens, start on the first interaction.
  start();
  ["pointerdown", "keydown", "touchstart", "scroll"].forEach((evt) => {
    window.addEventListener(
      evt,
      () => {
        if (bgMusic.paused) start();
      },
      { once: true, passive: true }
    );
  });

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
