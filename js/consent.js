// Cookie notice and Meta Pixel. The Pixel only loads after the visitor presses Accept.
// Paste the Meta Pixel ID between the quotes below.
(function () {
  var PIXEL_ID = "";
  var KEY = "molteno-cookies";
  var get = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var set = function (v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage blocked */ } };
  var loaded = false;

  function loadPixel() {
    if (loaded || !PIXEL_ID) return;
    loaded = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
  }

  // Other scripts call this: Lead after an enquiry is sent, Contact when WhatsApp is tapped.
  window.moltenoTrack = function (name) {
    if (get() === "accepted" && window.fbq) fbq("track", name);
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href*='wa.me']");
    if (a) window.moltenoTrack("Contact");
  });

  var banner;
  function hide() { if (banner) { banner.remove(); banner = null; } }
  function show() {
    if (banner) return;
    banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie notice");
    banner.innerHTML = '<p>We use cookies to measure how well our adverts work. You can accept or decline; the site works the same either way. See our <a href="privacy-policy.html">privacy policy</a>.</p>' +
      '<div><button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-c="declined">Decline</button>' +
      '<button type="button" class="cookie-banner__btn" data-c="accepted">Accept</button></div>';
    banner.addEventListener("click", function (e) {
      var c = e.target.getAttribute && e.target.getAttribute("data-c");
      if (!c) return;
      set(c); hide();
      if (c === "accepted") loadPixel();
    });
    document.body.appendChild(banner);
  }

  // A "Cookie settings" link anywhere on the page lets visitors change their mind.
  document.addEventListener("click", function (e) {
    var l = e.target.closest && e.target.closest("[data-cookie-settings]");
    if (l) { e.preventDefault(); show(); }
  });

  var saved = get();
  if (saved === "accepted") loadPixel();
  else if (!saved) show();
})();
