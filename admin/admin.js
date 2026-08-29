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
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString() : "—"; }
  function fmtDateTime(iso) { return iso ? new Date(iso).toLocaleString() : "—"; }

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

  // ── Multi-select checklists (members + courses) ───────────────────────────
  // Selection state kept in Sets so members/courses can be toggled independently.
  var selectedUserIds = {};   // userId -> true
  var selectedCourses = {};   // courseKey -> true
  var CATALOGUE_INDEX = {};   // courseKey -> catalogue position (for default sequencing)
  COURSES.forEach(function (c, i) { CATALOGUE_INDEX[c[0]] = i; });
  var FRAMEWORKS = ["EASA", "UK CAA", "UAE GCAA", "FAA"];
  // Collapsed-by-framework state so the admin can filter courses by framework. Default
  // all collapsed (compact 4-row list); the admin expands the framework(s) they want.
  var collapsedGroups = {}; FRAMEWORKS.forEach(function (g) { collapsedGroups[g] = true; });

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
    FRAMEWORKS.forEach(function (grp) {
      var inGroup = COURSES.filter(function (c) { return c[2] === grp; });
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
    if (typeof a.sequence === "number") bits.push("seq " + a.sequence);
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
    var card = document.createElement("div"); card.className = "member";

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

  function renderRoster(members) {
    var root = $("roster"); root.textContent = "";
    if (!members.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "No members found for your organisation yet. Members appear here once they create an account with a work email on your organisation's domain.";
      root.appendChild(e);
      renderMemberChecklist(members);
      return;
    }
    members.forEach(function (m) { root.appendChild(renderMember(m)); });
    renderMemberChecklist(members);
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

  $("assignForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var userIds = Object.keys(selectedUserIds);
    var plan = courseDeadlines();
    var startSeq = Number($("sequence").value || 0);
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

    // Each member gets the same plan: sequence follows catalogue order; deadlines are
    // staggered per courseDeadlines().
    var jobs = [];
    userIds.forEach(function (uid) {
      plan.forEach(function (p) {
        jobs.push({ userId: uid, courseKey: p.courseKey, sequence: startSeq + p.index, deadline: p.date.toISOString() });
      });
    });
    var courseCount = plan.length;

    var btn = $("assignBtn"); btn.disabled = true;
    showMessage("assignMsg", "Assigning " + jobs.length + " …", "ok");

    Promise.allSettled(jobs.map(function (j) {
      return authed("POST", "/v1/org/assignments", {
        courseKey: j.courseKey, deadline: j.deadline, sequence: j.sequence, userId: j.userId
      });
    })).then(function (results) {
      var ok = 0, fail = 0, firstErr = "";
      results.forEach(function (r) {
        if (r.status === "fulfilled") ok++;
        else { fail++; if (!firstErr) firstErr = (r.reason && r.reason.message) || "Some assignments failed."; }
      });
      var msg = "Assigned " + courseCount + " course" + (courseCount === 1 ? "" : "s") +
                " to " + userIds.length + " member" + (userIds.length === 1 ? "" : "s") +
                " (" + ok + " assignment" + (ok === 1 ? "" : "s") + ").";
      if (fail) { showMessage("assignMsg", msg + " " + fail + " failed: " + firstErr, "err"); }
      else { showMessage("assignMsg", msg, "ok"); }
      return loadRoster();
    }).finally(function () { btn.disabled = false; });
  });

  $("reloadBtn").addEventListener("click", function () { loadRoster(); });
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
      renderCourseChecklist();
      // Default the first deadline to one month out (matches the monthly cadence).
      $("deadline").value = addMonths(new Date(), 1).toISOString().slice(0, 10);
      $("deadline").min = new Date().toISOString().slice(0, 10);
      updateScheduleHint();
      show("dashView");
      loadDevices();
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
