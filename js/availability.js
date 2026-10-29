// Availability: reads blocked dates from Supabase and shows them on the rooms page and enquiry form.
// Dates are nights: a booking from 10 to 13 blocks the nights of the 10th, 11th and 12th;
// the 13th (check-out day) is free for the next guest to arrive.
(function () {
  var URL = "https://dfttgmchlfhwxkxueqva.supabase.co";
  var KEY = "sb_publishable_LBtxYidEdPaqDdkTcKB9HA_gwCSJ0IX";

  // To add the 6th room: add a line here and the matching row in the Supabase "rooms" table.
  var ROOMS = [
    { id: "azura", name: "Azura Haven", match: /azura/i },
    { id: "sanctuary", name: "The Sanctuary", match: /sanctuary/i },
    { id: "studio", name: "The Studio", match: /studio/i },
    { id: "monarch", name: "The Monarch Suite", match: /monarch/i },
    { id: "panorama", name: "The Panorama Suite", match: /panorama/i }
  ];

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var key = function (y, m, d) { return y + "-" + pad(m + 1) + "-" + pad(d); };
  var todayKey = function () { var t = new Date(); return key(t.getFullYear(), t.getMonth(), t.getDate()); };

  var blocked = null;
  function load(force) {
    if (blocked && !force) return blocked;
    blocked = fetch(URL + "/rest/v1/blocked_dates?select=room_id,check_in,check_out", { headers: { apikey: KEY } })
      .then(function (r) { if (!r.ok) throw new Error("load"); return r.json(); })
      .catch(function () { blocked = null; return null; });
    return blocked;
  }

  function nightBooked(list, roomId, day) {
    return list.some(function (b) { return b.room_id === roomId && b.check_in <= day && day < b.check_out; });
  }
  function rangeFree(list, roomId, from, to) {
    return !list.some(function (b) { return b.room_id === roomId && from < b.check_out && to > b.check_in; });
  }

  // One month grid; booked nights are crossed out, past days are dimmed.
  function renderCalendar(el, roomId, list) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var max = new Date(now.getFullYear() + 2, now.getMonth(), 1);
    function draw() {
      var first = new Date(y, m, 1);
      var offset = (first.getDay() + 6) % 7; // week starts Monday
      var days = new Date(y, m + 1, 0).getDate();
      var today = todayKey();
      var html = '<div class="cal__head"><button type="button" class="cal__nav" data-d="-1" aria-label="Previous month">&lsaquo;</button>' +
        '<strong>' + MONTHS[m] + " " + y + '</strong>' +
        '<button type="button" class="cal__nav" data-d="1" aria-label="Next month">&rsaquo;</button></div>' +
        '<div class="cal__grid">' + ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(function (d) { return '<span class="cal__dow">' + d + "</span>"; }).join("");
      for (var i = 0; i < offset; i++) html += "<span></span>";
      for (var d = 1; d <= days; d++) {
        var k = key(y, m, d);
        var cls = "cal__day";
        if (k < today) cls += " is-past";
        else if (nightBooked(list, roomId, k)) cls += " is-booked";
        html += '<span class="' + cls + '">' + d + "</span>";
      }
      html += '</div><p class="cal__legend"><i class="cal__key"></i> Booked</p>';
      el.innerHTML = html;
      el.querySelectorAll(".cal__nav").forEach(function (b) {
        b.addEventListener("click", function () {
          var n = new Date(y, m + Number(b.getAttribute("data-d")), 1);
          if (n < new Date(now.getFullYear(), now.getMonth(), 1) || n > max) return;
          y = n.getFullYear(); m = n.getMonth(); draw();
        });
      });
    }
    draw();
  }

  window.MoltenoAvail = { URL: URL, KEY: KEY, ROOMS: ROOMS, MONTHS: MONTHS, key: key, load: load, nightBooked: nightBooked, rangeFree: rangeFree, renderCalendar: renderCalendar };

  // ---- rooms & rates page: a calendar under each room ----
  document.querySelectorAll("details.avail[data-room]").forEach(function (box) {
    box.addEventListener("toggle", function () {
      if (!box.open || box.getAttribute("data-ready")) return;
      var el = box.querySelector(".avail__cal");
      el.textContent = "Loading availability...";
      load().then(function (list) {
        if (!list) { el.textContent = "Availability is not available right now. Please enquire and we will confirm."; return; }
        box.setAttribute("data-ready", "1");
        renderCalendar(el, box.getAttribute("data-room"), list);
      });
    });
  });

  // ---- enquiry form: warn when the chosen suite is already booked ----
  var from = document.querySelector("form[data-email-form] [name='Date From']");
  var to = document.querySelector("form[data-email-form] [name='Date To']");
  var suite = document.querySelector("form[data-email-form] [name='Suite']");
  if (from && to && suite) {
    var note = document.createElement("p");
    note.className = "form-status avail-note";
    note.setAttribute("role", "status");
    to.closest(".form-row").insertAdjacentElement("afterend", note);

    var check = function () {
      note.textContent = ""; note.className = "form-status avail-note";
      to.setCustomValidity(""); from.setCustomValidity("");
      if (!from.value || !to.value || to.value <= from.value) return;
      load().then(function (list) {
        if (!list) return;
        var room = ROOMS.filter(function (r) { return r.match.test(suite.value); })[0];
        if (room) {
          if (!rangeFree(list, room.id, from.value, to.value)) {
            var free = ROOMS.filter(function (r) { return rangeFree(list, r.id, from.value, to.value); });
            note.className = "form-status form-status--error avail-note";
            note.textContent = room.name + " is already booked for some of these dates." +
              (free.length ? " Available for your dates: " + free.map(function (r) { return r.name; }).join(", ") + "." : " No suites are free for these dates; please try other dates.");
            to.setCustomValidity("These dates are not available for the chosen suite.");
          } else {
            note.className = "form-status form-status--ok avail-note";
            note.textContent = room.name + " is available for these dates.";
          }
        } else {
          var open = ROOMS.filter(function (r) { return rangeFree(list, r.id, from.value, to.value); });
          if (open.length) {
            note.className = "form-status form-status--ok avail-note";
            note.textContent = "Available for your dates: " + open.map(function (r) { return r.name; }).join(", ") + ".";
          } else {
            note.className = "form-status form-status--error avail-note";
            note.textContent = "No suites are free for these dates; please try other dates.";
            to.setCustomValidity("No suites are free for these dates.");
          }
        }
      });
    };
    [from, to, suite].forEach(function (el) { el.addEventListener("change", check); });
  }
})();
