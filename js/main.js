const header = document.getElementById('siteHeader');

if (header) {
  // Pages that start with a solid header keep it solid.
  const alwaysSolid = header.classList.contains('is-scrolled');
  const onScroll = () => {
    if (alwaysSolid || window.scrollY > 40) {
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
