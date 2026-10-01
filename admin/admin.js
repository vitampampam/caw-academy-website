/* CAW Academy — organisation admin portal (B2B assignments).
 *
 * Static page against the account API, same security model as account.js (H-2):
 * the refresh token lives ONLY in an HttpOnly, SameSite=Strict cookie (never in JS);
 * we hold just the short-lived access token in memory. All calls send
 * credentials:"include" + X-Client-Type: web. Access is gated server-side to
 * orgRole==admin and scoped to the caller's own org (GET /v1/org/context).
 *
 * All rendering uses textContent / DOM builders — never innerHTML — so nothing
 * from the API (names, emails, course titles) can inject markup.
 */
(function () {
  "use strict";

  // ── Configuration ────────────────────────────────────────────────────────
  // The documents' "Last updated" date. Must match terms.html, privacy.html,
  // account.js and the apps' LEGAL_DOCUMENTS_VERSION.
  var LEGAL_DOCUMENTS_VERSION = "2026-08-28";
  // The server's minimum (schemas.ts: z.string().min(10)). Declared here because
  // setMode() runs during init and reads it.
  var MIN_PASSWORD = 10;
  var API_BASE = "https://api.caw-academy.com"; // licensing/account service base URL
  // ──────────────────────────────────────────────────────────────────────────

  var accessToken = null; // in-memory only; never persisted.
  var $ = function (id) { return document.getElementById(id); };

  // Stable per-browser id so repeat portal sign-ins reuse one server session row
  // instead of piling up. Browser sessions are exempt from the device cap server-side
  // (they deliver no offline content); this just keeps them tidy. Falls back to a
  // per-page id if localStorage is unavailable.
  function deviceId() {
    try {
      var k = "caw_admin_device_id", v = localStorage.getItem(k);
      if (!v) { v = "web-admin-" + (Math.random().toString(36).slice(2) + Date.now().toString(36)); localStorage.setItem(k, v); }
      return v;
    } catch (e) { return "web-admin-session"; }
  }

  // Course catalogue for the assign picker. Mirrors server COURSE_KEYS
  // (src/domain/courses.ts) — keep in sync when courses are added/renamed. The
  // roster falls back to the raw key for anything not listed here.
  var COURSES = [
    // EASA
    ["aof","Airline Operating Framework (AOF)","EASA"],
    ["m","Part-M Continuing Airworthiness","EASA"],
    ["camo","Part-CAMO","EASA"],
    ["p145","Part-145","EASA"],
    ["partis","Part-IS","EASA"],
    ["p21dp","Part-21","EASA"],
    ["cs","Certification Specifications (CS)","EASA"],
    ["iawfam","Initial Airworthiness Familiarisation","EASA"],
    ["amp","Aircraft Maintenance Programme (AMP)","EASA"],
    ["arc","Airworthiness Review (ARC)","EASA"],
    ["reliability","Fleet Reliability & Availability","EASA"],
    ["mec","Maintenance Economics","EASA"],
    ["eng","Engine & LLP Asset Management","EASA"],
    ["lease","Aircraft & Engine Leasing","EASA"],
    ["recycle","Aircraft Recycling & End-of-Life","EASA"],
    ["offshore","Offshore Registries & Art. 83bis","EASA"],
    ["hf","Human Factors","EASA"],
    ["sms","Safety Management System (SMS)","EASA"],
    ["ewis12","EWIS Groups 1-2","EASA"],
    ["ewis35","EWIS Group 3","EASA"],
    ["ewis45","EWIS Groups 4-5","EASA"],
    ["ewis68","EWIS Groups 6-8","EASA"],
    ["fts1","Fuel Tank Safety — Phase 1","EASA"],
    ["fts2","Fuel Tank Safety — Phase 2","EASA"],
    // UK CAA
    ["aof_uk","UK Airline Operating Framework","UK CAA"],
    ["m_uk","UK Part-M","UK CAA"],
    ["camo_uk","UK Part-CAMO","UK CAA"],
    ["p145_uk","UK Part-145","UK CAA"],
    ["partis_uk","UK Part-IS","UK CAA"],
    ["p21dp_uk","UK Part-21","UK CAA"],
    ["cs_uk","UK Certification Specifications","UK CAA"],
    ["iawfam_uk","UK Initial Airworthiness Familiarisation","UK CAA"],
    ["amp_uk","UK Aircraft Maintenance Programme","UK CAA"],
    ["arc_uk","UK Airworthiness Review","UK CAA"],
    ["reliability_uk","UK Fleet Reliability","UK CAA"],
    ["mec_uk","UK Maintenance Economics","UK CAA"],
    ["eng_uk","UK Engine & LLP Asset Management","UK CAA"],
    ["lease_uk","UK Aircraft & Engine Leasing","UK CAA"],
    ["recycle_uk","UK Aircraft Recycling","UK CAA"],
    ["offshore_uk","UK Offshore Registries","UK CAA"],
    ["hf_uk","UK Human Factors","UK CAA"],
    ["sms_uk","UK Safety Management System","UK CAA"],
    ["ewis_uk","UK EWIS","UK CAA"],
    ["fts_uk","UK Fuel Tank Safety","UK CAA"],
    // UAE GCAA
    ["aof_gcaa","UAE Airline Operating Framework","UAE GCAA"],
    ["m_gcaa","CAR-M Continuing Airworthiness","UAE GCAA"],
    ["p145_gcaa","CAR-145","UAE GCAA"],
    ["partis_gcaa","UAE Part-IS","UAE GCAA"],
    ["p21_gcaa","CAR-21","UAE GCAA"],
    ["cs_gcaa","UAE Airworthiness Standards","UAE GCAA"],
    ["iawfam_gcaa","UAE Initial Airworthiness Familiarisation","UAE GCAA"],
    ["amp_gcaa","UAE Aircraft Maintenance Programme","UAE GCAA"],
    ["arc_gcaa","UAE Airworthiness Review","UAE GCAA"],
    ["reliability_gcaa","UAE Fleet Reliability","UAE GCAA"],
    ["mec_gcaa","UAE Maintenance Economics","UAE GCAA"],
    ["eng_gcaa","UAE Engine & LLP Asset Management","UAE GCAA"],
    ["lease_gcaa","UAE Aircraft & Engine Leasing","UAE GCAA"],
    ["recycle_gcaa","UAE Aircraft Recycling","UAE GCAA"],
    ["hf_gcaa","UAE Human Factors","UAE GCAA"],
    ["sms_gcaa","UAE Safety Management System","UAE GCAA"],
    ["ewis_gcaa","UAE EWIS","UAE GCAA"],
    ["fts_gcaa","UAE Fuel Tank Safety","UAE GCAA"],
    // FAA
    ["aof_faa","US Aviation Operating Framework","FAA"],
    ["p43_faa","14 CFR Part 43 / 91","FAA"],
    ["p145_faa","14 CFR Part 145","FAA"],
    ["p65_faa","14 CFR Part 65","FAA"],
    ["p39_faa","14 CFR Part 39 (ADs)","FAA"],
    ["camp_faa","Air Carrier CAMP","FAA"],
    ["p21_faa","14 CFR Part 21","FAA"],
    ["cs_faa","US Airworthiness Standards","FAA"],
    ["msg3_faa","MSG-3","FAA"],
    ["reliability_faa","US Fleet Reliability","FAA"],
    ["mec_faa","US Maintenance Economics","FAA"],
    ["eng_faa","US Engine & LLP Asset Management","FAA"],
    ["lease_faa","US Aircraft & Engine Leasing","FAA"],
    ["recycle_faa","US Aircraft Recycling","FAA"],
    ["hf_faa","US Human Factors","FAA"],
    ["sms_faa","US Safety Management System","FAA"],
    ["ewis_faa","US EWIS","FAA"],
    ["fts_faa","US Fuel Tank Safety","FAA"]
  ];
  var COURSE_LABEL = {};
  COURSES.forEach(function (c) { COURSE_LABEL[c[0]] = c[1]; });
  function labelFor(key) { return COURSE_LABEL[key] || key; }

  // ── HTTP (identical pattern to account.js) ────────────────────────────────
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
  function refresh() {
    return request("POST", "/v1/auth/refresh", null, false).then(function (b) {
      accessToken = b.accessToken || null; return b;
    });
  }
  function authed(method, path, body) {
    var attempt = accessToken ? request(method, path, body, true)
      : refresh().then(function () { return request(method, path, body, true); });
    return attempt.catch(function (err) {
      if (err.status !== 401) throw err;
      return refresh().then(function () { return request(method, path, body, true); });
    });
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  function showMessage(elId, text, kind) {
    var el = $(elId); el.textContent = "";
    if (!text) return;
    var box = document.createElement("div");
    box.className = "msg " + kind;
    /* Any email address in the message becomes a real mailto link. Built as DOM
       nodes, so the message text is still never passed through innerHTML — the
       no-injection rule these boxes were written with is kept. */
    var re = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) { box.appendChild(document.createTextNode(text.slice(last, m.index))); }
      var a = document.createElement("a");
      a.href = "mailto:" + m[0];
      a.textContent = m[0];
      box.appendChild(a);
      last = re.lastIndex;
    }
    if (last < text.length) { box.appendChild(document.createTextNode(text.slice(last))); }
    el.appendChild(box);
  }
  function show(view) {
    ["signinView", "deniedView", "dashView"].forEach(function (v) {
      $(v).classList.toggle("hidden", v !== view);
    });
  }
  function fullName(m) {
    var n = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
    return n || m.email;
  }
  /* 28-Jun-2026, not toLocaleDateString's 28/06/2026 — which an American admin
     reads as the 6th of the 28th month, i.e. guesses. Deadlines are the whole
     point of this page, so the month is spelled. Same rule as verify.js. */
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    var day = d.getDate();
    return (day < 10 ? "0" + day : String(day)) + "-" + MONTHS[d.getMonth()] + "-" + d.getFullYear();
  }
  function fmtDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return fmtDate(iso) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ── Your signed-in devices ────────────────────────────────────────────────
  // Lists the admin's OWN native app sessions (the ones that count toward the
  // per-account device limit). The server already excludes this web portal
  // session, so signing a device out here frees a slot for the mobile app.
  function loadDevices() {
    var host = $("devices"); host.textContent = "Loading…";
    return authed("GET", "/v1/me/devices", null).then(function (r) {
      renderDevices(r && r.devices ? r.devices : []);
    }).catch(function (err) {
      host.textContent = "";
      showMessage("devicesMsg", err.message || "Couldn't load your devices.", "err");
    });
  }

  function renderDevices(devices) {
    var host = $("devices"); host.textContent = "";
    if (!devices.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "No app devices are signed in on your account.";
      host.appendChild(e); return;
    }
    devices.forEach(function (d) {
      var card = document.createElement("div"); card.className = "member";
      var head = document.createElement("div"); head.className = "member-head";
      var left = document.createElement("div");
      var name = document.createElement("div"); name.className = "member-name";
      name.textContent = d.deviceName || "Unknown device";
      var meta = document.createElement("div"); meta.className = "member-email";
      meta.textContent = "Last used " + fmtDateTime(d.lastUsedAt) + " · signed in " + fmtDate(d.createdAt);
      left.appendChild(name); left.appendChild(meta);

      var btn = document.createElement("button");
      btn.className = "btn btn-danger"; btn.type = "button"; btn.textContent = "Sign out";
      btn.addEventListener("click", function () {
        if (!window.confirm("Sign out \"" + (d.deviceName || "this device") + "\"? It frees a device slot; that device will need to sign in again.")) return;
        btn.disabled = true;
        showMessage("devicesMsg", "", "ok");
        authed("DELETE", "/v1/me/devices/" + encodeURIComponent(d.id), null).then(function () {
          showMessage("devicesMsg", "Device signed out — a slot is now free.", "ok");
          return loadDevices();
        }).catch(function (err) {
          btn.disabled = false;
          showMessage("devicesMsg", err.message || "Couldn't sign out that device.", "err");
        });
      });

      head.appendChild(left); head.appendChild(btn);
      card.appendChild(head);
      host.appendChild(card);
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  /* A CSV built from the roster already in the page — no endpoint, so it works
     whatever the API is running. The audit question this answers is "show me what
     this team was asked to do and what they did", so the row is one MEMBER x COURSE
     and carries the certificate number beside the status: a status says they
     finished, the number is what proves it to somebody else. */

  function csvCell(v) {
    var s = v == null ? "" : String(v);
    // Quote everything. A name with a comma and a course title with a quote are
    // both ordinary here, and a half-quoted file opens wrong in exactly one of the
    // tools people use.
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function csvDate(iso) {
    // ISO, not the display format: a spreadsheet sorts 2026-06-28 correctly and
    // reads 28-Jun-2026 as text. The portal's own screens keep the readable one.
    return iso ? String(iso).slice(0, 10) : "";
  }

  function statusWord(a) {
    return a.displayStatus === "done" ? "Completed"
      : a.displayStatus === "overdue" ? "Overdue"
      : a.displayStatus === "due_soon" ? "Due soon" : "Upcoming";
  }

  function buildRosterCsv(members) {
    var rows = [[
      "Member", "Email", "Role", "Course", "Status", "Due", "Days remaining",
      "Completed", "Assessment %", "Certificate number", "Certificate issued",
      "Lessons completed", "Lessons total", "Progress %", "Last active"
    ]];
    members.forEach(function (m) {
      var certs = {};
      (m.certificates || []).forEach(function (c) {
        // Keep the NEWEST certificate per course: a course can hold a series, and
        // the current one is what a report is asked for.
        if (!certs[c.courseKey] || String(c.issuedAt) > String(certs[c.courseKey].issuedAt)) certs[c.courseKey] = c;
      });
      var prog = {};
      (m.progress || []).forEach(function (p) { prog[p.courseKey] = p; });

      // A member with no assignments still gets a row: "nobody assigned them
      // anything" is a finding, and dropping them makes the report look complete.
      var list = (m.assignments || []);
      if (!list.length) {
        rows.push([fullName(m), m.email, m.orgRole, "", "No assignments", "", "", "", "",
                   "", "", "", "", "", csvDate(m.lastActiveAt)]);
        return;
      }
      list.forEach(function (a) {
        var c = certs[a.courseKey], p = prog[a.courseKey];
        rows.push([
          fullName(m), m.email, m.orgRole,
          labelFor(a.courseKey), statusWord(a),
          csvDate(a.deadline), a.daysRemaining,
          csvDate(a.completedAt), a.score != null ? a.score : (c && c.examScore != null ? c.examScore : ""),
          c ? c.number : "", c ? csvDate(c.issuedAt) : "",
          p ? p.lessonsCompleted : "", p ? p.lessonsTotal : "", p ? p.percent : "",
          csvDate(m.lastActiveAt)
        ]);
      });
    });
    return rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
  }

  function downloadCsv(name, text) {
    // The BOM is for Excel: without it a name with an accent in it arrives mangled,
    // and the people who open these files open them in Excel.
    var blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportRoster(members, label) {
    if (!members.length) { showMessage("rosterMsg", "Nothing to export.", "err"); return; }
    var stamp = new Date().toISOString().slice(0, 10);
    downloadCsv("caw-training-report-" + stamp + ".csv", buildRosterCsv(members));
    showMessage("rosterMsg", "Exported " + members.length + " member" +
      (members.length === 1 ? "" : "s") + " (" + label + ").", "ok");
  }

  /* ── The printed (PDF) report ──────────────────────────────────────────────
     The same report as the CSV, laid out for paper and handed to the browser's
     print dialog, where "Save as PDF" writes the file. No PDF library: this
     page's CSP would refuse one, the text stays selectable and searchable, and
     the result matches the app's own export rather than resembling it.
     The branding mirrors ExportBranding.swift exactly — serif wordmark with CAW
     in ink and Academy in indigo, the tagline, the title, the amber rule — and
     the disclaimer is the app's verbatim (StatsExport.disclaimer). */

  var REPORT_DISCLAIMER = "This is a record of in-app study progress only. It does not " +
    "constitute or confer any aviation-authority licence, qualification, rating or approval. " +
    "CAW Academy is an independent study aid and is not affiliated with or endorsed by any " +
    "aviation regulatory authority.";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function longStamp(d) {
    return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  }

  function buildPrintReport(members, scopeLabel, orgName) {
    var host = $("printReport"); host.textContent = "";
    var root = el("div", "prep");

    // Header — the app's, line for line.
    var mark = el("p", "prep-mark");
    mark.appendChild(document.createTextNode("CAW "));
    mark.appendChild(el("span", "ac", "Academy"));
    root.appendChild(mark);
    root.appendChild(el("p", "prep-tag", "Airworthiness made learnable"));
    root.appendChild(el("p", "prep-title", "Team training report"));

    var meta = el("p", "prep-meta");
    [orgName || "Your organisation",
     "Exported: " + longStamp(new Date()),
     "Covering: " + scopeLabel + "  ·  " + members.length + " member" + (members.length === 1 ? "" : "s")
    ].forEach(function (line, i) {
      if (i) meta.appendChild(document.createElement("br"));
      meta.appendChild(document.createTextNode(line));
    });
    root.appendChild(meta);
    root.appendChild(el("div", "prep-rule"));

    members.forEach(function (m) {
      var block = el("div", "prep-member");
      block.appendChild(el("p", "prep-name", fullName(m)));
      var st = memberStats(m);
      block.appendChild(el("p", "prep-sub", m.email + "  ·  " +
        (st.total ? st.done + " of " + st.total + " assigned courses completed" : "no assignments") +
        (m.lastActiveAt ? "  ·  last active " + fmtDate(m.lastActiveAt) : "")));

      if (!st.total) {
        block.appendChild(el("p", "prep-none", "No courses assigned."));
      } else {
        var certs = {};
        (m.certificates || []).forEach(function (c) {
          if (!certs[c.courseKey] || String(c.issuedAt) > String(certs[c.courseKey].issuedAt)) certs[c.courseKey] = c;
        });
        var prog = {};
        (m.progress || []).forEach(function (p) { prog[p.courseKey] = p; });

        var table = document.createElement("table");
        var thead = document.createElement("tr");
        ["Course", "Status", "Due", "Progress", "Assessment", "Certificate"].forEach(function (h) {
          thead.appendChild(el("th", null, h));
        });
        table.appendChild(thead);
        (m.assignments || []).forEach(function (a) {
          var c = certs[a.courseKey], p = prog[a.courseKey];
          var tr = document.createElement("tr");
          tr.appendChild(el("td", null, labelFor(a.courseKey)));
          tr.appendChild(el("td", "st-" + a.displayStatus, statusWord(a)));
          tr.appendChild(el("td", null, a.status === "completed"
            ? "completed " + fmtDate(a.completedAt) : fmtDate(a.deadline)));
          tr.appendChild(el("td", null, p ? p.percent + "%  (" + p.lessonsCompleted + "/" + p.lessonsTotal + ")" : "—"));
          var score = a.score != null ? a.score : (c && c.examScore != null ? c.examScore : null);
          tr.appendChild(el("td", null, score != null ? score + "%" : "—"));
          tr.appendChild(el("td", "num", c ? c.number : "—"));
          table.appendChild(tr);
        });
        block.appendChild(table);
      }
      root.appendChild(block);
    });

    root.appendChild(el("p", "prep-disclaim", REPORT_DISCLAIMER));

    var foot = el("div", "prep-foot");
    foot.appendChild(el("b", null, "Team training report  ·  " + (orgName || "")));
    foot.appendChild(el("span", "site", "caw-academy.com"));
    root.appendChild(foot);

    host.appendChild(root);
  }

  function exportRosterPdf(members, scopeLabel) {
    if (!members.length) { showMessage("rosterMsg", "Nothing to export.", "err"); return; }
    buildPrintReport(members, scopeLabel, ($("orgName").textContent || "").trim());
    showMessage("rosterMsg",
      "Choose \u201cSave as PDF\u201d as the destination in the print dialog.", "ok");
    // A tick of delay so the message paints before the modal print dialog blocks.
    setTimeout(function () { window.print(); }, 60);
  }

  // ── Licence & seats ───────────────────────────────────────────────────────
  /* Every figure here was already in the database and reached no customer screen:
     the portal could say who has an account, never how many seats were paid for,
     how many were redeemed, or when access ends. NO redeem codes are shown — an
     unredeemed code is a credential, and re-sending one belongs in an invite over
     email, not on a page anyone can read over a shoulder. */
  function loadLicence() {
    var host = $("overviewLicence");
    if (host && !host.children.length) host.textContent = "Loading…";
    return authed("GET", "/v1/org/license", null).then(function (data) {
      var card = $("licenceCard"); if (card) card.classList.remove("hidden");
      renderLicence(data);
    }).catch(function (err) {
      $("overviewLicence").textContent = "";
      $("licenceDetail").textContent = "";
      /* A 404 means the API this page is talking to predates the endpoint — the
         panel is newer than the server it landed on, which happens whenever the
         site deploys ahead of the backend, or the backend is rolled back. That is
         a CONDITION, not a failure: hide the card rather than paint a red "Route
         not found" across a customer's dashboard for a feature they never asked
         for. Any other error is a real one and still says so. */
      if (err.status === 404) {
        var card = $("licenceCard"); if (card) card.classList.add("hidden");
        return;
      }
      showMessage("licenceMsg", err.message || "Couldn't load your licence.", "err");
    });
  }

  function statTile(label, value, tone, sub) {
    var t = document.createElement("div");
    t.className = "rstat" + (tone ? " " + tone : "") + (value === 0 && tone ? " zero" : "");
    var b = document.createElement("b"); b.textContent = String(value);
    var lab = document.createElement("span"); lab.textContent = label;
    t.appendChild(b); t.appendChild(lab);
    if (sub) { var s2 = document.createElement("small"); s2.className = "rstat-sub"; s2.textContent = sub; t.appendChild(s2); }
    return t;
  }

  /* Seats and renewal date in the page header, where the eye lands first. The
     Overview tiles carry the detail; this is the one line an admin would otherwise
     scroll to find. */
  function renderStrap(t) {
    var el = $("orgStrap"); if (!el) return;
    el.textContent = "";
    if (!t || !t.seatLimit) return;
    var seats = document.createElement("b");
    seats.textContent = t.claimed + " of " + t.seatLimit + " seats in use";
    el.appendChild(seats);
    if (t.validUntil) {
      el.appendChild(document.createTextNode("  ·  renews "));
      var when = document.createElement("span");
      when.className = t.daysRemaining <= 30 ? "alert" : t.daysRemaining <= 90 ? "warn" : "";
      when.textContent = fmtDate(t.validUntil) + " (" + t.daysRemaining + " days)";
      el.appendChild(when);
    }
  }

  function renderLicence(data) {
    showMessage("licenceMsg", "", "ok");
    var host = $("overviewLicence"); host.textContent = "";
    var detail = $("licenceDetail"); detail.textContent = "";
    var t = (data && data.totals) || {};
    var rows = (data && data.licenses) || [];
    renderStrap(t);
    if (!rows.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "No live licence found for your organisation.";
      detail.appendChild(e);
      return;
    }

    /* Seats in use, out of what was bought. Amber at the cap because that is the
       moment a new colleague cannot be added, and nothing else on this page says so. */
    var full = t.claimed >= t.seatLimit;
    host.appendChild(statTile("Seats in use", t.claimed, full ? "warn" : "good",
      "of " + t.seatLimit + " purchased"));
    // Invited and never arrived — the gap an admin currently has no way to see.
    host.appendChild(statTile("Codes unredeemed", t.unredeemed, t.unredeemed ? "warn" : "good",
      t.unredeemed ? "sent but not yet claimed" : "none outstanding"));
    host.appendChild(statTile("Seats spare", t.spare, "", "no code issued yet"));
    // Accounts without a seat: membership is by email domain, so someone can hold
    // an account on your domain and no entitlement at all.
    host.appendChild(statTile("Accounts without a seat", data.accountsWithoutSeat, data.accountsWithoutSeat ? "warn" : "",
      "on your domain"));
    var days = t.daysRemaining;
    host.appendChild(statTile("Days left", days == null ? "—" : days,
      days != null && days <= 30 ? "alert" : days != null && days <= 90 ? "warn" : "good",
      t.validUntil ? "until " + fmtDate(t.validUntil) : ""));

    // One line per licence, but only when there is more than one to tell apart —
    // a single-row table below five tiles that already said it is just furniture.
    if (rows.length > 1) {
      var ul = document.createElement("ul"); ul.className = "alist";
      rows.forEach(function (r, i) {
        var li = document.createElement("li"); li.className = "aitem";
        var c = document.createElement("div"); c.className = "course";
        c.appendChild(document.createTextNode("Licence " + (i + 1)));
        var small = document.createElement("small");
        small.textContent = r.claimed + " of " + r.seatLimit + " seats in use  ·  " +
          r.issued + " code" + (r.issued === 1 ? "" : "s") + " issued  ·  expires " +
          fmtDate(r.validUntil) + " (" + r.daysRemaining + "d)";
        c.appendChild(small);
        li.appendChild(c);
        var pill = document.createElement("span");
        pill.className = "pill " + (r.daysRemaining <= 30 ? "overdue" : r.daysRemaining <= 90 ? "due_soon" : "upcoming");
        pill.textContent = r.daysRemaining <= 30 ? "Renew soon" : r.daysRemaining <= 90 ? "Expiring" : "Active";
        li.appendChild(pill);
        ul.appendChild(li);
      });
      detail.appendChild(ul);
    }

    var note = document.createElement("p"); note.className = "note";
    note.style.marginTop = "12px";
    note.textContent = "Seats and renewals are managed by CAW Academy — contact us to add seats or extend. " +
      "A member appears in the roster once they create an account on your domain; they can only open paid courses after redeeming a seat code.";
    detail.appendChild(note);
  }

  // ── Company documents ─────────────────────────────────────────────────────
  /* The licence decides WHAT the organisation holds; this decides WHO inside it
     can open each one. An MRO's packages are its customers' controlled documents,
     so "everyone with a seat" — the only behaviour there used to be — is the wrong
     default for them and the right one for an operator reading its own manual.
     Both are offered by name; neither is a switch the reader has to decode. */

  var lastDocs = [];

  function loadDocs() {
    return authed("GET", "/v1/org/documents", null).then(function (r) {
      lastDocs = (r && r.documents) || [];
      // No documents, no card. An org that has never bought one should not be
      // shown a control for a thing it does not have.
      $("docsCard").classList.toggle("hidden", lastDocs.length === 0);
      renderDocs();
    }).catch(function (err) {
      // An older API has no /documents route; the card simply stays hidden, the
      // same rule the licence panel follows.
      if (err.status === 404) { $("docsCard").classList.add("hidden"); return; }
      $("docsCard").classList.remove("hidden");
      showMessage("docsMsg", err.message || "Couldn't load your documents.", "err");
    });
  }

  function setDocMode(pkgId, mode) {
    showMessage("docsMsg", "", "ok");
    return authed("PUT", "/v1/org/documents/" + encodeURIComponent(pkgId) + "/mode", { mode: mode })
      .then(function (r) { lastDocs = (r && r.documents) || lastDocs; renderDocs(); })
      .catch(function (err) { showMessage("docsMsg", err.message || "Couldn't change that.", "err"); });
  }

  function setDocGrant(pkgId, userId, granted) {
    showMessage("docsMsg", "", "ok");
    return authed("PUT", "/v1/org/documents/" + encodeURIComponent(pkgId) + "/grant",
      { userId: userId, granted: granted })
      .then(function (r) { lastDocs = (r && r.documents) || lastDocs; renderDocs(); })
      .catch(function (err) { showMessage("docsMsg", err.message || "Couldn't change that.", "err"); });
  }

  function renderDocs() {
    var host = $("docs"); if (!host) return;
    host.textContent = "";
    lastDocs.forEach(function (doc) {
      var card = document.createElement("div"); card.className = "doc";

      var head = document.createElement("div"); head.className = "doc-head";
      var left = document.createElement("div");
      var name = document.createElement("div"); name.className = "doc-name";
      // The package id is the only name we are sure of; the manifest's title is
      // shown when the encrypted package is actually on the host.
      name.textContent = doc.name || doc.pkgId;
      left.appendChild(name);
      var meta = document.createElement("div"); meta.className = "doc-meta";
      var bits = [];
      if (doc.name) bits.push(doc.pkgId);
      if (doc.rev) bits.push(doc.rev);
      if (doc.updatedAt) bits.push("updated " + fmtDate(doc.updatedAt));
      if (!doc.name && !doc.rev && !doc.updatedAt) bits.push("not yet loaded on the server");
      meta.textContent = bits.join("  ·  ");
      left.appendChild(meta);
      head.appendChild(left);

      var count = document.createElement("span"); count.className = "doc-count";
      count.textContent = doc.mode === "all"
        ? "Everyone with a seat"
        : doc.grantedUserIds.length + " of " + lastRoster.length + " members";
      head.appendChild(count);
      card.appendChild(head);

      var modes = document.createElement("div"); modes.className = "doc-modes";
      [["all", "Everyone with a seat"], ["selected", "Only selected people"]].forEach(function (m) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "doc-mode" + (doc.mode === m[0] ? " on" : "");
        b.textContent = m[1];
        b.addEventListener("click", function () {
          if (doc.mode === m[0]) return;
          setDocMode(doc.pkgId, m[0]);
        });
        modes.appendChild(b);
      });
      card.appendChild(modes);

      if (doc.mode === "selected") {
        var people = document.createElement("div"); people.className = "doc-people";
        if (!lastRoster.length) {
          var e = document.createElement("div"); e.className = "empty";
          e.textContent = "No members yet.";
          people.appendChild(e);
        } else {
          var granted = {}; doc.grantedUserIds.forEach(function (id) { granted[id] = true; });
          lastRoster.forEach(function (m) {
            var row = document.createElement("label"); row.className = "ms-row";
            var cb = document.createElement("input"); cb.type = "checkbox";
            cb.checked = !!granted[m.userId];
            cb.addEventListener("change", function () {
              cb.disabled = true;
              setDocGrant(doc.pkgId, m.userId, cb.checked);
            });
            var txt = document.createElement("span");
            var n = document.createElement("span"); n.textContent = fullName(m);
            var sub = document.createElement("span"); sub.className = "sub"; sub.textContent = "  " + m.email;
            txt.appendChild(n); txt.appendChild(sub);
            row.appendChild(cb); row.appendChild(txt);
            people.appendChild(row);
          });
        }
        card.appendChild(people);
      }
      host.appendChild(card);
    });
  }

  // ── Multi-select checklists (members + courses) ───────────────────────────
  // Selection state kept in Sets so members/courses can be toggled independently.
  var selectedUserIds = {};   // userId -> true
  var selectedCourses = {};   // courseKey -> true
  var CATALOGUE_INDEX = {};   // courseKey -> catalogue position (for default sequencing)
  COURSES.forEach(function (c, i) { CATALOGUE_INDEX[c[0]] = i; });
  var FRAMEWORKS = ["EASA", "UK CAA", "UAE GCAA", "FAA"];

  /* WHAT THIS ORGANISATION MAY ACTUALLY ASSIGN.
     The picker used to list all four frameworks whatever the licence bought, so an
     admin licensed for EASA and the FAA could schedule a UK CAA course: the deadline
     appeared in the learner's app and the course behind it stayed locked. The server
     now refuses those outright; this hides them, because being told "no" after
     choosing is a worse way to learn the boundary than not being offered it.
     `orgScope` is ["__all__"] or the explicit course keys of the org's live licences,
     from GET /v1/org/context. Null until it loads — nothing is hidden before then. */
  var orgScope = null;
  // The eight courses that open with NO licence at all (mirrors CourseKey.free in
  // the apps and PUBLIC_CONTENT_COURSES on the server).
  var FREE_ANCHORS = { aof: 1, m: 1, aof_uk: 1, m_uk: 1, aof_gcaa: 1, m_gcaa: 1, aof_faa: 1, p43_faa: 1 };
  var COURSE_FRAMEWORK = {}; COURSES.forEach(function (c) { COURSE_FRAMEWORK[c[0]] = c[2]; });

  /* Frameworks the licence actually buys into — derived from the scope's NON-anchor
     keys, because the anchors are free everywhere and would otherwise make every
     framework look purchased. */
  function licencedFrameworks() {
    var out = {};
    if (!orgScope) { FRAMEWORKS.forEach(function (g) { out[g] = true; }); return out; }
    if (orgScope.indexOf("__all__") !== -1) { FRAMEWORKS.forEach(function (g) { out[g] = true; }); return out; }
    orgScope.forEach(function (k) {
      if (!FREE_ANCHORS[k] && COURSE_FRAMEWORK[k]) out[COURSE_FRAMEWORK[k]] = true;
    });
    // A licence of anchors only (or of keys this page doesn't know) still has to show
    // something to work with, so fall back to whatever frameworks the scope names.
    if (!Object.keys(out).length) {
      orgScope.forEach(function (k) { if (COURSE_FRAMEWORK[k]) out[COURSE_FRAMEWORK[k]] = true; });
    }
    return out;
  }

  function assignableCourses() {
    if (!orgScope) return COURSES;
    if (orgScope.indexOf("__all__") !== -1) return COURSES;
    var frameworks = licencedFrameworks();
    return COURSES.filter(function (c) {
      if (orgScope.indexOf(c[0]) !== -1) return true;      // named by the licence
      return !!FREE_ANCHORS[c[0]] && !!frameworks[c[2]];    // free, in a bought framework
    });
  }
  // Collapsed-by-framework state so the admin can filter courses by framework. Default
  // all collapsed (compact 4-row list); the admin expands the framework(s) they want.
  var collapsedGroups = {}; FRAMEWORKS.forEach(function (g) { collapsedGroups[g] = true; });

  /* One quiet line saying what the licence covers, so an admin who cannot find
     UK CAA in the list learns why here rather than by guessing. */
  function renderLicenceNote() {
    var el = $("licenceNote"); if (!el) return;
    if (!orgScope || orgScope.indexOf("__all__") !== -1) {
      el.textContent = "Your licence covers every framework.";
      return;
    }
    var names = Object.keys(licencedFrameworks());
    el.textContent = names.length
      ? "Your licence covers " + names.join(", ") + ". Other frameworks are not listed."
      : "Your licence does not cover any course yet — contact CAW Academy.";
  }

  function updateMemberCount() {
    var n = Object.keys(selectedUserIds).length;
    $("memCount").textContent = n + " selected";
    updateAssignEnabled();
  }
  function updateCourseCount() {
    var n = Object.keys(selectedCourses).length;
    $("courseCount").textContent = n + " selected";
    updateAssignEnabled();
  }
  // Enable Assign only when at least one member AND one course are selected.
  function updateAssignEnabled() {
    var btn = $("assignBtn"); if (!btn) return;
    btn.disabled = !(Object.keys(selectedUserIds).length && Object.keys(selectedCourses).length);
  }

  // Build the members checklist from the roster. "Select all" toggles every member.
  function renderMemberChecklist(members) {
    var list = $("memList"); list.textContent = "";
    // Drop any previously-selected ids that are no longer members.
    var present = {}; members.forEach(function (m) { present[m.userId] = true; });
    Object.keys(selectedUserIds).forEach(function (id) { if (!present[id]) delete selectedUserIds[id]; });

    members.forEach(function (m) {
      var rowEl = document.createElement("label"); rowEl.className = "ms-row";
      var cb = document.createElement("input"); cb.type = "checkbox";
      cb.checked = !!selectedUserIds[m.userId];
      cb.addEventListener("change", function () {
        if (cb.checked) selectedUserIds[m.userId] = true; else delete selectedUserIds[m.userId];
        syncMemAll(members); updateMemberCount();
      });
      var txt = document.createElement("span");
      var name = document.createElement("span"); name.textContent = fullName(m);
      var sub = document.createElement("span"); sub.className = "sub"; sub.textContent = "  " + m.email;
      txt.appendChild(name); txt.appendChild(sub);
      rowEl.appendChild(cb); rowEl.appendChild(txt);
      list.appendChild(rowEl);
    });
    syncMemAll(members); updateMemberCount();
  }

  function syncMemAll(members) {
    var all = $("memAll");
    var n = members.length, sel = 0;
    members.forEach(function (m) { if (selectedUserIds[m.userId]) sel++; });
    all.checked = n > 0 && sel === n;
    all.indeterminate = sel > 0 && sel < n;
  }

  // Build the courses checklist, grouped by framework. Each group header is
  // collapsible (click to expand/collapse) so the admin can filter by framework, and
  // carries a select-all checkbox + a selected/total count.
  function renderCourseChecklist() {
    var list = $("courseList"); list.textContent = "";
    var catalogue = assignableCourses();
    // Drop a selection the licence no longer covers (the scope can change under us
    // on a reload), so the form can never submit something the server will refuse.
    var offered = {}; catalogue.forEach(function (c) { offered[c[0]] = true; });
    Object.keys(selectedCourses).forEach(function (k) { if (!offered[k]) delete selectedCourses[k]; });
    FRAMEWORKS.forEach(function (grp) {
      var inGroup = catalogue.filter(function (c) { return c[2] === grp; });
      if (!inGroup.length) return;
      var selInGroup = inGroup.filter(function (c) { return selectedCourses[c[0]]; }).length;

      var head = document.createElement("div"); head.className = "ms-group";
      head.dataset.group = grp;

      // Select-all checkbox for the group (independent of collapse).
      var gcb = document.createElement("input"); gcb.type = "checkbox";
      gcb.checked = selInGroup === inGroup.length;
      gcb.indeterminate = selInGroup > 0 && selInGroup < inGroup.length;
      gcb.addEventListener("click", function (e) { e.stopPropagation(); });
      gcb.addEventListener("change", function () {
        inGroup.forEach(function (c) {
          if (gcb.checked) selectedCourses[c[0]] = true; else delete selectedCourses[c[0]];
        });
        renderCourseChecklist(); updateCourseCount(); updateScheduleHint();
      });

      // Disclosure chevron + name + count; clicking the header toggles collapse.
      var chev = document.createElement("span"); chev.className = "ms-chev";
      chev.textContent = collapsedGroups[grp] ? "▸" : "▾"; // ▸ / ▾
      var name = document.createElement("span"); name.className = "ms-gname"; name.textContent = grp;
      var count = document.createElement("span"); count.className = "ms-gcount";
      count.textContent = selInGroup > 0 ? "(" + selInGroup + "/" + inGroup.length + ")" : "(" + inGroup.length + ")";

      head.appendChild(gcb); head.appendChild(chev); head.appendChild(name); head.appendChild(count);
      head.addEventListener("click", function () {
        collapsedGroups[grp] = !collapsedGroups[grp];
        renderCourseChecklist();
      });
      list.appendChild(head);

      inGroup.forEach(function (c) {
        var rowEl = document.createElement("label"); rowEl.className = "ms-row";
        rowEl.dataset.key = c[0]; rowEl.dataset.label = c[1].toLowerCase(); rowEl.dataset.group = grp;
        var cb = document.createElement("input"); cb.type = "checkbox";
        cb.checked = !!selectedCourses[c[0]];
        cb.addEventListener("change", function () {
          if (cb.checked) selectedCourses[c[0]] = true; else delete selectedCourses[c[0]];
          renderCourseChecklist(); updateCourseCount(); updateScheduleHint();
        });
        var t = document.createElement("span"); t.textContent = c[1];
        rowEl.appendChild(cb); rowEl.appendChild(t);
        list.appendChild(rowEl);
      });
    });
    applyCourseFilter();
    updateCourseCount();
  }

  // Row visibility combines the framework collapse state with the filter text: while a
  // filter is typed, matches show even inside collapsed groups (and that group's chevron
  // reads as open); with no filter, rows show only for expanded groups.
  function applyCourseFilter() {
    var q = ($("courseSearch").value || "").trim().toLowerCase();
    var groupHasMatch = {};
    $("courseList").querySelectorAll(".ms-row[data-key]").forEach(function (r) {
      var grp = r.dataset.group;
      var match = !q || r.dataset.label.indexOf(q) !== -1 || r.dataset.key.indexOf(q) !== -1;
      var show = match && (q ? true : !collapsedGroups[grp]);
      r.style.display = show ? "" : "none";
      if (match) groupHasMatch[grp] = true;
    });
    // Headers: hidden only if a filter excludes the whole group; chevron reflects the
    // effective open/closed state (a filter forces the group open).
    $("courseList").querySelectorAll(".ms-group").forEach(function (h) {
      var grp = h.dataset.group;
      h.style.display = (!q || groupHasMatch[grp]) ? "" : "none";
      var chev = h.querySelector(".ms-chev");
      if (chev) chev.textContent = (q ? !!groupHasMatch[grp] : !collapsedGroups[grp]) ? "▾" : "▸";
    });
  }

  // ── Roster rendering ──────────────────────────────────────────────────────
  function statusPill(a) {
    var span = document.createElement("span");
    span.className = "pill " + a.displayStatus;
    var text = a.displayStatus === "done" ? "Completed"
      : a.displayStatus === "overdue" ? "Overdue"
      : a.displayStatus === "due_soon" ? "Due soon" : "Upcoming";
    span.textContent = text;
    return span;
  }

  // ── Progress on an assigned course ────────────────────────────────────────
  // The member's app reports how far through each ASSIGNED course they are (see
  // the client's ProgressSummary). Two things this deliberately does NOT do:
  //   - it never shows 0% for a course with no report. "Not reported yet" and
  //     "started and got nowhere" look identical on a bar and mean opposite
  //     things, and only one of them is worth a conversation. Android does not
  //     report progress at all yet, so this case is real, not theoretical.
  //   - it does not grade anyone. "Behind" is a prompt to look, not a verdict.

  /** Behind = open, due inside a fortnight, and less than half done. A rough
   *  prompt for a conversation; the status pill still carries the real urgency. */
  function isBehind(a, p) {
    if (!p || a.status === "completed") return false;
    if (a.displayStatus === "overdue") return p.percent < 100;
    return typeof a.daysRemaining === "number" && a.daysRemaining <= 14 && p.percent < 50;
  }

  function progressRow(a, p) {
    var row = document.createElement("div"); row.className = "prog";
    if (!p) {
      var none = document.createElement("small");
      none.textContent = "No progress reported yet";
      row.appendChild(none);
      return row;
    }
    var behind = isBehind(a, p);
    var bar = document.createElement("div");
    bar.className = "bar" + (p.percent >= 100 ? " done" : behind ? " risk" : "");
    var fill = document.createElement("i");
    fill.style.width = Math.max(0, Math.min(100, p.percent)) + "%";
    bar.appendChild(fill);
    row.appendChild(bar);

    var txt = document.createElement("small");
    var bits = [p.percent + "%"];
    if (p.lessonsTotal) bits.push(p.lessonsCompleted + " of " + p.lessonsTotal + " lessons");
    if (p.examPassed) bits.push("assessment passed" + (p.examBest != null ? " (" + p.examBest + "%)" : ""));
    else if (p.examBest != null) bits.push("best assessment " + p.examBest + "%");
    if (p.lastActiveAt) bits.push("last opened " + fmtDate(p.lastActiveAt));
    txt.textContent = bits.join("  ·  ");
    row.appendChild(txt);

    if (p.percent === 0) {
      var idle = document.createElement("span");
      idle.className = "flag idle"; idle.textContent = "Not started";
      row.appendChild(idle);
    } else if (behind) {
      var flag = document.createElement("span");
      flag.className = "flag"; flag.textContent = "Behind";
      row.appendChild(flag);
    }
    return row;
  }

  function assignmentItem(a, isNextUp, selected, onToggle, progress) {
    var li = document.createElement("li"); li.className = "aitem";

    // Per-assignment tick for bulk removal. Selection state lives in the member's
    // `selected` map (keyed by assignment id) so ticks survive re-renders within a card.
    var pick = document.createElement("input"); pick.type = "checkbox";
    pick.className = "apick"; pick.checked = !!selected[a.id];
    pick.setAttribute("aria-label", "Select " + labelFor(a.courseKey) + " for removal");
    pick.addEventListener("change", function () {
      if (pick.checked) selected[a.id] = true; else delete selected[a.id];
      onToggle();
    });
    li.appendChild(pick);

    var course = document.createElement("div"); course.className = "course";
    course.appendChild(document.createTextNode(labelFor(a.courseKey)));
    if (isNextUp) {
      var nx = document.createElement("span"); nx.className = "nextup"; nx.textContent = " Next due";
      course.appendChild(nx);
    }
    var small = document.createElement("small");
    var bits = [];
    // The soft sequence is NOT shown: it is an ordering hint the list already
    // expresses by being in that order, and "seq 3" on a row read as a grade.
    if (a.status === "completed") bits.push("completed " + fmtDate(a.completedAt) + (a.score != null ? " · " + a.score + "%" : ""));
    else bits.push("due " + fmtDate(a.deadline) + " · " + a.daysRemaining + "d");
    small.textContent = bits.join("  ·  ");
    course.appendChild(small);
    // How far through it they actually are — the part a deadline alone cannot say.
    if (a.status !== "completed") course.appendChild(progressRow(a, progress));
    li.appendChild(course);

    li.appendChild(statusPill(a));

    var actions = document.createElement("div"); actions.className = "actions";
    if (a.status !== "completed") {
      var edit = document.createElement("button");
      edit.className = "btn-ghost"; edit.type = "button"; edit.textContent = "Edit";
      edit.addEventListener("click", function () { openEditor(li, a); });
      actions.appendChild(edit);
    }
    var del = document.createElement("button");
    del.className = "btn-danger"; del.type = "button"; del.textContent = "Remove";
    del.addEventListener("click", function () { removeAssignment(a); });
    actions.appendChild(del);
    li.appendChild(actions);

    return li;
  }

  function openEditor(li, a) {
    if (li.querySelector(".editor")) return; // already open
    var ed = document.createElement("div"); ed.className = "editor";

    var date = document.createElement("input");
    date.type = "date"; date.className = "field";
    date.value = a.deadline ? a.deadline.slice(0, 10) : "";

    var seq = document.createElement("input");
    seq.type = "number"; seq.className = "field"; seq.min = "0"; seq.max = "9999";
    seq.value = String(a.sequence != null ? a.sequence : 0);
    seq.style.width = "90px";

    var save = document.createElement("button");
    save.className = "btn"; save.type = "button"; save.style.padding = "8px 14px"; save.textContent = "Save";
    save.addEventListener("click", function () {
      save.disabled = true;
      var body = { sequence: Number(seq.value) };
      if (date.value) body.deadline = new Date(date.value + "T23:59:59").toISOString();
      authed("PATCH", "/v1/org/assignments/" + encodeURIComponent(a.id), body)
        .then(function () { loadRoster(); })
        .catch(function (err) { alert(err.message); save.disabled = false; });
    });

    var cancel = document.createElement("button");
    cancel.className = "btn-ghost"; cancel.type = "button"; cancel.textContent = "Cancel";
    cancel.addEventListener("click", function () { ed.remove(); });

    var l1 = document.createElement("span"); l1.textContent = "Deadline"; l1.style.fontSize = "13px"; l1.style.color = "var(--muted)";
    var l2 = document.createElement("span"); l2.textContent = "Seq"; l2.style.fontSize = "13px"; l2.style.color = "var(--muted)";
    ed.appendChild(l1); ed.appendChild(date); ed.appendChild(l2); ed.appendChild(seq);
    ed.appendChild(save); ed.appendChild(cancel);
    li.appendChild(ed);
  }

  function removeAssignment(a) {
    if (!window.confirm("Remove the assignment “" + labelFor(a.courseKey) + "”?")) return;
    authed("DELETE", "/v1/org/assignments/" + encodeURIComponent(a.id), null)
      .then(function () { loadRoster(); })
      .catch(function (err) { alert(err.message); });
  }

  // Bulk removal: delete every assignment in `list` (one DELETE each — the API has no
  // batch route), then refresh the roster once. Reports any that failed.
  function removeAssignments(list, memberName) {
    if (!list.length) return;
    var msg = list.length === 1
      ? "Remove the assignment “" + labelFor(list[0].courseKey) + "”?"
      : "Remove " + list.length + " assignments from " + memberName + "?\n\n"
        + list.map(function (a) { return "• " + labelFor(a.courseKey); }).join("\n");
    if (!window.confirm(msg)) return;
    var failed = [];
    var chain = Promise.resolve();
    list.forEach(function (a) {
      chain = chain.then(function () {
        return authed("DELETE", "/v1/org/assignments/" + encodeURIComponent(a.id), null)
          .catch(function () { failed.push(labelFor(a.courseKey)); });
      });
    });
    chain.then(function () {
      if (failed.length) alert("Could not remove: " + failed.join(", "));
      loadRoster();
    });
  }

  function renderMember(m) {
    var stats = memberStats(m);
    var card = document.createElement("div");
    // The left edge carries the verdict, so a long roster is skimmable without
    // reading a single card.
    card.className = "member" + (stats.overdue ? " needs" : stats.dueSoon ? " soon" : "");

    var head = document.createElement("div"); head.className = "member-head";
    var left = document.createElement("div");
    var name = document.createElement("span"); name.className = "member-name"; name.textContent = fullName(m);
    var email = document.createElement("span"); email.className = "member-email"; email.textContent = "  " + m.email;
    left.appendChild(name); left.appendChild(email);
    // Seat utilisation, one line: is this person using the app at all? The single
    // fact that answers it — never what they were reading.
    var active = document.createElement("div"); active.className = "member-active";
    active.textContent = m.lastActiveAt
      ? "Last active " + fmtDate(m.lastActiveAt)
      : "No activity reported yet";
    left.appendChild(active);

    /* This person's assignments in one line, worst first — the same statuses the
       rows below carry, counted, so the card answers "how are they doing" before
       it is read in full. Only non-zero states appear; a row of zeroes is noise. */
    var chips = document.createElement("div"); chips.className = "mchips";
    function chip(kind, text) {
      var c = document.createElement("span"); c.className = "mchip " + kind; c.textContent = text;
      chips.appendChild(c);
    }
    if (!stats.total) chip("none", "No assignments");
    else {
      if (stats.overdue) chip("overdue", stats.overdue + " overdue");
      if (stats.dueSoon) chip("due_soon", stats.dueSoon + " due soon");
      if (stats.upcoming) chip("", stats.upcoming + " upcoming");
      if (stats.done) chip("done", stats.done + " completed");
    }
    left.appendChild(chips);

    if (stats.total) {
      var bar = document.createElement("div"); bar.className = "mbar";
      var fill = document.createElement("i");
      fill.style.width = Math.round((stats.done / stats.total) * 100) + "%";
      bar.appendChild(fill);
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", stats.done + " of " + stats.total + " assigned courses completed");
      left.appendChild(bar);
    }

    left.style.flex = "1 1 320px";
    left.style.minWidth = "0";
    head.appendChild(left);
    var headRight = document.createElement("div");
    headRight.style.cssText = "display:flex;align-items:center;gap:10px";
    if (m.orgRole === "admin") {
      var role = document.createElement("span"); role.className = "role-pill"; role.textContent = "Admin";
      headRight.appendChild(role);
    }
    // One person's report, from where that person is — an admin asked for someone's
    // record is looking at their card, not at a filter.
    var onePdf = document.createElement("button");
    onePdf.className = "btn-ghost"; onePdf.type = "button"; onePdf.textContent = "PDF";
    onePdf.addEventListener("click", function () { exportRosterPdf([m], fullName(m)); });
    var oneCsv = document.createElement("button");
    oneCsv.className = "btn-ghost"; oneCsv.type = "button"; oneCsv.textContent = "CSV";
    oneCsv.addEventListener("click", function () { exportRoster([m], fullName(m)); });
    headRight.appendChild(onePdf); headRight.appendChild(oneCsv);
    head.appendChild(headRight);
    card.appendChild(head);

    // Assignments (nextUp = first not-done in the sorted list).
    var nextUpId = null;
    for (var i = 0; i < m.assignments.length; i++) {
      if (m.assignments[i].status !== "completed") { nextUpId = m.assignments[i].id; break; }
    }
    if (m.assignments.length === 0) {
      var e = document.createElement("div"); e.className = "empty"; e.textContent = "No assignments yet.";
      card.appendChild(e);
    } else {
      // Per-card selection state + a bulk toolbar (select-all + Remove selected).
      var selected = {};
      var bulk = document.createElement("div"); bulk.className = "abulk";
      var allLbl = document.createElement("label"); allLbl.className = "abulk-all";
      var allCb = document.createElement("input"); allCb.type = "checkbox";
      allLbl.appendChild(allCb);
      allLbl.appendChild(document.createTextNode(" Select all"));
      var delSel = document.createElement("button");
      delSel.className = "btn-danger"; delSel.type = "button"; delSel.textContent = "Remove selected";
      delSel.disabled = true;
      var cnt = document.createElement("span"); cnt.className = "abulk-count";
      bulk.appendChild(allLbl); bulk.appendChild(delSel); bulk.appendChild(cnt);

      var ul = document.createElement("ul"); ul.className = "alist";

      function refreshBulk() {
        var n = Object.keys(selected).length, total = m.assignments.length;
        delSel.disabled = !n;
        cnt.textContent = n ? (n + " selected") : "";
        allCb.checked = n === total && n > 0;
        allCb.indeterminate = n > 0 && n < total;
      }
      allCb.addEventListener("change", function () {
        m.assignments.forEach(function (a) {
          if (allCb.checked) selected[a.id] = true; else delete selected[a.id];
        });
        ul.querySelectorAll("input.apick").forEach(function (cb) { cb.checked = allCb.checked; });
        refreshBulk();
      });
      delSel.addEventListener("click", function () {
        var chosen = m.assignments.filter(function (a) { return selected[a.id]; });
        removeAssignments(chosen, fullName(m));
      });

      // Progress arrives as a list; index it by course so each row can find its own.
      var byCourse = {};
      (m.progress || []).forEach(function (p) { byCourse[p.courseKey] = p; });
      m.assignments.forEach(function (a) {
        ul.appendChild(assignmentItem(a, a.id === nextUpId, selected, refreshBulk, byCourse[a.courseKey]));
      });
      card.appendChild(bulk);
      card.appendChild(ul);
    }

    // Certificates line (durable completion record).
    if (m.certificates && m.certificates.length) {
      var certs = document.createElement("div"); certs.className = "certs";
      var b = document.createElement("b"); b.textContent = "Certificates: ";
      certs.appendChild(b);
      certs.appendChild(document.createTextNode(
        m.certificates.map(function (c) {
          return labelFor(c.courseKey) + (c.examScore != null ? " (" + c.examScore + "%)" : "");
        }).join(", ")
      ));
      card.appendChild(certs);
    }
    return card;
  }

  // The last roster the server gave us — the assign form reads it to name a member
  // in the "already scheduled" prompt, which would otherwise show a raw userId.
  var lastRoster = [];
  var rosterFilter = "all";   // all | attention | assigned | idle
  // What the roster is CURRENTLY showing, so Export follows the screen rather than
  // quietly exporting everyone — the filter is how an admin says who they mean.
  var shownRoster = [];

  /** One member's assignments counted by live status. */
  function memberStats(m) {
    var s = { total: (m.assignments || []).length, overdue: 0, dueSoon: 0, upcoming: 0, done: 0 };
    (m.assignments || []).forEach(function (a) {
      if (a.displayStatus === "done") s.done++;
      else if (a.displayStatus === "overdue") s.overdue++;
      else if (a.displayStatus === "due_soon") s.dueSoon++;
      else s.upcoming++;
    });
    return s;
  }

  /* Attention first: whoever has the most overdue, then the most due soon, then
     alphabetically. The app sorts a learner's own courses by what they are working
     on for the same reason — a list in a fixed order makes the reader do the
     scanning that the order could have done for them. */
  function byAttention(a, b) {
    var sa = memberStats(a), sb = memberStats(b);
    if (sa.overdue !== sb.overdue) return sb.overdue - sa.overdue;
    if (sa.dueSoon !== sb.dueSoon) return sb.dueSoon - sa.dueSoon;
    return fullName(a).localeCompare(fullName(b));
  }

  function renderRosterSummary(members) {
    var host = $("overviewTraining"); if (!host) return;
    host.textContent = "";
    var t = { overdue: 0, dueSoon: 0, done: 0, assigned: 0 };
    members.forEach(function (m) {
      var s = memberStats(m);
      t.overdue += s.overdue; t.dueSoon += s.dueSoon; t.done += s.done; t.assigned += s.total;
    });
    [
      ["Members", members.length, ""],
      ["Assigned", t.assigned, ""],
      ["Overdue", t.overdue, "alert"],
      ["Due soon", t.dueSoon, "warn"],
      ["Completed", t.done, "good"]
    ].forEach(function (row) {
      var tile = document.createElement("div");
      tile.className = "rstat" + (row[2] ? " " + row[2] : "") + (row[1] === 0 && row[2] ? " zero" : "");
      var b = document.createElement("b"); b.textContent = String(row[1]);
      var lab = document.createElement("span"); lab.textContent = row[0];
      tile.appendChild(b); tile.appendChild(lab);
      host.appendChild(tile);
    });
  }

  function renderRosterFilters(members) {
    var host = $("rosterFilters"); if (!host) return;
    host.textContent = "";
    var attention = members.filter(function (m) {
      var s = memberStats(m); return s.overdue > 0 || s.dueSoon > 0;
    }).length;
    var idle = members.filter(function (m) { return memberStats(m).total === 0; }).length;
    var assigned = members.length - idle;
    [
      ["all", "Everyone (" + members.length + ")", members.length],
      ["attention", "Needs attention (" + attention + ")", attention],
      // The one most teams actually want: most of a roster has nothing scheduled
      // yet, and scrolling past twelve empty cards to reach the one that matters
      // is the whole complaint this answers.
      ["assigned", "With assignments (" + assigned + ")", assigned],
      ["idle", "No assignments (" + idle + ")", idle]
    ].forEach(function (f) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rchip" + (rosterFilter === f[0] ? " on" : "");
      b.textContent = f[1];
      // An empty filter is shown but not clickable: hiding it would make the row
      // change shape as the team's state changes, which is harder to read than a
      // greyed count that stays put.
      b.disabled = f[2] === 0 && f[0] !== "all";
      b.addEventListener("click", function () { rosterFilter = f[0]; renderRoster(lastRoster); });
      host.appendChild(b);
    });
  }

  /* Everything late or nearly late, across the whole team, worst first. The same
     facts the member cards carry — but gathering them meant opening every card and
     remembering the result, which is the job this page should be doing. */
  function renderAttention(members) {
    var host = $("attention"); if (!host) return;
    host.textContent = "";
    var rows = [];
    members.forEach(function (m) {
      (m.assignments || []).forEach(function (a) {
        if (a.displayStatus === "overdue" || a.displayStatus === "due_soon") rows.push({ m: m, a: a });
      });
    });
    // Most overdue first; within the same state, the nearest deadline.
    rows.sort(function (x, y) { return x.a.daysRemaining - y.a.daysRemaining; });
    $("attentionCount").textContent = rows.length ? rows.length + " item" + (rows.length === 1 ? "" : "s") : "";
    if (!rows.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "Nothing overdue, and nothing due in the next three days.";
      host.appendChild(e);
      return;
    }
    rows.forEach(function (r) {
      var row = document.createElement("div"); row.className = "frow";
      var who = document.createElement("div"); who.className = "who";
      who.appendChild(document.createTextNode(fullName(r.m)));
      var sub = document.createElement("small"); sub.textContent = labelFor(r.a.courseKey);
      who.appendChild(sub);
      row.appendChild(who);
      row.appendChild(statusPill(r.a));
      var when = document.createElement("span"); when.className = "when";
      var d = r.a.daysRemaining;
      when.textContent = (d < 0 ? Math.abs(d) + " day" + (Math.abs(d) === 1 ? "" : "s") + " late"
                                : "due in " + d + " day" + (d === 1 ? "" : "s")) +
                         "  ·  " + fmtDate(r.a.deadline);
      row.appendChild(when);
      host.appendChild(row);
    });
  }

  /* Every certificate the team holds, newest first — the durable record. It used
     to exist only as a comma-joined line inside a member card, which cannot be
     searched and does not carry the number anybody would be asked for. */
  var certFilter = "";
  // Which holders / courses are open. Keyed so the state survives a roster reload —
  // an admin who opened someone to read a number should not have it shut under them
  // when the page refreshes.
  var certOpenHolder = {};   // userId -> true
  var certOpenCourse = {};   // userId + "|" + courseKey -> true

  function disclosure(open) {
    var c = document.createElement("span"); c.className = "ms-chev";
    c.textContent = open ? "▾" : "▸";
    return c;
  }

  function renderCertificates(members) {
    var host = $("certs"); if (!host) return;
    host.textContent = "";

    // Gather per holder, then per course. A course can hold a SERIES — a learner who
    // resets their progress and completes it again earns another certificate, with
    // its own number and date, and both stay valid — so the second level is a real
    // grouping, not decoration.
    var holders = [];
    members.forEach(function (m) {
      var list = (m.certificates || []).slice();
      if (!list.length) return;
      list.sort(function (x, y) { return String(y.issuedAt).localeCompare(String(x.issuedAt)); });
      var byCourse = {}, order = [];
      list.forEach(function (c) {
        if (!byCourse[c.courseKey]) { byCourse[c.courseKey] = []; order.push(c.courseKey); }
        byCourse[c.courseKey].push(c);
      });
      holders.push({
        m: m,
        total: list.length,
        newest: list[0].issuedAt,
        courses: order.map(function (k) { return { courseKey: k, items: byCourse[k] }; })
      });
    });
    holders.sort(function (a, b) { return String(b.newest).localeCompare(String(a.newest)); });

    var total = holders.reduce(function (n, h) { return n + h.total; }, 0);
    var q = certFilter.trim().toLowerCase();
    function matches(h, course) {
      if (!q) return true;
      var hay = fullName(h.m) + " " + h.m.email + " " + labelFor(course.courseKey) + " " +
                course.items.map(function (c) { return c.number || ""; }).join(" ");
      return hay.toLowerCase().indexOf(q) !== -1;
    }

    var shownHolders = holders
      .map(function (h) {
        var courses = h.courses.filter(function (c) { return matches(h, c); });
        return courses.length ? { m: h.m, courses: courses, total: courses.reduce(function (n, c) { return n + c.items.length; }, 0) } : null;
      })
      .filter(Boolean);

    var shownCount = shownHolders.reduce(function (n, h) { return n + h.total; }, 0);
    $("certCount").textContent = total
      ? (q ? shownCount + " of " + total : total + " certificate" + (total === 1 ? "" : "s"))
      : "";

    if (!shownHolders.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = total
        ? "No certificate matches that."
        : "No certificates yet. One is issued when a member finishes every lesson in a course and passes its assessment.";
      host.appendChild(e);
      return;
    }

    shownHolders.forEach(function (h) {
      // A filter forces the matching groups open — the same rule the course picker
      // uses. Searching for something and being shown a closed box is a dead end.
      var holderOpen = q ? true : !!certOpenHolder[h.m.userId];

      var head = document.createElement("button");
      head.type = "button"; head.className = "cgroup";
      head.setAttribute("aria-expanded", holderOpen ? "true" : "false");
      head.appendChild(disclosure(holderOpen));
      var nm = document.createElement("span"); nm.className = "cg-name"; nm.textContent = fullName(h.m);
      var em = document.createElement("span"); em.className = "cg-sub"; em.textContent = h.m.email;
      var ct = document.createElement("span"); ct.className = "cg-count";
      ct.textContent = h.total + " certificate" + (h.total === 1 ? "" : "s");
      head.appendChild(nm); head.appendChild(em); head.appendChild(ct);
      head.addEventListener("click", function () {
        if (certOpenHolder[h.m.userId]) delete certOpenHolder[h.m.userId];
        else certOpenHolder[h.m.userId] = true;
        renderCertificates(lastRoster);
      });
      host.appendChild(head);
      if (!holderOpen) return;

      h.courses.forEach(function (c) {
        var key = h.m.userId + "|" + c.courseKey;
        var courseOpen = q ? true : !!certOpenCourse[key];
        var one = c.items.length === 1 ? c.items[0] : null;

        var sub = document.createElement("button");
        sub.type = "button"; sub.className = "csub";
        sub.setAttribute("aria-expanded", courseOpen ? "true" : "false");
        sub.appendChild(disclosure(courseOpen));
        var cn = document.createElement("span"); cn.className = "cg-name"; cn.textContent = labelFor(c.courseKey);
        sub.appendChild(cn);
        // A course with ONE certificate carries its number and date on the row
        // itself: the number is the thing somebody came here for, and hiding it
        // behind a second click to keep the shape uniform trades the content for
        // the container. A SERIES shows how many instead.
        if (one) {
          var n1 = document.createElement("span"); n1.className = "num"; n1.textContent = one.number || "—";
          var d1 = document.createElement("span"); d1.className = "when"; d1.textContent = fmtDate(one.issuedAt);
          sub.appendChild(n1); sub.appendChild(d1);
        } else {
          var many = document.createElement("span"); many.className = "cg-count";
          many.textContent = c.items.length + " issued";
          sub.appendChild(many);
        }
        sub.addEventListener("click", function () {
          if (certOpenCourse[key]) delete certOpenCourse[key];
          else certOpenCourse[key] = true;
          renderCertificates(lastRoster);
        });
        host.appendChild(sub);
        if (!courseOpen) return;

        c.items.forEach(function (cert) {
          var row = document.createElement("div"); row.className = "frow cert-row";
          var who = document.createElement("div"); who.className = "who";
          who.appendChild(document.createTextNode(labelFor(c.courseKey)));
          var s2 = document.createElement("small");
          s2.textContent = cert.examScore != null ? "assessment " + cert.examScore + "%" : "no assessment score recorded";
          who.appendChild(s2);
          row.appendChild(who);
          var num = document.createElement("span"); num.className = "num"; num.textContent = cert.number || "—";
          row.appendChild(num);
          var when = document.createElement("span"); when.className = "when"; when.textContent = fmtDate(cert.issuedAt);
          row.appendChild(when);
          host.appendChild(row);
        });
      });
    });
  }

  function renderRoster(members) {
    lastRoster = members || [];
    var root = $("roster"); root.textContent = "";
    renderRosterSummary(lastRoster);
    renderAttention(lastRoster);
    renderCertificates(lastRoster);
    renderRosterFilters(lastRoster);
    if (!lastRoster.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "No members found for your organisation yet. Members appear here once they create an account with a work email on your organisation's domain.";
      root.appendChild(e);
      renderMemberChecklist(lastRoster);
      return;
    }
    shownRoster = lastRoster.filter(function (m) {
      var s = memberStats(m);
      if (rosterFilter === "attention") return s.overdue > 0 || s.dueSoon > 0;
      if (rosterFilter === "assigned") return s.total > 0;
      if (rosterFilter === "idle") return s.total === 0;
      return true;
    }).sort(byAttention);
    var shown = shownRoster;

    if (!shown.length) {
      var none = document.createElement("div"); none.className = "empty";
      none.textContent = rosterFilter === "attention"
        ? "Nobody is overdue or due within three days."
        : rosterFilter === "assigned"
        ? "Nobody has an assignment yet — assign a course above."
        : "Everyone has at least one assignment.";
      root.appendChild(none);
    } else {
      shown.forEach(function (m) { root.appendChild(renderMember(m)); });
    }
    renderMemberChecklist(lastRoster);
  }

  function loadRoster() {
    return authed("GET", "/v1/org/members", null).then(function (res) {
      renderRoster(res.members || []);
    });
  }

  // ── Assign form (multi-member × multi-course fan-out) ─────────────────────
  // "Select all" members toggle.
  $("memAll").addEventListener("change", function () {
    var on = $("memAll").checked;
    $("memList").querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.checked = on; cb.dispatchEvent(new Event("change"));
    });
  });
  $("courseSearch").addEventListener("input", applyCourseFilter);
  $("courseClear").addEventListener("click", function () {
    selectedCourses = {}; renderCourseChecklist(); updateCourseCount(); updateScheduleHint();
  });
  $("deadline").addEventListener("change", updateScheduleHint);
  $("monthsApart").addEventListener("input", updateScheduleHint);

  // Add whole months to a date, clamping day-of-month overflow (e.g. 31 Jan +1mo -> 28/29 Feb).
  function addMonths(date, n) {
    var d = new Date(date.getTime());
    var day = d.getDate();
    d.setMonth(d.getMonth() + n);
    if (d.getDate() < day) d.setDate(0); // rolled into the next month -> clamp to last day
    return d;
  }

  // The selected courses in catalogue order, each with its computed deadline: the
  // first at the picked date, each subsequent one `monthsApart` months later (0 = all
  // share the same deadline). Returns [] if the inputs aren't ready.
  function courseDeadlines() {
    var keys = Object.keys(selectedCourses);
    var dateVal = $("deadline").value;
    if (!keys.length || !dateVal) return [];
    keys.sort(function (a, b) { return (CATALOGUE_INDEX[a] || 0) - (CATALOGUE_INDEX[b] || 0); });
    var base = new Date(dateVal + "T23:59:59");
    var monthsApart = Math.max(0, Math.floor(Number($("monthsApart").value || 0)));
    return keys.map(function (ck, i) { return { courseKey: ck, index: i, date: addMonths(base, i * monthsApart) }; });
  }

  var DAY_MS = 86400000;
  function fmtShort(d) { return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }

  // Live preview under the form: how many courses, first/last deadline, and roughly how
  // long per course — with a warning when that's tight (< ~3 weeks each).
  function updateScheduleHint() {
    var el = $("scheduleHint"); if (!el) return;
    var plan = courseDeadlines();
    if (!plan.length) { el.textContent = ""; el.style.color = ""; return; }
    var n = plan.length;
    var last = plan[n - 1].date;
    var perCourseDays = Math.round((last.getTime() - Date.now()) / DAY_MS / n);
    var txt = n + " course" + (n === 1 ? "" : "s") + " · first due " + fmtShort(plan[0].date);
    if (n > 1) txt += ", last due " + fmtShort(last);
    if (n > 1) txt += " · ~" + Math.max(0, perCourseDays) + " days each";
    if (perCourseDays < 21) {
      txt += "  — that's tight; consider a later deadline or more months apart.";
      el.style.color = "var(--err)";
    } else {
      el.style.color = "";
    }
    el.textContent = txt;
  }

  /* ONE request for the whole assign — members x courses — instead of one per
     pair. The server answers with everything it wrote and everything it refused
     to overwrite, so the conflict prompt is asked once; and because the server
     sees the whole action it can send each learner ONE email listing their
     courses rather than one per course. */
  function postBatch(jobs, overwrite) {
    var body = {
      items: jobs.map(function (j) {
        return {
          userId: j.userId, courseKey: j.courseKey, deadline: j.deadline,
          sequence: j.sequence,
          // The display name, for the learner's email only. The server has no
          // course-title table — its only titles are snapshots on issued
          // certificates — and "p145_faa" is not a course name to a learner.
          title: labelFor(j.courseKey)
        };
      })
    };
    if (overwrite) body.overwrite = true;
    return authed("POST", "/v1/org/assignments/batch", body);
  }

  function nameOf(userId) {
    for (var i = 0; i < lastRoster.length; i++) if (lastRoster[i].userId === userId) return fullName(lastRoster[i]);
    return "That member";
  }

  $("assignForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var userIds = Object.keys(selectedUserIds);
    var plan = courseDeadlines();
    if (!userIds.length) { showMessage("assignMsg", "Select at least one member.", "err"); return; }
    if (!plan.length) { showMessage("assignMsg", "Select at least one course and a first deadline.", "err"); return; }

    // Warn (allow override) if the schedule is too short — under ~3 weeks per course.
    var n = plan.length;
    var perCourseDays = Math.round((plan[n - 1].date.getTime() - Date.now()) / DAY_MS / n);
    if (perCourseDays < 21) {
      if (!window.confirm("This schedule gives about " + Math.max(0, perCourseDays) +
        " days per course for " + n + " course" + (n === 1 ? "" : "s") +
        " — that may be too short. Assign anyway?")) return;
    }

    /* Each member gets the same plan. The soft order follows CATALOGUE POSITION —
       there is no "start sequence at" box, because a number the admin had to
       invent explained nothing. */
    var jobs = [];
    userIds.forEach(function (uid) {
      plan.forEach(function (p) {
        jobs.push({ userId: uid, courseKey: p.courseKey, sequence: p.index, deadline: p.date.toISOString() });
      });
    });
    var courseCount = plan.length;

    var btn = $("assignBtn"); btn.disabled = true;
    showMessage("assignMsg", "Assigning " + jobs.length + " …", "ok");

    function report(created, kept, done) {
      var msg = "Assigned " + courseCount + " course" + (courseCount === 1 ? "" : "s") +
                " to " + userIds.length + " member" + (userIds.length === 1 ? "" : "s") +
                " (" + created + " added or updated";
      if (done) msg += ", " + done + " already completed and left as " + (done === 1 ? "it is" : "they are");
      if (kept) msg += ", " + kept + " existing deadline" + (kept === 1 ? "" : "s") + " kept";
      msg += ").";
      showMessage("assignMsg", msg, "ok");
      btn.disabled = false;
      return loadRoster();
    }

    postBatch(jobs, false).then(function (r) {
      var created = (r.assignments || []).length;
      var conflicts = r.conflicts || [];
      var done = conflicts.filter(function (c) { return c.reason === "completed"; });
      var pending = conflicts.filter(function (c) { return c.reason !== "completed"; });
      if (!pending.length) return report(created, 0, done.length);

      /* ONE prompt for the whole batch. Nothing was written for these — the
         server reported them and stopped — so Cancel really does keep every date. */
      var lines = pending.slice(0, 6).map(function (c) {
        return "\u2022 " + nameOf(c.userId) + " — " + labelFor(c.courseKey) + ", due " + fmtDate(c.deadline);
      }).join("\n");
      if (pending.length > 6) lines += "\n\u2022 …and " + (pending.length - 6) + " more";

      var replace = window.confirm(
        (pending.length === 1 ? "One of these is already scheduled:" : pending.length + " of these are already scheduled:") +
        "\n\n" + lines +
        "\n\nReplace the existing deadline" + (pending.length === 1 ? "" : "s") + " with the new one" +
        (pending.length === 1 ? "" : "s") + "?\n\nOK — replace     Cancel — keep the existing date" +
        (pending.length === 1 ? "" : "s"));
      if (!replace) return report(created, pending.length, done.length);

      showMessage("assignMsg", "Replacing " + pending.length + " …", "ok");
      var retry = pending.map(function (c) {
        var job = null;
        jobs.forEach(function (j) { if (j.userId === c.userId && j.courseKey === c.courseKey) job = j; });
        return job;
      }).filter(Boolean);
      return postBatch(retry, true).then(function (r2) {
        return report(created + (r2.assignments || []).length, 0, done.length);
      });
    }).catch(function (err) {
      showMessage("assignMsg", err.message || "Couldn't reach the server.", "err");
      btn.disabled = false;
    });
  });

  $("reloadBtn").addEventListener("click", function () { loadRoster(); });
  /* Export follows the FILTER. "Everyone" exports the team; "Needs attention"
     exports the people who are behind — which is the report somebody actually asks
     for before a review, and it needs no second control to say so. */
  function currentScopeLabel() {
    var chip = document.querySelector(".rchip.on");
    return chip ? chip.textContent.replace(/\s*\(\d+\)$/, "") : "everyone";
  }
  $("exportBtn").addEventListener("click", function () {
    exportRoster(shownRoster, currentScopeLabel());
  });
  $("exportPdfBtn").addEventListener("click", function () {
    exportRosterPdf(shownRoster, currentScopeLabel());
  });
  $("overviewReload").addEventListener("click", function () { loadLicence(); loadRoster(); });
  $("docsReload").addEventListener("click", function () { loadDocs(); });
  $("certSearch").addEventListener("input", function () {
    certFilter = $("certSearch").value || "";
    renderCertificates(lastRoster);
  });
  $("devicesReload").addEventListener("click", function () { loadDevices(); });

  // ── Auth (Sign in / Request admin account tabs) ────────────────────────────
  var registerMode = false;
  $("tabSignIn").addEventListener("click", function () { setMode(false); });
  $("tabRegister").addEventListener("click", function () { setMode(true); });
  function setMode(register) {
    registerMode = register;
    $("tabSignIn").classList.toggle("active", !register);
    $("tabRegister").classList.toggle("active", register);
    $("authSubmit").textContent = register ? "Request admin account" : "Sign in";
    $("password").setAttribute("autocomplete", register ? "new-password" : "current-password");
    /* Requesting an account means CHOOSING a password, not recalling one. The
       wording matches the app, and the 10-character rule (the server's minimum)
       is stated and enforced here rather than surfacing as a rejection. */
    $("passwordLbl").textContent = register ? "Choose a password" : "Password";
    $("password").placeholder = register ? "At least 10 characters" : "Your CAW Academy password";
    if (register) { $("password").setAttribute("minlength", "10"); }
    else { $("password").removeAttribute("minlength"); }
    $("regNames").classList.toggle("hidden", !register);   // name fields (required by the API)
    $("regNote").classList.toggle("hidden", !register);    // "registered organisations only"
    $("consentRow").classList.toggle("hidden", !register); // consent is only for a NEW account
    $("confirmRow").classList.toggle("hidden", !register); // confirm only when choosing one
    if (!register) { $("password2").value = ""; }
    updatePasswordHint();
    $("portalNote").classList.toggle("hidden", register);
    $("forgotRow").classList.toggle("hidden", register);   // forgot-password only for sign-in
    $("authTitle").textContent = register ? "Request admin account" : "Team admin";
    $("authSub").textContent = register
      ? "Request administrator access for your organisation. Our support team reviews each request, and you will be notified by email once the account is activated."
      : "Sign in with your CAW Academy administrator account to manage your team's course assignments and deadlines.";
    showMessage("authMsg", "", "err");
  }

  /* The same feedback the app gives while choosing a password: the length rule
     is shown while it is unmet, then whether the two entries agree. Nothing is
     shown when signing in, where there is one field and nothing to compare. */
  function updatePasswordHint() {
    var hint = $("pwHint");
    if (!registerMode) { hint.className = "pw-hint hidden"; hint.textContent = ""; return; }
    var pw = $("password").value, pw2 = $("password2").value;
    var text = "", tone = "muted";
    /* The length rule is already in the field's own placeholder, so it is not
       repeated here — this line only reports whether the two entries agree.
       Nothing is claimed until the password is long enough to be valid. */
    if (pw2 && pw2 !== pw) {
      text = "Passwords do not match"; tone = "err";
    } else if (pw2 && pw2 === pw && pw.length >= MIN_PASSWORD) {
      text = "Passwords match"; tone = "ok";
    }
    hint.textContent = text;
    hint.className = "pw-hint " + tone + (text ? "" : " hidden");
  }
  $("password").addEventListener("input", updatePasswordHint);
  $("password2").addEventListener("input", updatePasswordHint);

  $("authForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("email").value.trim();
    var password = $("password").value;
    var btn = $("authSubmit");
    showMessage("authMsg", "", "err");
    var body = { email: email, password: password, device: { id: deviceId(), name: "Team admin portal" } };
    var path = "/v1/auth/login";
    if (registerMode) {
      var firstName = $("firstName").value.trim();
      var lastName = $("lastName").value.trim();
      if (!firstName || !lastName) {
        showMessage("authMsg", "Enter your first and last name to create an account.", "err");
        return;
      }
      if (password.length < MIN_PASSWORD) {
        showMessage("authMsg", "The password must be no less than " + MIN_PASSWORD + " characters.", "err");
        $("password").focus();
        return;
      }
      if ($("password2").value !== password) {
        showMessage("authMsg", "The two passwords do not match.", "err");
        $("password2").focus();
        return;
      }
      if (!$("acceptTerms").checked) {
        showMessage("authMsg", "Please accept the Terms of Use and Privacy Policy to request an account.", "err");
        return;
      }
      body.firstName = firstName;
      body.lastName = lastName;
      /* The server's register schema REQUIRES these two — `acceptedTerms` is a
         z.literal(true) — so a registration without them is rejected outright.
         `termsVersion` is the documents' "Last updated" date, so a later revision
         can be detected and re-consent asked for rather than assumed. Keep it in
         step with terms.html, privacy.html, account.js and the apps. */
      body.acceptedTerms = true;
      body.termsVersion = LEGAL_DOCUMENTS_VERSION;
      path = "/v1/auth/register";
    }
    btn.disabled = true;
    request("POST", path, body, false)
      .then(function (b) { accessToken = b.accessToken || null; $("password").value = ""; return enter(); })
      .catch(function (err) {
        /* The commonest case: they already have a CAW Academy account from the
           app. It is the SAME account here, so the answer is to sign in, not to
           make another one. */
        var msg = /already exists/i.test(err.message || "")
          ? "You already have a CAW Academy account with this email. Choose Sign in above and use that password — it is the same account."
          : err.message;
        showMessage("authMsg", msg, "err");
      })
      .finally(function () { btn.disabled = false; });
  });

  // ── Forgot password ────────────────────────────────────────────────────────
  /* Password reset is disabled on the website for now: the element is rendered
     inert (see `.link-off`), and the handler is kept but guarded so re-enabling
     it is a one-line change here and in index.html. */
  $("forgotLink").addEventListener("click", function (e) {
    if (this.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
    e.preventDefault();
    var email = $("email").value.trim();
    if (!email) {
      showMessage("authMsg", "Enter your email above first, then tap Forgot password.", "err");
      $("email").focus();
      return;
    }
    request("POST", "/v1/auth/forgot-password", { email: email }, false)
      .then(function () { showMessage("authMsg", "If that email has an account, a reset link is on its way.", "ok"); })
      .catch(function (err) { showMessage("authMsg", err.message, "err"); });
  });

  function signOut() {
    request("POST", "/v1/auth/logout", null, false).catch(function () {}).finally(function () {
      accessToken = null; $("who").textContent = ""; show("signinView");
    });
  }
  $("signOutBtn").addEventListener("click", signOut);
  $("deniedSignOut").addEventListener("click", signOut);

  // Load the org context (admin gate), then the dashboard.
  function enter() {
    return authed("GET", "/v1/org/context", null).then(function (ctx) {
      $("orgName").textContent = ctx.orgName || "Your organisation";
      $("orgDomains").textContent = (ctx.domains || []).join(", ");
      $("who").textContent = "";
      orgScope = Array.isArray(ctx.scope) ? ctx.scope : null;
      renderLicenceNote();
      renderCourseChecklist();
      // Default the first deadline to one month out (matches the monthly cadence).
      $("deadline").value = addMonths(new Date(), 1).toISOString().slice(0, 10);
      $("deadline").min = new Date().toISOString().slice(0, 10);
      updateScheduleHint();
      show("dashView");
      loadDevices();
      loadLicence();
      // Documents after the roster: the per-member tick list is drawn from it.
      return loadRoster().then(loadDocs);
    }).catch(function (err) {
      if (err.status === 403) {
        $("deniedMsg").textContent = err.message || "This account is not an organisation administrator.";
        show("deniedView");
      } else if (err.status === 401) {
        show("signinView");
      } else {
        show("signinView");
        showMessage("authMsg", err.message || "Couldn't reach the server.", "err");
      }
    });
  }

  // Init: restore a session from the refresh cookie, else show sign-in.
  show("signinView");
  refresh().then(enter).catch(function () { show("signinView"); });
})();
