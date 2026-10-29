// Enquiry and contact forms: sent by email to info@themolteno.com through Web3Forms.
// Paste the Web3Forms access key between the quotes below (free key, emailed to info@themolteno.com).
(function () {
  var ACCESS_KEY = "0ffdd311-dc52-4bc4-9132-40f7cd61e1cf";
  var EMAIL = "info@themolteno.com";
  var WHATSAPP = "27723034857";

  document.querySelectorAll("form[data-email-form]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector("button[type=submit]");
    var from = form.querySelector("[name='Date From']");
    var to = form.querySelector("[name='Date To']");
    if (from && to) {
      var today = new Date().toISOString().slice(0, 10);
      from.min = today;
      to.min = today;
      from.addEventListener("change", function () {
        to.min = from.value || today;
        if (to.value && to.value < to.min) to.value = to.min;
      });
    }

    function summary(data, subject) {
      var lines = [subject, ""];
      Object.keys(data).forEach(function (k) {
        if (k.charAt(0) !== "_" && data[k]) lines.push(k + ": " + data[k]);
      });
      return lines.join("\n");
    }

    // Never lose an enquiry: if sending fails, offer the same message by WhatsApp or email.
    function fallback(data, subject) {
      var text = summary(data, subject);
      status.className = "form-status form-status--error";
      status.innerHTML = "Sorry, that did not send automatically. Please send it with one tap: " +
        "<a href=\"https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text) + "\">WhatsApp</a> or " +
        "<a href=\"mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text) + "\">email</a>.";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data._honey) return;
      var subject = data._subject || "Website enquiry: The Molteno";
      button.disabled = true;
      status.className = "form-status";
      status.textContent = "Sending...";

      if (!ACCESS_KEY) { fallback(data, subject); button.disabled = false; return; }

      var payload = { access_key: ACCESS_KEY, subject: subject, from_name: "The Molteno website" };
      Object.keys(data).forEach(function (k) { if (k.charAt(0) !== "_") payload[k] = data[k]; });

      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: ctl ? ctl.signal : undefined
      })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (!r.success) throw new Error("not sent");
          form.reset();
          status.className = "form-status form-status--ok";
          status.textContent = "Thank you. Your message has been sent and we will be in touch very soon.";
        })
        .catch(function () { fallback(data, subject); })
        .then(function () { clearTimeout(timer); button.disabled = false; });
    });
  });
})();
