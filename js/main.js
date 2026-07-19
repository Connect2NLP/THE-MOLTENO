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

const musicToggle = document.getElementById('musicToggle');
const musicPlayerEl = document.getElementById('bgMusicPlayer');

if (musicToggle && musicPlayerEl) {
  const BG_MUSIC_VIDEO_ID = 'vZzbTdnbLmo';
  let ytPlayer = null;
  let userStopped = false;
  let isMuted = true;

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  const tryUnmute = () => {
    if (!ytPlayer || typeof ytPlayer.unMute !== 'function' || userStopped || !isMuted) return;
    ytPlayer.setVolume(100);
    ytPlayer.unMute();
    ytPlayer.playVideo();
    isMuted = false;
    musicToggle.setAttribute('aria-pressed', 'true');
  };

  // Browsers block audio autoplay until the user has interacted with the
  // page — so start silently, then unmute on the very first interaction
  // instead of making the visitor find and press a play button.
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
    window.addEventListener(evt, tryUnmute, { once: true, passive: true });
  });

  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('bgMusicPlayer', {
      videoId: BG_MUSIC_VIDEO_ID,
      playerVars: {
        autoplay: 1,
        mute: 1,
        loop: 1,
        controls: 0,
        playsinline: 1,
        playlist: BG_MUSIC_VIDEO_ID,
      },
      events: {
        onReady: (event) => {
          event.target.mute();
          event.target.playVideo();
          // In case the user already interacted with the page before the player was ready.
          tryUnmute();
        },
      },
    });
    window.__ytPlayer = ytPlayer;
  };

  musicToggle.addEventListener('click', () => {
    if (!ytPlayer || typeof ytPlayer.unMute !== 'function') return;
    isMuted = !isMuted;
    userStopped = isMuted;
    if (isMuted) {
      ytPlayer.mute();
    } else {
      ytPlayer.setVolume(100);
      ytPlayer.unMute();
      ytPlayer.playVideo();
    }
    musicToggle.setAttribute('aria-pressed', String(!isMuted));
  });
}
