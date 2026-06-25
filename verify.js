/* CAW Academy — public verification page.
 *  - With ?token=...  : confirms an email address (from a verification email).
 *  - Otherwise         : verifies a certificate (number + printed name) against
 *                        the public registry, which returns only a yes/no match
 *                        plus course + date — never anyone's name. */
(function () {
  "use strict";

  var API_BASE = "https://api.caw-academy.com";

  var $ = function (id) { return document.getElementById(id); };
  document.getElementById("yr").textContent = new Date().getFullYear();

  function showMessage(elId, text, kind) {
    var el = $(elId);
    el.textContent = "";
    if (!text) return;
    var box = document.createElement("div");
    box.className = "acct-msg " + kind;
    box.textContent = text;
    el.appendChild(box);
  }

  var token = new URLSearchParams(window.location.search).get("token");

  // ── Email-verification mode ──────────────────────────────────────────────
  if (token) {
    $("certSection").classList.add("hidden");
    $("emailSection").classList.remove("hidden");
    showMessage("emailMsg", "Confirming your email…", "ok");
    fetch(API_BASE + "/v1/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token })
    }).then(function (res) {
      if (res.ok) {
        showMessage("emailMsg", "Your email is confirmed. You can now redeem your licence code in the app.", "ok");
      } else {
        showMessage("emailMsg", "This confirmation link is invalid or has expired. Request a new one from the app.", "err");
      }
    }).catch(function () {
      showMessage("emailMsg", "Couldn't reach the server. Please try again.", "err");
    });
    return;
  }

  // ── Certificate-verification mode ────────────────────────────────────────
  function renderResult(data) {
    var el = $("result");
    el.textContent = "";
    el.classList.remove("hidden");
    if (!data.valid) {
      showMessage("msg", "No matching certificate. Check the number and the exact name printed on it.", "err");
      el.classList.add("hidden");
      return;
    }
    showMessage("msg", "Certificate verified.", "ok");
    var rows = [
      ["Course", data.courseTitle || "—"],
      ["Issued", data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : "—"]
    ];
    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "result-row";
      var a = document.createElement("span"); a.textContent = r[0];
      var b = document.createElement("span"); b.textContent = r[1];
      row.appendChild(a); row.appendChild(b);
      el.appendChild(row);
    });
  }

  $("verifyForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var number = $("number").value.trim();
    var name = $("name").value.trim();
    if (!number || !name) return;
    var btn = $("verifyBtn");
    btn.disabled = true;
    showMessage("msg", "", "err");
    $("result").classList.add("hidden");
    var url = API_BASE + "/v1/certificates/verify?number=" +
      encodeURIComponent(number) + "&name=" + encodeURIComponent(name);
    fetch(url).then(function (res) {
      return res.text().then(function (t) {
        var data = t ? JSON.parse(t) : {};
        if (!res.ok) throw new Error((data.error && data.error.message) || "Verification failed.");
        renderResult(data);
      });
    }).catch(function (err) {
      showMessage("msg", err.message || "Couldn't reach the server. Please try again.", "err");
    }).finally(function () { btn.disabled = false; });
  });
})();
