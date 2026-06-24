/* CAW Academy — password reset page. Reads the one-time token from the email
 * link (?token=...), lets the user set a new password, and calls the backend.
 * No inline script (strict CSP); no tokens stored. */
(function () {
  "use strict";

  var API_BASE = "https://api.caw-academy.com";

  var $ = function (id) { return document.getElementById(id); };
  document.getElementById("yr").textContent = new Date().getFullYear();

  var token = new URLSearchParams(window.location.search).get("token");

  function showMessage(id, text, kind) {
    var el = $(id);
    el.textContent = "";
    if (!text) return;
    var box = document.createElement("div");
    box.className = "acct-msg " + kind;
    box.textContent = text;
    el.appendChild(box);
  }

  if (!token) {
    showMessage("banner", "This reset link is missing or invalid. Please request a new one.", "err");
    $("resetForm").classList.add("hidden");
    return;
  }

  $("resetForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("password").value;
    var confirm = $("confirm").value;
    showMessage("msg", "", "err");
    if (pw.length < 10) { showMessage("msg", "Password must be at least 10 characters.", "err"); return; }
    if (pw !== confirm) { showMessage("msg", "The two passwords don't match.", "err"); return; }

    var btn = $("submit");
    btn.disabled = true;
    fetch(API_BASE + "/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
      body: JSON.stringify({ token: token, newPassword: pw })
    }).then(function (res) {
      if (res.ok) {
        $("resetForm").classList.add("hidden");
        $("done").classList.remove("hidden");
        showMessage("banner", "", "ok");
        return;
      }
      return res.text().then(function (t) {
        var msg = "This reset link is invalid or has expired. Please request a new one.";
        try { msg = JSON.parse(t).error.message || msg; } catch (_) {}
        showMessage("msg", msg, "err");
        btn.disabled = false;
      });
    }).catch(function () {
      showMessage("msg", "Couldn't reach the server. Please try again.", "err");
      btn.disabled = false;
    });
  });
})();
