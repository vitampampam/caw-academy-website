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
  var API_BASE = "https://api.caw-academy.com"; // licensing/account service base URL
  // ──────────────────────────────────────────────────────────────────────────

  var accessToken = null; // in-memory only; never persisted.
  var $ = function (id) { return document.getElementById(id); };

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
    ["ewis35","EWIS Groups 3-5","EASA"],
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
    box.className = "msg " + kind; box.textContent = text;
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
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString() : "—"; }

  // ── Course + member selects ───────────────────────────────────────────────
  function populateCourseSelect() {
    var sel = $("course"); sel.textContent = "";
    var groups = {};
    COURSES.forEach(function (c) {
      if (!groups[c[2]]) {
        var og = document.createElement("optgroup"); og.label = c[2];
        groups[c[2]] = og; sel.appendChild(og);
      }
      var o = document.createElement("option"); o.value = c[0]; o.textContent = c[1];
      groups[c[2]].appendChild(o);
    });
  }
  function populateMemberSelect(members) {
    var sel = $("who2"); sel.textContent = "";
    var all = document.createElement("option");
    all.value = "*"; all.textContent = "Whole organisation (" + members.length + ")";
    sel.appendChild(all);
    members.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.userId; o.textContent = fullName(m) + " · " + m.email;
      sel.appendChild(o);
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

  function assignmentItem(a, isNextUp) {
    var li = document.createElement("li"); li.className = "aitem";

    var course = document.createElement("div"); course.className = "course";
    course.appendChild(document.createTextNode(labelFor(a.courseKey)));
    if (isNextUp) {
      var nx = document.createElement("span"); nx.className = "nextup"; nx.textContent = " Next up";
      course.appendChild(nx);
    }
    var small = document.createElement("small");
    var bits = [];
    if (typeof a.sequence === "number") bits.push("seq " + a.sequence);
    if (a.status === "completed") bits.push("completed " + fmtDate(a.completedAt) + (a.score != null ? " · " + a.score + "%" : ""));
    else bits.push("due " + fmtDate(a.deadline) + " · " + a.daysRemaining + "d");
    small.textContent = bits.join("  ·  ");
    course.appendChild(small);
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

  function renderMember(m) {
    var card = document.createElement("div"); card.className = "member";

    var head = document.createElement("div"); head.className = "member-head";
    var left = document.createElement("div");
    var name = document.createElement("span"); name.className = "member-name"; name.textContent = fullName(m);
    var email = document.createElement("span"); email.className = "member-email"; email.textContent = "  " + m.email;
    left.appendChild(name); left.appendChild(email);
    head.appendChild(left);
    if (m.orgRole === "admin") {
      var role = document.createElement("span"); role.className = "role-pill"; role.textContent = "Admin";
      head.appendChild(role);
    }
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
      var ul = document.createElement("ul"); ul.className = "alist";
      m.assignments.forEach(function (a) { ul.appendChild(assignmentItem(a, a.id === nextUpId)); });
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

  function renderRoster(members) {
    var root = $("roster"); root.textContent = "";
    if (!members.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "No members found for your organisation yet. Members appear here once they create an account with a work email on your organisation's domain.";
      root.appendChild(e);
      populateMemberSelect(members);
      return;
    }
    members.forEach(function (m) { root.appendChild(renderMember(m)); });
    populateMemberSelect(members);
  }

  function loadRoster() {
    return authed("GET", "/v1/org/members", null).then(function (res) {
      renderRoster(res.members || []);
    });
  }

  // ── Assign form ───────────────────────────────────────────────────────────
  $("assignForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var who = $("who2").value;
    var courseKey = $("course").value;
    var dateVal = $("deadline").value;
    var sequence = Number($("sequence").value || 0);
    if (!dateVal) { showMessage("assignMsg", "Pick a deadline.", "err"); return; }
    var body = {
      courseKey: courseKey,
      deadline: new Date(dateVal + "T23:59:59").toISOString(),
      sequence: sequence
    };
    if (who === "*") body.allMembers = true; else body.userId = who;

    var btn = $("assignBtn"); btn.disabled = true;
    showMessage("assignMsg", "", "err");
    authed("POST", "/v1/org/assignments", body)
      .then(function (res) {
        var n = (res.assignments || []).length;
        showMessage("assignMsg", "Assigned " + labelFor(courseKey) + " to " + n + (n === 1 ? " member." : " members."), "ok");
        return loadRoster();
      })
      .catch(function (err) { showMessage("assignMsg", err.message, "err"); })
      .finally(function () { btn.disabled = false; });
  });

  $("reloadBtn").addEventListener("click", function () { loadRoster(); });

  // ── Auth ──────────────────────────────────────────────────────────────────
  $("authForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("email").value.trim();
    var password = $("password").value;
    var btn = $("authSubmit"); btn.disabled = true;
    showMessage("authMsg", "", "err");
    request("POST", "/v1/auth/login", { email: email, password: password }, false)
      .then(function (b) { accessToken = b.accessToken || null; $("password").value = ""; return enter(); })
      .catch(function (err) { showMessage("authMsg", err.message, "err"); })
      .finally(function () { btn.disabled = false; });
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
      populateCourseSelect();
      // default the deadline to two weeks out for convenience
      var d = new Date(Date.now() + 14 * 86400000);
      $("deadline").value = d.toISOString().slice(0, 10);
      $("deadline").min = new Date().toISOString().slice(0, 10);
      show("dashView");
      return loadRoster();
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
