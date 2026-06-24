/* CAW Academy — account page logic.
 *
 * Security model (H-2): the refresh token is NEVER touched by JavaScript. It is
 * set by the server as an HttpOnly, SameSite=Strict cookie, so an XSS on this
 * page cannot read or steal it. Only the short-lived access token is held here,
 * in memory (a closure variable) — it is lost on reload and re-minted from the
 * cookie via /v1/auth/refresh. All API calls send `credentials: "include"` (to
 * carry the cookie) and `X-Client-Type: web` (so the server uses the cookie flow).
 */
(function () {
  "use strict";

  // ── Configuration — FILL BEFORE GOING LIVE ──────────────────────────────
  var API_BASE = "https://api.caw-academy.com";          // licensing service base URL
  var PRICE_ID = "price_REPLACE_ME";                      // Stripe Price ID for full access
  // ────────────────────────────────────────────────────────────────────────

  var accessToken = null; // in-memory only; never persisted.

  var $ = function (id) { return document.getElementById(id); };
  document.getElementById("yr").textContent = new Date().getFullYear();

  var registerMode = false;

  // ── HTTP ─────────────────────────────────────────────────────────────────
  function request(method, path, body, useAuth) {
    var headers = { "Accept": "application/json", "X-Client-Type": "web" };
    if (useAuth && accessToken) headers["Authorization"] = "Bearer " + accessToken;
    var opts = { method: method, headers: headers, credentials: "include" };
    if (body) { headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch(API_BASE + path, opts).then(function (res) {
      return res.text().then(function (text) {
        var json = text ? JSON.parse(text) : {};
        if (!res.ok) {
          var msg = (json && json.error && json.error.message) || "Something went wrong.";
          var err = new Error(msg); err.status = res.status; throw err;
        }
        return json;
      });
    });
  }

  // Mint a fresh access token from the HttpOnly refresh cookie.
  function refresh() {
    return request("POST", "/v1/auth/refresh", null, false).then(function (bundle) {
      accessToken = bundle.accessToken || null;
      return bundle;
    });
  }

  // Authenticated call with one transparent refresh-on-401 retry.
  function authed(method, path, body) {
    var attempt = accessToken
      ? request(method, path, body, true)
      : refresh().then(function () { return request(method, path, body, true); });
    return attempt.catch(function (err) {
      if (err.status !== 401) throw err;
      return refresh().then(function () { return request(method, path, body, true); });
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  function showMessage(elId, text, kind) {
    var el = $(elId);
    el.textContent = "";
    if (!text) return;
    var box = document.createElement("div");
    box.className = "acct-msg " + kind;
    box.textContent = text; // textContent — never innerHTML (no injection)
    el.appendChild(box);
  }

  function describePlan(plan) {
    return plan === "org" ? "Organisation"
      : plan === "individual" ? "Individual"
      : plan === "mixed" ? "Individual + organisation"
      : "No active licence";
  }
  function describeAccess(courses) {
    if (!courses || courses.length === 0) return "Free courses only";
    if (courses.indexOf("__all__") !== -1) return "All courses";
    return courses.length + (courses.length === 1 ? " course" : " courses");
  }

  function renderSignedIn(me) {
    $("signedOut").classList.add("hidden");
    $("signedIn").classList.remove("hidden");
    $("meEmail").textContent = (me.user && me.user.email) || "—";
    $("mePlan").textContent = describePlan(me.plan);
    $("meAccess").textContent = describeAccess(me.courses);
  }
  function renderSignedOut() {
    accessToken = null;
    $("signedIn").classList.add("hidden");
    $("signedOut").classList.remove("hidden");
  }

  // ── Tabs ───────────────────────────────────────────────────────────────
  $("tabSignIn").addEventListener("click", function () { setMode(false); });
  $("tabRegister").addEventListener("click", function () { setMode(true); });
  function setMode(register) {
    registerMode = register;
    $("tabSignIn").classList.toggle("active", !register);
    $("tabRegister").classList.toggle("active", register);
    $("authSubmit").textContent = register ? "Create account" : "Sign in";
    $("password").setAttribute("autocomplete", register ? "new-password" : "current-password");
    showMessage("authMsg", "", "err");
  }

  // ── Auth submit ────────────────────────────────────────────────────────
  $("authForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("email").value.trim();
    var password = $("password").value;
    var btn = $("authSubmit");
    btn.disabled = true;
    showMessage("authMsg", "", "err");
    var path = registerMode ? "/v1/auth/register" : "/v1/auth/login";
    request("POST", path, { email: email, password: password }, false)
      .then(function (bundle) {
        accessToken = bundle.accessToken || null; // refresh token is in the cookie
        $("password").value = "";
        return loadMe();
      })
      .catch(function (err) { showMessage("authMsg", err.message, "err"); })
      .finally(function () { btn.disabled = false; });
  });

  // ── Forgot password ──────────────────────────────────────────────────────
  $("forgotLink").addEventListener("click", function (e) {
    e.preventDefault();
    var email = $("email").value.trim();
    if (!email) {
      showMessage("authMsg", "Enter your email above first, then tap Forgot password.", "err");
      $("email").focus();
      return;
    }
    request("POST", "/v1/auth/forgot-password", { email: email }, false)
      .then(function () {
        showMessage("authMsg", "If that email has an account, a reset link is on its way.", "ok");
      })
      .catch(function (err) { showMessage("authMsg", err.message, "err"); });
  });

  // ── Buy ────────────────────────────────────────────────────────────────
  $("buyBtn").addEventListener("click", function () {
    var btn = $("buyBtn");
    btn.disabled = true;
    showMessage("actionMsg", "", "err");
    authed("POST", "/v1/billing/checkout", { priceId: PRICE_ID })
      .then(function (res) { if (res.url) window.location.href = res.url; })
      .catch(function (err) { showMessage("actionMsg", err.message, "err"); btn.disabled = false; });
  });

  // ── Redeem ─────────────────────────────────────────────────────────────
  $("redeemBtn").addEventListener("click", function () {
    var code = $("redeemCode").value.trim();
    if (!code) return;
    var btn = $("redeemBtn");
    btn.disabled = true;
    showMessage("actionMsg", "", "err");
    authed("POST", "/v1/licenses/redeem", { code: code })
      .then(function () {
        $("redeemCode").value = "";
        showMessage("actionMsg", "Code redeemed. Your courses are now unlocked.", "ok");
        return loadMe();
      })
      .catch(function (err) { showMessage("actionMsg", err.message, "err"); })
      .finally(function () { btn.disabled = false; });
  });

  // ── Sign out ───────────────────────────────────────────────────────────
  $("signOutBtn").addEventListener("click", function () {
    request("POST", "/v1/auth/logout", null, false)
      .catch(function () { /* ignore */ })
      .finally(renderSignedOut);
  });

  // ── Load profile ───────────────────────────────────────────────────────
  function loadMe() {
    return authed("GET", "/v1/me", null)
      .then(renderSignedIn)
      .catch(renderSignedOut);
  }

  // ── Purchase return banner ──────────────────────────────────────────────
  (function purchaseBanner() {
    var params = new URLSearchParams(window.location.search);
    var p = params.get("purchase");
    if (p === "success") showMessage("banner", "Thanks — your purchase is confirmed. It may take a moment to appear.", "ok");
    else if (p === "cancelled") showMessage("banner", "Checkout cancelled. No charge was made.", "err");
  })();

  // Init: try to restore a session from the refresh cookie, else show sign-in.
  setMode(false);
  refresh().then(loadMe).catch(renderSignedOut);
})();
