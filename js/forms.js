// Enquiry and contact forms: sent by email to info@themolteno.com through FormSubmit.
(function () {
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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      button.disabled = true;
      status.className = "form-status";
      status.textContent = "Sending, this can take up to a minute. Please keep this page open.";
      fetch("https://formsubmit.co/ajax/info@themolteno.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (r.success === "true" || r.success === true) {
            form.reset();
            status.className = "form-status form-status--ok";
            status.textContent = "Thank you. Your message has been sent and we will be in touch very soon.";
          } else {
            throw new Error("not sent");
          }
        })
        .catch(function () {
          status.className = "form-status form-status--error";
          status.innerHTML = "Sorry, that did not send. Please email <a href=\"mailto:info@themolteno.com\">info@themolteno.com</a> or message us on <a href=\"https://wa.me/27723034857\">WhatsApp</a>.";
        })
        .then(function () { button.disabled = false; });
    });
  });
})();
