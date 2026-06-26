/* CAW Academy — public verification page.
 *  - With ?token=... : confirms an email address (from a verification email).
 *  - With ?cert=...  : QR scan from a certificate — the token is unguessable, so
 *                      the holder is presenting the certificate; we show the FULL
 *                      details (name, course, date, score) and "genuine".
 *  - Otherwise       : manual check (number + printed name) — returns only a
 *                      yes/no match, never anyone's name. */
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

  // Renders a labelled detail row into the result box.
  function addRow(el, label, value) {
    var row = document.createElement("div");
    row.className = "result-row";
    var a = document.createElement("span"); a.textContent = label;
    var b = document.createElement("span"); b.textContent = value;
    row.appendChild(a); row.appendChild(b);
    el.appendChild(row);
  }

  // ── QR-token mode (scanned from a certificate): show full details ────────
  var cert = new URLSearchParams(window.location.search).get("cert");
  if (cert) {
    var form = $("verifyForm");
    if (form) form.classList.add("hidden");
    var sub = document.querySelector("#certSection .acct-sub");
    if (sub) sub.textContent = "Certificate details from the registry.";
    // The QR view shows the details, so replace the manual-mode privacy note.
    var note = document.querySelector("#certSection .acct-note");
    if (note) note.textContent = "These details come from the certificate you scanned. A certificate confirms in-app study only; it is not an EASA qualification.";
    showMessage("msg", "Checking…", "ok");
    fetch(API_BASE + "/v1/certificates/lookup?token=" + encodeURIComponent(cert))
      .then(function (res) {
        return res.text().then(function (t) {
          var data = t ? JSON.parse(t) : {};
          if (!res.ok) throw new Error("Lookup failed.");
          var el = $("result");
          el.textContent = "";
          if (!data.valid) {
            showMessage("msg", "This certificate could not be found. It may have been revoked.", "err");
            el.classList.add("hidden");
            return;
          }
          showMessage("msg", "Genuine CAW Academy certificate.", "ok");
          el.classList.remove("hidden");
          addRow(el, "Name", data.holderName || "—");
          addRow(el, "Course", data.courseTitle || "—");
          addRow(el, "Certificate No.", data.number || "—");
          addRow(el, "Issued", data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : "—");
          if (typeof data.examScore === "number") addRow(el, "Exam score", data.examScore + "%");
        });
      })
      .catch(function () {
        showMessage("msg", "Couldn't reach the server. Please try again.", "err");
      });
    return;
  }

  // ── Manual certificate-verification mode (number + name) ─────────────────
  function renderResult(data) {
    var el = $("result");
    el.textContent = "";
    el.classList.add("hidden");   // no details are shown - just the match result
    if (!data.valid) {
      showMessage("msg", "No matching certificate. Check the number and the exact name printed on it.", "err");
      return;
    }
    showMessage("msg", "Certificate verified — this number and name match a genuine CAW Academy certificate.", "ok");
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
