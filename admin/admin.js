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
          var err = new Error(msg);
          err.status = res.status;
          /* The server's machine-readable reason, carried beside the HTTP status because
             some refusals are a step the UI must ROUTE on rather than a message to print:
             "email_unconfirmed" is the code screen, and a bare 403 is indistinguishable
             from a disabled account. Matches what the two apps already read. */
          err.code = (json && json.error && json.error.code) || null;
          throw err;
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

  // ── Dialogs ───────────────────────────────────────────────────────────────
  /* The portal's own confirm/alert. `window.confirm` was doing three things wrong:
     it is unstyleable, it prefixes "caw-academy.com says" to your own words, and it
     CLIPS long text — the replace prompt's button legend ("OK — replace, Cancel —
     keep the existing dates") was cut off, leaving two buttons whose meaning had
     just been hidden.

     So the buttons carry the verbs themselves. "OK/Cancel" makes the reader hold
     the question in their head to decode the answer; "Replace the dates" / "Keep
     existing dates" can be read on their own, which is what someone skimming a
     dialog actually does.

     Returns a Promise<boolean>. One dialog at a time; a second call replaces the
     first rather than stacking, because two modal layers is never the intent. */
  var openDialog = null;

  function dialog(opts) {
    if (openDialog) openDialog.close(false);

    var resolveWith;
    var done = new Promise(function (res) { resolveWith = res; });

    var back = document.createElement("div");
    back.className = "dlg-back";
    var box = document.createElement("div");
    box.className = "dlg";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");

    var head = document.createElement("div"); head.className = "dlg-head";
    var h = document.createElement("h2"); h.className = "dlg-title"; h.id = "dlgTitle";
    h.textContent = opts.title;
    box.setAttribute("aria-labelledby", "dlgTitle");
    head.appendChild(h); box.appendChild(head);

    var body = document.createElement("div"); body.className = "dlg-body";
    // Accepts text, a list, or both — the caller never builds DOM, so no caller can
    // put unescaped server text on the page.
    (opts.lines || []).forEach(function (t) {
      var pEl = document.createElement("p"); pEl.textContent = t; body.appendChild(pEl);
    });
    if (opts.items && opts.items.length) {
      var ul = document.createElement("ul");
      opts.items.forEach(function (t) {
        var li = document.createElement("li"); li.textContent = t; ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    /* One input, when the question needs an answer rather than a yes. The caller
       builds and owns the element and reads its value after the promise settles;
       the dialog only places it, focuses it, and keeps it inside the tab ring. */
    if (opts.field) body.appendChild(opts.field);
    if (opts.note) {
      var n = document.createElement("p"); n.className = "dlg-note"; n.textContent = opts.note;
      body.appendChild(n);
    }
    box.appendChild(body);

    var foot = document.createElement("div"); foot.className = "dlg-foot";
    var cancelBtn = null;
    if (opts.cancelLabel) {
      cancelBtn = document.createElement("button");
      cancelBtn.type = "button"; cancelBtn.className = "btn-ghost";
      cancelBtn.textContent = opts.cancelLabel;
      cancelBtn.addEventListener("click", function () { close(false); });
      foot.appendChild(cancelBtn);
    }
    var okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = opts.danger ? "btn-danger" : "btn";
    okBtn.textContent = opts.confirmLabel || "OK";
    okBtn.addEventListener("click", function () { close(true); });
    foot.appendChild(okBtn);
    box.appendChild(foot);

    back.appendChild(box);
    document.body.appendChild(back);

    /** The focusable controls inside `opts.field`, which may be one input or a
     *  small form of several. */
    function fieldFocusables() {
      if (!opts.field) return [];
      if (typeof opts.field.matches === "function" &&
          opts.field.matches("input,select,textarea,button")) return [opts.field];
      return [].slice.call(opts.field.querySelectorAll("input,select,textarea,button"));
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
      // Enter confirms only when the focus is still on a button — otherwise a
      // keystroke meant for the page could answer a question nobody read. A
      // field is the exception: Enter in the one input IS how a form is sent.
      else if (e.key === "Enter" && document.activeElement &&
               fieldFocusables().indexOf(document.activeElement) !== -1) {
        e.preventDefault(); okBtn.click();
      }
      else if (e.key === "Enter" && document.activeElement &&
               document.activeElement.tagName === "BUTTON") {
        e.preventDefault(); document.activeElement.click();
      } else if (e.key === "Tab") {
        // Keep focus inside: a tab that escapes a modal leaves the keyboard on a
        // page the mouse cannot reach. The field may be a CONTAINER of several
        // inputs (the invite form is three), so every focusable inside it joins
        // the ring — otherwise tab from the first input jumps straight out.
        var f = fieldFocusables().concat([cancelBtn, okBtn].filter(Boolean));
        var i = f.indexOf(document.activeElement);
        if (i === -1) return;
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    }
    function close(answer) {
      if (openDialog !== api) return;
      openDialog = null;
      document.removeEventListener("keydown", onKey, true);
      back.remove();
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
      resolveWith(answer);
    }
    var api = { close: close, done: done };

    // Clicking the dim area cancels — but only the dim area, never a stray click
    // that started inside the card and drifted out.
    back.addEventListener("mousedown", function (e) { if (e.target === back) close(false); });

    var lastFocus = document.activeElement;
    openDialog = api;
    document.addEventListener("keydown", onKey, true);
    /* Focus the field when there is one to fill, else the SAFE button on a
       destructive question and the primary otherwise. A dialog that opens with
       "Delete" under a waiting Enter key is a trap. */
    (fieldFocusables()[0] || (opts.danger && cancelBtn ? cancelBtn : okBtn)).focus();

    return done;
  }

  /** A question. Resolves true if the admin chose the action. */
  function confirmDialog(opts) { return dialog(opts); }

  /** A statement with nothing to decide — one button, and it says "Close", because
   *  "OK" on a message about a failure reads like agreeing to it. */
  function alertDialog(title, lines, note) {
    return dialog({ title: title, lines: lines, note: note, confirmLabel: "Close" });
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
    ["signinView", "confirmView", "deniedView", "dashView"].forEach(function (v) {
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

  // ── Sections ──────────────────────────────────────────────────────────────
  /* One page was fine with three cards and is not with seven: looking for the
     licence or a certificate meant scrolling past the entire team. Each tab is one
     job. The hash records which, so a reload or a bookmark returns to the same
     place and the browser's Back button works — no router, no new files.

     "Your account" was the sixth tab and is gone (SME, Oct 2026): it listed the
     admin's own signed-in app devices, which is a thing about the person rather
     than about the team they manage, and the app already has that screen. Sign out
     lives in the header, so nothing was reachable only from there. */

  /* id, label, and the rail icon as raw SVG path data. The icons are drawn here
     rather than shipped as files because the page's CSP allows `img-src 'self'`
     only and a sprite would be a second request for 16 pixels of line art. */
  var SECTIONS = [
    ["overview",     "Overview",
      '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/>' +
      '<rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'],
    /* ASSIGN HAS TWO CHILDREN: Courses and Documents. Same verb, two objects.
       There is only ONE Documents entry in the whole rail — the library and
       the bulk "require familiarisation" live on one screen, because a second
       item with the same name could only be told apart by its position. */
    ["assign",       "Assign",
      '<path d="M12 5v14M5 12h14"/>', { parent: true }],
    ["assign",       "Courses",
      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v14H6.5A2.5 2.5 0 0 0 4 19.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19v4H6.5A2.5 2.5 0 0 1 4 19.5z"/>', { child: true }],
    ["documents",    "Documents",
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', { child: true }],
    ["team",         "Team progress",
      '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/>' +
      '<path d="M16 11.2A3 3 0 0 0 16 5.4M18 20c0-2.1-.8-3.8-2-5"/>'],
    /* RECORDS is the history: course completions, document familiarisation and
       certificates in one list, because an auditor's question spans all three.
       Certificates keeps its own screen — it is the one record people look up
       by NUMBER, and a number is found in a list of certificates, not in a
       history of everything. */
    ["records",      "Records",
      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v15a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 7.5h7M8 11h7M8 14.5h4"/>'],
    ["certificates", "Certificates",
      '<circle cx="12" cy="9" r="5.2"/><path d="M8.5 13.6 7 21l5-2.4L17 21l-1.5-7.4"/>']
  ];

  /* Two groups in the rail: what you DO, and what the org HOLDS. A flat list
     reads as equal errands; the split says which are the work.

     DOCUMENTS IS WORK, not a record (SME). Access is granted there and
     familiarisation is required there — things an admin changes. Certificates
     are the only genuine record: issued, numbered, never edited. */
  var NAV_GROUPS = { overview: "Workspace", records: "Records" };

  var currentSect = "overview";

  function sectionVisible(id) {
    // Documents exists only for an org that holds one (see loadDocs).
    if (id === "documents") return !$("docsCard").classList.contains("hidden");
    return true;
  }

  function showSection(id, fromHash) {
    if (!SECTIONS.some(function (x) { return x[0] === id; }) || !sectionVisible(id)) id = "overview";
    currentSect = id;
    document.querySelectorAll(".sect").forEach(function (sec) {
      sec.classList.toggle("on", sec.dataset.sect === id);
    });
    renderTabs();
    if (!fromHash && location.hash.slice(1) !== id) {
      // replaceState, not a hash assignment: switching tabs should not fill the
      // Back history with every tab the admin glanced at.
      try { history.replaceState(null, "", "#" + id); } catch (e) { location.hash = id; }
    }
    // A tab change is a new screen; start it at the top.
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderTabs() {
    var host = $("tabs"); if (!host) return;
    host.textContent = "";
    // Counts come from the roster, so a tab says how much sits behind it.
    var attention = lastRoster.filter(function (m) {
      var st = memberStats(m); return st.overdue > 0 || st.dueSoon > 0;
    }).length;
    var certCount = lastRoster.reduce(function (n, m) { return n + ((m.certificates || []).length); }, 0);

    SECTIONS.forEach(function (sec) {
      var opts = sec[3] || {};
      if (!sectionVisible(sec[0])) return;

      if (NAV_GROUPS[sec[0]] && !opts.child) {
        var h = document.createElement("div");
        h.className = "navhead"; h.textContent = NAV_GROUPS[sec[0]];
        host.appendChild(h);
      }

      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      /* A PARENT is a heading with an icon, not a destination: clicking it
         opens its first child, because a menu item that goes nowhere is a
         thing to learn rather than a thing to use. A CHILD is indented and
         drops its icon — the indent is the relationship, and two icons in a
         row read as two unrelated items. */
      var isChild = !!opts.child, isParent = !!opts.parent;
      var activeHere = currentSect === sec[0] && !isParent;
      var parentActive = isParent && SECTIONS.some(function (x) {
        return (x[3] || {}).child && x[0] === currentSect;
      });
      b.className = "tabbtn" +
        (activeHere ? " on" : "") +
        (isChild ? " child" : "") +
        (isParent ? " parent" : "") +
        (parentActive ? " open" : "") +
        (sec[0] === "overview" && attention ? " alert" : "");

      if (!isChild) {
        /* The icon is what the rail shows once it narrows to a strip, so it is
           not decoration — it is the whole label at 1180px and below.
           innerHTML of a constant from SECTIONS, never of anything the server
           said. */
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = sec[2];
        b.appendChild(svg);
      }

      var label = document.createElement("span");
      label.className = "tlabel"; label.textContent = sec[1];
      b.appendChild(label);

      var n = sec[0] === "team" ? lastRoster.length
            : sec[0] === "certificates" ? certCount
            : sec[0] === "documents" ? lastDocs.length
            : sec[0] === "records" ? allRecords().length
            : sec[0] === "overview" ? attention
            : 0;
      if (n) {
        var c = document.createElement("span"); c.className = "tcount";
        c.textContent = String(n);
        b.appendChild(c);
      }
      // The icon alone cannot say "3 people are overdue", so the narrow rail
      // keeps a title on every item.
      b.title = (isChild ? "Assign " + sec[1].toLowerCase() : sec[1]) + (n ? " (" + n + ")" : "");
      b.addEventListener("click", function () { showSection(sec[0]); });
      host.appendChild(b);
    });
  }

  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    if (!id || id === currentSect) return;
    showSection(id, true);
    /* It may have refused: an unknown name, or a tab this org does not have. Then the
       address bar still says #account (a bookmark from the build that had that tab)
       while Overview is on screen, so the two are corrected to agree — the same rule
       `applyPendingSection` applies at load time, through the same writer. */
    if (currentSect !== id) showSection(currentSect, false);
  });

  /* A link to #documents arrives BEFORE the documents do: the tab exists only for
     an org that holds a package, and that answer comes from the API, so at load
     time showSection can only refuse it and fall back to Overview — leaving the
     address bar saying #documents while another screen is on display. loadDocs
     calls this once it knows, on both paths (it must also run on the 404 path, or
     an older API would leave the intent pending forever). */
  function applyPendingSection() {
    var id = location.hash.slice(1);
    if (!id || id === currentSect) return;
    var known = SECTIONS.some(function (x) { return x[0] === id; });
    if (known && sectionVisible(id)) showSection(id, true);
    // The hash names a tab this org does not have, or nothing at all. Correct the
    // URL to what is actually on screen rather than leave the two disagreeing —
    // through showSection, which is the one place that knows how to write the hash
    // (and how to fall back when replaceState is refused).
    else showSection(currentSect, false);
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

  /** A person's document readings, for the exported roster. */
  function famCsvRows(m) {
    return famForUser(m.userId).map(function (r) {
      var doc = lastDocs.filter(function (d) { return d.pkgId === r.pkgId; })[0];
      return {
        item: (doc ? docTitleOf(doc) : r.pkgId) + " (Rev. " + r.revision + ")",
        company: doc ? docCompanyOf(doc) : "",
        deadline: r.deadline,
        status: r.acknowledgedAt
          ? (r.acknowledgedBy === "learner" ? "Confirmed by the learner" : "Recorded by an administrator")
          : (r.status === "overdue" ? "Overdue" : "Outstanding"),
        doneAt: r.acknowledgedAt
      };
    });
  }

  function buildRosterCsv(members) {
    /* ONE ROW PER OBLIGATION, courses and document readings alike. A roster
       export that listed only courses described half of what people owe, and
       half an answer in a spreadsheet is worse than none — it looks complete.
       "Kind" is the first column so the two can be told apart at a glance and
       filtered in whatever the reader opens this in. */
    var rows = [[
      "Member", "Email", "Role", "Kind", "Item", "Company", "Status", "Due", "Days remaining",
      "Completed", "Assessment %", "Certificate number", "Certificate issued",
      "Lessons completed", "Lessons total", "Progress %", "Last active"
    ]];
    members.forEach(function (m) {
      /* THE SAME RULE AS THE PRINTED REPORT, and it has to be the same or the
         two exports of one roster disagree about whether somebody is done: a
         certificate belongs to an assignment only if it was issued AFTER that
         assignment was created. A course can hold a series, so the newest
         QUALIFYING one wins; an award from a previous round is reported on its
         own row instead of being attached to the current obligation. */
      var certFor = function (key, assignedAt) {
        var best = null;
        (m.certificates || []).forEach(function (c) {
          if (c.courseKey !== key) return;
          if (assignedAt && !(String(c.issuedAt) >= String(assignedAt))) return;
          if (!best || String(c.issuedAt) > String(best.issuedAt)) best = c;
        });
        return best;
      };
      var prog = {};
      (m.progress || []).forEach(function (p) { prog[p.courseKey] = p; });

      // A member with no assignments still gets a row: "nobody assigned them
      // anything" is a finding, and dropping them makes the report look complete.
      var list = (m.assignments || []);
      var docRows = famCsvRows(m);
      if (!list.length && !docRows.length) {
        rows.push([fullName(m), m.email, m.orgRole, "", "", "", "Nothing assigned", "", "",
                   "", "", "", "", "", "", "", csvDate(m.lastActiveAt)]);
        return;
      }
      list.forEach(function (a) {
        var c = certFor(a.courseKey, a.assignedAt), p = prog[a.courseKey];
        rows.push([
          fullName(m), m.email, m.orgRole,
          "Course", labelFor(a.courseKey), "", statusWord(a),
          csvDate(a.deadline), a.daysRemaining,
          csvDate(a.completedAt), a.score != null ? a.score : (c && c.examScore != null ? c.examScore : ""),
          c ? c.number : "", c ? csvDate(c.issuedAt) : "",
          p ? p.lessonsCompleted : "", p ? p.lessonsTotal : "", p ? p.percent : "",
          csvDate(m.lastActiveAt)
        ]);
      });

      /* EARLIER CERTIFICATES AS THEIR OWN ROWS. Dropping them would make the
         CSV a worse record than the database; attaching them to a current
         assignment would make it a wrong one. "Certificate" is its own Kind,
         beside "Course" and "Document". */
      (m.certificates || []).forEach(function (c) {
        var claimed = list.some(function (a) {
          var q = certFor(a.courseKey, a.assignedAt);
          return q && q.number === c.number;
        });
        if (claimed) return;
        rows.push([
          fullName(m), m.email, m.orgRole,
          "Certificate", labelFor(c.courseKey), "", "Issued",
          "", "", csvDate(c.issuedAt), c.examScore != null ? c.examScore : "",
          c.number, csvDate(c.issuedAt), "", "", "",
          csvDate(m.lastActiveAt)
        ]);
      });

      // Then their document readings, in the same shape.
      docRows.forEach(function (d) {
        rows.push([
          fullName(m), m.email, m.orgRole,
          "Document", d.item, d.company, d.status,
          csvDate(d.deadline), "",
          csvDate(d.doneAt), "", "", "",
          "", "", "",
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

    // ── Masthead: the mark and wordmark, then what this report IS. Page 1 only,
    //    the same decision the app's export makes; every page gets the footer.
    var head = el("div", "prep-head");
    var brand = el("div", "prep-brand");
    var logo = document.createElement("img");
    logo.className = "prep-logo"; logo.src = "logo-header.png?v=4"; logo.alt = "";
    brand.appendChild(logo);
    var words = document.createElement("div");
    var mark = el("p", "prep-mark");
    mark.appendChild(document.createTextNode("CAW "));
    mark.appendChild(el("span", null, "Academy"));
    words.appendChild(mark);
    words.appendChild(el("p", "prep-tag", "Airworthiness made learnable"));
    brand.appendChild(words);
    head.appendChild(brand);

    var id = el("div", "prep-id");
    id.appendChild(el("p", "prep-title", "Team training report"));
    id.appendChild(el("p", "prep-org", orgName || "Your organisation"));
    var when = el("p", "prep-when");
    when.appendChild(document.createTextNode("Exported " + longStamp(new Date())));
    when.appendChild(document.createElement("br"));
    when.appendChild(document.createTextNode(
      scopeLabel + "  ·  " + members.length + " member" + (members.length === 1 ? "" : "s")));
    id.appendChild(when);
    head.appendChild(id);
    root.appendChild(head);
    root.appendChild(el("div", "prep-rule"));

    /* The report OPENS WITH THE ANSWER — the same five figures the dashboard
       shows, so whoever ran it and whoever reads it are looking at one thing.
       A report that starts with row one of a table makes the reader do the
       summing the page could have done. */
    var t = { total: 0, overdue: 0, dueSoon: 0, done: 0 };
    members.forEach(function (m) {
      var st = memberStats(m);
      t.total += st.total; t.overdue += st.overdue; t.dueSoon += st.dueSoon; t.done += st.done;
    });
    var summary = el("div", "prep-summary");
    [["Members", members.length, ""],
     ["Assigned", t.total, ""],
     ["Overdue", t.overdue, "alert"],
     ["Due soon", t.dueSoon, "warn"],
     ["Completed", t.done, "good"]
    ].forEach(function (row) {
      var box = el("div", "ps" + (row[2] ? " " + row[2] : "") + (row[1] === 0 && row[2] ? " zero" : ""));
      box.appendChild(el("b", null, String(row[1])));
      box.appendChild(el("span", null, row[0]));
      summary.appendChild(box);
    });
    root.appendChild(summary);

    members.forEach(function (m) {
      var st = memberStats(m);
      var block = el("div", "prep-member");

      var mh = el("div", "pm-head");
      var who = document.createElement("div");
      who.appendChild(el("p", "pm-name", fullName(m)));
      who.appendChild(el("p", "pm-mail", m.email +
        (m.lastActiveAt ? "  ·  last active " + fmtDate(m.lastActiveAt) : "  ·  no activity reported")));
      mh.appendChild(who);

      // The same chips the roster card carries, so the paper and the screen agree.
      var chips = el("div", "pm-chips");
      function chip(kind, text) { chips.appendChild(el("span", "pm-chip " + kind, text)); }
      if (!st.total) chip("none", "No assignments");
      else {
        if (st.overdue) chip("overdue", st.overdue + " overdue");
        if (st.dueSoon) chip("due_soon", st.dueSoon + " due soon");
        if (st.upcoming) chip("", st.upcoming + " upcoming");
        if (st.done) chip("done", st.done + " completed");
      }
      mh.appendChild(chips);
      block.appendChild(mh);

      if (!st.total) {
        block.appendChild(el("p", "prep-none", "No courses assigned."));
      } else {
        /* A CERTIFICATE IS DURABLE; AN ASSIGNMENT IS NOT. The same person can
           hold an award earned last year for a course they have just been
           assigned again — and matching the two by course key alone printed
           that old award, and its score, against a row reading "Upcoming, 0%".
           A report that says a 0% assignment carries 100% is the kind of
           document somebody has to explain afterwards.

           So a certificate belongs to THIS round only if it was issued after
           the assignment was created. The rest are not discarded — they are
           the person's record — they move to their own line below the table,
           where they are a fact about the holder rather than a claim about
           the work in hand. */
        var certsFor = function (key, assignedAt) {
          var best = null;
          (m.certificates || []).forEach(function (c) {
            if (c.courseKey !== key) return;
            if (assignedAt && !(String(c.issuedAt) >= String(assignedAt))) return;
            if (!best || String(c.issuedAt) > String(best.issuedAt)) best = c;
          });
          return best;
        };
        var prog = {};
        (m.progress || []).forEach(function (p) { prog[p.courseKey] = p; });

        var table = document.createElement("table");
        var thead = document.createElement("thead");
        var hrow = document.createElement("tr");
        ["Course", "Status", "Due", "Progress", "Assessment", "Certificate"].forEach(function (h, i) {
          var th = el("th", i >= 4 ? "right" : null, h);
          hrow.appendChild(th);
        });
        thead.appendChild(hrow); table.appendChild(thead);

        var tbody = document.createElement("tbody");
        (m.assignments || []).forEach(function (a) {
          var c = certsFor(a.courseKey, a.assignedAt), p = prog[a.courseKey];
          var tr = document.createElement("tr");
          tr.appendChild(el("td", "course", labelFor(a.courseKey)));

          var tdSt = document.createElement("td");
          tdSt.appendChild(el("span", "st " + a.displayStatus, statusWord(a)));
          tr.appendChild(tdSt);

          tr.appendChild(el("td", null, a.status === "completed"
            ? fmtDate(a.completedAt) : fmtDate(a.deadline)));

          // A bar AND the number: a bar alone cannot be read off a photocopy.
          var tdP = document.createElement("td");
          if (p) {
            // No "full" variant any more: the bar is green at every level, and
            // 100% is said by the figure beside it.
            var bar = el("div", "pbar");
            var fill = document.createElement("i");
            fill.style.width = Math.max(0, Math.min(100, p.percent)) + "%";
            bar.appendChild(fill);
            tdP.appendChild(bar);
            tdP.appendChild(document.createTextNode(p.percent + "%  (" + p.lessonsCompleted + "/" + p.lessonsTotal + ")"));
          } else {
            tdP.textContent = "not reported";
          }
          tr.appendChild(tdP);

          var score = a.score != null ? a.score : (c && c.examScore != null ? c.examScore : null);
          tr.appendChild(el("td", "right", score != null ? score + "%" : "—"));
          tr.appendChild(el("td", "num right", c ? c.number : "—"));
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        block.appendChild(table);

        /* EARLIER AWARDS, named rather than dropped. An admin reading this
           wants to know the person has done the course before — just not in a
           column that implies the current assignment is finished. */
        var earlier = (m.certificates || []).filter(function (c) {
          return !(m.assignments || []).some(function (a) {
            return a.courseKey === c.courseKey && certsFor(a.courseKey, a.assignedAt) &&
                   certsFor(a.courseKey, a.assignedAt).number === c.number;
          });
        });
        if (earlier.length) {
          var note = el("p", "prep-earlier");
          note.appendChild(el("b", null, "Earlier certificates: "));
          note.appendChild(document.createTextNode(
            earlier.map(function (c) {
              return labelFor(c.courseKey) + " \u2014 " + c.number +
                (c.issuedAt ? ", " + fmtDate(c.issuedAt) : "");
            }).join("  \u00b7  ")));
          block.appendChild(note);
        }
      }
      root.appendChild(block);
    });

    root.appendChild(el("p", "prep-disclaim", REPORT_DISCLAIMER));

    var foot = el("div", "prep-foot");
    foot.appendChild(el("span", null, "Team training report  ·  " + (orgName || "") +
      "  ·  " + longStamp(new Date())));
    foot.appendChild(el("span", "site", "caw-academy.com"));
    root.appendChild(foot);

    host.appendChild(root);
  }

  /** The report masthead, shared by both printed reports so a records export
   *  and a roster export are plainly the same document from the same product.
   *  Page 1 only — the same decision the app's own export makes. */
  function printMasthead(title, subtitle) {
    var head = el("div", "prep-head");
    var brand = el("div", "prep-brand");
    var logo = document.createElement("img");
    logo.className = "prep-logo"; logo.src = "logo-header.png?v=4"; logo.alt = "";
    brand.appendChild(logo);
    var words = document.createElement("div");
    var mark = el("p", "prep-mark");
    mark.appendChild(document.createTextNode("CAW "));
    mark.appendChild(el("span", null, "Academy"));
    words.appendChild(mark);
    words.appendChild(el("p", "prep-tag", "Airworthiness made learnable"));
    brand.appendChild(words);
    head.appendChild(brand);

    var id = el("div", "prep-id");
    id.appendChild(el("p", "prep-title", title));
    id.appendChild(el("p", "prep-org", ($("orgName").textContent || "Your organisation").trim()));
    var when = el("p", "prep-when");
    when.appendChild(document.createTextNode("Exported " + longStamp(new Date())));
    when.appendChild(document.createElement("br"));
    when.appendChild(document.createTextNode(subtitle));
    id.appendChild(when);
    head.appendChild(id);
    return head;
  }

  /* THE PRINTED RECORDS REPORT. One table, because that is what it is — a
     history to be filed, re-sorted and kept, not a dashboard. It states its
     own filters under the title, so a cut of the history cannot be mistaken
     for the whole of it a year later when nobody remembers how it was run. */
  function buildRecordsPrint(rows, custom) {
    var host = $("printReport"); host.textContent = "";
    var root = el("div", "prep");

    var counts = { course: 0, document: 0, certificate: 0 };
    rows.forEach(function (r) { counts[r.kind]++; });

    /* The sheet states its OWN criteria, and `custom` is passed by the caller
       rather than read from the filter state — the two export buttons now mean
       different things, and a sheet of the whole history headed with whatever
       the filter panel happens to say is exactly the document that gets handed
       to an auditor and then has to be explained. */
    var narrow = custom && recFilterIsOn();
    root.appendChild(printMasthead(
      narrow ? "Training records \u2014 custom report" : "Training records",
      rows.length + " record" + (rows.length === 1 ? "" : "s") + "  \u00b7  " +
        (custom ? recFilterSummary() : "Complete history")));
    root.appendChild(el("div", "prep-rule"));

    var summary = el("div", "prep-summary");
    [["Records", rows.length, ""],
     ["Courses completed", counts.course, "good"],
     ["Documents read", counts.document, ""],
     ["Certificates", counts.certificate, "good"]
    ].forEach(function (row) {
      var box = el("div", "ps" + (row[2] ? " " + row[2] : "") + (row[1] === 0 && row[2] ? " zero" : ""));
      box.appendChild(el("b", null, String(row[1])));
      box.appendChild(el("span", null, row[0]));
      summary.appendChild(box);
    });
    root.appendChild(summary);

    var table = document.createElement("table");
    table.className = "prep-rows";
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    ["Date", "Person", "Record", "Item", "Detail", "Status"].forEach(function (h) {
      var th = document.createElement("th"); th.textContent = h; hr.appendChild(th);
    });
    thead.appendChild(hr); table.appendChild(thead);

    var tbody = document.createElement("tbody");
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      [fmtDate(r.when),
       r.who,
       r.kind === "course" ? "Course" : r.kind === "certificate" ? "Certificate" : "Document",
       r.item + (r.company ? " (" + r.company + ")" : ""),
       r.detail || "",
       r.status
      ].forEach(function (v) {
        var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);

    root.appendChild(el("p", "prep-disclaim", REPORT_DISCLAIMER));

    var foot = el("div", "prep-foot");
    foot.appendChild(el("span", null, "Training records  \u00b7  " +
      ($("orgName").textContent || "").trim() + "  \u00b7  " + longStamp(new Date())));
    foot.appendChild(el("span", "site", "caw-academy.com"));
    root.appendChild(foot);

    host.appendChild(root);
  }

  function exportRosterPdf(members, scopeLabel) {
    if (!members.length) { showMessage("rosterMsg", "Nothing to export.", "err"); return; }
    buildPrintReport(members, scopeLabel, ($("orgName").textContent || "").trim());
    showMessage("rosterMsg",
      "Choose \u201cSave as PDF\u201d as the destination in the print dialog.", "ok");
    /* WAIT FOR THE MASTHEAD MARK before opening the dialog. print() captures the
       page as it stands, so on a cold load — where the logo has not decoded yet —
       the report would go to paper with an empty box where the brand should be.
       Capped at 1.5s so a missing or slow image delays the dialog rather than
       withholding it. */
    var logo = $("printReport").querySelector(".prep-logo");
    var ready = (logo && !logo.complete)
      ? new Promise(function (done) {
          var go = function () { done(); };
          logo.addEventListener("load", go, { once: true });
          logo.addEventListener("error", go, { once: true });
          setTimeout(go, 1500);
        })
      : Promise.resolve();
    // A tick after that so the message paints before the modal dialog blocks.
    ready.then(function () { setTimeout(function () { window.print(); }, 60); });
  }

  // ── Licence & seats ───────────────────────────────────────────────────────
  /* Every figure here was already in the database and reached no customer screen:
     the portal could say who has an account, never how many seats were paid for,
     how many were redeemed, or when access ends. NO redeem codes are shown — an
     unredeemed code is a credential, and re-sending one belongs in an invite over
     email, not on a page anyone can read over a shoulder. */
  /* The last licence payload, kept so expanding a contract's course list can
     re-render from memory instead of asking the server again. */
  var lastLicence = null;
  // Which contracts have their course list open, keyed by licence id.
  var contractOpen = {};
  // Which contracts have their code list open, and what the server gave us for
  // each — fetched on demand, because the codes are the one secret on this page
  // and there is no reason for every page load to carry them.
  var codesOpen = {};
  var codesCache = {};

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

  /* Licences and renewal date in the RAIL, under the organisation's name — the
     two standing facts an admin needs on every screen, which is exactly why they
     must not cost the canvas a band of its own. The meter beside them turns amber
     at the cap, because that is the moment a new colleague cannot be added and
     nothing else on the page says so. */
  function renderStrap(t) {
    var el = $("orgStrap"); if (!el) return;
    var meter = $("orgMeter");
    el.textContent = "";
    if (meter) meter.classList.add("hidden");
    if (!t || !t.seatLimit) return;

    if (meter) {
      var pct = Math.max(0, Math.min(100, Math.round((t.claimed / t.seatLimit) * 100)));
      meter.classList.remove("hidden");
      meter.classList.toggle("full", t.claimed >= t.seatLimit);
      meter.firstElementChild.style.width = pct + "%";
      meter.setAttribute("role", "img");
      meter.setAttribute("aria-label", t.claimed + " of " + t.seatLimit + " licences in use");
    }

    var seats = document.createElement("div");
    var b = document.createElement("b");
    b.textContent = t.claimed + " of " + t.seatLimit;
    seats.appendChild(b);
    seats.appendChild(document.createTextNode(" licences in use"));
    el.appendChild(seats);

    if (t.validUntil) {
      var line = document.createElement("div");
      line.appendChild(document.createTextNode("Renews "));
      var when = document.createElement("span");
      when.className = t.daysRemaining <= 30 ? "alert" : t.daysRemaining <= 90 ? "warn" : "";
      when.textContent = fmtDate(t.validUntil);
      line.appendChild(when);
      el.appendChild(line);
    }
  }

  /** One label-and-value line in the narrow Licence panel. Five stat tiles fitted
   *  a full-width card and do not fit a sidebar column; the facts are the same. */
  /** Copy text, and say so ON the control that was pressed. A toast at the top
   *  of the page is not read by somebody looking at row eleven of a code list. */
  function copyTo(btn, text, done) {
    var original = btn.textContent;
    function ok() { btn.textContent = done || "Copied"; setTimeout(function () { btn.textContent = original; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { btn.textContent = "Press ⌘C"; });
    } else {
      // Older browsers, and any context where the async clipboard is refused.
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { btn.textContent = "Press ⌘C"; }
      ta.remove();
    }
  }

  /** Every seat on one contract: unreadable first (they need action), then
   *  unused, then spent. */
  function codesPanel(row, data) {
    var panel = document.createElement("div"); panel.className = "codes";

    /* ONE LIST OF SEATS, not a list of codes. The old panel listed only the
       codes it could read and said one sentence about the rest, so the seats
       that actually needed doing something about were the ones it left out.
       A seat whose code cannot be recovered is still a seat — it is shown, and
       it carries the only thing that fixes it. */
    var seats = data.seats || (data.codes || []).map(function (c) {
      return { id: null, code: c.code, claimedAt: c.claimedAt };   // older server
    });

    if (!seats.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.style.padding = "9px";
      e.textContent = "No codes have been minted on this contract yet.";
      panel.appendChild(e);
      return panel;
    }

    var unused = seats.filter(function (s) { return !s.claimedAt && s.code; });
    var lost = seats.filter(function (s) { return !s.claimedAt && !s.code; });

    var head = document.createElement("div"); head.className = "codes-h";
    var n = document.createElement("span"); n.className = "n";
    n.textContent = unused.length + " unused of " + seats.length;
    head.appendChild(n);
    if (unused.length) {
      var all = document.createElement("button");
      all.type = "button"; all.className = "code-copy";
      all.textContent = "Copy unused";
      all.addEventListener("click", function () {
        // Only the unused ones: a spent code pasted into an email to a new
        // colleague is a support ticket waiting to happen.
        copyTo(all, unused.map(function (s) { return s.code; }).join("\n"),
               "Copied " + unused.length);
      });
      head.appendChild(all);
    }
    panel.appendChild(head);

    /* WHY SOME CANNOT BE SHOWN, said once above the rows rather than per row.
       It is a property of when they were minted, not of any one seat. */
    if (lost.length) {
      var note = document.createElement("div"); note.className = "codes-note";
      note.textContent = data.encryptionEnabled === false
        ? lost.length + " code" + (lost.length === 1 ? " was" : "s were") +
          " stored without a readable copy and cannot be shown. Contact CAW Academy."
        : lost.length + " code" + (lost.length === 1 ? " was" : "s were") +
          " issued before codes could be stored for recall. Re-issue to get a working one — " +
          "the old code stops working.";
      panel.appendChild(note);
    }

    var order = function (s) { return !s.claimedAt && !s.code ? 0 : s.claimedAt ? 2 : 1; };
    seats.slice().sort(function (a, b) { return order(a) - order(b); }).forEach(function (s) {
      var line = document.createElement("div");
      line.className = "code-row" + (s.claimedAt ? " used" : "");

      var code = document.createElement("code");
      code.textContent = s.code || "\u2014\u2014\u2014\u2014  \u2014\u2014\u2014\u2014";
      if (!s.code) code.className = "code-lost";
      line.appendChild(code);

      if (s.claimedAt) {
        var tag = document.createElement("span"); tag.className = "used-tag";
        tag.textContent = "redeemed";
        line.appendChild(tag);
      } else if (s.code) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "code-copy"; b.textContent = "Copy";
        b.addEventListener("click", function () { copyTo(b, s.code); });
        line.appendChild(b);
      } else if (s.id && data.encryptionEnabled !== false) {
        /* THE REMEDY, on the row that needs it. The old code is replaced, so
           this is asked for rather than done on a single click: a code already
           emailed to a colleague who has not redeemed it yet dies here. */
        var re = document.createElement("button");
        re.type = "button"; re.className = "code-copy"; re.textContent = "Re-issue";
        re.addEventListener("click", function () {
          if (!window.confirm(
            "Issue a new code for this licence?\n\n" +
            "The current code stops working immediately. If you have already sent it " +
            "to someone who has not signed up yet, send them the new one.")) return;
          re.disabled = true; re.textContent = "Issuing\u2026";
          authed("POST", "/v1/org/licenses/" + encodeURIComponent(row.id) +
                         "/seats/" + encodeURIComponent(s.id) + "/reissue", {})
            .then(function () {
              // Re-read rather than patching the row: the server is the record
              // of what the code now is, and a local guess can disagree with it.
              return authed("GET", "/v1/org/licenses/" + encodeURIComponent(row.id) + "/codes", null)
                .then(function (fresh) {
                  var holder = panel.parentElement;
                  if (holder) holder.replaceChild(codesPanel(row, fresh), panel);
                });
            })
            .catch(function (err) {
              re.disabled = false; re.textContent = "Re-issue";
              showMessage("licenceMsg", err.message || "Couldn't issue a new code.", "err");
            });
        });
        line.appendChild(re);
      }
      panel.appendChild(line);
    });
    return panel;
  }

  function licRow(label, value, tone) {
    var row = document.createElement("div"); row.className = "kv";
    var k = document.createElement("span"); k.textContent = label;
    var v = document.createElement("b");
    if (tone === "alert") v.style.color = "var(--err)";
    else if (tone === "warn") v.style.color = "var(--warn)";
    v.textContent = String(value);
    row.appendChild(k); row.appendChild(v);
    return row;
  }

  /* THE WARNING WINDOWS, matching the server's sweep exactly (60 / 30 / 7).
     The portal and the email must not disagree about what counts as expiring:
     an admin who has been emailed and then finds nothing on the dashboard
     concludes the email was spam, and the one after it too. */
  var EXPIRY_WARN_DAYS = 60;
  var EXPIRY_URGENT_DAYS = 30;

  /** The contracts close enough to expiry to say something about, soonest first. */
  function expiringContracts(data) {
    return ((data && data.licenses) || []).filter(function (r) {
      return r.daysRemaining != null && r.daysRemaining >= 0 &&
             r.daysRemaining <= EXPIRY_WARN_DAYS;
    }).sort(function (a, b) { return a.daysRemaining - b.daysRemaining; });
  }

  function renderExpiryNotice(data) {
    var host = $("expiryNotice"); if (!host) return;
    host.textContent = "";
    var due = expiringContracts(data);
    if (!due.length) return;

    var soonest = due[0].daysRemaining;
    var note = document.createElement("div");
    note.className = "xnote" + (soonest <= EXPIRY_URGENT_DAYS ? " soon" : "");
    note.setAttribute("role", "status");

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
    note.appendChild(svg);

    var body = document.createElement("div");
    var head = document.createElement("b");
    /* Named by contract, because that reference is what the admin quotes to us
       and matches against an invoice. "Your licence expires" sends them back
       into the portal to work out which one. */
    head.textContent = due.length === 1 && due[0].reference
      ? "Licences under contract " + due[0].reference + " expire " + inDays(soonest)
      : due.length === 1
        ? "Your licences expire " + inDays(soonest)
        : due.length + " contracts expire within " + EXPIRY_WARN_DAYS + " days";
    body.appendChild(head);

    if (due.length === 1) {
      var sub = document.createElement("span");
      sub.textContent = due[0].seatLimit + " licence" + (due[0].seatLimit === 1 ? "" : "s") +
        "  \u00b7  ends " + fmtDate(due[0].validUntil) +
        "  \u00b7  contact CAW Academy to renew.";
      body.appendChild(sub);
    } else {
      var ul = document.createElement("ul"); ul.className = "xlist";
      due.forEach(function (r) {
        var li = document.createElement("li");
        var nm = document.createElement("b");
        nm.textContent = r.reference || "Licence";
        li.appendChild(nm);
        li.appendChild(document.createTextNode(
          "  \u00b7  " + r.seatLimit + " licence" + (r.seatLimit === 1 ? "" : "s") +
          "  \u00b7  " + fmtDate(r.validUntil) + " (" + inDays(r.daysRemaining) + ")"));
        ul.appendChild(li);
      });
      body.appendChild(ul);
      var sub2 = document.createElement("span");
      sub2.textContent = "Contact CAW Academy to renew.";
      body.appendChild(sub2);
    }
    note.appendChild(body);
    host.appendChild(note);
  }

  /** "tomorrow" / "in 9 days" — the same phrasing the expiry email uses. */
  function inDays(n) {
    if (n <= 0) return "today";
    return n === 1 ? "tomorrow" : "in " + n + " days";
  }

  function renderLicence(data) {
    lastLicence = data;
    showMessage("licenceMsg", "", "ok");
    renderExpiryNotice(data);
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

    /* ONE HEADLINE, THEN THE REST QUIETLY.
       Six label-and-value rows of equal weight made the admin read all six to
       find the one that matters, and the one that matters is almost always the
       same: how many licences are left. So the count leads, as a figure with the
       same meter the rail carries, and the standing facts follow underneath.
       Nothing here is acted on, so none of it competes with the exposure tiles
       across the page — it is reference, laid out as reference. */
    var full = t.claimed >= t.seatLimit;
    var days = t.daysRemaining;

    var headline = document.createElement("div"); headline.className = "lic-head";
    var fig = document.createElement("div"); fig.className = "lic-fig" + (full ? " full" : "");
    var big = document.createElement("b"); big.textContent = String(t.claimed);
    fig.appendChild(big);
    fig.appendChild(document.createTextNode(" of " + t.seatLimit));
    headline.appendChild(fig);
    var cap = document.createElement("div"); cap.className = "lic-cap";
    cap.textContent = "licences in use";
    headline.appendChild(cap);

    var meter = document.createElement("div");
    meter.className = "lic-meter" + (full ? " full" : "");
    var fill = document.createElement("i");
    fill.style.width = Math.max(0, Math.min(100, Math.round((t.claimed / t.seatLimit) * 100))) + "%";
    meter.appendChild(fill);
    headline.appendChild(meter);

    host.appendChild(headline);

    /* EVERYTHING BELOW THE HEADLINE IS ONE LIST, label left and figure right.
       "Spare" and "codes unredeemed" used to be a two-up block of large
       figures between the meter and the rows beneath, so the panel changed
       shape twice on the way down and the eye had to re-find the left edge
       each time. They are the same KIND of fact as the rows that follow —
       standing reference, nothing to act on — so they are now written the
       same way, and the contract blocks below already use this row. */
    host.appendChild(licRow("Spare licences", t.spare, t.spare ? "" : "warn"));
    // Invited and never arrived — a gap an admin otherwise has no way to see.
    host.appendChild(licRow("Codes unredeemed", t.unredeemed, t.unredeemed ? "warn" : ""));

    // Membership is by email domain, so someone can hold an account on your
    // domain and no entitlement at all.
    if (data.accountsWithoutSeat) {
      host.appendChild(licRow("Accounts without a licence", data.accountsWithoutSeat, "warn"));
    }
    var frameworks = Object.keys(licencedFrameworks());
    if (frameworks.length && frameworks.length < 4) {
      host.appendChild(licRow("Covers", frameworks.join(", "), ""));
    }
    if (t.validUntil) {
      var row = licRow("Renews", fmtDate(t.validUntil),
        days != null && days <= 30 ? "alert" : days != null && days <= 90 ? "warn" : "");
      if (days != null) {
        var pill = document.createElement("span");
        pill.className = "pill " + (days <= 30 ? "overdue" : days <= 90 ? "due_soon" : "upcoming");
        pill.style.marginLeft = "7px";
        pill.textContent = days + " days";
        row.lastChild.appendChild(pill);
      }
      host.appendChild(row);
    }

    /* EVERY CONTRACT, EACH AS ITS OWN BLOCK, read top to bottom: reference,
       term, licences, how many are redeemed, and what it includes.

       It used to be one squashed line per licence — and only when there was
       more than one — which answered none of those questions and could not be
       matched against an invoice. An organisation that renews or tops up holds
       several at once with different end dates and different course scopes, and
       "which contract is the one expiring in March, and what is on it" is the
       question this panel exists to answer. It is shown even for a single
       contract: one contract is still the contract, and its reference is the
       thing an admin quotes when they email us. */
    var head = document.createElement("div");
    head.className = "grouphead"; head.style.marginTop = "14px";
    head.textContent = rows.length === 1 ? "Contract" : rows.length + " contracts";
    detail.appendChild(head);

    rows.forEach(function (r, i) {
      var box = document.createElement("div"); box.className = "contract";

      var top = document.createElement("div"); top.className = "contract-h";
      var ref = document.createElement("b");
      // No recorded reference on an older licence, so it is named by position
      // rather than by a cuid nobody can read off a purchase order.
      ref.textContent = r.reference || ("Licence " + (i + 1));
      top.appendChild(ref);
      var pill = document.createElement("span");
      pill.className = "pill " + (r.daysRemaining <= 30 ? "overdue" : r.daysRemaining <= 90 ? "due_soon" : "upcoming");
      pill.textContent = r.daysRemaining <= 30 ? "Renew soon" : r.daysRemaining <= 90 ? "Expiring" : "Active";
      top.appendChild(pill);
      box.appendChild(top);

      /* "Ends in 365 days" is GONE. The summary above states the renewal date
         with the same count beside it as a pill, and this block's own header
         grades it a third time (Active / Expiring / Renew soon) — three
         statements of one fact in one card, which is what made it read as a
         list rather than as a contract. The term keeps the START date, which
         is the one thing here the summary does not say. */
      box.appendChild(licRow("Term", (r.validFrom ? fmtDate(r.validFrom) + " – " : "to ") + fmtDate(r.validUntil), ""));
      box.appendChild(licRow("Licences", String(r.seatLimit), ""));
      box.appendChild(licRow("Redeemed", r.claimed + " of " + r.issued + " code" + (r.issued === 1 ? "" : "s") + " issued",
        r.issued > r.claimed ? "warn" : ""));
      if (r.issued < r.seatLimit) {
        box.appendChild(licRow("Not yet issued", String(r.seatLimit - r.issued), ""));
      }

      /* WHAT IS ON THIS CONTRACT, BY NAME. "7 courses · EASA, UK CAA" answers
         how much and roughly what, and an admin checking whether a colleague
         can be given Part-145 needs to know WHICH seven. The summary stays as
         the line — eighty course titles cannot be the default state of a
         sidebar — and opens to the list, grouped by framework because that is
         how the catalogue is sold and how the names disambiguate (Part-M and
         UK Part-M are different courses). */
      /* NOT A LABEL-AND-VALUE ROW. Every other line here is a short right-
         aligned figure; this one is a sentence — "75 courses · EASA, UK CAA,
         UAE GCAA, FAA" — and right-aligning a sentence wraps it into a ragged
         block with the disclosure arrow stranded at the far edge, away from
         the words it opens. It gets its own full-width line under a quiet
         label, reading left to right like the prose it is. */
      var incl = document.createElement("div"); incl.className = "lic-incl";
      var inclLab = document.createElement("span"); inclLab.className = "lic-incl-k";
      inclLab.textContent = "Includes";
      incl.appendChild(inclLab);
      var inclVal = document.createElement("div"); inclVal.className = "lic-incl-v";
      incl.appendChild(inclVal);
      var wide = !r.scope || r.scope.indexOf("__all__") !== -1;
      if (wide) {
        inclVal.textContent = scopeLabel(r.scope);
        box.appendChild(incl);
      } else {
        var open = !!contractOpen[r.id];
        var toggle = document.createElement("button");
        toggle.type = "button"; toggle.className = "lic-more";
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.appendChild(document.createTextNode(scopeLabel(r.scope)));
        var chv = document.createElement("span"); chv.className = "fold-chev";
        toggle.appendChild(chv);
        toggle.addEventListener("click", function () {
          if (contractOpen[r.id]) delete contractOpen[r.id]; else contractOpen[r.id] = true;
          renderLicence(lastLicence);
        });
        inclVal.appendChild(toggle);
        box.appendChild(incl);

        if (open) {
          var listed = document.createElement("div"); listed.className = "lic-courses";
          var byFw = {}, order = [];
          r.scope.forEach(function (k) {
            var fw = COURSE_FRAMEWORK[k] || "Other";
            if (!byFw[fw]) { byFw[fw] = []; order.push(fw); }
            byFw[fw].push(k);
          });
          // Catalogue order within a framework, so the list reads the way the
          // course picker does rather than the order the licence was typed in.
          order.forEach(function (fw) {
            var h = document.createElement("div"); h.className = "lic-fw"; h.textContent = fw;
            listed.appendChild(h);
            byFw[fw]
              .slice()
              .sort(function (a, b) { return (CATALOGUE_INDEX[a] || 0) - (CATALOGUE_INDEX[b] || 0); })
              .forEach(function (k) {
                var li = document.createElement("div"); li.className = "lic-course";
                li.textContent = labelFor(k);
                // A free anchor is on every licence whether it was bought or
                // not, so saying it is included without saying that is misleading.
                if (FREE_ANCHORS[k]) {
                  var f = document.createElement("span"); f.className = "lic-free";
                  f.textContent = "free";
                  li.appendChild(f);
                }
                listed.appendChild(li);
              });
          });
          box.appendChild(listed);
        }
      }

      /* THE SEAT CODES. Returned once at issue, to whoever received our email,
         which made onboarding depend on that person still having it. Fetched
         on demand rather than with the overview: they are the one secret on
         this page, and there is no reason for every page load to carry them. */
      var codesWrap = document.createElement("div");
      var codesBtn = document.createElement("button");
      codesBtn.type = "button"; codesBtn.className = "lic-more";
      codesBtn.style.margin = "8px 0 2px";
      codesBtn.appendChild(document.createTextNode(
        codesOpen[r.id] ? "Hide licence codes" : "Show licence codes"));
      var cchv = document.createElement("span"); cchv.className = "fold-chev";
      codesBtn.setAttribute("aria-expanded", codesOpen[r.id] ? "true" : "false");
      codesBtn.appendChild(cchv);
      codesBtn.addEventListener("click", function () {
        if (codesOpen[r.id]) { delete codesOpen[r.id]; renderLicence(lastLicence); return; }
        codesOpen[r.id] = true;
        if (codesCache[r.id]) { renderLicence(lastLicence); return; }
        codesBtn.disabled = true;
        authed("GET", "/v1/org/licenses/" + encodeURIComponent(r.id) + "/codes", null)
          .then(function (res) { codesCache[r.id] = res; renderLicence(lastLicence); })
          .catch(function (err) {
            delete codesOpen[r.id];
            showMessage("licenceMsg", err.message || "Couldn't load the codes.", "err");
            renderLicence(lastLicence);
          });
      });
      codesWrap.appendChild(codesBtn);

      if (codesOpen[r.id] && codesCache[r.id]) codesWrap.appendChild(codesPanel(r, codesCache[r.id]));
      box.appendChild(codesWrap);

      detail.appendChild(box);
    });

    /* The standing caption that used to close this panel is gone (SME). It
       explained how licences and membership work — true, and read once; after
       that it was four lines of boilerplate under every contract, in the one
       column where height is scarce. */
  }

  /** What a contract opens, in words. The raw scope is a list of up to eighty
   *  course keys, which is not a thing to print in a sidebar — an admin needs
   *  to recognise what they bought, and the framework names plus a count do
   *  that where `["m","camo","p145",…]` does not. */
  function scopeLabel(scope) {
    if (!scope || !scope.length) return "—";
    if (scope.indexOf("__all__") !== -1) return "Every course, all frameworks";
    var frameworks = {}, n = 0;
    scope.forEach(function (k) {
      if (FREE_ANCHORS[k]) return;          // free everywhere; it is not what was bought
      n++;
      if (COURSE_FRAMEWORK[k]) frameworks[COURSE_FRAMEWORK[k]] = true;
    });
    if (!n) return "Free courses only";
    var names = Object.keys(frameworks);
    return n + " course" + (n === 1 ? "" : "s") + (names.length ? " · " + names.join(", ") : "");
  }

  // ── Company documents ─────────────────────────────────────────────────────
  /* The licence decides WHAT the organisation holds; this decides WHO inside it
     can open each one. An MRO's packages are its customers' controlled documents,
     so "everyone with a licence" — the only behaviour there used to be — is the wrong
     default for them and the right one for an operator reading its own manual.
     Both are offered by name; neither is a switch the reader has to decode. */

  var lastDocs = [];
  // The org's registered email domains — the invite dialog states them, because
  // an address anywhere else is refused by the server and could not sign up.
  var lastDomains = [];

  function loadDocs() {
    return authed("GET", "/v1/org/documents", null).then(function (r) {
      lastDocs = (r && r.documents) || [];
      // No documents, no card. An org that has never bought one should not be
      // shown a control for a thing it does not have.
      $("docsCard").classList.toggle("hidden", lastDocs.length === 0);
      renderDocs();
      renderTabs();   // the Documents tab exists only when there is one
      applyPendingSection();
    }).catch(function (err) {
      // An older API has no /documents route; the card simply stays hidden, the
      // same rule the licence panel follows.
      if (err.status === 404) { $("docsCard").classList.add("hidden"); renderTabs(); applyPendingSection(); return; }
      $("docsCard").classList.remove("hidden");
      showMessage("docsMsg", err.message || "Couldn't load your documents.", "err");
    });
  }

  /* NOTHING IS WRITTEN ON A TICK. Every mode button and every box used to be a live
     server write, so an admin who was only looking around - ticking a name to see what
     happens - gave or cut someone's access to a controlled document without meaning
     to. Changes now collect in a per-document draft and reach the server only through
     an explicit "Save access changes", with a plain summary of what will change beside
     it and a Discard next to it. Keyed by pkgId and kept out of the DOM, like the filter
     and scroll state below, so a re-render does not lose it. */
  var docDraft = {};   // pkgId -> { mode: "all"|"selected", grants: { userId: true } }

  function serverGrants(doc) {
    var g = {}; (doc.grantedUserIds || []).forEach(function (id) { g[id] = true; }); return g;
  }
  function draftFor(doc) {
    if (!docDraft[doc.pkgId]) docDraft[doc.pkgId] = { mode: doc.mode, grants: serverGrants(doc) };
    return docDraft[doc.pkgId];
  }
  /** What saving would change, against what the server last said. Grant changes only
   *  count while the draft is "Only selected people": under "Everyone with a licence"
   *  the list is not in force, so ticks there change nothing the reader would notice. */
  function docChanges(doc) {
    var d = docDraft[doc.pkgId];
    var out = { mode: null, add: [], remove: [], n: 0 };
    if (!d) return out;
    if (d.mode !== doc.mode) { out.mode = d.mode; out.n += 1; }
    if (d.mode === "selected") {
      var srv = serverGrants(doc);
      Object.keys(d.grants).forEach(function (id) { if (!srv[id]) out.add.push(id); });
      Object.keys(srv).forEach(function (id) { if (!d.grants[id]) out.remove.push(id); });
      out.n += out.add.length + out.remove.length;
    }
    return out;
  }
  function anyDocChanges() {
    return lastDocs.some(function (doc) { return docChanges(doc).n > 0; });
  }
  /** Drop a draft that has drifted back to what the server holds, so the bar goes away
   *  when the admin un-ticks what they ticked. */
  function pruneDraft(doc) { if (docDraft[doc.pkgId] && docChanges(doc).n === 0) delete docDraft[doc.pkgId]; }

  function memberLabel(userId) {
    var m = lastRoster.filter(function (x) { return x.userId === userId; })[0];
    return m ? fullName(m) : "a former member";
  }

  /** One sentence naming what Save will do, in the admin's words, not counts alone. */
  function describeChanges(doc, ch) {
    var parts = [];
    if (ch.mode === "all") parts.push("open it to everyone with a licence");
    if (ch.mode === "selected") parts.push("limit it to the people ticked");
    if (ch.add.length) parts.push("give access to " + ch.add.map(memberLabel).join(", "));
    if (ch.remove.length) parts.push("remove access from " + ch.remove.map(memberLabel).join(", "));
    var t = parts.join("; ");
    return t.charAt(0).toUpperCase() + t.slice(1) + ".";
  }

  /* Save = the mode first, then each grant, one request at a time (the API takes one
     change per call). Each reply carries the full document list, so if one call fails
     part-way the list already reflects what DID land; the draft is kept, and the bar
     then shows only what is still outstanding. */
  function saveDocDraft(doc) {
    var ch = docChanges(doc);
    if (!ch.n) return Promise.resolve();
    showMessage("docsMsg", "", "ok");
    var base = "/v1/org/documents/" + encodeURIComponent(doc.pkgId);
    var steps = [];
    if (ch.mode) steps.push(function () { return authed("PUT", base + "/mode", { mode: ch.mode }); });
    ch.add.forEach(function (id) {
      steps.push(function () { return authed("PUT", base + "/grant", { userId: id, granted: true }); });
    });
    ch.remove.forEach(function (id) {
      steps.push(function () { return authed("PUT", base + "/grant", { userId: id, granted: false }); });
    });
    var summary = describeChanges(doc, ch);
    return steps.reduce(function (p, step) {
      return p.then(step).then(function (r) { lastDocs = (r && r.documents) || lastDocs; });
    }, Promise.resolve()).then(function () {
      delete docDraft[doc.pkgId];
      renderDocs();
      showMessage("docsMsg", "Saved for " + docTitleOf(doc) + ". " + summary, "ok");
    }).catch(function (err) {
      var fresh = lastDocs.filter(function (d) { return d.pkgId === doc.pkgId; })[0];
      if (fresh) pruneDraft(fresh);
      renderDocs();
      showMessage("docsMsg", (err.message || "Couldn't save that.") +
        " Anything still listed as not saved did not reach the server.", "err");
    });
  }

  window.addEventListener("beforeunload", function (e) {
    if (!anyDocChanges()) return;
    e.preventDefault(); e.returnValue = "";
  });

  /** The document's own name. The server resolves it (packaged title, else derived
   *  from the pkgId); an older API that sends none leaves the id, which is still the
   *  one label we are always sure of. */
  function docTitleOf(doc) { return doc.title || doc.pkgId; }

  /** The company that owns it. Documents are grouped under this. */
  function docCompanyOf(doc) { return doc.name || "Not yet loaded on the server"; }
  /* WHAT NARROWS THE LIST: free text, and one view. That is the whole set.

     It was four controls, and three were not earning their place. A COMPANY
     picker duplicated both the collapsible holder bands in the body and the
     search, which matches the company name. A FAMILIARISATION dropdown offered
     Required / Overdue / Not required when only "what is late" is a question
     anybody asks on a Tuesday. An ACCESS dropdown answered "what am I managing
     access for" — a view of the list rather than a property to combine with
     others, and nobody needs "restricted AND overdue" in one go. */
  var docQuery = "";
  var docView = "";           // "" | "restricted" | "overdue"

  /* How the list is ORDERED — a separate job, done by the column headings.
     "company" | "name" | "updated"; see visibleDocs for why order is a choice. */
  var docSort = "company";
  var docSortDesc = false;
  /* Which company groups are OPEN, keyed by company name. Stored as open rather
     than as folded so shut is the default for every holder without an init pass
     to remember — including a holder that only arrives on a later load. */
  var docOpen = {};

  /* Per-document state for the people list, kept OUT of the DOM because every tick is
     a server write whose reply rebuilds the whole card. Without this the filter would
     clear and the list would jump to the top after each one — harmless while the list
     was short, unmissable now that it scrolls. Keyed by pkgId. */
  var docPeopleQuery = {};
  var docPeopleScroll = {};
  var docsScroll = 0;         // the same, one level up, for the documents list itself

  /** The documents currently shown: the view, then the search within it. The
   *  search reaches the HOLDER as well as the title and the pkgId — which is
   *  what retired the company picker, and what somebody pastes when checking
   *  one specific package rather than browsing. */
  function visibleDocs() {
    var q = docQuery.trim().toLowerCase();
    var out = lastDocs.filter(function (d) {
      if (docView === "restricted" && d.mode !== "selected") return false;
      if (docView === "overdue" &&
          !famFor(d.pkgId).some(function (r) { return r.status === "overdue"; })) return false;
      if (!q) return true;
      return (docCompanyOf(d) + " " + docTitleOf(d) + " " + d.pkgId).toLowerCase().indexOf(q) !== -1;
    });

    /* THE ORDER IS A CHOICE, because the three questions an admin arrives with
       want three different ones. "Which of this customer's manuals do we
       hold" wants them by holder; "where is the MEL" wants every MEL together
       whoever owns it; "what changed" wants the newest first. The server sorts
       by company then title, which only ever answered the first. */
    /* Ascending is whatever each comparator calls natural — alphabetical for a
       name, NEWEST first for a date, because "updated, ascending" meaning
       "oldest" is a technicality nobody wants from a column called Updated. */
    var flip = function (list) { return docSortDesc ? list.reverse() : list; };

    var byName = function (a, b) {
      return docTitleOf(a).localeCompare(docTitleOf(b), undefined, { sensitivity: "base" }) ||
             docCompanyOf(a).localeCompare(docCompanyOf(b), undefined, { sensitivity: "base" });
    };
    if (docSort === "name") return flip(out.slice().sort(byName));
    if (docSort === "updated") {
      return flip(out.slice().sort(function (a, b) {
        // No date sorts last, not first: "unknown" is not "newest".
        var ta = a.updatedAt ? String(a.updatedAt) : "";
        var tb = b.updatedAt ? String(b.updatedAt) : "";
        if (!ta && !tb) return byName(a, b);
        if (!ta) return 1;
        if (!tb) return -1;
        return tb.localeCompare(ta);
      }));
    }
    // "company": holder, then the document within it.
    return flip(out.slice().sort(function (a, b) {
      return docCompanyOf(a).localeCompare(docCompanyOf(b), undefined, { sensitivity: "base" }) ||
             docTitleOf(a).localeCompare(docTitleOf(b), undefined, { sensitivity: "base" });
    }));
  }

  /** company -> how many documents it holds, counted from the WHOLE list. A number
   *  that moved because another company was ticked could not be used to compare
   *  holders, which is most of what it is for. */
  function companyCounts() {
    var counts = {}, order = [];
    lastDocs.forEach(function (d) {
      var c = docCompanyOf(d);
      if (counts[c] === undefined) { counts[c] = 0; order.push(c); }
      counts[c]++;
    });
    order.sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: "base" }); });
    return { counts: counts, order: order };
  }

  /* The company dropdown was a ticked popover. It is a plain <select> in the
     table header now (built in renderDocs), because a component that has to
     survive the container it lives in cannot survive `textContent = ""` — and
     with holders collapsible in the body and a search beside them, picking
     several companies at once stopped paying for the complexity. */

  /* ── DOCUMENT FAMILIARISATION ─────────────────────────────────────────────
     Access says who MAY open a document. This says who must have READ a
     particular revision, by when, and whether they have — which is the thing
     an auditor asks for and the portal could not answer.

     The revision is part of the record, so reissuing a manual creates a fresh
     obligation rather than silently inheriting last year's ticks. */
  var famRecords = [];

  function loadFamiliarisation() {
    return authed("GET", "/v1/org/familiarisation", null)
      .then(function (r) {
        famRecords = (r && r.records) || [];
        renderDocs();
        renderRecords();
        // Team progress carries a Documents column drawn from these records,
        // so it has to hear about them too.
        if (lastRoster.length) renderRoster(lastRoster);
        /* AND THE RAIL. Its Records count is drawn from the same history, and
           familiarisation arrives after the roster — so without this the rail
           said 42 while the list it points at said 46. */
        renderTabs();
      })
      .catch(function (err) {
        // An older API has no such route; the block simply does not appear,
        // the same rule the documents card itself follows.
        if (err.status === 404) { famRecords = []; return; }
        showMessage("docsMsg", err.message || "Couldn't load familiarisation records.", "err");
      });
  }

  function famFor(pkgId) {
    return famRecords.filter(function (r) { return r.pkgId === pkgId; });
  }

  function famPill(r) {
    var p = document.createElement("span");
    if (r.status === "done") {
      p.className = "pill done";
      // WHO said so, not just that somebody did: an admin ticking a box is the
      // organisation's statement, the learner's own is stronger evidence, and
      // a report that cannot tell them apart is worth less than one that can.
      p.textContent = r.acknowledgedBy === "learner" ? "Confirmed" : "Recorded";
      return p;
    }
    if (r.status === "overdue") { p.className = "pill overdue"; p.textContent = "Overdue"; return p; }
    if (r.status === "due_soon") { p.className = "pill due_soon"; p.textContent = "Due soon"; return p; }
    p.className = "pill upcoming"; p.textContent = "Outstanding";
    return p;
  }

  /** The familiarisation panel inside one document's card. */
  function famBlock(doc) {
    var wrap = document.createElement("div"); wrap.className = "fam";
    var rows = famFor(doc.pkgId);
    var done = rows.filter(function (r) { return r.status === "done"; }).length;
    var late = rows.filter(function (r) { return r.status === "overdue"; }).length;

    var head = document.createElement("div"); head.className = "fam-h";
    var t = document.createElement("b"); t.textContent = "Familiarisation";
    head.appendChild(t);

    var sum = document.createElement("span"); sum.className = "fam-sum";
    sum.textContent = rows.length
      ? done + " of " + rows.length + " recorded" + (late ? " · " + late + " overdue" : "")
      : "Not required yet";
    if (late) sum.style.color = "var(--err)";
    head.appendChild(sum);

    var req = document.createElement("button");
    req.type = "button"; req.className = "btn-ghost";
    req.textContent = rows.length ? "Require again" : "Require familiarisation";
    req.addEventListener("click", function () { openFamDialog(doc); });
    head.appendChild(req);

    if (rows.length) {
      var exp = exportButton("Report", function () { exportFamiliarisation(rows, docTitleOf(doc)); });
      head.appendChild(exp);
    }
    wrap.appendChild(head);

    if (!rows.length) return wrap;

    // Worst first, so the people to chase are at the top of the list.
    var order = { overdue: 0, due_soon: 1, upcoming: 2, done: 3 };
    rows.slice().sort(function (a, b) {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return a.name.localeCompare(b.name);
    }).forEach(function (r) {
      var row = document.createElement("div"); row.className = "fam-row";

      var who = document.createElement("div"); who.className = "who";
      who.appendChild(document.createTextNode(r.name));
      var sub = document.createElement("small");
      sub.textContent = "Rev. " + r.revision + "  ·  due " + fmtDate(r.deadline) +
        (r.acknowledgedAt ? "  ·  recorded " + fmtDate(r.acknowledgedAt) : "");
      who.appendChild(sub);
      row.appendChild(who);

      row.appendChild(famPill(r));

      var acts = document.createElement("div"); acts.className = "actions";
      var tick = document.createElement("button");
      tick.type = "button"; tick.className = "btn-ghost";
      tick.textContent = r.status === "done" ? "Undo" : "Mark read";
      tick.addEventListener("click", function () {
        tick.disabled = true;
        authed("PATCH", "/v1/org/familiarisation/" + encodeURIComponent(r.id),
               { acknowledged: r.status !== "done" })
          .then(loadFamiliarisation)
          .catch(function (err) {
            tick.disabled = false;
            showMessage("docsMsg", err.message || "Couldn't record that.", "err");
          });
      });
      acts.appendChild(tick);

      var del = document.createElement("button");
      del.type = "button"; del.className = "btn-danger"; del.textContent = "Remove";
      del.addEventListener("click", function () {
        authed("DELETE", "/v1/org/familiarisation/" + encodeURIComponent(r.id), null)
          .then(loadFamiliarisation)
          .catch(function (err) {
            showMessage("docsMsg", err.message || "Couldn't remove that.", "err");
          });
      });
      acts.appendChild(del);
      row.appendChild(acts);

      wrap.appendChild(row);
    });
    return wrap;
  }

  /** Ask for a revision, a date and who — then write one record each. */
  function openFamDialog(doc) {
    var form = document.createElement("div");

    var rLbl = document.createElement("label"); rLbl.className = "lbl"; rLbl.textContent = "Revision";
    var rev = document.createElement("input");
    rev.type = "text"; rev.className = "field";
    // Prefilled from the package, because that IS the revision in nine cases
    // out of ten and retyping "Issue 04 Rev. 02" invites a mismatch that would
    // split one obligation into two.
    rev.value = doc.rev || "";
    rev.placeholder = "e.g. Issue 04 Rev. 02";

    var dLbl = document.createElement("label"); dLbl.className = "lbl"; dLbl.textContent = "Familiar by";
    var due = document.createElement("input");
    due.type = "date"; due.className = "field";
    due.value = addMonths(new Date(), 1).toISOString().slice(0, 10);
    due.min = new Date().toISOString().slice(0, 10);

    var wLbl = document.createElement("label"); wLbl.className = "lbl"; wLbl.textContent = "Who";
    var who = document.createElement("div"); who.className = "ms";
    var tools = document.createElement("div"); tools.className = "ms-tools";
    var all = document.createElement("label"); all.className = "ms-row"; all.style.padding = "0";
    var allCb = document.createElement("input"); allCb.type = "checkbox";
    all.appendChild(allCb);
    all.appendChild(document.createTextNode(" Everyone who can open it"));
    tools.appendChild(all);
    who.appendChild(tools);
    var list = document.createElement("div"); list.className = "ms-list"; list.style.maxHeight = "180px";

    // Who can actually open it decides who it is sensible to ask. Restricted to
    // a few people, asking the whole company to read it is a mistake the dialog
    // can simply not offer.
    var eligible = doc.mode === "all"
      ? lastRoster.slice()
      : lastRoster.filter(function (m) { return (doc.grantedUserIds || []).indexOf(m.userId) !== -1; });

    var picked = {};
    eligible.forEach(function (m) {
      var row = document.createElement("label"); row.className = "ms-row";
      var cb = document.createElement("input"); cb.type = "checkbox";
      cb.addEventListener("change", function () {
        if (cb.checked) picked[m.userId] = true; else delete picked[m.userId];
        allCb.checked = Object.keys(picked).length === eligible.length && eligible.length > 0;
      });
      var txt = document.createElement("span");
      txt.appendChild(document.createTextNode(fullName(m)));
      var s = document.createElement("span"); s.className = "sub"; s.textContent = "  " + m.email;
      txt.appendChild(s);
      row.appendChild(cb); row.appendChild(txt);
      list.appendChild(row);
    });
    allCb.addEventListener("change", function () {
      list.querySelectorAll("input").forEach(function (cb) {
        cb.checked = allCb.checked; cb.dispatchEvent(new Event("change"));
      });
      allCb.checked = allCb.checked;
    });
    who.appendChild(list);

    form.appendChild(rLbl); form.appendChild(rev);
    form.appendChild(dLbl); form.appendChild(due);
    form.appendChild(wLbl); form.appendChild(who);

    confirmDialog({
      title: "Require familiarisation",
      lines: [
        docTitleOf(doc) + " — " + docCompanyOf(doc) + ".",
        "Each person listed has to be familiar with this revision by the date. Reissuing the document later creates a fresh obligation rather than reusing these records."
      ],
      field: form,
      confirmLabel: "Require it",
      cancelLabel: "Cancel"
    }).then(function (ok) {
      if (!ok) return;
      var ids = Object.keys(picked);
      if (!ids.length) {
        showMessage("docsMsg", "Nobody was selected, so nothing was required.", "warn");
        return;
      }
      return authed("POST", "/v1/org/documents/" + encodeURIComponent(doc.pkgId) + "/familiarisation",
                    { revision: rev.value || "", userIds: ids, deadline: due.value })
        .then(function (res) {
          showMessage("docsMsg",
            "Familiarisation required of " + res.assigned + " " +
            (res.assigned === 1 ? "person" : "people") + ".", "ok");
          return loadFamiliarisation();
        })
        .catch(function (err) {
          showMessage("docsMsg", err.message || "Couldn't set that.", "err");
        });
    });
  }

  /* THE RECORD TO KEEP. Built from the rows already on the page, like the
     roster export, so it works whatever the API is running — and it is a CSV
     because the thing an auditor is handed gets filed, re-sorted and kept, not
     looked at once. */
  function exportFamiliarisation(rows, label) {
    var head = ["Name", "Email", "Document", "Revision", "Due", "Status", "Recorded on", "Recorded by"];
    var lines = [head.map(csvCell).join(",")];
    rows.forEach(function (r) {
      lines.push([
        r.name, r.email, r.pkgId, r.revision, csvDate(r.deadline),
        r.status === "done" ? "Familiar"
          : r.status === "overdue" ? "Overdue" : "Outstanding",
        csvDate(r.acknowledgedAt),
        r.acknowledgedBy === "learner" ? "Confirmed by the learner"
          : r.acknowledgedBy === "admin" ? "Recorded by an administrator" : ""
      ].map(csvCell).join(","));
    });
    downloadCsv("familiarisation-" + (label || "report"), lines.join("\r\n"));
  }

  /* ── COMPANY DOCUMENTS, AS A TABLE ───────────────────────────────────────
     Every document used to be drawn fully expanded — mode buttons, a 240px
     member picker and the familiarisation panel — so one card stood 545px
     tall in a 532px box. You could see exactly ONE document at a time, and
     anything below the picker (familiarisation, as it turned out) was
     invisible unless you went looking for it.

     So: a row per document, and the detail opens on the one being worked on,
     the same shape Team uses. The filters live in the column headers, where
     the thing being filtered is named. */
  var openDocId = null;

  /** WHO can open it, in words. It read "1 of 25" — one of twenty-five WHAT,
   *  and is that good? The denominator is the size of the team, which is not
   *  what the column is about, and the detail below lists the people anyway. */
  function docAccessLabel(doc) {
    if (doc.mode === "all") return "Everyone";
    var d = docDraft[doc.pkgId];
    var n = d ? Object.keys(d.grants).length : (doc.grantedUserIds || []).length;
    if (!n) return "Nobody yet";
    return n + (n === 1 ? " person" : " people");
  }

  /** One document's familiarisation state, for the row. */
  /** One document's familiarisation state, for the row. It read "2/4 · 1 late",
   *  which is three facts compressed into punctuation; this says the one that
   *  matters and leaves the arithmetic to the panel inside. */
  function famSummary(pkgId) {
    var rows = famFor(pkgId);
    if (!rows.length) return { text: "Not required", tone: "none", late: 0 };
    var done = rows.filter(function (r) { return r.status === "done"; }).length;
    var late = rows.filter(function (r) { return r.status === "overdue"; }).length;
    if (done === rows.length) return { text: "All read", tone: "ok", late: 0 };
    return { text: done + " of " + rows.length + " read", tone: late ? "bad" : "", late: late };
  }

  /* ONE HEADER CELL = the column's name, and the control that narrows it,
     stacked. It was two header ROWS — names, then a strip of boxes — which had
     to be made sticky separately with a hard-coded offset, and left a visible
     gap under Revision and Updated where no filter exists. Stacked, a column
     with no filter simply has nothing under its name, which reads as
     deliberate rather than as missing. */
  /* A COLUMN HEADING SORTS. That is all it does now. It also carried a filter
     for a while, which made the table look like it had two filter systems
     stacked on each other — the heading row and the control row reading as one
     confused band. Narrowing happens in the bar above; ordering happens here. */
  function docHeaderCell(opts) {
    var th = document.createElement("th");
    if (opts.width) th.style.width = opts.width;
    if (opts.centre) th.className = "col-c";
    if (!opts.sortKey) { th.textContent = opts.label; return th; }

    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "th-sort";
    btn.appendChild(document.createTextNode(opts.label));

    var active = docSort === opts.sortKey;
    var car = document.createElement("span");
    car.className = "car" + (active ? " on" : "");
    // The arrow points the way the list is actually ordered, so the heading
    // states the current order rather than merely admitting it can be clicked.
    car.textContent = active && docSortDesc ? "\u25bc" : "\u25b2";
    btn.appendChild(car);

    btn.setAttribute("aria-sort", active ? (docSortDesc ? "descending" : "ascending") : "none");
    btn.addEventListener("click", function () {
      // Same column: flip the direction. New column: start ascending, because
      // a fresh sort that opens reversed is disorienting.
      if (docSort === opts.sortKey) docSortDesc = !docSortDesc;
      else { docSort = opts.sortKey; docSortDesc = false; }
      renderDocs();
    });
    th.appendChild(btn);
    return th;
  }

  /* THE FILTER BAR — one search, and three views.
     
     It was four controls (search, company, access, familiarisation) and most of
     them were not pulling their weight:
     
       · COMPANY duplicated two things at once. The body already groups by
         holder with a collapsible band per company, and the search already
         matches the company name — so the picker was a third way to do what
         the page does twice.
       · FAMILIARISATION offered Required / Overdue / Not required. Only one of
         those answers a question anybody asks on a Tuesday: what is late.
         "Not required" is audit trivia, and the column states it anyway.
       · ACCESS's one real use is "which documents am I managing access for",
         which is a view of the list, not a property to combine with others.
     
     So: a search that covers name, id and holder, and three VIEWS that are
     mutually exclusive because nobody needs "restricted AND overdue" — they
     need to see one list at a time. */
  var DOC_VIEWS = [
    ["", "All documents", null],
    ["restricted", "Restricted access", "Only documents limited to named people"],
    ["overdue", "Overdue familiarisation", "Only documents somebody is late reading"]
  ];

  function renderDocFilters() {
    var bar = $("docFilters"); if (!bar) return;

    var active = document.activeElement;
    var refocus = !!(active && active.id === "docSearch");
    var caret = refocus ? (active.selectionStart || 0) : 0;

    bar.textContent = "";

    var search = document.createElement("input");
    search.type = "search"; search.id = "docSearch";
    search.className = "tbar-search" + (docQuery.trim() ? " on" : "");
    search.placeholder = "Search document, id or company\u2026";
    search.autocomplete = "off";
    search.value = docQuery;
    search.addEventListener("input", function () {
      docQuery = search.value || "";
      renderDocs();
    });
    bar.appendChild(search);

    var views = document.createElement("div"); views.className = "seg";
    DOC_VIEWS.forEach(function (v) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "seg-btn" + (docView === v[0] ? " on" : "");
      btn.textContent = v[1];
      if (v[2]) btn.title = v[2];
      btn.setAttribute("aria-pressed", docView === v[0] ? "true" : "false");
      // The count rides the view, so "Overdue" says how much is overdue before
      // it is chosen — a view you have to enter to find out is empty is a
      // wasted click.
      var n = countForView(v[0]);
      if (v[0] && n) {
        var tag = document.createElement("span"); tag.className = "seg-n";
        tag.textContent = String(n);
        btn.appendChild(tag);
      }
      btn.disabled = !!v[0] && !n;
      btn.addEventListener("click", function () { docView = v[0]; renderDocs(); });
      views.appendChild(btn);
    });
    bar.appendChild(views);

    if (docQuery.trim() || docView) {
      var clear = document.createElement("button");
      clear.type = "button"; clear.className = "linkbtn"; clear.style.marginLeft = "auto";
      clear.textContent = "Clear";
      clear.addEventListener("click", clearDocFilters);
      bar.appendChild(clear);
    }

    if (refocus) {
      var fresh = $("docSearch");
      if (fresh) { fresh.focus(); try { fresh.setSelectionRange(caret, caret); } catch (e) {} }
    }
  }

  /** How many documents a view would show — so the control can say so, and
   *  disable itself when the answer is none. */
  function countForView(view) {
    if (!view) return lastDocs.length;
    return lastDocs.filter(function (d) {
      if (view === "restricted") return d.mode === "selected";
      return famFor(d.pkgId).some(function (r) { return r.status === "overdue"; });
    }).length;
  }

  /* ── ASSIGN · DOCUMENTS ───────────────────────────────────────────────────
     The bulk version of "Require familiarisation": several people, several
     documents, one date. The per-document dialog stays for the one-off, but
     the reason this screen exists is that a reissued manual is rarely one
     document for one person.

     EACH DOCUMENT CARRIES ITS OWN REVISION, taken from the package as it
     stands. One shared revision box across several documents would be wrong
     for all but one of them, and the revision is what makes the obligation
     reset when the manual is reissued. */
  var famPickedUsers = {};
  var famPickedDocs = {};
  var famMemQuery = "";
  var famDocQuery = "";
  /* Which holders are OPEN in the document picker, keyed by company — stored as
     open rather than as folded so that shut is the default for every holder,
     including one that only appears after a later load. The folded-set version
     of this started empty, which meant every holder opened expanded and the
     picker was a list of documents rather than a list of holders. */
  var famDocOpen = {};

  function famEligibleFor(doc) {
    return doc.mode === "all"
      ? lastRoster.slice()
      : lastRoster.filter(function (m) { return (doc.grantedUserIds || []).indexOf(m.userId) !== -1; });
  }

  /** Somebody who cannot OPEN a document cannot be asked to have read it. */
  function famCanRead(userId, doc) {
    return doc.mode === "all" || (doc.grantedUserIds || []).indexOf(userId) !== -1;
  }

  function renderFamMembers() {
    var list = $("famMemList"); if (!list) return;
    list.textContent = "";
    Object.keys(famPickedUsers).forEach(function (id) {
      if (!lastRoster.some(function (m) { return m.userId === id; })) delete famPickedUsers[id];
    });
    var q = famMemQuery.trim().toLowerCase();
    var visible = q
      ? lastRoster.filter(function (m) { return (fullName(m) + " " + m.email).toLowerCase().indexOf(q) !== -1; })
      : lastRoster;
    if (!visible.length) {
      var none = document.createElement("div"); none.className = "empty";
      none.style.padding = "8px 12px"; none.textContent = "No member matches that.";
      list.appendChild(none);
    }
    visible.forEach(function (m) {
      var row = document.createElement("label"); row.className = "ms-row";
      var cb = document.createElement("input"); cb.type = "checkbox";
      cb.checked = !!famPickedUsers[m.userId];
      cb.addEventListener("change", function () {
        if (cb.checked) famPickedUsers[m.userId] = true; else delete famPickedUsers[m.userId];
        syncFamMemAll(visible); updateFamSummary();
      });
      var txt = document.createElement("span");
      txt.appendChild(document.createTextNode(fullName(m)));
      var sub = document.createElement("span"); sub.className = "sub"; sub.textContent = "  " + m.email;
      txt.appendChild(sub);
      row.appendChild(cb); row.appendChild(txt);
      list.appendChild(row);
    });
    syncFamMemAll(visible);
    updateFamSummary();
  }

  function syncFamMemAll(members) {
    var all = $("famMemAll"); if (!all) return;
    var sel = members.filter(function (m) { return famPickedUsers[m.userId]; }).length;
    all.checked = members.length > 0 && sel === members.length;
    all.indeterminate = sel > 0 && sel < members.length;
  }

  /* The document picker folds by holder, exactly as the course picker folds by
     framework: a tick that takes the whole group, a chevron, and a count of
     how many inside are chosen. An MRO holds its customers' manuals, so an
     unfolded list of sixty is the same wall the Documents table avoids. */
  function renderFamDocs() {
    var list = $("famDocList"); if (!list) return;
    list.textContent = "";
    Object.keys(famPickedDocs).forEach(function (k) {
      if (!lastDocs.some(function (d) { return d.pkgId === k; })) delete famPickedDocs[k];
    });

    var q = famDocQuery.trim().toLowerCase();
    var visible = lastDocs.filter(function (d) {
      if (!q) return true;
      return (docCompanyOf(d) + " " + docTitleOf(d) + " " + d.pkgId).toLowerCase().indexOf(q) !== -1;
    });
    if (!visible.length) {
      var none = document.createElement("div"); none.className = "empty";
      none.style.padding = "8px 12px";
      none.textContent = lastDocs.length ? "No document matches that." : "No company documents on your licence yet.";
      list.appendChild(none);
      updateFamSummary();
      return;
    }

    // Holders in name order, each with its documents.
    var byCo = {}, order = [];
    visible.slice().sort(function (a, b) {
      return docTitleOf(a).localeCompare(docTitleOf(b), undefined, { sensitivity: "base" });
    }).forEach(function (d) {
      var co = docCompanyOf(d);
      if (!byCo[co]) { byCo[co] = []; order.push(co); }
      byCo[co].push(d);
    });
    order.sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: "base" }); });

    order.forEach(function (co) {
      var docs = byCo[co];
      var chosen = docs.filter(function (d) { return famPickedDocs[d.pkgId]; }).length;
      // A search forces matching holders open: being shown a closed box after
      // searching for something is a dead end.
      var open = q ? true : !!famDocOpen[co];

      var head = document.createElement("div");
      head.className = "ms-group" + (open ? " open" : "") + (chosen ? " picked" : "");

      var gcb = document.createElement("input"); gcb.type = "checkbox";
      gcb.checked = chosen === docs.length;
      gcb.indeterminate = chosen > 0 && chosen < docs.length;
      gcb.addEventListener("click", function (e) { e.stopPropagation(); });
      gcb.addEventListener("change", function () {
        docs.forEach(function (d) {
          if (gcb.checked) famPickedDocs[d.pkgId] = true; else delete famPickedDocs[d.pkgId];
        });
        renderFamDocs();
      });
      head.appendChild(gcb);

      var chev = document.createElement("span"); chev.className = "ms-chev";
      head.appendChild(chev);
      var nm = document.createElement("span"); nm.className = "ms-gname"; nm.textContent = co;
      head.appendChild(nm);
      var cnt = document.createElement("span"); cnt.className = "ms-gcount";
      cnt.textContent = chosen ? chosen + " of " + docs.length : String(docs.length);
      head.appendChild(cnt);

      head.addEventListener("click", function () {
        if (famDocOpen[co]) delete famDocOpen[co]; else famDocOpen[co] = true;
        renderFamDocs();
      });
      list.appendChild(head);

      if (!open) return;
      docs.forEach(function (d) {
        var row = document.createElement("label"); row.className = "ms-row";
        row.dataset.key = d.pkgId;
        var cb = document.createElement("input"); cb.type = "checkbox";
        cb.checked = !!famPickedDocs[d.pkgId];
        cb.addEventListener("change", function () {
          if (cb.checked) famPickedDocs[d.pkgId] = true; else delete famPickedDocs[d.pkgId];
          renderFamDocs();
        });
        var txt = document.createElement("span");
        txt.appendChild(document.createTextNode(docTitleOf(d)));
        var sub = document.createElement("span"); sub.className = "sub";
        // The revision is shown because it is what will be RECORDED, and a
        // document without one is about to be recorded as "(unversioned)".
        sub.textContent = "  " + (d.rev || "no revision stated");
        txt.appendChild(sub);
        row.appendChild(cb); row.appendChild(txt);
        list.appendChild(row);
      });
    });
    updateFamSummary();
  }

  /* The consequence, before the button: how many obligations this makes, and
     — the part that is easy to get wrong — how many of the chosen people
     cannot even open one of the chosen documents. */
  function updateFamSummary() {
    var hint = $("famHint"); if (!hint) return;
    var bar = $("famSummary"), btn = $("famAssignBtn"), note = $("famDocNote");
    var users = Object.keys(famPickedUsers);
    var docs = Object.keys(famPickedDocs).map(function (k) {
      return lastDocs.filter(function (d) { return d.pkgId === k; })[0];
    }).filter(Boolean);
    var when = $("famDeadline") ? $("famDeadline").value : "";

    var pairs = 0, blocked = 0;
    docs.forEach(function (d) {
      users.forEach(function (u) { if (famCanRead(u, d)) pairs++; else blocked++; });
    });

    if (btn) btn.disabled = !(pairs && when);
    hint.textContent = "";

    if (!users.length || !docs.length) {
      if (bar) bar.classList.add("idle");
      if (btn) btn.textContent = "Require";
      hint.textContent = !users.length && !docs.length
        ? "Pick people and documents to see what will be required."
        : !users.length ? "No people picked yet." : "No documents picked yet.";
      if (note) note.textContent = "";
      return;
    }
    if (bar) bar.classList.remove("idle");

    var b = document.createElement("b");
    b.textContent = pairs + " requirement" + (pairs === 1 ? "" : "s");
    hint.appendChild(b);
    hint.appendChild(document.createTextNode(
      " \u2014 " + users.length + " " + (users.length === 1 ? "person" : "people") +
      " \u00d7 " + docs.length + " document" + (docs.length === 1 ? "" : "s") +
      (when ? ", familiar by " + fmtShort(new Date(when + "T12:00:00")) : ", once a date is set") + "."));

    /* SOMEBODY WHO CANNOT OPEN IT CANNOT BE ASKED TO HAVE READ IT. Those pairs
       are dropped rather than written, and saying so here is the difference
       between a quiet omission and an admin who knows to grant access first. */
    if (blocked) {
      var warn = document.createElement("div");
      warn.style.cssText = "color:var(--warn);font-weight:650;margin-top:3px";
      warn.textContent = blocked + " " + (blocked === 1 ? "pairing is" : "pairings are") +
        " skipped: those people cannot open that document yet. Grant them access first.";
      hint.appendChild(warn);
    }
    if (btn) btn.textContent = "Require " + pairs + " reading" + (pairs === 1 ? "" : "s");
    if (note) note.textContent = "";
  }

  /* ── RECORDS ───────────────────────────────────────────────────────────────
     ONE HISTORY over three kinds of record. A course finished, a document
     revision read, a certificate issued — an auditor's question ("show me what
     this person completed last year") spans all three, so they are one list
     with a `kind`, not three screens to reconcile by hand.

     Every row is built from what the page already holds, like the roster
     export, so a report works whatever the API is running. */
  var recKind = "";               // "" | "course" | "document" | "certificate"
  var recWho = {};                // userId -> true; empty means everyone
  var recWhat = {};               // "course:<key>" | "doc:<pkgId>"; empty means all
  var recWhoQuery = "";
  var recWhatQuery = "";
  /* COLLAPSED TO START. Courses and documents are two different questions and an
     admin arrives wanting one of them, so the picker opens as two lines rather
     than as a scroll of eighty titles with the Documents heading somewhere below
     the fold. Same shape as the framework picker on Assign. */
  var recWhatCollapsed = { Courses: true, Documents: true };

  var REC_KINDS = [
    ["", "Everything"],
    ["course", "Courses completed"],
    ["document", "Document familiarisation"],
    ["certificate", "Certificates"]
  ];

  /** Every record the org holds, newest first. */
  function allRecords() {
    var out = [];
    lastRoster.forEach(function (m) {
      var who = fullName(m), email = m.email;

      (m.assignments || []).forEach(function (a) {
        if (a.status !== "completed") return;
        out.push({
          kind: "course", when: a.completedAt || a.deadline,
          who: who, email: email, userId: m.userId,
          itemKey: "course:" + a.courseKey, item: labelFor(a.courseKey),
          detail: a.score != null ? a.score + "%" : "",
          status: "Completed", company: ""
        });
      });

      (m.certificates || []).forEach(function (c) {
        out.push({
          kind: "certificate", when: c.issuedAt,
          who: who, email: email, userId: m.userId,
          itemKey: "course:" + c.courseKey, item: labelFor(c.courseKey),
          detail: c.number || "",
          status: c.examScore != null ? "Issued \u00b7 " + c.examScore + "%" : "Issued",
          company: ""
        });
      });
    });

    famRecords.forEach(function (r) {
      var doc = lastDocs.filter(function (d) { return d.pkgId === r.pkgId; })[0];
      out.push({
        kind: "document",
        /* An acknowledged record is dated by when it was READ; an outstanding
           one has no such date, so it is placed by its deadline — which is
           what a reader scanning for "what is due" would look for anyway. */
        when: r.acknowledgedAt || r.deadline,
        pending: !r.acknowledgedAt,
        who: r.name, email: r.email, userId: r.userId,
        itemKey: "doc:" + r.pkgId,
        item: doc ? docTitleOf(doc) : r.pkgId,
        detail: "Rev. " + r.revision,
        status: r.acknowledgedAt
          ? (r.acknowledgedBy === "learner" ? "Confirmed by the learner" : "Recorded by an administrator")
          : (r.status === "overdue" ? "Overdue" : "Outstanding"),
        company: doc ? docCompanyOf(doc) : ""
      });
    });

    return out.sort(function (a, b) { return String(b.when || "").localeCompare(String(a.when || "")); });
  }

  /** The records the current filters select. */
  function shownRecords() {
    var from = $("recFrom") ? $("recFrom").value : "";
    var to = $("recTo") ? $("recTo").value : "";
    var people = Object.keys(recWho);
    var items = Object.keys(recWhat);
    return allRecords().filter(function (r) {
      if (recKind && r.kind !== recKind) return false;
      if (people.length && !recWho[r.userId]) return false;
      if (items.length && !recWhat[r.itemKey]) return false;
      var day = String(r.when || "").slice(0, 10);
      if (from && day < from) return false;
      // Inclusive of the end day: a report "to 31 March" that drops the 31st is
      // wrong in the way nobody notices until an audit.
      if (to && day > to) return false;
      return true;
    });
  }

  function recFilterIsOn() {
    return !!(recKind || Object.keys(recWho).length || Object.keys(recWhat).length ||
              ($("recFrom") && $("recFrom").value) || ($("recTo") && $("recTo").value));
  }

  /** What the custom report is currently asking for, in words. */
  function recFilterSummary() {
    if (!recFilterIsOn()) return "Everything";
    var bits = [];
    var people = Object.keys(recWho).length, items = Object.keys(recWhat).length;
    /* The kind is chosen on the results card rather than in this panel, but it
       narrows the report exactly as the panel's own filters do — leaving it out
       of the summary meant a sheet of 21 certificates headed "everyone". */
    if (recKind) {
      REC_KINDS.forEach(function (k) { if (k[0] === recKind) bits.push(k[1].toLowerCase()); });
    }
    bits.push(people ? people + (people === 1 ? " person" : " people") : "everyone");
    if (items) bits.push(items + (items === 1 ? " item" : " items"));
    var f = $("recFrom").value, t = $("recTo").value;
    if (f && t) bits.push(fmtDate(f) + " to " + fmtDate(t));
    else if (f) bits.push("from " + fmtDate(f));
    else if (t) bits.push("to " + fmtDate(t));
    return bits.join(" \u00b7 ");
  }

  function renderRecordKinds() {
    var host = $("recKinds"); if (!host) return;
    host.textContent = "";
    var all = allRecords();
    REC_KINDS.forEach(function (k) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "seg-btn" + (recKind === k[0] ? " on" : "");
      btn.textContent = k[1];
      var n = k[0] ? all.filter(function (r) { return r.kind === k[0]; }).length : all.length;
      if (n) {
        var tag = document.createElement("span"); tag.className = "seg-n"; tag.textContent = String(n);
        btn.appendChild(tag);
      }
      btn.disabled = !n;
      btn.addEventListener("click", function () { recKind = k[0]; renderRecords(); });
      host.appendChild(btn);
    });
  }

  /* EMPTY MEANS ALL in both pickers, which is why their counts read "Everyone"
     and "All" rather than "0 selected": a filter that starts by excluding
     everything would make the common case — a complete report — the one that
     needs work. */
  function renderRecWho() {
    var list = $("recWhoList"); if (!list) return;
    list.textContent = "";
    var q = recWhoQuery.trim().toLowerCase();
    var visible = q
      ? lastRoster.filter(function (m) { return (fullName(m) + " " + m.email).toLowerCase().indexOf(q) !== -1; })
      : lastRoster;
    if (!visible.length) {
      var none = document.createElement("div"); none.className = "empty";
      none.style.padding = "8px 12px"; none.textContent = "No member matches that.";
      list.appendChild(none);
    }
    visible.forEach(function (m) {
      var row = document.createElement("label"); row.className = "ms-row";
      var cb = document.createElement("input"); cb.type = "checkbox";
      cb.checked = !!recWho[m.userId];
      cb.addEventListener("change", function () {
        if (cb.checked) recWho[m.userId] = true; else delete recWho[m.userId];
        renderRecords();
      });
      var txt = document.createElement("span");
      txt.appendChild(document.createTextNode(fullName(m)));
      var sub = document.createElement("span"); sub.className = "sub"; sub.textContent = "  " + m.email;
      txt.appendChild(sub);
      row.appendChild(cb); row.appendChild(txt);
      list.appendChild(row);
    });
    var n = Object.keys(recWho).length;
    $("recWhoCount").textContent = n ? n + " selected" : "Everyone";
  }

  /** Courses and documents in one list, grouped, because a report is asked for
   *  by subject and the asker does not sort them into two kinds first. */
  function renderRecWhat() {
    var list = $("recWhatList"); if (!list) return;
    list.textContent = "";
    var q = recWhatQuery.trim().toLowerCase();

    // Only things that actually APPEAR in a record: a picker offering eighty
    // courses the team has never finished is a list of dead ends.
    var seen = {}, courses = [], docs = [];
    allRecords().forEach(function (r) {
      if (seen[r.itemKey]) return;
      seen[r.itemKey] = true;
      (r.itemKey.indexOf("course:") === 0 ? courses : docs).push({ key: r.itemKey, label: r.item, co: r.company });
    });
    function cmp(a, b) { return a.label.localeCompare(b.label, undefined, { sensitivity: "base" }); }
    courses.sort(cmp); docs.sort(cmp);

    function group(title, items) {
      var shown = items.filter(function (it) {
        return !q || (it.label + " " + (it.co || "")).toLowerCase().indexOf(q) !== -1;
      });
      if (!shown.length) return;
      /* A SEARCH OPENS BOTH GROUPS. Someone who has typed has already named what
         they want; leaving the matches folded away behind a heading would answer
         them with a count. */
      var open = !recWhatCollapsed[title] || !!q;
      var picked = shown.filter(function (it) { return recWhat[it.key]; }).length;

      var h = document.createElement("div");
      h.className = "ms-group" + (open ? " open" : "") + (picked ? " picked" : "");

      // Select-all for the group, independent of the fold (same as Assign).
      var gcb = document.createElement("input"); gcb.type = "checkbox";
      gcb.checked = picked === shown.length;
      gcb.indeterminate = picked > 0 && picked < shown.length;
      gcb.addEventListener("click", function (e) { e.stopPropagation(); });
      gcb.addEventListener("change", function () {
        shown.forEach(function (it) {
          if (gcb.checked) recWhat[it.key] = true; else delete recWhat[it.key];
        });
        renderRecords();
      });

      var chev = document.createElement("span"); chev.className = "ms-chev";
      chev.textContent = open ? "▾" : "▸";
      var nm = document.createElement("span"); nm.className = "ms-gname"; nm.textContent = title;
      var ct = document.createElement("span"); ct.className = "ms-gcount";
      // "3 of 10", not "(3/10)" — read at a glance while deciding what to tick.
      ct.textContent = picked > 0 ? picked + " of " + shown.length : String(shown.length);
      h.appendChild(gcb); h.appendChild(chev); h.appendChild(nm); h.appendChild(ct);
      h.addEventListener("click", function () {
        recWhatCollapsed[title] = !recWhatCollapsed[title];
        renderRecWhat();
      });
      list.appendChild(h);
      if (!open) return;
      shown.forEach(function (it) {
        var row = document.createElement("label"); row.className = "ms-row";
        var cb = document.createElement("input"); cb.type = "checkbox";
        cb.checked = !!recWhat[it.key];
        cb.addEventListener("change", function () {
          if (cb.checked) recWhat[it.key] = true; else delete recWhat[it.key];
          renderRecords();
        });
        var txt = document.createElement("span");
        txt.appendChild(document.createTextNode(it.label));
        if (it.co) {
          var sub = document.createElement("span"); sub.className = "sub"; sub.textContent = "  " + it.co;
          txt.appendChild(sub);
        }
        row.appendChild(cb); row.appendChild(txt);
        list.appendChild(row);
      });
    }
    group("Courses", courses);
    group("Documents", docs);

    if (!list.children.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.style.padding = "8px 12px"; e.textContent = "Nothing matches that.";
      list.appendChild(e);
    }
    var n = Object.keys(recWhat).length;
    $("recWhatCount").textContent = n ? n + " selected" : "All";
  }

  /* THE EXPORT IS WHAT IS ON SCREEN. A report that quietly contains more than
     the filters said is the kind of document that gets handed to an auditor
     and then has to be explained. */
  function recordsCsv(rows) {
    var head = ["Date", "Record", "Name", "Email", "Item", "Company", "Detail", "Status"];
    var lines = [head.map(csvCell).join(",")];
    rows.forEach(function (r) {
      lines.push([
        csvDate(r.when),
        r.kind === "course" ? "Course completed" : r.kind === "certificate" ? "Certificate" : "Document familiarisation",
        r.who, r.email, r.item, r.company, r.detail, r.status
      ].map(csvCell).join(","));
    });
    return lines.join("\r\n");
  }

  function renderRecords() {
    var host = $("recList"); if (!host) return;
    host.textContent = "";
    renderRecordKinds();
    renderRecWho();
    renderRecWhat();
    $("recFilterSummary").textContent = recFilterSummary();

    var rows = shownRecords();
    var total = allRecords().length;
    $("recCount").textContent = total
      ? (rows.length === total ? total + " record" + (total === 1 ? "" : "s")
                               : rows.length + " of " + total)
      : "";

    if (!rows.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = total
        ? "No record matches these filters."
        : "No records yet. They appear as people finish courses and confirm they have read documents.";
      host.appendChild(e);
      return;
    }

    var table = document.createElement("table");
    var head = document.createElement("thead"); var hr = document.createElement("tr");
    ["Date", "Person", "Record", "Item", "Detail", "Status"].forEach(function (h, i) {
      var th = document.createElement("th");
      if (i === 0) th.style.width = "13%";
      if (i === 1) th.style.width = "22%";
      th.textContent = h;
      hr.appendChild(th);
    });
    head.appendChild(hr); table.appendChild(head);

    var body = document.createElement("tbody");
    rows.forEach(function (r) {
      var tr = document.createElement("tr");

      var tdD = document.createElement("td"); tdD.className = "member-active";
      tdD.textContent = r.when ? fmtDate(r.when) : "\u2014";
      // An outstanding reading is dated by its deadline, which is a different
      // kind of date from "this happened" and must not be read as one.
      if (r.pending) { tdD.style.color = "var(--muted)"; tdD.title = "Due date — not yet read"; }
      tr.appendChild(tdD);

      var tdW = document.createElement("td");
      var person = document.createElement("div"); person.className = "person";
      var av = document.createElement("div"); av.className = "av";
      av.textContent = (r.who || "?").split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
      var pn = document.createElement("div"); pn.className = "pn";
      var nm = document.createElement("span"); nm.className = "member-name"; nm.textContent = r.who;
      var em = document.createElement("span"); em.className = "member-email"; em.textContent = r.email;
      pn.appendChild(nm); pn.appendChild(em);
      person.appendChild(av); person.appendChild(pn);
      tdW.appendChild(person); tr.appendChild(tdW);

      var tdK = document.createElement("td");
      var kp = document.createElement("span");
      kp.className = "pill " + (r.kind === "certificate" ? "done" : r.kind === "course" ? "upcoming" : "idle");
      kp.textContent = r.kind === "course" ? "Course" : r.kind === "certificate" ? "Certificate" : "Document";
      tdK.appendChild(kp); tr.appendChild(tdK);

      var tdI = document.createElement("td");
      tdI.appendChild(document.createTextNode(r.item));
      if (r.company) {
        var sub = document.createElement("small"); sub.className = "csub"; sub.textContent = r.company;
        tdI.appendChild(sub);
      }
      tr.appendChild(tdI);

      var tdX = document.createElement("td"); tdX.className = "member-active";
      if (r.kind === "certificate") tdX.className = "num";
      tdX.textContent = r.detail || "\u2014";
      tr.appendChild(tdX);

      var tdS = document.createElement("td"); tdS.className = "member-active";
      tdS.textContent = r.status;
      if (r.status === "Overdue") { tdS.style.color = "var(--err)"; tdS.style.fontWeight = "650"; }
      tr.appendChild(tdS);

      body.appendChild(tr);
    });
    table.appendChild(body);
    host.appendChild(table);
  }

  function renderDocs() {
    var host = $("docs"); if (!host) return;
    /* #docs survives every redraw, so its scroll position is recorded as it
       happens rather than read back just before the list is torn down — which
       would record a 0 on the redraws that run while the section is hidden. */
    if (!host.dataset.scrollWatched) {
      host.dataset.scrollWatched = "1";
      host.addEventListener("scroll", function () { docsScroll = host.scrollTop; });
    }
    /* Read the focus state before anything is torn down: the controls in the
       header are rebuilt each render, so "was the admin typing in the search?"
       cannot be asked afterwards. */
    host.textContent = "";
    // The bar is drawn with the list it governs, so the two can never disagree
    // about what is being filtered.
    renderDocFilters();

    /* COMPANIES START FOLDED. An MRO holds its customers' manuals, and opening
       on thirty expanded holders is a wall; folded, the first screen is the
       list of customers, which is how the admin thinks about them. It needs no
       init pass: `docOpen` records what the admin has OPENED, so an unknown
       holder is shut by definition. */

    var shown = visibleDocs();
    if (!shown.length) {
      var none = document.createElement("div");
      none.className = "empty";
      if (!lastDocs.length) {
        none.textContent = "No company documents on your licence yet.";
      } else {
        /* NAME WHAT IS FILTERING, and offer the way out. Two filters that each
           match something can between them match nothing — a search for one
           company's document while a different company is ticked — and "no
           match" alone leaves the admin to work out which of the two to undo. */
        var bits = [];
        if (docQuery.trim()) bits.push("\u201c" + docQuery.trim() + "\u201d");
        if (docView === "restricted") bits.push("with restricted access");
        if (docView === "overdue") bits.push("with overdue familiarisation");
        none.textContent = "No document matches " + (bits.join(" ") || "that filter") + ". ";
        var reset = document.createElement("button");
        reset.type = "button"; reset.className = "linkbtn"; reset.textContent = "Clear the filters";
        reset.addEventListener("click", clearDocFilters);
        none.appendChild(reset);
      }
      host.appendChild(none);
      return;
    }

    /* Grouped by holder ONLY in the company order. Sorted by document or by
       date, a company row would break the very run it is sorting — every MEL
       together is the point of "by document". */
    var grouped = docSort === "company";

    var table = document.createElement("table"); table.className = "doctable";
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    hr.appendChild(docHeaderCell({ label: "Document", sortKey: "name", width: grouped ? "34%" : "27%" }));
    /* THE COMPANY COLUMN IS DROPPED WHILE GROUPING BY COMPANY. The band above
       each run already names the holder, so the column repeated it on every
       row — and a column whose every value is the heading it sits under is a
       column carrying no information. */
    if (!grouped) hr.appendChild(docHeaderCell({ label: "Company", sortKey: "company", width: "23%" }));
    hr.appendChild(docHeaderCell({ label: "Revision", centre: true }));
    hr.appendChild(docHeaderCell({ label: "Updated", sortKey: "updated", centre: true }));
    hr.appendChild(docHeaderCell({ label: "Access", centre: true }));
    hr.appendChild(docHeaderCell({ label: "Familiarisation", centre: true }));
    hr.appendChild(docHeaderCell({ label: "" }));
    thead.appendChild(hr);
    table.appendChild(thead);
    var colCount = grouped ? 6 : 7;

    var tbody = document.createElement("tbody");

    var searching = !!docQuery.trim();
    var currentCompany = null;
    var folded = false;

    shown.forEach(function (doc) {
      var company = docCompanyOf(doc);

      if (grouped && company !== currentCompany) {
        currentCompany = company;
        var inCo = shown.filter(function (d) { return docCompanyOf(d) === company; });
        // A search forces matching holders open: being shown a closed box
        // after searching for something is a dead end.
        folded = !searching && !docOpen[company];

        var gr = document.createElement("tr"); gr.className = "docgroup";
        var gc = document.createElement("td"); gc.colSpan = colCount;
        var gb = document.createElement("button");
        gb.type = "button"; gb.className = "doc-company" + (folded ? "" : " open");
        gb.setAttribute("aria-expanded", folded ? "false" : "true");
        var chev = document.createElement("span"); chev.className = "fold-chev";
        if (folded) chev.style.transform = "rotate(-90deg)";
        gb.appendChild(chev);
        var cn = document.createElement("span"); cn.className = "co-name"; cn.textContent = company;
        gb.appendChild(cn);
        var cnum = document.createElement("span"); cnum.className = "doc-company-n";
        cnum.textContent = inCo.length + " document" + (inCo.length === 1 ? "" : "s");
        gb.appendChild(cnum);
        /* The counts sit WITH the company name. Pushed to the far right they
           landed under FAMILIARISATION and read as a value in that column —
           the band spans every column, so anything in it inherits whichever
           heading it happens to reach. */
        var restricted = inCo.filter(function (d) { return d.mode === "selected"; }).length;
        if (restricted) {
          var rb = document.createElement("span"); rb.className = "doc-company-r";
          rb.textContent = restricted + " restricted";
          gb.appendChild(rb);
        }
        gb.addEventListener("click", function () {
          if (docOpen[company]) delete docOpen[company]; else docOpen[company] = true;
          renderDocs();
        });
        gc.appendChild(gb); gr.appendChild(gc);
        tbody.appendChild(gr);
      }
      if (grouped && folded) return;

      var open = openDocId === doc.pkgId;
      var tr = document.createElement("tr");
      tr.className = "rowlink" + (open ? " open" : "");
      tr.tabIndex = 0;
      tr.setAttribute("aria-expanded", open ? "true" : "false");

      var tdN = document.createElement("td");
      var nm = document.createElement("span"); nm.className = "doc-name";
      nm.textContent = docTitleOf(doc);
      var id = document.createElement("span"); id.className = "doc-meta"; id.textContent = doc.pkgId;
      tdN.appendChild(nm); tdN.appendChild(id);
      tr.appendChild(tdN);

      if (!grouped) {
        var tdC = document.createElement("td"); tdC.className = "member-active";
        tdC.textContent = company;
        tr.appendChild(tdC);
      }

      var tdR = document.createElement("td"); tdR.className = "member-active col-c";
      tdR.textContent = doc.rev || "—";
      tr.appendChild(tdR);

      var tdU = document.createElement("td"); tdU.className = "member-active col-c";
      tdU.textContent = doc.updatedAt ? fmtDate(doc.updatedAt) : "—";
      tr.appendChild(tdU);

      var tdA = document.createElement("td"); tdA.className = "col-c";
      var ap = document.createElement("span");
      // Open to the whole team reads as the ordinary state; limited to named
      // people is the one worth noticing, so only that one takes colour.
      ap.className = "pill " + (doc.mode === "all" ? "idle" : "upcoming");
      ap.textContent = docAccessLabel(doc);
      tdA.appendChild(ap);
      tr.appendChild(tdA);

      var fs = famSummary(doc.pkgId);
      var tdF = document.createElement("td"); tdF.className = "col-c";
      var fsTxt = document.createElement("span");
      fsTxt.className = "famcell" + (fs.tone ? " " + fs.tone : "");
      fsTxt.textContent = fs.text;
      tdF.appendChild(fsTxt);
      // "1 late" is the only part anybody acts on, so it is a chip rather than
      // a clause buried in a sentence.
      if (fs.late) {
        var lateTag = document.createElement("span");
        lateTag.className = "pill overdue"; lateTag.style.marginLeft = "7px";
        lateTag.textContent = fs.late + " late";
        tdF.appendChild(lateTag);
      }
      tr.appendChild(tdF);

      var tdX = document.createElement("td"); tdX.className = "r chev";
      tdX.textContent = open ? "▾" : "›";
      tr.appendChild(tdX);

      function toggle() {
        openDocId = open ? null : doc.pkgId;
        renderDocs();
      }
      tr.addEventListener("click", function (e) {
        if (e.target.closest("button, a, input, label, select")) return;
        toggle();
      });
      tr.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
      tbody.appendChild(tr);

      if (!open) return;

      var dr = document.createElement("tr"); dr.className = "member";
      var dc = document.createElement("td"); dc.colSpan = colCount;
      var card = document.createElement("div"); card.className = "member-body doc-detail";
      dc.appendChild(card); dr.appendChild(dc);

      var draft = docDraft[doc.pkgId];
      var mode = draft ? draft.mode : doc.mode;
      // The row above already states the access, so the detail only has to keep
      // it in step while the admin is ticking people.
      var count = document.createElement("span");
      var setCount = function () {
        var d = docDraft[doc.pkgId];
        var n = d ? Object.keys(d.grants).length : (doc.grantedUserIds || []).length;
        count.textContent = mode === "all"
          ? "Everyone with a licence"
          : n + " of " + lastRoster.length + " members";
      };
      setCount();

      var accessHead = document.createElement("div"); accessHead.className = "fam-h";
      var ah = document.createElement("b"); ah.textContent = "Who can open it";
      accessHead.appendChild(ah);
      count.className = "fam-sum";
      accessHead.appendChild(count);
      card.appendChild(accessHead);

      var modes = document.createElement("div"); modes.className = "doc-modes";
      [["all", "Everyone with a licence"], ["selected", "Only selected people"]].forEach(function (m) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "doc-mode" + (mode === m[0] ? " on" : "");
        b.textContent = m[1];
        b.addEventListener("click", function () {
          if (mode === m[0]) return;
          draftFor(doc).mode = m[0];
          pruneDraft(doc);
          renderDocs();
        });
        modes.appendChild(b);
      });
      card.appendChild(modes);

      /* The save bar. Built before the list so the ticks can refresh it in place
         instead of rebuilding the card (which would take the filter's focus). */
      var bar = document.createElement("div"); bar.className = "doc-save hidden";
      var barTxt = document.createElement("div"); barTxt.className = "doc-save-txt";
      var barBtns = document.createElement("div"); barBtns.className = "doc-save-btns";
      var discard = document.createElement("button");
      discard.type = "button"; discard.className = "btn-ghost"; discard.textContent = "Discard";
      discard.addEventListener("click", function () { delete docDraft[doc.pkgId]; renderDocs(); });
      var save = document.createElement("button");
      save.type = "button"; save.className = "btn doc-save-go"; save.textContent = "Save access changes";
      save.addEventListener("click", function () {
        save.disabled = true; discard.disabled = true; save.textContent = "Saving\u2026";
        saveDocDraft(doc);
      });
      barBtns.appendChild(discard); barBtns.appendChild(save);
      bar.appendChild(barTxt); bar.appendChild(barBtns);
      var picked = null;
      var refreshBar = function () {
        var ch = docChanges(doc);
        bar.classList.toggle("hidden", ch.n === 0);
        barTxt.textContent = ch.n
          ? "Not saved yet. " + describeChanges(doc, ch)
          : "";
        setCount();
        if (picked) {
          var d = docDraft[doc.pkgId];
          picked.textContent = (d ? Object.keys(d.grants).length : (doc.grantedUserIds || []).length) + " selected";
        }
      };

      if (mode === "selected") {
        var people = document.createElement("div"); people.className = "ms doc-people";
        if (!lastRoster.length) {
          var e = document.createElement("div"); e.className = "empty";
          e.style.padding = "10px 12px";
          e.textContent = "No members yet.";
          people.appendChild(e);
        } else {
          var granted = draft ? draft.grants : serverGrants(doc);
          var list = document.createElement("div"); list.className = "ms-list";

          /* Draws the ROWS only. The filter calls this directly rather than going
             through renderDocs, which would rebuild the card and take the field's
             focus away mid-word. */
          var fillPeople = function () {
            var q = (docPeopleQuery[doc.pkgId] || "").trim().toLowerCase();
            list.textContent = "";
            var visible = q
              ? lastRoster.filter(function (m) {
                  return (fullName(m) + " " + m.email).toLowerCase().indexOf(q) !== -1;
                })
              : lastRoster;
            if (!visible.length) {
              var none = document.createElement("div"); none.className = "empty";
              none.style.padding = "8px 12px";
              none.textContent = "No member matches that.";
              list.appendChild(none);
            }
            visible.forEach(function (m) {
              var row = document.createElement("label"); row.className = "ms-row";
              var cb = document.createElement("input"); cb.type = "checkbox";
              cb.checked = !!granted[m.userId];
              cb.addEventListener("change", function () {
                var d = draftFor(doc);
                if (cb.checked) d.grants[m.userId] = true; else delete d.grants[m.userId];
                granted = d.grants;
                pruneDraft(doc);
                refreshBar();
              });
              var txt = document.createElement("span");
              var n = document.createElement("span"); n.textContent = fullName(m);
              var sub = document.createElement("span"); sub.className = "sub"; sub.textContent = "  " + m.email;
              txt.appendChild(n); txt.appendChild(sub);
              row.appendChild(cb); row.appendChild(txt);
              list.appendChild(row);
            });
          };

          /* The filter earns its place the same way the documents one above does: a
             handful of people is quicker to read than to search, and an empty search
             box over six names reads as something broken. */
          if (lastRoster.length > 6) {
            var tools = document.createElement("div"); tools.className = "ms-tools";
            var search = document.createElement("input");
            search.type = "text"; search.className = "ms-search grow";
            search.placeholder = "Filter members…"; search.autocomplete = "off";
            search.value = docPeopleQuery[doc.pkgId] || "";
            search.addEventListener("input", function () {
              docPeopleQuery[doc.pkgId] = search.value;
              fillPeople();
            });
            tools.appendChild(search);
            picked = document.createElement("span"); picked.className = "ms-count";
            tools.appendChild(picked);
            people.appendChild(tools);
          }

          fillPeople();
          people.appendChild(list);
          /* Restored at the END of the render, not here: an element that is not in the
             document yet has no height, so an assignment to scrollTop is discarded. */
          list.dataset.pkg = doc.pkgId;
          list.addEventListener("scroll", function () { docPeopleScroll[doc.pkgId] = list.scrollTop; });
        }
        card.appendChild(people);
      }
      card.appendChild(bar);
      refreshBar();
      card.appendChild(famBlock(doc));
      tbody.appendChild(dr);
    });

    table.appendChild(tbody);
    host.appendChild(table);

    /* Focus and caret are restored by renderDocFilters, which owns the search
       field now — doing it here as well would fight it for the caret. */

    host.scrollTop = docsScroll;
    Array.prototype.forEach.call(host.querySelectorAll(".ms-list[data-pkg]"), function (l) {
      l.scrollTop = docPeopleScroll[l.dataset.pkg] || 0;
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
    // The summary bar counts members × courses, so it has to hear about both.
    // It used to be driven by the course side alone, which is why it could sit
    // there describing a plan for nobody.
    updateScheduleHint();
  }
  function updateCourseCount() {
    var n = Object.keys(selectedCourses).length;
    $("courseCount").textContent = n + " selected";
    updateAssignEnabled();
    updateScheduleHint();
  }

  // Enable Assign only when at least one member AND one course are selected.
  function updateAssignEnabled() {
    var btn = $("assignBtn"); if (!btn) return;
    btn.disabled = !(Object.keys(selectedUserIds).length && Object.keys(selectedCourses).length);
  }

  // Build the members checklist from the roster. "Select all" toggles every member.
  var memQuery = "";
  function renderMemberChecklist(members) {
    var list = $("memList"); list.textContent = "";
    // Drop any previously-selected ids that are no longer members.
    var present = {}; members.forEach(function (m) { present[m.userId] = true; });
    Object.keys(selectedUserIds).forEach(function (id) { if (!present[id]) delete selectedUserIds[id]; });

    /* A fifty-person list needs a way in. The filter narrows what is SHOWN;
       ticks already made stay made, so an admin can search, tick, search again
       and assign to both — "Select all shown" is scoped to the filter for the
       same reason, since ticking fifty people by accident is not recoverable
       with one click. */
    var mq = memQuery.trim().toLowerCase();
    var visible = mq
      ? members.filter(function (m) { return (fullName(m) + " " + m.email).toLowerCase().indexOf(mq) !== -1; })
      : members;
    if (!visible.length) {
      var none = document.createElement("div"); none.className = "empty";
      none.style.padding = "8px 12px";
      none.textContent = "No member matches that.";
      list.appendChild(none);
    }
    visible.forEach(function (m) {
      var rowEl = document.createElement("label"); rowEl.className = "ms-row";
      var cb = document.createElement("input"); cb.type = "checkbox";
      cb.checked = !!selectedUserIds[m.userId];
      cb.addEventListener("change", function () {
        if (cb.checked) selectedUserIds[m.userId] = true; else delete selectedUserIds[m.userId];
        syncMemAll(visible); updateMemberCount();
      });
      var txt = document.createElement("span");
      var name = document.createElement("span"); name.textContent = fullName(m);
      var sub = document.createElement("span"); sub.className = "sub"; sub.textContent = "  " + m.email;
      txt.appendChild(name); txt.appendChild(sub);
      // Said at the point of choosing, not only after the attempt fails. The row stays
      // tickable on purpose: the admin may be about to send that person a code, and a
      // disabled row with no explanation is harder to act on than a labelled one.
      if (hasNoSeat(m)) {
        var warn = document.createElement("span");
        warn.className = "sub"; warn.style.color = "#B25E00"; warn.style.fontWeight = "600";
        warn.textContent = "  no licence code";
        txt.appendChild(warn);
      }
      rowEl.appendChild(cb); rowEl.appendChild(txt);
      list.appendChild(rowEl);
    });
    syncMemAll(visible); updateMemberCount();
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

      var head = document.createElement("div");
      head.className = "ms-group" + (collapsedGroups[grp] ? "" : " open") +
        (selInGroup ? " picked" : "");
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
        /* TICKING A FRAMEWORK OPENS IT. Ticking twenty-four courses behind a
           folded heading gave a badge reading "24 of 24" and not one course
           name, which is what made the selection feel like it had gone
           nowhere. Opening the group shows it where it was made — no second
           copy of the selection elsewhere to keep in step. Unticking leaves
           the fold alone: shutting a group the moment it empties would snatch
           the list away from somebody who meant to pick two of it. */
        if (gcb.checked) collapsedGroups[grp] = false;
        renderCourseChecklist(); updateCourseCount(); updateScheduleHint();
      });

      // Disclosure chevron + name + count; clicking the header toggles collapse.
      var chev = document.createElement("span"); chev.className = "ms-chev";
      chev.textContent = collapsedGroups[grp] ? "▸" : "▾"; // ▸ / ▾
      var name = document.createElement("span"); name.className = "ms-gname"; name.textContent = grp;
      var count = document.createElement("span"); count.className = "ms-gcount";
      /* "3 of 24", not "(3/24)". A framework header is read at a glance while
         deciding what to tick, and a slash inside brackets is a notation to
         decode where two words are not. */
      count.textContent = selInGroup > 0
        ? selInGroup + " of " + inGroup.length
        : String(inGroup.length);

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
    // Green at every level, so there is no "done" variant to add — only the
    // at-risk one, which is the single thing this bar says that the pill and
    // the percentage beside it do not.
    bar.className = "bar" + (behind ? " risk" : "");
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
    // `aitem-asg` grids the four cells (tick · course · pill · actions) so the
    // status pills line up down the list instead of each starting wherever the
    // course title before it happened to end. The plain `.aitem` used by the
    // licence list has a different shape and is deliberately left on flex.
    var li = document.createElement("li"); li.className = "aitem aitem-asg";

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
        .catch(function (err) {
          alertDialog("Couldn't save that change", [err.message]);
          save.disabled = false;
        });
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
    confirmDialog({
      title: "Remove this assignment?",
      lines: [labelFor(a.courseKey) + " will be taken off their list."],
      note: "Any progress they have already made on the course is kept.",
      confirmLabel: "Remove assignment",
      cancelLabel: "Keep it",
      danger: true,
    }).then(function (yes) {
      if (!yes) return;
      authed("DELETE", "/v1/org/assignments/" + encodeURIComponent(a.id), null)
        .then(function () { loadRoster(); })
        .catch(function (err) { alertDialog("Couldn't remove that assignment", [err.message]); });
    });
  }

  // Bulk removal: delete every assignment in `list` (one DELETE each — the API has no
  // batch route), then refresh the roster once. Reports any that failed.
  function removeAssignments(list, memberName) {
    if (!list.length) return;
    var one = list.length === 1;
    confirmDialog({
      title: one ? "Remove this assignment?" : "Remove " + list.length + " assignments?",
      lines: one
        ? [labelFor(list[0].courseKey) + " will be taken off " + memberName + "'s list."]
        : ["These will be taken off " + memberName + "'s list:"],
      // The courses are listed rather than counted: "remove 6 assignments" is not
      // something anybody can check before agreeing to it.
      items: one ? null : list.map(function (a) { return labelFor(a.courseKey); }),
      note: "Any progress already made is kept.",
      confirmLabel: one ? "Remove assignment" : "Remove " + list.length + " assignments",
      cancelLabel: "Keep them",
      danger: true,
    }).then(function (yes) {
      if (!yes) return;
      var failed = [];
      var chain = Promise.resolve();
      list.forEach(function (a) {
        chain = chain.then(function () {
          return authed("DELETE", "/v1/org/assignments/" + encodeURIComponent(a.id), null)
            .catch(function () { failed.push(labelFor(a.courseKey)); });
        });
      });
      chain.then(function () {
        if (failed.length) {
          alertDialog("Some assignments could not be removed",
                      ["These are still on the list; the rest were removed."],
                      failed.join(", "));
        }
        loadRoster();
      });
    });
  }

  /** A ghost button that says it produces a file: the label plus the download
   *  mark, so "Export PDF" is plainly an action and not a format on offer. */
  function exportButton(label, onClick) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn-ghost";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<path d="M12 3v12"/><path d="M7.5 10.5 12 15l4.5-4.5"/>' +
                    '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>';
    b.appendChild(svg);
    b.appendChild(document.createTextNode(label));
    b.addEventListener("click", onClick);
    return b;
  }

  /** Initials for the row avatar — two letters at most, and never empty. */
  function initialsOf(m) {
    var a = (m.firstName || "").trim(), b = (m.lastName || "").trim();
    var s = (a.charAt(0) + b.charAt(0)).toUpperCase();
    if (s) return s;
    return (m.email || "?").charAt(0).toUpperCase();
  }

  /** One worst-first verdict for the whole person, as a pill. */
  /* ONE VERDICT FOR THE PERSON, over courses AND documents. A member who has
     finished every course but is a week late reading the revised MOE is not
     "All done", and a column that said so would be the one an admin trusted
     and the one that was wrong. */
  function memberStatusPill(m, stats) {
    var f = famStatsFor(m.userId);
    var p = document.createElement("span");
    var dot = document.createElement("span"); dot.className = "dot";
    function set(cls, text) { p.className = "pill " + cls; p.appendChild(dot); p.appendChild(document.createTextNode(text)); return p; }

    if (hasNoSeat(m)) { p.className = "pill idle"; p.textContent = "No licence"; return p; }
    if (stats.overdue || f.overdue) return set("overdue", "Overdue");
    if (stats.dueSoon || f.dueSoon) return set("due_soon", "Due soon");
    if (!stats.total && !f.total) { p.className = "pill idle"; p.textContent = "Nothing assigned"; return p; }
    if (stats.done === stats.total && f.done === f.total) return set("done", "All done");
    p.className = "pill upcoming"; p.textContent = "On track";
    return p;
  }

  /* ONE MEMBER, AS TWO TABLE ROWS: the summary line, and the detail that opens
     under it. The detail is the same content the card carried — chips, the
     assignment list with its bulk bar, the certificates line — so nothing was
     lost in the move; what changed is that twenty-five people's worth of it is
     no longer printed at once. A roster is a RECORD, and a record is read by
     comparing down a column. */
  function renderMember(m, open, onToggle) {
    var stats = memberStats(m);

    var tr = document.createElement("tr");
    tr.className = "rowlink" + (open ? " open" : "");
    tr.tabIndex = 0;
    tr.setAttribute("aria-expanded", open ? "true" : "false");

    // Member
    var tdWho = document.createElement("td");
    var person = document.createElement("div"); person.className = "person";
    var av = document.createElement("div"); av.className = "av"; av.textContent = initialsOf(m);
    var pn = document.createElement("div"); pn.className = "pn";
    var name = document.createElement("span"); name.className = "member-name";
    name.textContent = fullName(m);
    if (m.orgRole === "admin") {
      var role = document.createElement("span"); role.className = "role-pill";
      role.textContent = "Admin"; role.style.marginLeft = "6px";
      name.appendChild(role);
    }
    var email = document.createElement("span"); email.className = "member-email"; email.textContent = m.email;
    pn.appendChild(name); pn.appendChild(email);
    person.appendChild(av); person.appendChild(pn);
    tdWho.appendChild(person);
    tr.appendChild(tdWho);

    // Assigned
    var tdN = document.createElement("td");
    tdN.className = "member-active col-c";
    tdN.textContent = stats.total ? String(stats.total) : "—";
    if (!stats.total) tdN.style.color = "var(--muted)";
    tr.appendChild(tdN);

    /* Progress: courses FINISHED out of courses assigned. Counts, never an
       average of percentages — an average of four half-read courses and one
       finished says "60%" and means nothing anybody can act on. */
    var tdP = document.createElement("td"); tdP.className = "col-c";
    var cell = document.createElement("div"); cell.className = "mcell";
    var bar = document.createElement("div"); bar.className = "mbar";
    var fill = document.createElement("i");
    fill.style.width = stats.total ? Math.round((stats.done / stats.total) * 100) + "%" : "0";
    bar.appendChild(fill);
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", stats.done + " of " + stats.total + " assigned courses completed");
    var small = document.createElement("small");
    small.textContent = stats.total ? stats.done + "/" + stats.total : "—";
    cell.appendChild(bar); cell.appendChild(small);
    tdP.appendChild(cell);
    tr.appendChild(tdP);

      /* DOCUMENTS, beside the courses. A member's obligations are not only
         courses — a revised manual they have not read is the same kind of
         debt, and a progress screen that shows one and not the other is the
         screen somebody trusts and is wrong about. */
      var fsm = famStatsFor(m.userId);
      var tdDoc = document.createElement("td"); tdDoc.className = "col-c member-active";
      if (!fsm.total) { tdDoc.textContent = "\u2014"; tdDoc.style.color = "var(--muted)"; }
      else {
        tdDoc.textContent = fsm.done + " of " + fsm.total;
        if (fsm.overdue) { tdDoc.style.color = "var(--err)"; tdDoc.style.fontWeight = "650"; }
        else if (fsm.done === fsm.total) { tdDoc.style.color = "var(--success)"; tdDoc.style.fontWeight = "650"; }
      }
      tr.appendChild(tdDoc);

    // Status
    var tdS = document.createElement("td"); tdS.className = "col-c";
    tdS.appendChild(memberStatusPill(m, stats));
    tr.appendChild(tdS);

    // Last active — is this person using the app at all? Never what they read.
    var tdA = document.createElement("td"); tdA.className = "member-active col-c";
    if (m.lastActiveAt) tdA.textContent = fmtDate(m.lastActiveAt);
    else { tdA.textContent = "never"; tdA.style.color = "var(--muted)"; }
    tr.appendChild(tdA);

    var tdC = document.createElement("td"); tdC.className = "r chev";
    tdC.textContent = open ? "▾" : "›";
    tr.appendChild(tdC);

    tr.addEventListener("click", function (e) {
      if (e.target.closest("button, a, input, label")) return;
      onToggle(m.userId);
    });
    tr.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(m.userId); }
    });

    if (!open) return [tr];

    // ── The open detail ────────────────────────────────────────────────────
    var trx = document.createElement("tr"); trx.className = "member";
    var tdx = document.createElement("td"); tdx.colSpan = 7;
    var card = document.createElement("div"); card.className = "member-body";
    tdx.appendChild(card); trx.appendChild(tdx);

    var head = document.createElement("div"); head.className = "member-head";
    head.style.cssText = "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-top:10px";

    /* This person's assignments counted by state — the same statuses the rows
       below carry, so the summary answers "how are they doing" before the list
       is read. Only non-zero states appear; a row of zeroes is noise. */
    var chips = document.createElement("div"); chips.className = "mchips";
    function chip(kind, text) {
      var c = document.createElement("span"); c.className = "mchip " + kind; c.textContent = text;
      chips.appendChild(c);
    }
    // Before anything about their progress: can they open a course at all? An admin
    // reading "0 assignments" and one reading "no licence" need to do different things.
    if (hasNoSeat(m)) chip("needs", "No licence code");
    if (!stats.total) chip("none", "No assignments");
    else {
      if (stats.overdue) chip("overdue", stats.overdue + " overdue");
      if (stats.dueSoon) chip("due_soon", stats.dueSoon + " due soon");
      if (stats.upcoming) chip("", stats.upcoming + " upcoming");
      if (stats.done) chip("done", stats.done + " completed");
    }
    head.appendChild(chips);

    var headRight = document.createElement("div");
    headRight.style.cssText = "display:flex;align-items:center;gap:7px;margin-left:auto";
    /* One person's report, from where that person is — an admin asked for
       somebody's record is looking at them, not at a filter.

       They say "Export", with the download mark the toolbar buttons carry. Bare
       "PDF" and "CSV" name a file format and not an action: next to Edit and
       Remove they read as things to open, and nothing on the row said a file
       was about to be produced. */
    var onePdf = exportButton("Export PDF", function () { exportRosterPdf([m], fullName(m)); });
    var oneCsv = exportButton("Export CSV", function () { exportRoster([m], fullName(m)); });
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

    /* THEIR DOCUMENT READINGS, under their courses. The same person, the same
       question — what do they still owe — so the two sit together rather than
       sending the admin to the Documents screen to assemble it by hand. */
    var mine = famForUser(m.userId);
    if (mine.length) {
      var fh = document.createElement("div"); fh.className = "fam-h";
      fh.style.marginTop = "14px";
      var fhb = document.createElement("b"); fhb.textContent = "Document familiarisation";
      fh.appendChild(fhb);
      var fsum = famStatsFor(m.userId);
      var fsp = document.createElement("span"); fsp.className = "fam-sum";
      fsp.textContent = fsum.done + " of " + fsum.total + " read" +
        (fsum.overdue ? "  \u00b7  " + fsum.overdue + " overdue" : "");
      if (fsum.overdue) fsp.style.color = "var(--err)";
      fh.appendChild(fsp);
      card.appendChild(fh);

      var order = { overdue: 0, due_soon: 1, upcoming: 2, done: 3 };
      mine.slice().sort(function (x, y) {
        if (order[x.status] !== order[y.status]) return order[x.status] - order[y.status];
        return String(x.deadline).localeCompare(String(y.deadline));
      }).forEach(function (r) {
        var doc = lastDocs.filter(function (d) { return d.pkgId === r.pkgId; })[0];
        var row = document.createElement("div"); row.className = "fam-row fam-row-mem";
        // The empty cell under the course rows' checkbox: without it everything
        // in this row sits one column left of the rows it is read against.
        row.appendChild(document.createElement("span"));

        var who = document.createElement("div"); who.className = "who";
        who.appendChild(document.createTextNode(doc ? docTitleOf(doc) : r.pkgId));
        var sub = document.createElement("small");
        sub.textContent = (doc ? docCompanyOf(doc) + "  \u00b7  " : "") +
          "Rev. " + r.revision + "  \u00b7  due " + fmtDate(r.deadline) +
          (r.acknowledgedAt ? "  \u00b7  recorded " + fmtDate(r.acknowledgedAt) : "");
        who.appendChild(sub);
        row.appendChild(who);
        row.appendChild(famPill(r));

        var acts = document.createElement("div"); acts.className = "actions";
        var tick = document.createElement("button");
        tick.type = "button"; tick.className = "btn-ghost";
        tick.textContent = r.status === "done" ? "Undo" : "Mark read";
        tick.addEventListener("click", function () {
          tick.disabled = true;
          authed("PATCH", "/v1/org/familiarisation/" + encodeURIComponent(r.id),
                 { acknowledged: r.status !== "done" })
            .then(loadFamiliarisation)
            .catch(function (err) {
              tick.disabled = false;
              showMessage("rosterMsg", err.message || "Couldn't record that.", "err");
            });
        });
        acts.appendChild(tick);
        row.appendChild(acts);
        card.appendChild(row);
      });
    }

    // Certificates line (durable completion record).
    if (m.certificates && m.certificates.length) {
      /* A SECTION, NOT A SENTENCE. These were a comma-joined run of titles
         under a bold "Certificates:" — the only part of an opened member not
         written as a section, so it read as a footnote to the readings above
         rather than as the third thing this person holds. It is also the most
         durable of the three: a course can be reset and an obligation reissued,
         but a certificate is a numbered record that stands forever. It takes
         the same heading, rule and row as the courses and the readings, which
         is also what puts its number and date on screen — until now the portal
         held both and showed neither. */
      var ch = document.createElement("div"); ch.className = "fam-h";
      ch.style.marginTop = "14px";
      var chb = document.createElement("b"); chb.textContent = "Certificates";
      ch.appendChild(chb);
      var csp = document.createElement("span"); csp.className = "fam-sum";
      csp.textContent = m.certificates.length + " issued";
      ch.appendChild(csp);
      card.appendChild(ch);

      m.certificates.slice().sort(function (x, y) {
        return String(y.issuedAt).localeCompare(String(x.issuedAt));
      }).forEach(function (c) {
        var row = document.createElement("div"); row.className = "fam-row fam-row-mem";
        row.appendChild(document.createElement("span"));

        var who = document.createElement("div"); who.className = "who";
        who.appendChild(document.createTextNode(labelFor(c.courseKey)));
        var sub = document.createElement("small");
        sub.textContent = c.number +
          (c.issuedAt ? "  ·  issued " + fmtDate(c.issuedAt) : "") +
          (c.examScore != null ? "  ·  " + c.examScore + "%" : "");
        who.appendChild(sub);
        row.appendChild(who);

        var pill = document.createElement("span");
        pill.className = "pill done"; pill.textContent = "Issued";
        row.appendChild(pill);

        // No action: a certificate is a record, not a thing to change from here.
        row.appendChild(document.createElement("span"));
        card.appendChild(row);
      });
    }
    return [tr, trx];
  }

  // The last roster the server gave us — the assign form reads it to name a member
  // in the "already scheduled" prompt, which would otherwise show a raw userId.
  var lastRoster = [];
  var rosterFilter = "all";   // all | attention | assigned | idle
  var rosterQuery = "";       // free-text search over name + email
  var rosterPage = 0;         // zero-based
  var ROSTER_PAGE_SIZE = 20;  // a screen's worth; a 60-person org is three pages
  // What the roster is CURRENTLY showing, so Export follows the screen rather than
  // quietly exporting everyone — the filter is how an admin says who they mean.
  var shownRoster = [];

  /** One member's assignments counted by live status. */
  /** One person's DOCUMENT readings, counted the way memberStats counts their
   *  courses — so the two can be compared and combined without the caller
   *  learning two shapes. */
  function famStatsFor(userId) {
    var s = { total: 0, done: 0, overdue: 0, dueSoon: 0 };
    famRecords.forEach(function (r) {
      if (r.userId !== userId) return;
      s.total++;
      if (r.status === "done") s.done++;
      else if (r.status === "overdue") s.overdue++;
      else if (r.status === "due_soon") s.dueSoon++;
    });
    return s;
  }

  function famForUser(userId) {
    return famRecords.filter(function (r) { return r.userId === userId; });
  }

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

  /* EXPOSURE, in four figures: how much is late, how much is about to be, how
     much is moving, how much is finished. They are the first thing on the page
     because they are the reason the page exists — the old five tiles led with
     "Members" and "Assigned", which are facts about the org's size rather than
     about its risk, and put Overdue third.

     Each tile carries a sub-line saying what its number is a share of. A bare
     "3" cannot be judged; "3 — across 3 people" can. */
  function renderRosterSummary(members) {
    var host = $("overviewTraining"); if (!host) return;
    host.textContent = "";
    var t = { overdue: 0, dueSoon: 0, done: 0, assigned: 0, upcoming: 0 };
    var peopleOverdue = 0, peopleSoon = 0;
    var soonest = null;
    members.forEach(function (m) {
      var s = memberStats(m);
      t.overdue += s.overdue; t.dueSoon += s.dueSoon; t.done += s.done;
      t.assigned += s.total; t.upcoming += s.upcoming;
      if (s.overdue) peopleOverdue++;
      if (s.dueSoon) peopleSoon++;
      (m.assignments || []).forEach(function (a) {
        if (a.displayStatus === "due_soon" &&
            (soonest == null || a.daysRemaining < soonest.daysRemaining)) soonest = a;
      });
    });
    var open = t.assigned - t.done;
    var pct = t.assigned ? Math.round((t.done / t.assigned) * 100) : 0;

    [
      ["Overdue", t.overdue, "alert",
        peopleOverdue ? "across " + peopleOverdue + " " + (peopleOverdue === 1 ? "person" : "people") : "nothing late"],
      ["Due soon", t.dueSoon, "warn",
        soonest ? "earliest " + fmtDate(soonest.deadline) : "nothing in the next three days"],
      ["In progress", open - t.overdue - t.dueSoon, "",
        t.assigned ? "of " + t.assigned + " assigned" : "nothing assigned yet"],
      ["Completed", t.done, "good",
        t.assigned ? pct + "% of all assigned" : "—"]
    ].forEach(function (row) {
      host.appendChild(statTile(row[0], Math.max(0, row[1]), row[2], row[3]));
    });
  }

  /* RECENT ACTIVITY — the latest movement in the team, newest first.
     There is NO event log on the server, so this is assembled from the two
     things that genuinely are recorded: a completion date, and the
     `lastActiveAt` each member's app reports. It therefore says "finished X" and
     "was last in Y" and nothing else — inventing "started", "earned a
     certificate at 14:02" or any other verb would be writing a history the data
     cannot support. */
  function renderActivity(members) {
    var host = $("activity"); if (!host) return;
    host.textContent = "";
    var events = [];
    members.forEach(function (m) {
      (m.assignments || []).forEach(function (a) {
        if (a.status === "completed" && a.completedAt) {
          events.push({ at: a.completedAt, who: fullName(m), verb: "finished", what: labelFor(a.courseKey) });
        }
      });
      // One "last seen" per member, and only when it is not already explained by
      // a completion on the same day — otherwise the feed says the same thing twice.
      if (m.lastActiveAt) {
        var sameDay = events.some(function (e) {
          return e.who === fullName(m) && String(e.at).slice(0, 10) === String(m.lastActiveAt).slice(0, 10);
        });
        if (!sameDay) events.push({ at: m.lastActiveAt, who: fullName(m), verb: "was last in the app", what: "" });
      }
    });
    events.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    if (!events.length) {
      var e = document.createElement("div"); e.className = "empty"; e.style.padding = "4px 0";
      e.textContent = "No activity reported yet.";
      host.appendChild(e);
      return;
    }
    events.slice(0, 6).forEach(function (ev) {
      var row = document.createElement("div"); row.className = "act";
      var txt = document.createElement("span");
      var b = document.createElement("b"); b.textContent = ev.who;
      txt.appendChild(b);
      txt.appendChild(document.createTextNode(" " + ev.verb + (ev.what ? " " + ev.what : "")));
      row.appendChild(txt);
      var ago = document.createElement("span"); ago.className = "ago"; ago.textContent = fmtDate(ev.at);
      row.appendChild(ago);
      host.appendChild(row);
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
      b.addEventListener("click", function () { rosterFilter = f[0]; rosterPage = 0; renderRoster(lastRoster); });
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
      var row = document.createElement("div"); row.className = "frow frow-att";
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

      /* THE ACTION BELONGS ON THE ROW THAT REPORTS THE PROBLEM. Until now this
         list could only be read: an admin learned that somebody was eleven days
         late, then went to Team, found them among twenty-five, opened the card
         and edited the deadline there. Both things anyone does about a late
         course — move it, or ask them to get on with it — are here. */
      var acts = document.createElement("div"); acts.className = "actions";

      var ext = document.createElement("button");
      ext.type = "button"; ext.className = "btn-ghost"; ext.textContent = "Extend";
      ext.addEventListener("click", function () { extendDeadline(r.a, fullName(r.m)); });
      acts.appendChild(ext);

      var rem = document.createElement("button");
      rem.type = "button"; rem.className = "btn-ghost"; rem.textContent = "Remind";
      rem.addEventListener("click", function () { remind([r.a], fullName(r.m), rem); });
      acts.appendChild(rem);

      row.appendChild(acts);
      host.appendChild(row);
    });
  }

  /* Move one deadline, from wherever the admin is reading about it. A dialog
     rather than the inline editor the member card uses: there is no row to open
     an editor into here, and the question is one field wide. */
  function extendDeadline(a, memberName) {
    var input = document.createElement("input");
    input.type = "date"; input.className = "field"; input.style.margin = "4px 0 0";
    input.value = String(a.deadline || "").slice(0, 10);
    input.min = new Date().toISOString().slice(0, 10);

    confirmDialog({
      title: "Move the deadline",
      lines: [memberName + " — " + labelFor(a.courseKey) + ".",
              "Currently due " + fmtDate(a.deadline) + "."],
      field: input,
      confirmLabel: "Move deadline",
      cancelLabel: "Cancel"
    }).then(function (ok) {
      if (!ok || !input.value) return;
      return authed("PATCH", "/v1/org/assignments/" + encodeURIComponent(a.id),
                    { deadline: input.value })
        .then(loadRoster)
        .then(function () { showMessage("rosterMsg", "Deadline moved.", "ok"); })
        .catch(function (err) { showMessage("rosterMsg", err.message || "Couldn't move that deadline.", "err"); });
    });
  }

  /* Nudge the learner by email. The server already emails each learner once when
     courses are assigned; this sends the same kind of message for work that has
     gone quiet, and is rate-limited server-side so a row that is clicked twice
     does not send twice. The BUTTON reports its own result — a toast at the top
     of a long list is read by nobody looking at row eleven. */
  function remind(assignments, memberName, btn) {
    var ids = assignments.map(function (a) { return a.id; });
    if (!ids.length) return;
    var original = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    authed("POST", "/v1/org/assignments/remind", { assignmentIds: ids })
      .then(function (res) {
        if (btn) {
          // "Reminded" rather than "Sent": the server may have declined to send
          // again so soon, and the admin's question is whether this person has
          // been nudged, not whether an SMTP call happened just now.
          btn.textContent = (res && res.skipped) ? "Reminded recently" : "Reminded";
          btn.disabled = true;
        }
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = original; }
        showMessage("rosterMsg", err.message || "Couldn't send that reminder.", "err");
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

  /* EVERY CERTIFICATE THE TEAM HOLDS, AS ONE TABLE.
     It was a two-level disclosure — open the holder, then open the course, then
     read the number — which is three clicks to answer the only question this
     page is ever asked: "what is Farid's certificate number for Part-145?". A
     certificate is a RECORD, and records are rows: holder, course, number, date,
     score, in columns that line up and can be scanned or sorted.

     The SERIES survives the flattening and reads better for it. A learner who
     resets a course and earns it again holds two certificates, both valid; as
     two rows with a #2 marker that is plain, where nested behind a disclosure
     labelled "2 issued" it was not. */
  var certSort = "issued";   // issued | holder | course
  var certSortDesc = false;

  /* ONE LIST, THREE READERS — the table, the CSV and the printed sheet. Built
     here rather than inside the renderer so an export cannot quietly disagree
     with what is on screen, which in a register of certificates is the kind of
     disagreement nobody catches until it is in someone else's hands. */
  function certificateRows(members) {
    var rows = [];
    (members || []).forEach(function (m) {
      var list = (m.certificates || []).slice();
      if (!list.length) return;
      // Oldest first per course, so #1 is the first one earned.
      var seen = {};
      list.slice().sort(function (x, y) { return String(x.issuedAt).localeCompare(String(y.issuedAt)); })
        .forEach(function (c) {
          seen[c.courseKey] = (seen[c.courseKey] || 0) + 1;
          rows.push({ m: m, c: c, seq: seen[c.courseKey] });
        });
      // How many that course holds in total, so only a real series is marked.
      rows.forEach(function (r) { if (r.m === m) r.of = seen[r.c.courseKey]; });
    });
    return rows;
  }

  /* ONE comparator map, read by both the sorter and the column headings — the
     headings ask it which columns are sortable at all, so a map scoped inside
     the sorter leaves `th()` referring to a name that is not there. */
  var CERT_SORTS = {
    issued: function (a, b) { return String(b.c.issuedAt).localeCompare(String(a.c.issuedAt)); },
    holder: function (a, b) { return fullName(a.m).localeCompare(fullName(b.m)); },
    course: function (a, b) { return labelFor(a.c.courseKey).localeCompare(labelFor(b.c.courseKey)); }
  };

  function certSorted(rows) {
    var out = rows.slice().sort(CERT_SORTS[certSort] || CERT_SORTS.issued);
    if (certSortDesc) out.reverse();
    return out;
  }

  /** What the Certificates table is showing right now — filter and sort applied. */
  function shownCertificates() {
    var rows = certificateRows(lastRoster);
    var q = certFilter.trim().toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        return (fullName(r.m) + " " + r.m.email + " " + labelFor(r.c.courseKey) + " " +
                (r.c.number || "")).toLowerCase().indexOf(q) !== -1;
      });
    }
    return certSorted(rows);
  }

  function renderCertificates(members) {
    var host = $("certs"); if (!host) return;
    host.textContent = "";

    var rows = certificateRows(members);
    var total = rows.length;
    var q = certFilter.trim().toLowerCase();
    var shown = certSorted(!q ? rows : rows.filter(function (r) {
      return (fullName(r.m) + " " + r.m.email + " " + labelFor(r.c.courseKey) + " " +
              (r.c.number || "")).toLowerCase().indexOf(q) !== -1;
    }));

    $("certCount").textContent = total
      ? (q ? shown.length + " of " + total : total + " certificate" + (total === 1 ? "" : "s"))
      : "";

    if (!shown.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = total
        ? "No certificate matches that."
        : "No certificates yet. One is issued when a member finishes every lesson in a course and passes its assessment.";
      host.appendChild(e);
      return;
    }

    function th(key, label, centred, width) {
      var el = document.createElement("th");
      if (width) el.style.width = width;
      if (centred) el.className = "col-c";
      if (!CERT_SORTS[key]) { el.textContent = label; return el; }
      el.className = (centred ? "col-c " : "") + "sortable";
      el.textContent = label;
      if (certSort === key) {
        var car = document.createElement("span"); car.className = "car";
        car.textContent = certSortDesc ? "▼" : "▲";
        el.appendChild(car);
      }
      el.addEventListener("click", function () {
        if (certSort === key) certSortDesc = !certSortDesc;
        else { certSort = key; certSortDesc = false; }
        renderCertificates(lastRoster);
      });
      return el;
    }

    var table = document.createElement("table");
    var head = document.createElement("thead"); var hr = document.createElement("tr");
    hr.appendChild(th("holder", "Holder", false, "27%"));
    hr.appendChild(th("course", "Course", false, "30%"));
    hr.appendChild(th(null, "Number"));
    hr.appendChild(th("issued", "Issued", true));
    hr.appendChild(th(null, "Score", true));
    head.appendChild(hr); table.appendChild(head);

    var body = document.createElement("tbody");
    shown.forEach(function (r) {
      var tr = document.createElement("tr");

      var tdH = document.createElement("td");
      var person = document.createElement("div"); person.className = "person";
      var av = document.createElement("div"); av.className = "av"; av.textContent = initialsOf(r.m);
      var pn = document.createElement("div"); pn.className = "pn";
      var nm = document.createElement("span"); nm.className = "member-name"; nm.textContent = fullName(r.m);
      var em = document.createElement("span"); em.className = "member-email"; em.textContent = r.m.email;
      pn.appendChild(nm); pn.appendChild(em);
      person.appendChild(av); person.appendChild(pn);
      tdH.appendChild(person); tr.appendChild(tdH);

      var tdC = document.createElement("td");
      tdC.appendChild(document.createTextNode(labelFor(r.c.courseKey)));
      // Only a real series is marked; "#1 of 1" would be noise on every row.
      if (r.of > 1) {
        var s = document.createElement("small"); s.className = "csub";
        s.textContent = "certificate " + r.seq + " of " + r.of + " for this course";
        tdC.appendChild(s);
      }
      tr.appendChild(tdC);

      var tdN = document.createElement("td");
      var num = document.createElement("span"); num.className = "num";
      num.textContent = r.c.number || "—";
      tdN.appendChild(num); tr.appendChild(tdN);

      var tdD = document.createElement("td"); tdD.className = "member-active col-c";
      tdD.textContent = fmtDate(r.c.issuedAt);
      tr.appendChild(tdD);

      var tdS = document.createElement("td"); tdS.className = "col-c";
      if (r.c.examScore != null) {
        var pill = document.createElement("span"); pill.className = "pill done";
        pill.textContent = r.c.examScore + "%";
        tdS.appendChild(pill);
      } else {
        tdS.textContent = "—";
        tdS.style.color = "var(--muted)";
      }
      tr.appendChild(tdS);

      body.appendChild(tr);
    });
    table.appendChild(body);
    host.appendChild(table);
  }

  /* Which member's detail is open, and how the table is ordered. Both live out
     here so they survive a re-render: a roster reload must not shut the person
     an admin is reading, nor silently re-sort the list under their cursor. */
  var openMemberId = null;
  var rosterSort = "attention";   // attention | name | assigned | progress | active
  var rosterSortDesc = false;

  var SORTS = {
    attention: byAttention,
    name: function (a, b) { return fullName(a).localeCompare(fullName(b)); },
    assigned: function (a, b) { return memberStats(b).total - memberStats(a).total; },
    progress: function (a, b) {
      // Least finished first: the column is read to find who needs pushing.
      var sa = memberStats(a), sb = memberStats(b);
      var pa = sa.total ? sa.done / sa.total : -1, pb = sb.total ? sb.done / sb.total : -1;
      return pa - pb;
    },
    documents: function (a, b) {
      // Least read first: the column is read to find who still owes a reading.
      var fa = famStatsFor(a.userId), fb = famStatsFor(b.userId);
      var pa = fa.total ? fa.done / fa.total : -1, pb = fb.total ? fb.done / fb.total : -1;
      return pa - pb;
    },
    active: function (a, b) {
      // Never-seen last, whichever way it is sorted: "no date" is not a date.
      var ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : -Infinity;
      var tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : -Infinity;
      return tb - ta;
    }
  };

  function sortHeader(key, label, width, centred) {
    var th = document.createElement("th");
    if (width) th.style.width = width;
    if (centred) th.className = "col-c";
    if (!SORTS[key]) { th.textContent = label; return th; }
    th.className = (centred ? "col-c " : "") + "sortable";
    th.setAttribute("scope", "col");
    th.textContent = label;
    if (rosterSort === key) {
      var car = document.createElement("span"); car.className = "car";
      car.textContent = rosterSortDesc ? "▼" : "▲";
      th.appendChild(car);
    }
    th.addEventListener("click", function () {
      if (rosterSort === key) rosterSortDesc = !rosterSortDesc;
      else { rosterSort = key; rosterSortDesc = false; }
      rosterPage = 0;
      renderRoster(lastRoster);
    });
    return th;
  }

  function toggleMember(userId) {
    openMemberId = openMemberId === userId ? null : userId;
    renderRoster(lastRoster);
  }

  function renderRoster(members) {
    lastRoster = members || [];
    var root = $("roster"); root.textContent = "";
    renderRosterSummary(lastRoster);
    renderAttention(lastRoster);
    renderActivity(lastRoster);
    renderCertificates(lastRoster);
    renderRecords();
    renderRosterFilters(lastRoster);
    if (!lastRoster.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "No members found for your organisation yet. Members appear here once they create an account with a work email on your organisation's domain.";
      root.appendChild(e);
      renderMemberChecklist(lastRoster);
      return;
    }
    var q = rosterQuery.trim().toLowerCase();
    shownRoster = lastRoster.filter(function (m) {
      var s = memberStats(m);
      if (q && (fullName(m) + " " + m.email).toLowerCase().indexOf(q) === -1) return false;
      if (rosterFilter === "attention") return s.overdue > 0 || s.dueSoon > 0;
      if (rosterFilter === "assigned") return s.total > 0;
      if (rosterFilter === "idle") return s.total === 0;
      return true;
    }).sort(SORTS[rosterSort] || byAttention);
    if (rosterSortDesc) shownRoster.reverse();

    /* PAGE the cards, but never the EXPORT: `shownRoster` is everything the
       filter and the search matched, and that is what a report of "needs
       attention" has to contain — exporting only the twenty on screen would be a
       quietly wrong document. */
    var pages = Math.max(1, Math.ceil(shownRoster.length / ROSTER_PAGE_SIZE));
    if (rosterPage > pages - 1) rosterPage = pages - 1;
    if (rosterPage < 0) rosterPage = 0;
    var from = rosterPage * ROSTER_PAGE_SIZE;
    var shown = shownRoster.slice(from, from + ROSTER_PAGE_SIZE);
    renderPager(shownRoster.length, pages, from, shown.length);

    if (!shown.length) {
      var none = document.createElement("div"); none.className = "empty";
      none.textContent = rosterFilter === "attention"
        ? "Nobody is overdue or due within three days."
        : rosterFilter === "assigned"
        ? "Nobody has an assignment yet — assign a course from the Assign tab."
        : "Everyone has at least one assignment.";
      root.appendChild(none);
    } else {
      var table = document.createElement("table");
      var thead = document.createElement("thead");
      var hr = document.createElement("tr");
      hr.appendChild(sortHeader("name", "Member", "30%"));
      hr.appendChild(sortHeader("assigned", "Courses", null, true));
      hr.appendChild(sortHeader("progress", "Course progress", "18%", true));
      hr.appendChild(sortHeader("documents", "Documents", null, true));
      // Status has no sort of its own: "attention" IS that sort, and two
      // controls for one ordering is how they end up disagreeing.
      hr.appendChild(sortHeader("attention", "Status", null, true));
      hr.appendChild(sortHeader("active", "Last active", null, true));
      hr.appendChild(sortHeader(null, ""));
      thead.appendChild(hr); table.appendChild(thead);

      var tbody = document.createElement("tbody");
      shown.forEach(function (m) {
        renderMember(m, m.userId === openMemberId, toggleMember)
          .forEach(function (row) { tbody.appendChild(row); });
      });
      table.appendChild(tbody);
      root.appendChild(table);
    }
    renderMemberChecklist(lastRoster);
    renderTabs();
  }

  function renderPager(total, pages, from, count) {
    var host = $("rosterPager"); if (!host) return;
    host.textContent = "";
    if (total === 0) return;
    if (pages <= 1) {
      var only = document.createElement("span"); only.className = "pinfo";
      only.textContent = total + " member" + (total === 1 ? "" : "s");
      host.appendChild(only);
      return;
    }
    var prev = document.createElement("button");
    prev.type = "button"; prev.textContent = "\u2039 Previous";
    prev.disabled = rosterPage === 0;
    prev.addEventListener("click", function () { rosterPage--; renderRoster(lastRoster); });
    var info = document.createElement("span"); info.className = "pinfo";
    info.textContent = (from + 1) + "\u2013" + (from + count) + " of " + total;
    var next = document.createElement("button");
    next.type = "button"; next.textContent = "Next \u203a";
    next.disabled = rosterPage >= pages - 1;
    next.addEventListener("click", function () { rosterPage++; renderRoster(lastRoster); });
    host.appendChild(prev); host.appendChild(info); host.appendChild(next);
  }

  function loadRoster() {
    return authed("GET", "/v1/org/members", null).then(function (res) {
      renderRoster(res.members || []);
    });
  }

  /* ── Invite a colleague ───────────────────────────────────────────────────
     The roster can only list accounts that already EXIST, so the first step of
     running a team's training — getting people into the app — had no place in
     the portal and happened over chat.

     The invitation creates nothing: the colleague signs up themselves, which
     their allow-listed work domain already permits, and the six-digit code then
     proves they own the mailbox. So this sends instructions, not a credential.
     The dialog says that plainly, because an admin who thinks an account has
     been made will wait for something that is not coming. */
  function openInvite() {
    var wrap = document.createElement("div");

    var eLbl = document.createElement("label"); eLbl.className = "lbl";
    eLbl.textContent = "Work email";
    var email = document.createElement("input");
    email.type = "email"; email.className = "field"; email.placeholder = "e.g. alex.morgan@" + (lastDomains[0] || "yourcompany.com");
    email.autocomplete = "off";

    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px";
    var fWrap = document.createElement("div"); fWrap.style.flex = "1 1 0";
    var fLbl = document.createElement("label"); fLbl.className = "lbl"; fLbl.textContent = "First name";
    var first = document.createElement("input");
    first.type = "text"; first.className = "field"; first.placeholder = "Alex"; first.autocomplete = "off";
    fWrap.appendChild(fLbl); fWrap.appendChild(first);
    var lWrap = document.createElement("div"); lWrap.style.flex = "1 1 0";
    var lLbl = document.createElement("label"); lLbl.className = "lbl"; lLbl.textContent = "Last name";
    var last = document.createElement("input");
    last.type = "text"; last.className = "field"; last.placeholder = "Morgan"; last.autocomplete = "off";
    lWrap.appendChild(lLbl); lWrap.appendChild(last);
    row.appendChild(fWrap); row.appendChild(lWrap);

    wrap.appendChild(eLbl); wrap.appendChild(email); wrap.appendChild(row);

    confirmDialog({
      title: "Invite a colleague",
      lines: [
        "They get an email telling them to install the app and create an account with this address.",
        "Nothing is created for them and no licence is used — they sign up themselves, and appear in your team once they do."
      ],
      field: wrap,
      note: lastDomains.length
        ? "Only addresses on " + lastDomains.join(" or ") + " can be invited."
        : "",
      confirmLabel: "Send invitation",
      cancelLabel: "Cancel"
    }).then(function (ok) {
      if (!ok) return;
      var addr = (email.value || "").trim();
      if (!addr) return;
      return authed("POST", "/v1/org/invites", {
        email: addr,
        firstName: (first.value || "").trim() || undefined,
        lastName: (last.value || "").trim() || undefined
      }).then(function (res) {
        if (res && res.alreadyMember) {
          // Not an error, and not a success either: saying "invitation sent"
          // about somebody who has been using the app for a month costs the
          // admin a real conversation.
          showMessage("rosterMsg", addr + " already has an account and is in your team.", "warn");
        } else {
          showMessage("rosterMsg", "Invitation sent to " + addr + ".", "ok");
        }
      }).catch(function (err) {
        showMessage("rosterMsg", err.message || "Couldn't send that invitation.", "err");
      });
    });
  }

  // ── Assign form (multi-member × multi-course fan-out) ─────────────────────
  // "Select all" members toggle.
  $("memAll").addEventListener("change", function () {
    var on = $("memAll").checked;
    // Only the rows the filter is SHOWING — see renderMemberChecklist.
    $("memList").querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.checked = on; cb.dispatchEvent(new Event("change"));
    });
  });
  $("memSearch").addEventListener("input", function () {
    memQuery = $("memSearch").value || "";
    renderMemberChecklist(lastRoster);
  });
  $("rosterSearch").addEventListener("input", function () {
    rosterQuery = $("rosterSearch").value || "";
    rosterPage = 0;
    renderRoster(lastRoster);
  });
  $("courseSearch").addEventListener("input", applyCourseFilter);
  $("memClear").addEventListener("click", function () {
    selectedUserIds = {};
    renderMemberChecklist(lastRoster);   // re-renders the ticks and re-syncs "Select all shown"
  });
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
  /* THE CONSEQUENCE, STATED BEFORE THE BUTTON IS REACHABLE. The admin is about
     to write members × courses rows and send each of those people an email; the
     bar says how many that is and on what dates, and the button carries the
     count so the number is still under the cursor at the moment of clicking. */
  function updateScheduleHint() {
    var el = $("scheduleHint"); if (!el) return;
    var bar = $("assignSummary"), btn = $("assignBtn");
    var plan = courseDeadlines();
    var people = Object.keys(selectedUserIds).length;
    el.style.color = "";

    if (!plan.length || !people) {
      if (bar) bar.classList.add("idle");
      if (btn) btn.textContent = "Assign";
      el.textContent = !people && !plan.length ? "Pick members and courses to see what will be scheduled."
        : !people ? "No members picked yet."
        : "No courses picked yet.";
      /* AND CLEAR THE SCHEDULE. This branch returned before the render, so
         unticking the last course left eighteen dated rows on screen under a
         bar reading "No courses picked yet" — the plan outliving the selection
         it was built from, which is the one thing on this form an admin reads
         as a statement of fact. */
      renderAssignPlan([]);
      syncSeePlan();   // no schedule, no signpost to one
      return;
    }
    if (bar) bar.classList.remove("idle");

    var n = plan.length;
    var jobs = people * n;
    var last = plan[n - 1].date;
    var perCourseDays = Math.round((last.getTime() - Date.now()) / DAY_MS / n);

    el.textContent = "";
    var strong = document.createElement("b");
    strong.textContent = jobs + " assignment" + (jobs === 1 ? "" : "s");
    el.appendChild(strong);
    el.appendChild(document.createTextNode(
      " — " + people + " member" + (people === 1 ? "" : "s") +
      " × " + n + " course" + (n === 1 ? "" : "s") +
      ". First due " + fmtShort(plan[0].date) +
      (n > 1 ? ", last due " + fmtShort(last) + " (~" + Math.max(0, perCourseDays) + " days each)" : "") +
      ". Each learner is emailed once."));

    if (n > 1 && perCourseDays < 21) {
      var warn = document.createElement("div");
      warn.style.cssText = "color:var(--err);font-weight:650;margin-top:3px";
      warn.textContent = "That's tight — consider a later first deadline, or more months apart.";
      el.appendChild(warn);
    }
    if (btn) btn.textContent = "Assign " + jobs + " course" + (jobs === 1 ? "" : "s");
    renderAssignPlan(plan);
    syncSeePlan();
  }

  /* THE WAY DOWN TO THE SCHEDULE.
     The pinned bar states a total — "17 assignments, first due 2 Nov 2026" —
     and the schedule that total was computed from is further down a form
     taller than the window, with nothing from the bar saying it is there. This
     is the signpost, and it is shown only while there IS a schedule and it is
     off screen: an arrow pointing at something already in view is an
     instruction to do what you have already done.

     It reads the card's scroll box rather than the window, because that is
     what moves. */
  function seePlanHost() {
    var sect = document.querySelector('.sect[data-sect="assign"]');
    return sect ? sect.querySelector(".card") : null;
  }

  function syncSeePlan() {
    var btn = $("seePlanBtn"), plan = $("assignPlan"), host = seePlanHost();
    if (!btn || !plan || !host) return;
    var rows = plan.querySelectorAll(".plan-r").length;
    if (!rows) { btn.classList.add("hidden"); return; }
    var p = plan.getBoundingClientRect(), h = host.getBoundingClientRect();
    /* HOW MUCH OF IT CAN ACTUALLY BE READ, not whether its top edge has
       crossed the fold. Testing the edge alone called sixty pixels of peeking
       heading "visible" and hid the signpost exactly where it was wanted; and
       testing whether the WHOLE box fits would keep it up for every eighteen-
       row schedule, which is the same wrong answer pointing the other way.
       Three rows is the smallest amount that reads as a list. */
    var seen = Math.min(p.bottom, h.bottom) - Math.max(p.top, h.top);
    btn.classList.toggle("hidden", seen >= 120);
  }

  function initSeePlan() {
    var btn = $("seePlanBtn"), host = seePlanHost();
    if (!btn || !host) return;
    btn.addEventListener("click", function () {
      var plan = $("assignPlan"); if (!plan) return;
      plan.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    // The card is the thing that scrolls, so it is the thing to listen to.
    host.addEventListener("scroll", syncSeePlan, { passive: true });
    window.addEventListener("resize", syncSeePlan);
  }

  /* The schedule the two fields above actually produce, course by course.
     "Months between courses: 1" states a RULE; this states the plan, which is
     where an admin sees that the fourth course lands over the holidays — and
     the only place the catalogue ordering becomes visible before it is used. */
  function renderAssignPlan(plan) {
    var host = $("assignPlan"); if (!host) return;
    host.textContent = "";
    if (!plan || plan.length < 1) return;

    var h = document.createElement("div"); h.className = "plan-h";
    h.textContent = "Deadlines, in catalogue order";
    host.appendChild(h);

    plan.forEach(function (p, i) {
      var row = document.createElement("div"); row.className = "plan-r";
      var n = document.createElement("span"); n.className = "n"; n.textContent = (i + 1) + ".";
      var c = document.createElement("span"); c.className = "c"; c.textContent = labelFor(p.courseKey);
      var d = document.createElement("span"); d.className = "d"; d.textContent = fmtShort(p.date);
      row.appendChild(n); row.appendChild(c); row.appendChild(d);
      host.appendChild(row);
    });
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
    return authed("POST", "/v1/org/assignments/batch", body).catch(function (err) {
      /* THE SITE DEPLOYS SEPARATELY FROM THE API, so this page can land on a
         server that predates the batch route — and unlike the licence panel,
         which can simply hide itself, ASSIGN IS WHAT THIS PAGE IS FOR. A 404
         here would leave an admin staring at "Route not found" with no way to
         assign anything.
         So fall back to the per-assignment endpoint that has been live all
         along, one call per pair, and reassemble the same { assignments,
         conflicts } answer the batch route returns. Everything downstream — the
         conflict prompt, the counts, the retry with overwrite — is unchanged.
         What is lost on this path is the LEARNER EMAIL: only the batch endpoint
         sees the whole action, and one-email-per-course is exactly what it was
         built to avoid. It comes back the moment the API catches up. */
      if (err.status !== 404) throw err;
      var assignments = [], conflicts = [], refusals = [];
      return jobs.reduce(function (chain, j) {
        return chain.then(function () {
          var one = { courseKey: j.courseKey, deadline: j.deadline, sequence: j.sequence, userId: j.userId };
          if (overwrite) one.overwrite = true;
          return authed("POST", "/v1/org/assignments", one).then(function (r) {
            assignments = assignments.concat((r && r.assignments) || []);
            conflicts = conflicts.concat((r && r.conflicts) || []);
            refusals = refusals.concat((r && r.refusals) || []);
          });
        });
      }, Promise.resolve()).then(function () {
        return { assignments: assignments, conflicts: conflicts, refusals: refusals };
      });
    });
  }

  /** Refusals from the last assign attempt — people the server would not write an
   *  assignment for because they could not open the course. */
  var lastRefusals = [];

  /* A member with NO live licence. `entitledCourses` is what that account can open, so
     an empty list means no seat has been redeemed (or it expired) — assignments to them
     are refused by the server, and this is how the admin sees it before trying.
     Absent entirely means an older API that does not send the field; then nothing is
     claimed, because inventing a "No licence code" badge from missing data would be worse than
     saying nothing. */
  function hasNoSeat(m) {
    return Array.isArray(m.entitledCourses) && m.entitledCourses.length === 0;
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
    var ask = perCourseDays < 21
      ? confirmDialog({
          title: "That is a tight schedule",
          lines: ["It gives about " + Math.max(0, perCourseDays) + " days per course for "
                  + n + " course" + (n === 1 ? "" : "s") + ", which may be too short to finish."],
          note: "You can change the first deadline or the months between courses instead.",
          confirmLabel: "Assign anyway",
          cancelLabel: "Change the dates",
        })
      : Promise.resolve(true);
    ask.then(function (go) { if (go) runAssign(); });
    function runAssign() {

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
      /* A refusal outranks the tally, because it is the only part the admin has to DO
         something about, and the something is outside this screen: send that person a
         licence code. So it is shown as a warning with the names, not folded into the
         sentence above as another number. */
      if (lastRefusals.length) {
        showRefusals(created === 0 ? "err" : "warn");
      } else {
        showMessage("assignMsg", msg, "ok");
      }
      btn.disabled = false;
      return loadRoster();
    }

    /* Names the people and says what to do. Grouped BY PERSON rather than by course: an
       admin assigning five courses to a seatless member does not need five lines telling
       them the same thing about the same person. */
    function showRefusals(kind) {
      var byUser = {};
      lastRefusals.forEach(function (r) {
        (byUser[r.userId] = byUser[r.userId] || { email: r.email, reason: r.reason, courses: [] })
          .courses.push(labelFor(r.courseKey));
      });
      var ids = Object.keys(byUser);
      var noSeat = ids.filter(function (id) { return byUser[id].reason === "no_seat"; });

      var el = $("assignMsg"); el.textContent = "";
      var box = document.createElement("div");
      box.className = "msg " + (kind === "err" ? "err" : "warn");

      var head = document.createElement("div");
      head.style.fontWeight = "700";
      head.textContent = ids.length === 1
        ? "1 person could not be assigned"
        : ids.length + " people could not be assigned";
      box.appendChild(head);

      var why = document.createElement("div");
      why.style.margin = "4px 0 6px";
      why.textContent = noSeat.length === ids.length
        ? "They have not redeemed a licence code, so the courses would appear in their app locked. Send them a code, then assign again."
        : "Their licence does not cover every course selected, so those would appear locked. Nothing was saved for them.";
      box.appendChild(why);

      var ul = document.createElement("ul");
      ul.style.margin = "0"; ul.style.paddingLeft = "18px";
      ids.slice(0, 8).forEach(function (id) {
        var u = byUser[id];
        var li = document.createElement("li");
        li.textContent = nameOf(id) + " (" + u.email + ") - "
          + (u.reason === "no_seat" ? "no licence code redeemed" : "outside their licence: " + u.courses.join(", "));
        ul.appendChild(li);
      });
      if (ids.length > 8) {
        var more = document.createElement("li");
        more.textContent = "…and " + (ids.length - 8) + " more";
        ul.appendChild(more);
      }
      box.appendChild(ul);
      el.appendChild(box);
    }

    postBatch(jobs, false).then(function (r) {
      var created = (r.assignments || []).length;
      /* REFUSED is not CONFLICTED, and the difference is who can act. A conflict is a
         question for the admin ("replace the date?"); a refusal is a fact about the
         account — they hold no seat, so the course would sit in their list locked. No
         answer here fixes it, so it is reported rather than prompted, and it names the
         people so the admin knows who needs a code. */
      lastRefusals = r.refusals || [];
      var conflicts = r.conflicts || [];
      var done = conflicts.filter(function (c) { return c.reason === "completed"; });
      var pending = conflicts.filter(function (c) { return c.reason !== "completed"; });
      if (!pending.length) return report(created, 0, done.length);

      /* ONE prompt for the whole batch. Nothing was written for these — the server
         reported them and stopped — so "Keep" really does keep every date.
         The legend this message used to carry ("OK — replace, Cancel — keep the
         existing dates") is gone, because THE BUTTONS SAY IT NOW. That line existed
         only because window.confirm cannot label its own buttons, and it was the
         first thing the browser clipped — leaving OK and Cancel with the sentence
         that explained them hidden. */
      var one = pending.length === 1;
      var items = pending.slice(0, 8).map(function (c) {
        return nameOf(c.userId) + " — " + labelFor(c.courseKey) + ", due " + fmtDate(c.deadline);
      });
      if (pending.length > 8) items.push("…and " + (pending.length - 8) + " more");

      return confirmDialog({
        title: one ? "One of these is already scheduled" : pending.length + " are already scheduled",
        lines: [one
          ? "This learner already has a deadline for that course:"
          : "These learners already have a deadline for the course selected:"],
        items: items,
        note: "Nothing has been changed for " + (one ? "this one" : "these") + " yet.",
        confirmLabel: one ? "Replace the date" : "Replace the dates",
        cancelLabel: one ? "Keep the existing date" : "Keep the existing dates",
      }).then(function (replace) {
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
      });   // confirmDialog
    }).catch(function (err) {
      showMessage("assignMsg", err.message || "Couldn't reach the server.", "err");
      btn.disabled = false;
    });
    }   // runAssign
  });

  $("inviteBtn").addEventListener("click", openInvite);
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
  function clearDocFilters() {
    // The controls are rebuilt from this state by renderDocFilters, so clearing
    // the state is the whole job — there are no live nodes to reset.
    docQuery = "";
    docView = "";
    renderDocs();
  }

  /* Recent activity folds, and starts folded: it is the least urgent thing on
     the page — nothing in it needs doing — and open it took the height the
     licence panel beside it actually wants. */
  $("activityToggle").addEventListener("click", function () {
    var open = $("activityToggle").getAttribute("aria-expanded") === "true";
    $("activityToggle").setAttribute("aria-expanded", open ? "false" : "true");
    $("activity").classList.toggle("hidden", open);
  });

  /* NO startup listener for the document search: it is built by renderDocs into
     the table header, with its handler attached there. Binding one here threw a
     TypeError on a null element at load time, which aborted the whole script
     before anything initialised — and because it fired before any error
     listener could exist, it surfaced as a page that simply had no tabs. */
  /* ── Assign · Documents wiring ──────────────────────────────────────────── */
  /* The bulk form folds, and starts folded: this screen is opened far more
     often to look a document up than to schedule a reading round. */
  /* ── Records wiring ─────────────────────────────────────────────────────── */
  $("recFilterToggle").addEventListener("click", function () {
    var open = $("recFilterToggle").getAttribute("aria-expanded") === "true";
    $("recFilterToggle").setAttribute("aria-expanded", open ? "false" : "true");
    $("recFilterBody").classList.toggle("hidden", open);
  });
  $("recWhoSearch").addEventListener("input", function () {
    recWhoQuery = $("recWhoSearch").value || ""; renderRecWho();
  });
  $("recWhoClear").addEventListener("click", function () { recWho = {}; renderRecords(); });
  $("recWhatSearch").addEventListener("input", function () {
    recWhatQuery = $("recWhatSearch").value || ""; renderRecWhat();
  });
  $("recWhatClear").addEventListener("click", function () { recWhat = {}; renderRecords(); });
  $("recFrom").addEventListener("change", renderRecords);
  $("recTo").addEventListener("change", renderRecords);
  $("recReset").addEventListener("click", function () {
    recKind = ""; recWho = {}; recWhat = {};
    recWhoQuery = ""; recWhatQuery = "";
    $("recWhoSearch").value = ""; $("recWhatSearch").value = "";
    $("recFrom").value = ""; $("recTo").value = "";
    renderRecords();
  });

  /* TWO PAIRS OF EXPORT BUTTONS, each sitting with what it exports.
     One pair, in the page header, exported whatever the filters happened to
     say — and a button beside the page title reads as the page's, so with a
     report built it was impossible to tell which set of records would come
     out. The header pair is now the whole history, always, and the custom
     report carries its own pair in its own panel.

     The file still says in its NAME which it is, because six of these in a
     downloads folder are otherwise indistinguishable. */
  function exportRecordsCsv(rows, name) {
    if (!rows.length) { showMessage("rosterMsg", "Nothing to export.", "err"); return; }
    downloadCsv("records-" + name, recordsCsv(rows));
  }

  function exportRecordsPdf(rows, custom) {
    if (!rows.length) { showMessage("rosterMsg", "Nothing to export.", "err"); return; }
    buildRecordsPrint(rows, custom);
    /* WAIT FOR THE MASTHEAD MARK before opening the dialog — print() captures
       the page as it stands, so on a cold load the report goes to paper with an
       empty box where the brand should be. The roster export learned this; the
       same wait is used here rather than a second, subtly different one. */
    var logo = $("printReport").querySelector(".prep-logo");
    var ready = (logo && !logo.complete)
      ? new Promise(function (done) {
          var go = function () { done(); };
          logo.addEventListener("load", go, { once: true });
          logo.addEventListener("error", go, { once: true });
          setTimeout(go, 1500);
        })
      : Promise.resolve();
    ready.then(function () { setTimeout(function () { window.print(); }, 60); });
  }

  $("recExportCsv").addEventListener("click", function () {
    exportRecordsCsv(allRecords(), "complete");
  });
  $("recExportCustomCsv").addEventListener("click", function () {
    exportRecordsCsv(shownRecords(), recFilterIsOn() ? "custom" : "complete");
  });
  $("recExportCustomPdf").addEventListener("click", function () {
    exportRecordsPdf(shownRecords(), true);
  });

  $("recExportPdf").addEventListener("click", function () {
    exportRecordsPdf(allRecords());
  });

  /* ── Certificates export ───────────────────────────────────────────────────
     A register of certificates is the document an auditor asks for by name,
     and until now the only way to produce one was to copy the table out by
     hand. It exports WHAT IS ON SCREEN — the search and the sort included —
     and the file says in its name whether it is the whole register or a cut
     of it, the same rule the records and roster exports follow. */
  function certificatesCsv(rows) {
    var head = ["Holder", "Email", "Course", "Certificate number", "Issued", "Score", "In series"];
    var lines = [head.map(csvCell).join(",")];
    rows.forEach(function (r) {
      lines.push([
        fullName(r.m), r.m.email, labelFor(r.c.courseKey), r.c.number || "",
        csvDate(r.c.issuedAt),
        r.c.examScore != null ? r.c.examScore + "%" : "",
        r.of > 1 ? r.seq + " of " + r.of : ""
      ].map(csvCell).join(","));
    });
    return lines.join("\r\n");
  }

  function buildCertificatesPrint(rows, filtered) {
    var host = $("printReport"); host.textContent = "";
    var root = el("div", "prep");

    var holders = {}, courses = {};
    rows.forEach(function (r) { holders[r.m.userId] = true; courses[r.c.courseKey] = true; });

    root.appendChild(printMasthead(
      filtered ? "Certificates \u2014 filtered" : "Certificates",
      rows.length + " certificate" + (rows.length === 1 ? "" : "s") +
        (filtered ? "  \u00b7  matching \u201c" + certFilter.trim() + "\u201d" : "  \u00b7  Complete register")));
    root.appendChild(el("div", "prep-rule"));

    var summary = el("div", "prep-summary");
    [["Certificates", rows.length, "good"],
     ["Holders", Object.keys(holders).length, ""],
     ["Courses", Object.keys(courses).length, ""]
    ].forEach(function (row) {
      var box = el("div", "ps" + (row[2] ? " " + row[2] : ""));
      box.appendChild(el("b", null, String(row[1])));
      box.appendChild(el("span", null, row[0]));
      summary.appendChild(box);
    });
    root.appendChild(summary);

    var table = document.createElement("table");
    table.className = "prep-rows";
    var thead = document.createElement("thead"); var hr = document.createElement("tr");
    ["Issued", "Holder", "Course", "Number", "Score"].forEach(function (h) {
      var th = document.createElement("th"); th.textContent = h; hr.appendChild(th);
    });
    thead.appendChild(hr); table.appendChild(thead);

    var tbody = document.createElement("tbody");
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      [fmtDate(r.c.issuedAt),
       fullName(r.m),
       labelFor(r.c.courseKey) + (r.of > 1 ? "  (#" + r.seq + " of " + r.of + ")" : ""),
       r.c.number || "",
       r.c.examScore != null ? r.c.examScore + "%" : ""
      ].forEach(function (v) {
        var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);

    /* The verification line belongs on the paper, not only on the screen: a
       printed certificate register is worth little if the reader cannot check
       a single row of it against us. */
    root.appendChild(el("p", "prep-disclaim",
      "Each certificate above can be checked at caw-academy.com/verify using its number and the holder's name. " +
      REPORT_DISCLAIMER));

    var foot = el("div", "prep-foot");
    foot.appendChild(el("span", null, "Certificates  \u00b7  " +
      ($("orgName").textContent || "").trim() + "  \u00b7  " + longStamp(new Date())));
    foot.appendChild(el("span", "site", "caw-academy.com"));
    root.appendChild(foot);

    host.appendChild(root);
  }

  $("certExportCsv").addEventListener("click", function () {
    var rows = shownCertificates();
    if (!rows.length) { showMessage("rosterMsg", "Nothing to export.", "err"); return; }
    downloadCsv("certificates-" + (certFilter.trim() ? "custom" : "complete"), certificatesCsv(rows));
  });

  $("certExportPdf").addEventListener("click", function () {
    var rows = shownCertificates();
    if (!rows.length) { showMessage("rosterMsg", "Nothing to export.", "err"); return; }
    buildCertificatesPrint(rows, !!certFilter.trim());
    // Same masthead wait as every other printed sheet (see exportRecordsPdf).
    var logo = $("printReport").querySelector(".prep-logo");
    var ready = (logo && !logo.complete)
      ? new Promise(function (done) {
          var go = function () { done(); };
          logo.addEventListener("load", go, { once: true });
          logo.addEventListener("error", go, { once: true });
          setTimeout(go, 1500);
        })
      : Promise.resolve();
    ready.then(function () { setTimeout(function () { window.print(); }, 60); });
  });

  /* OPENING THE FORM STANDS THE LIBRARY DOWN. Both cards wanted the same
     column: the form kept a 58% ceiling meant to stop an upper card starving a
     lower one, which left two pickers and a pinned footer sharing 400px and
     the footer sitting on top of the lists.

     The ceiling was the right rule for two things being READ together. These
     two are not — opening this form is a deliberate act, and while it is open
     the table below is the thing it is a shortcut around, since the form picks
     documents itself. So the form takes the section and the table steps aside
     until it is closed. */
  function setFamFormOpen(open) {
    var sect = document.querySelector('.sect[data-sect="documents"]');
    $("famToggle").setAttribute("aria-expanded", open ? "true" : "false");
    $("famBody").classList.toggle("hidden", !open);
    if (sect) sect.classList.toggle("form-open", open);
  }

  $("famToggle").addEventListener("click", function () {
    setFamFormOpen($("famToggle").getAttribute("aria-expanded") !== "true");
  });

  $("famMemSearch").addEventListener("input", function () {
    famMemQuery = $("famMemSearch").value || ""; renderFamMembers();
  });
  $("famMemClear").addEventListener("click", function () {
    famPickedUsers = {}; renderFamMembers();
  });
  $("famMemAll").addEventListener("change", function () {
    var on = $("famMemAll").checked;
    $("famMemList").querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.checked = on; cb.dispatchEvent(new Event("change"));
    });
  });
  $("famDocSearch").addEventListener("input", function () {
    famDocQuery = $("famDocSearch").value || ""; renderFamDocs();
  });
  $("famDocClear").addEventListener("click", function () {
    famPickedDocs = {}; renderFamDocs();
  });
  $("famDeadline").addEventListener("change", updateFamSummary);

  $("famForm").addEventListener("submit", function (e) {
    e.preventDefault();
    showMessage("famMsg", "", "ok");
    var when = $("famDeadline").value;
    var users = Object.keys(famPickedUsers);
    var docs = Object.keys(famPickedDocs).map(function (k) {
      return lastDocs.filter(function (d) { return d.pkgId === k; })[0];
    }).filter(Boolean);
    if (!when || !users.length || !docs.length) return;

    var btn = $("famAssignBtn");
    btn.disabled = true; btn.textContent = "Requiring\u2026";

    /* ONE CALL PER DOCUMENT, each with its own revision and only the people who
       can actually open it. The server takes a list of users per document, so
       this is documents-many rather than pairs-many requests. */
    var jobs = docs.map(function (d) {
      var can = users.filter(function (u) { return famCanRead(u, d); });
      return { doc: d, users: can };
    }).filter(function (j) { return j.users.length; });

    var done = 0, failed = 0;
    function next() {
      if (!jobs.length) {
        btn.disabled = false;
        updateFamSummary();
        if (failed) {
          showMessage("famMsg", done + " recorded, " + failed + " could not be saved.", "warn");
        } else {
          showMessage("famMsg",
            done + " reading" + (done === 1 ? "" : "s") + " required. They appear on each document in Documents.", "ok");
          famPickedUsers = {}; famPickedDocs = {};
          renderFamMembers(); renderFamDocs();
        }
        return loadFamiliarisation();
      }
      var j = jobs.shift();
      authed("POST", "/v1/org/documents/" + encodeURIComponent(j.doc.pkgId) + "/familiarisation",
             { revision: j.doc.rev || "", userIds: j.users, deadline: when })
        .then(function (res) { done += (res && res.assigned) || 0; })
        .catch(function () { failed += j.users.length; })
        .then(next);
    }
    next();
  });

  $("docsReload").addEventListener("click", function () { loadDocs(); });
  $("certSearch").addEventListener("input", function () {
    certFilter = $("certSearch").value || "";
    renderCertificates(lastRoster);
  });

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
      .then(function (b) {
        /* TWO SHAPES. A sign-up whose mailbox has to be proved first returns no token at
           all (202 `{status:"confirm_required"}`), so the test is whether a token came
           back, not what the status said — that also keeps working against a server
           predating the feature, which sends no `status` field. Without this the portal
           set accessToken to null and called enter(), which asked for the org context
           unauthenticated and dropped the person back on the sign-in form. */
        if (!b.accessToken) {
          beginConfirmation(b.email || $("email").value.trim());
          return;
        }
        accessToken = b.accessToken;
        $("password").value = "";
        return enter();
      })
      .catch(function (err) {
        /* The server refuses a sign-in on an unconfirmed account with its own code, and
           has already sent a fresh one. That is a STEP, not a failure. */
        if (err && err.code === "email_unconfirmed") {
          beginConfirmation($("email").value.trim());
          showMessage("confirmMsg", "We've sent a new code to " + $("email").value.trim() + ".", "ok");
          btn.disabled = false;
          return;
        }
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

  // ── Confirm your email ─────────────────────────────────────────────────────
  /* A sign-up returns no session until the six digits from the email are entered, so this
     is a step in the middle of creating an account rather than a page of its own. The
     address being confirmed is held in one variable: it is also the only thing the confirm
     and resend calls need, and re-reading the email FIELD would break the moment somebody
     edited it while the code was in flight. */
  var confirmEmailAddr = "";

  function beginConfirmation(address) {
    confirmEmailAddr = address;
    $("confirmAddr").textContent = address;
    $("confirmCode").value = "";
    $("password").value = "";
    showMessage("authMsg", "", "err");
    showMessage("confirmMsg", "", "err");
    show("confirmView");
    $("confirmCode").focus();
  }

  // Keep the digits and stop at six: people paste "123 456" out of a mail client, and the
  // separator is a measure of how carefully they copied, not of whether the account is
  // theirs. The server normalises too, so this is for the eye, not for correctness.
  $("confirmCode").addEventListener("input", function () {
    var digits = this.value.replace(/\D/g, "").slice(0, 6);
    if (digits !== this.value) this.value = digits;
  });

  $("confirmForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var code = $("confirmCode").value.trim();
    if (code.length < 6) {
      showMessage("confirmMsg", "Enter the six-digit code from the email.", "err");
      return;
    }
    var btn = $("confirmSubmit");
    btn.disabled = true;
    showMessage("confirmMsg", "", "err");
    // Confirming IS the sign-in - having just proved they hold the mailbox, nobody is
    // asked for the password they chose a minute ago. The device object uses the request
    // spelling {id, name}: the devices LIST returns {deviceId, deviceName}, and sending
    // that shape back parses as {} and silently leaves an "Unknown device" row.
    request("POST", "/v1/auth/confirm-email", {
      email: confirmEmailAddr,
      code: code,
      device: { id: deviceId(), name: "Team admin portal" },
    }, false)
      .then(function (b) {
        accessToken = b.accessToken || null;
        $("confirmCode").value = "";
        return enter();
      })
      .catch(function (err) {
        // The code stays in the field: a wrong digit is the likely cause, and clearing it
        // would make them re-enter all six to fix one.
        showMessage("confirmMsg", err.message || "That code didn't work.", "err");
      })
      .finally(function () { btn.disabled = false; });
  });

  $("resendLink").addEventListener("click", function (e) {
    e.preventDefault();
    showMessage("confirmMsg", "", "err");
    request("POST", "/v1/auth/resend-confirmation", { email: confirmEmailAddr }, false)
      .then(function () {
        $("confirmCode").value = "";
        // Deliberately non-committal: the server does not say whether the address has an
        // account waiting, because saying so would let anyone test which of a company's
        // staff have signed up.
        showMessage("confirmMsg", "If that account still needs confirming, a new code is on its way.", "ok");
      })
      .catch(function (err) {
        showMessage("confirmMsg", err.message || "Couldn't send a new code.", "err");
      });
  });

  /* The way out. Without it one mistyped character in the address is a dead end: no code
     can ever arrive, and the account holding that address is unconfirmed - which is
     exactly the account the server lets a fresh sign-up take over. */
  $("confirmBackLink").addEventListener("click", function (e) {
    e.preventDefault();
    confirmEmailAddr = "";
    $("confirmCode").value = "";
    show("signinView");
    $("email").focus();
  });

  // ── Forgot password ────────────────────────────────────────────────────────
  /* LIVE since Oct 2026, when the mailbox was configured. The portal is a browser, so it
     needs no code screen of its own: the reset email carries both a code and a link, and
     the link lands on caw-academy.com/reset.html, which is exactly where somebody sitting
     at this page should finish. The apps type the code instead, because a link opened from
     a phone's mail app lands in a browser rather than in the app that is waiting.
     The aria-disabled guard below is kept so the link can be made inert again by markup
     alone if the mailbox ever goes away. */
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
      .then(function () { showMessage("authMsg", "If that email has an account, a reset link is on its way. Open it on this device to set a new password.", "ok"); })
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
      lastDomains = ctx.domains || [];
      $("orgDomains").textContent = lastDomains.join(", ");
      /* Who is signed in, at the foot of the rail. The context endpoint now
         returns it: the portal had no way to say whose session this is, which
         matters on a shared machine and when an admin manages two orgs. An
         older server that doesn't send `you` simply leaves the role line. */
      var you = ctx.you || {};
      var label = ((you.firstName || "") + " " + (you.lastName || "")).trim() || you.email || "";
      $("who").textContent = "";
      if (label) {
        var b = document.createElement("b"); b.textContent = label;
        $("who").appendChild(b);
      }
      $("who").appendChild(document.createTextNode("Administrator"));
      $("whoAv").textContent =
        ((you.firstName || "").charAt(0) + (you.lastName || "").charAt(0)).toUpperCase() ||
        (you.email || "A").charAt(0).toUpperCase();
      orgScope = Array.isArray(ctx.scope) ? ctx.scope : null;
      renderLicenceNote();
      renderCourseChecklist();
      initSeePlan();
      // Default the first deadline to one month out (matches the monthly cadence).
      $("deadline").value = addMonths(new Date(), 1).toISOString().slice(0, 10);
      $("deadline").min = new Date().toISOString().slice(0, 10);
      updateScheduleHint();
      show("dashView");
      showSection(location.hash.slice(1) || "overview", true);
      loadLicence();
      // Documents after the roster: the per-member tick list is drawn from it.
      // Familiarisation after the documents: the panel is drawn per document,
      // so there is nothing to put the records into until the list exists.
      return loadRoster().then(loadDocs).then(loadFamiliarisation).then(function () {
        // The Assign·Documents pickers read the roster and the document list,
        // so they are drawn once both have arrived.
        renderFamMembers();
        renderFamDocs();
        $("famDeadline").value = addMonths(new Date(), 1).toISOString().slice(0, 10);
        $("famDeadline").min = new Date().toISOString().slice(0, 10);
        updateFamSummary();
      });
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
