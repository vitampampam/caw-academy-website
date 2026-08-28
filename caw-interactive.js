/* ===========================================================================
   CAW Academy — interactive sections (A–F).
   ---------------------------------------------------------------------------
   Loads AFTER caw-content.js and caw-demo-content.js.
   Vanilla ES5, no dependencies, no build step — the house style of the
   existing scripts in index.html.

   Trigger contract — every trigger is an element the page ALREADY has:
     A  .chips button                  data-caw-open="group"
     B  #organisations .card           data-caw-open="benefit"
     C  #why .prop                     data-caw-open="clarity"
     D  #curriculum .track             data-caw-open="track"
     E  .fw-pill                       data-caw-open="framework"
     F  #features .card                data-caw-open="demo"
   Nothing else is added to the page. The eight demo screens are reached from
   a switcher INSIDE the demo pop-up.

   Analytics: CAW.track() fires a `caw:track` CustomEvent; no vendor, no
   cookies, nothing sent anywhere by this file.
   =========================================================================== */
(function (w, d) {
  'use strict';

  var C = w.CAW_CONTENT;
  var D = w.CAW_DEMO;                 /* real course content, auto-generated */
  if (!C) { return; }
  var S = C.sample;

  /* =======================================================================
     0. Helpers
     ======================================================================= */
  var CURRENT_DEMO = null;      /* the demo the pop-up is showing right now */
  var CURRENT_PAGE = null;      /* or, if the visitor has navigated, the app page */
  var NAV_STACK = [];           /* where "Done" and "Back" return to */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function el(tag, cls, html) {
    var n = d.createElement(tag);
    if (cls) { n.className = cls; }
    if (html != null) { n.innerHTML = html; }
    return n;
  }
  function qs(sel, root) { return (root || d).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }
  function reducedMotion() {
    return w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var ICON = {
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.5-6.8a1 1 0 0 0 0-1.7L9.6 4.3A1 1 0 0 0 8 5.2z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 8.5a5 5 0 0 1 0 7"/></svg>',
    marker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M4 10h16M4 15h10"/></svg>',
    /* the glossary: a book carrying the letter A, as the app draws it */
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.4"/><path d="M9.4 16.5 12 8l2.6 8.5"/><path d="M10.3 13.6h3.4"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4" width="14" height="14" rx="2"/><path d="M3 8v10a2 2 0 0 0 2 2h10"/></svg>',
    checkC: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 3 10v11h6v-6h6v6h6V10z"/></svg>',
    saved: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="11" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="17" y="9" width="4" height="11" rx="1"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm8.5 3.4c0-.5 0-1-.1-1.4l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2.4-1.4L15.3 2h-4l-.4 2.3c-.9.3-1.7.8-2.4 1.4l-2.3-1-2 3.4 2 1.5a8 8 0 0 0 0 2.8l-2 1.5 2 3.4 2.3-1c.7.6 1.5 1.1 2.4 1.4l.4 2.3h4l.4-2.3c.9-.3 1.7-.8 2.4-1.4l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.4z"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>',
    wifi: '<svg viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.4C5.5 2.4 3.3 3.3 1.7 5l1.1 1.1C4.1 4.8 5.9 4 8 4s3.9.8 5.2 2.1L14.3 5C12.7 3.3 10.5 2.4 8 2.4zM8 6c-1.3 0-2.6.5-3.5 1.5l1.1 1.1C6.4 7.9 7.1 7.5 8 7.5s1.6.4 2.4 1.1l1.1-1.1C10.6 6.5 9.3 6 8 6zm0 3.3l1.5 1.5L8 12l-1.5-1.2z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2v.1"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M11 10.5h2v7h-2zM12 6.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z" fill="#fff"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 7v2h20V7zM4 11v7H2v2h20v-2h-2v-7h-2v7h-3v-7h-2v7h-3v-7z"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    again: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    tap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V6a2 2 0 1 1 4 0v6"/><path d="M13 10a2 2 0 1 1 4 0v2a7 7 0 0 1-7 7h-1l-4.2-5.1a2 2 0 0 1 3-2.6L9 13"/></svg>',
    doneTick: '<svg class="done" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M10.3 15.7 7 12.4l1.4-1.4 1.9 1.9 4.6-4.6L16.3 9.7z" fill="#fff"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6l-3.5.9.9-3.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="M8 7l4-4 4 4"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
    caret: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M4 17l3 3 3-3"/><path d="M17 20V4M14 7l3-3 3 3"/></svg>',
    bin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5"/><path d="M10 10v6.5M14 10v6.5"/></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 22l5-2.6L17 22l-1.5-8.5"/></svg>',
    due: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v3M16 2.5v3M12 12.5v3.5M12 18.5v.01"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7.5 7.5"/><path d="M3 21l7.5-7.5"/></svg>',
    gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/><path d="M12 7v1"/></svg>',
    skipBack: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M20 5.9v12.2c0 .8-.9 1.3-1.6.9l-9.4-6.1a1 1 0 0 1 0-1.7l9.4-6.1c.7-.5 1.6 0 1.6.8z"/></svg>',
    rewind: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 6.5v11c0 .8-.9 1.3-1.6.9L1.7 13a1 1 0 0 1 0-1.7l7.7-5.4c.7-.5 1.6 0 1.6.6z"/><path d="M22 6.5v11c0 .8-.9 1.3-1.6.9L12.7 13a1 1 0 0 1 0-1.7l7.7-5.4c.7-.5 1.6 0 1.6.6z"/></svg>',
    forward: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 6.5v11c0 .8.9 1.3 1.6.9L11.3 13a1 1 0 0 0 0-1.7L3.6 5.9C2.9 5.4 2 5.9 2 6.5z"/><path d="M13 6.5v11c0 .8.9 1.3 1.6.9l7.7-5.4a1 1 0 0 0 0-1.7l-7.7-5.4c-.7-.5-1.6 0-1.6.6z"/></svg>',
    skipFwd: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5.9v12.2c0 .8.9 1.3 1.6.9l9.4-6.1a1 1 0 0 0 0-1.7L5.6 5.1c-.7-.5-1.6 0-1.6.8z"/><rect x="16.4" y="5" width="2.6" height="14" rx="1"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    speakerOn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7 1 1 0 0 1-1.4-1.4 3 3 0 0 0 0-4.2 1 1 0 0 1 1.4-1.4z"/><path d="M19 6a9 9 0 0 1 0 12 1 1 0 0 1-1.4-1.4 7 7 0 0 0 0-9.2A1 1 0 0 1 19 6z"/></svg>',
    lesson: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5h6a2.5 2.5 0 0 1 2.5 2.5v11a2 2 0 0 0-2-2H3z"/><path d="M21 5.5h-6a2.5 2.5 0 0 0-2.5 2.5v11a2 2 0 0 1 2-2H21z"/></svg>',
    bookmarkO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12.2 19"/></svg>',

    /* --- the pointing hand -------------------------------------------------
       One silhouette with the folded fingers drawn as creases — the shape that
       was preferred. No fingernail and no white highlight: at this size any
       white shape inside the finger reads as a stray white line. */
    hand:
      '<svg viewBox="0 0 96 96" aria-hidden="true">' +
      '<defs><linearGradient id="cawxSk" x1="0.2" y1="0" x2="0.9" y2="1">' +
        '<stop offset="0" stop-color="#FBDCC0"/><stop offset="0.45" stop-color="#F0BE99"/>' +
        '<stop offset="1" stop-color="#D89B70"/></linearGradient>' +
      '<radialGradient id="cawxShade" cx="0.72" cy="0.78" r="0.62">' +
        '<stop offset="0" stop-color="#B9784C" stop-opacity=".3"/>' +
        '<stop offset="1" stop-color="#B9784C" stop-opacity="0"/></radialGradient></defs>' +
      '<ellipse cx="46" cy="90" rx="24" ry="4.5" fill="#0B1238" opacity=".16"/>' +
      '<path d="M30 9c-4.4 0-8 3.6-8 8v30.5l-6.2 3.1c-4.6 2.3-6.4 8-4 12.5l6.6 12.3C21.6 82.4 28.4 86 35.7 86H51c10.5 0 19-8.5 19-19V44.2c0-3.1-2.5-5.6-5.6-5.6-1.7 0-3.2.7-4.2 1.9-.6-2.6-2.9-4.5-5.7-4.5-1.8 0-3.4.8-4.5 2-.7-2.4-2.9-4.2-5.6-4.2-1.2 0-2.3.3-3.2.9V17c0-4.4-3.6-8-8-8z" ' +
        'fill="url(#cawxSk)" stroke="#C98B5E" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M30 9c-4.4 0-8 3.6-8 8v30.5l-6.2 3.1c-4.6 2.3-6.4 8-4 12.5l6.6 12.3C21.6 82.4 28.4 86 35.7 86H51c10.5 0 19-8.5 19-19V44.2c0-3.1-2.5-5.6-5.6-5.6-1.7 0-3.2.7-4.2 1.9-.6-2.6-2.9-4.5-5.7-4.5-1.8 0-3.4.8-4.5 2-.7-2.4-2.9-4.2-5.6-4.2-1.2 0-2.3.3-3.2.9V17c0-4.4-3.6-8-8-8z" ' +
        'fill="url(#cawxShade)"/>' +
      '<path d="M45.6 40.5v9.4M54.9 39.9v9.9M64.2 42.4v8.4" fill="none" stroke="#C98B5E" ' +
        'stroke-width="1.5" stroke-linecap="round" opacity=".5"/>' +
      '<path d="M22.4 50.4c3.6 2.6 6.2 6.4 7.2 10.8" fill="none" stroke="#C98B5E" ' +
        'stroke-width="1.5" stroke-linecap="round" opacity=".4"/>' +
      '</svg>'
  };

  /* =======================================================================
     1. Analytics hook — no-op by default
     ======================================================================= */
  var CAW = w.CAW = w.CAW || {};
  CAW.track = CAW.track || function (name, props) {
    try {
      d.dispatchEvent(new CustomEvent('caw:track', { detail: { name: name, props: props || {} } }));
    } catch (e) { /* older browsers: ignore */ }
  };

  /* =======================================================================
     2. The modal shell
     ======================================================================= */
  var Modal = (function () {
    var root = null, dialog = null, body = null, foot = null,
        titleEl = null, subEl = null, eyebrowEl = null,
        lastTrigger = null, open = false, cleanup = null;

    var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),' +
                    'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

    function build() {
      root = el('div', 'cawx-modal');
      root.id = 'cawxModal';
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML =
        '<div class="cawx-backdrop" data-cawx-close></div>' +
        '<div class="cawx-dialog" role="dialog" aria-modal="true" aria-labelledby="cawxTitle" aria-describedby="cawxSub">' +
          '<div class="cawx-head">' +
            '<span class="eyebrow" data-cawx-eyebrow hidden></span>' +
            '<h2 class="cawx-title" id="cawxTitle" tabindex="-1"></h2>' +
            '<p class="cawx-sub" id="cawxSub"></p>' +
            '<button class="cawx-expand" type="button" aria-pressed="false" hidden ' +
              'aria-label="Enlarge this screen" data-cawx-expand>' + ICON.expand + '</button>' +
            '<button class="cawx-close" type="button" aria-label="Close" data-cawx-close>&times;</button>' +
          '</div>' +
          '<div class="cawx-body"></div>' +
          '<div class="cawx-foot" hidden></div>' +
        '</div>';
      d.body.appendChild(root);
      dialog = qs('.cawx-dialog', root);
      body = qs('.cawx-body', root);
      foot = qs('.cawx-foot', root);
      titleEl = qs('.cawx-title', root);
      subEl = qs('.cawx-sub', root);
      eyebrowEl = qs('[data-cawx-eyebrow]', root);

      root.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-cawx-expand]')) {
          var on = !root.classList.contains('cawx-max');
          root.classList.toggle('cawx-max', on);
          var b = qs('[data-cawx-expand]', root);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.setAttribute('aria-label', on ? 'Shrink this screen' : 'Enlarge this screen');
          CAW.track('demo_expand', { on: on });
          return;
        }
        if (e.target.hasAttribute && e.target.hasAttribute('data-cawx-close')) { close(); }
      });
      d.addEventListener('keydown', onKeydown, true);
    }

    function onKeydown(e) {
      if (!open) { return; }
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.stopPropagation();      /* do not also close the free-trial modal */
        close();
        return;
      }
      if (e.key !== 'Tab') { return; }
      var items = qsa(FOCUSABLE, dialog).filter(function (n) {
        return n.offsetParent !== null || n === titleEl;
      });
      if (!items.length) { e.preventDefault(); titleEl.focus(); return; }
      var first = items[0], last = items[items.length - 1], active = d.activeElement;
      if (e.shiftKey && (active === first || active === titleEl || !dialog.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    }

    /* `overflow:hidden` on the body is ignored by iOS Safari, which is why the
       page could still be scrolled behind an open pop-up on an iPad or iPhone.
       Pinning the body at its current offset holds it still on every engine;
       the offset is restored on close so the page does not jump. */
    var lockedAt = 0;
    /* Pinning the body holds the page, but iOS still lets a touch that is
       already in flight drag the document for a moment, which reads as the site
       coming loose behind the pop-up. Refusing the touch outright removes that
       moment; touches inside the pop-up's own scrolling area still work. */
    function blockTouch(e) {
      if (!open) { return; }
      var t = e.target;
      if (body && (body === t || body.contains(t))) { return; }
      if (e.cancelable) { e.preventDefault(); }
    }
    function lockScroll() {
      var gap = w.innerWidth - d.documentElement.clientWidth;
      lockedAt = w.pageYOffset || d.documentElement.scrollTop || 0;
      if (gap > 0) { d.body.style.paddingRight = gap + 'px'; }
      d.body.style.position = 'fixed';
      d.body.style.top = -lockedAt + 'px';
      d.body.style.left = '0';
      d.body.style.right = '0';
      d.body.style.width = '100%';
      d.body.classList.add('cawx-modal-open');
      d.addEventListener('touchmove', blockTouch, { passive: false });
    }
    function unlockScroll() {
      /* style.css sets `html{scroll-behavior:smooth}`, so restoring the offset
         ANIMATED the page from the top back down to where the visitor was. The
         restore has to be instant: an inline style on <html> outranks the
         stylesheet, and is put back immediately afterwards. */
      var root = d.documentElement, was = root.style.scrollBehavior;
      d.removeEventListener('touchmove', blockTouch, { passive: false });
      root.style.scrollBehavior = 'auto';
      d.body.classList.remove('cawx-modal-open');
      d.body.style.paddingRight = '';
      d.body.style.position = '';
      d.body.style.top = '';
      d.body.style.left = '';
      d.body.style.right = '';
      d.body.style.width = '';
      w.scrollTo(0, lockedAt);
      root.style.scrollBehavior = was;
    }

    function show(cfg, trigger) {
      if (!root) { build(); }
      if (trigger !== undefined) { lastTrigger = trigger || d.activeElement; }

      root.setAttribute('data-size', cfg.size || 'normal');
      /* the expand control belongs to the demo pop-ups only */
      var exp = qs('[data-cawx-expand]', root);
      if (exp) { exp.hidden = cfg.size !== 'wide'; }
      if (cfg.size !== 'wide') { root.classList.remove('cawx-max'); }
      if (cfg.eyebrow) { eyebrowEl.hidden = false; eyebrowEl.textContent = cfg.eyebrow; }
      else { eyebrowEl.hidden = true; eyebrowEl.textContent = ''; }
      titleEl.textContent = cfg.title || '';
      subEl.innerHTML = cfg.sub || '';
      subEl.hidden = !cfg.sub;

      paintFoot(cfg);

      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
      body.innerHTML = (cfg.html != null) ? cfg.html : skeleton();

      root.classList.add('open');
      root.setAttribute('aria-hidden', 'false');
      lockScroll();
      open = true;

      /* Every pop-up opens at its top. The reset has to happen AFTER the dialog
         is visible: an element with `display:none` has no scroll box, so
         assigning scrollTop while hidden silently does nothing and the previous
         pop-up's position is inherited. */
      body.scrollTop = 0;

      if (cfg.focusTitle !== false) {
        w.setTimeout(function () { titleEl.focus(); }, 40);
      }

      if (cfg.render) {
        w.requestAnimationFrame(function () {
          w.requestAnimationFrame(function () {
            if (!open) { return; }
            body.innerHTML = '';
            cfg.render(body);
            body.scrollTop = 0;      /* the rendered screen is taller — reset again */
          });
        });
      }
      cleanup = cfg.cleanup || null;
      CAW.track('modal_open', { id: cfg.trackId || cfg.title });
    }

    /* Every pop-up ends with the same call to action, so the footer is the same
       height in all of them and there is always somewhere to go next. */
    var DEFAULT_CTA = { label: 'Request a free trial', href: '#', trial: true };

    function paintFoot(cfg) {
      var cta = cfg.cta || DEFAULT_CTA;
      foot.hidden = false;
      foot.innerHTML =
        (cfg.footNote ? '<p class="cawx-foot-note">' + cfg.footNote + '</p>' : '<span></span>') +
        '<a class="btn btn-light cawx-trial" href="' + esc(cta.href) + '"' +
        (cta.trial ? ' data-cawx-trial' : '') + '>' + esc(cta.label) + ICON.arrow + '</a>';
    }

    /* Swap the CONTENT of an already-open pop-up, with no skeleton and no
       teardown of the shell. Moving between demo screens used to re-open the
       whole modal, which read as a blink; this repaints only what changes. */
    function swap(cfg) {
      if (!open) { return false; }
      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
      titleEl.textContent = cfg.title || '';
      subEl.innerHTML = cfg.sub || '';
      subEl.hidden = !cfg.sub;
      paintFoot(cfg);
      body.innerHTML = '';
      if (cfg.render) { cfg.render(body); }
      else if (cfg.html != null) { body.innerHTML = cfg.html; }
      body.scrollTop = 0;
      cleanup = cfg.cleanup || null;
      CAW.track('modal_swap', { id: cfg.trackId || cfg.title });
      return true;
    }

    function skeleton() {
      return '<div class="cawx-skel" aria-hidden="true">' +
        '<i class="w85"></i><i></i><i class="w70"></i><i class="tall"></i><i class="w50"></i></div>' +
        '<p class="cawx-note" role="status">Loading…</p>';
    }

    function close() {
      if (!open || !root) { return; }
      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
      root.classList.remove('open');
      root.setAttribute('aria-hidden', 'true');
      unlockScroll();
      open = false;
      body.innerHTML = '';
      body.scrollTop = 0;
      CAW.track('modal_close', {});
      if (lastTrigger && d.body.contains(lastTrigger)) { lastTrigger.focus(); }
      lastTrigger = null;
    }

    return { show: show, swap: swap, close: close, isOpen: function () { return open; } };
  })();

  /* =======================================================================
     3. Shared content renderers
     ======================================================================= */
  function find(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function fwChips(editions, note) {
    var out = '<div class="cawx-fws">', k;
    for (k in editions) {
      if (!Object.prototype.hasOwnProperty.call(editions, k)) { continue; }
      var meta = C.frameworksMeta[k] || { flag: '', label: k };
      out += '<span class="cawx-fw"><span class="cawx-fw-flag" aria-hidden="true">' + meta.flag +
             '</span><b>' + esc(meta.label) + '</b> ' + editions[k][0] + ' lessons</span>';
    }
    out += '</div>';
    if (note) { out += '<p class="cawx-course-note">' + esc(note) + '</p>'; }
    return out;
  }
  function duration(course) {
    var order = ['EASA', 'UK CAA', 'UAE GCAA', 'FAA'], i, k;
    for (i = 0; i < order.length; i++) {
      k = order[i];
      if (course.editions[k]) {
        return course.editions[k][0] + ' lessons · about ' + course.editions[k][1] +
               ' hours of reading' + (k === 'EASA' ? '' : ' (' + k + ' edition)');
      }
    }
    return '';
  }
  function courseRow(key, opts) {
    var c = C.courses[key];
    if (!c) { return ''; }
    opts = opts || {};
    var h = '<div class="cawx-course">';
    h += '<div class="cawx-course-top"><h4 class="cawx-course-name">' + esc(c.title) + '</h4>' +
         (c.free ? '<span class="cawx-course-free">Free</span>' : '') + '</div>';
    h += '<p class="cawx-course-meta">' + esc(duration(c)) + '</p>';
    h += '<p class="cawx-course-desc">' + esc(c.description) + '</p>';
    if (opts.features !== false && c.features) {
      h += '<ul class="cawx-course-feats">';
      for (var i = 0; i < c.features.length; i++) { h += '<li>' + c.features[i] + '</li>'; }
      h += '</ul>';
    }
    h += fwChips(c.editions, c.note);
    if (opts.scenario !== false && c.scenario) {
      h += '<p class="cawx-case"><b>Example in practice.</b> ' + esc(c.scenario) + '</p>';
    }
    return h + '</div>';
  }
  function bulletList(items) {
    var h = '<ul class="cawx-list">', i;
    for (i = 0; i < items.length; i++) {
      h += '<li class="cawx-li">' + ICON.check + '<span>' + items[i] + '</span></li>';
    }
    return h + '</ul>';
  }

  /* =======================================================================
     4. Section openers
     ======================================================================= */
  function openGroup(id, trigger) {
    var g = find(C.groups, id);
    if (!g) { return; }
    var h = '<p class="cawx-lead">' + esc(g.intro) + '</p>';
    h += '<h3 class="cawx-h">Courses that may interest this group</h3><div class="cawx-courses">';
    for (var i = 0; i < g.courses.length; i++) { h += courseRow(g.courses[i]); }
    h += '</div><h3 class="cawx-h">Why this matters</h3>' + bulletList(g.why);
    if (g.note) { h += '<p class="cawx-note">' + esc(g.note) + '</p>'; }
    Modal.show({
      eyebrow: 'For people', title: g.title, html: h, trackId: 'group:' + g.id,
      footNote: 'Course lists reflect the catalogue on ' + C.generated + '.',
      cta: { label: 'Request a free trial', href: '#', trial: true }
    }, trigger);
  }

  function openBenefit(id, trigger) {
    var b = find(C.benefits, id);
    if (!b) { return; }
    var st = C.benefitShared.structure, ia = C.benefitShared.inApp, i;
    var h = '<p class="cawx-lead">' + esc(b.intro) + '</p>';
    h += '<h3 class="cawx-h">How the Operating Framework course helps</h3><p class="cawx-p">' + esc(b.aof) + '</p>';
    if (b.extra) { h += '<h3 class="cawx-h">' + esc(b.extra.heading) + '</h3>' + bulletList(b.extra.items); }
    h += '<h3 class="cawx-h">' + esc(st.heading) + '</h3><p class="cawx-p">' + esc(st.lead) + '</p><ol class="cawx-steps">';
    for (i = 0; i < st.items.length; i++) { h += '<li>' + st.items[i] + '</li>'; }
    h += '</ol><p class="cawx-p">' + esc(st.close) + '</p>';
    if (b.id !== 'seats') {
      h += '<h3 class="cawx-h">' + esc(C.benefitShared.admin.heading) + '</h3>' +
           bulletList(C.benefitShared.admin.items);
    }
    h += '<h3 class="cawx-h">' + esc(ia.heading) + '</h3>' + bulletList(ia.items);
    if (b.note) { h += '<p class="cawx-note">' + esc(b.note) + '</p>'; }
    Modal.show({
      eyebrow: 'For organisations', title: b.title, html: h, trackId: 'benefit:' + b.id,
      cta: { label: 'Request a free trial', href: '#', trial: true }
    }, trigger);
  }

  function openClarity(id, trigger) {
    var c = find(C.clarity, id);
    if (!c) { return; }
    var h = '<p class="cawx-lead">' + esc(c.intro) + '</p><h3 class="cawx-h">How it appears in the app</h3>';
    for (var i = 0; i < c.examples.length; i++) {
      h += '<div class="cawx-ex"><h4>' + esc(c.examples[i].h) + '</h4><p>' + esc(c.examples[i].p) + '</p></div>';
    }
    Modal.show({ eyebrow: 'Why CAW Academy', title: c.title, html: h, trackId: 'clarity:' + c.id }, trigger);
  }

  function openTrack(id, trigger) {
    var t = find(C.tracks, id);
    if (!t) { return; }
    var h = '<p class="cawx-lead">' + esc(t.intro) + '</p>';
    h += '<h3 class="cawx-h">Duration</h3><p class="cawx-p">' + esc(t.duration) + '</p>';
    h += '<h3 class="cawx-h">Key features</h3>' + bulletList(t.features);
    h += '<h3 class="cawx-h">Courses in this track</h3><div class="cawx-courses">';
    for (var i = 0; i < t.courses.length; i++) { h += courseRow(t.courses[i], { scenario: false }); }
    h += '</div>';
    h += '<h3 class="cawx-h">How people work through it</h3><ol class="cawx-steps">';
    for (var j = 0; j < C.path.length; j++) {
      h += '<li><b>' + esc(C.path[j].step) + '</b> — ' + esc(C.path[j].short) + '</li>';
    }
    h += '</ol>';
    Modal.show({
      eyebrow: 'The curriculum', title: t.title, html: h, trackId: 'track:' + t.id,
      footNote: 'Lesson counts and reading times reflect the catalogue on ' + C.generated + '.'
    }, trigger);
  }

  function openFramework(id, trigger) {
    var f = find(C.frameworks, id);
    if (!f) { return; }
    var h = '<p class="cawx-lead">' + esc(f.what) + '</p>';
    if (f.free) {
      /* the two free anchor courses, named for THIS edition */
      h += '<div class="cawx-free"><b>Free in this edition</b><ul>';
      f.free.courses.forEach(function (c) {
        h += '<li>' + ICON.check + '<span>' + c.n + '</span><i>' + c.l + '</i></li>';
      });
      h += '</ul><em>' + f.free.note + '</em></div>';
    }
    h += '<h3 class="cawx-h">What it is based on</h3><p class="cawx-p">' + esc(f.basedOn) + '</p>';
    h += '<h3 class="cawx-h">What changes compared with the other regulatory frameworks</h3>' +
         bulletList(f.changes);
    h += '<p class="cawx-note">The four regulatory frameworks cover the same subject matter, but they are not ' +
         'translations of each other. Each is written against its own authority&rsquo;s instruments, with that ' +
         'authority&rsquo;s references, wording and examples. Where the frameworks are structured differently the ' +
         'courses differ too &mdash; the FAA framework, for example, has no CAMO approval and no airworthiness ' +
         'review certificate, and carries courses the others do not.</p>';
    Modal.show({ eyebrow: f.flag + ' ' + f.pill, title: f.title, html: h, trackId: 'framework:' + f.id }, trigger);
  }

  /* --- F: one modal, eight screens, switched from inside ------------------ */
  var demoCleanup = null;

  function openDemo(id, trigger, fromInside) {
    var demo = find(C.demos, id);
    if (!demo) { return; }
    if (fromInside && CURRENT_DEMO && CURRENT_DEMO !== demo.id) {
      NAV_STACK.push(CURRENT_PAGE ? { p: CURRENT_PAGE } : { d: CURRENT_DEMO });
    } else if (!fromInside) {
      NAV_STACK.length = 0;      /* a pill is a jump, not a step */
    }
    CURRENT_DEMO = demo.id;
    CURRENT_PAGE = null;            /* the demo's own screen is showing again */
    var cfg = {
      eyebrow: 'In the app', title: demo.title, sub: esc(demo.intro), size: 'wide',
      trackId: 'demo:' + demo.id, focusTitle: trigger !== undefined,
      footNote:
        '<b>Simplified simulation.</b> For the app exactly as it looks, see ' +
        '<a href="#inside" data-cawx-goto="#inside">See exactly how you&rsquo;ll learn</a>.',
      cta: { label: 'Request a free trial', href: '#', trial: true },
      render: function (bodyEl) {
        var stage = el('div', 'cawx-stage');
        var frameWrap = el('div', 'cawx-framewrap');

        /* the switcher — inside the pop-up, so the page gains no new pills */
        var sw = el('div', 'cawx-switch');
        sw.setAttribute('role', 'group');
        sw.setAttribute('aria-label', 'Choose a screen');
        C.demos.forEach(function (dm) {
          var b = el('button', null, esc(dm.card));
          b.type = 'button';
          b.setAttribute('aria-current', dm.id === demo.id ? 'true' : 'false');
          b.addEventListener('click', function () {
            if (dm.id === demo.id) { return; }
            openDemo(dm.id);            /* keeps the original trigger for focus return */
            CAW.track('demo_switch', { to: dm.id });
          });
          sw.appendChild(b);
        });

        var pad, api;
        if (demo.layout === 'devices') {
          /* The hero lineup, reusing the site's OWN frame classes — .lineup,
             .dev, .phone, .island, .ipad-bz, .macbook, .dlabel — so the devices
             are the same overlapping, labelled trio as on the home page. */
          pad = el('div', 'cawx-hero');
          pad.innerHTML =
            '<div class="lineup">' +
              '<div class="dev iphone"><div class="phone">' +
                '<span class="island"></span><div class="cawx-screen" id="cawxDevPhone"></div>' +
              '</div><span class="dlabel">iPhone</span></div>' +
              '<div class="dev ipad"><div class="ipad-bz">' +
                '<div class="cawx-screen" id="cawxDevPad"></div>' +
              '</div><span class="dlabel">iPad</span></div>' +
              '<div class="dev mac"><div class="macbook">' +
                '<div class="lid"><div class="cawx-screen" id="cawxDevMac"></div></div>' +
                '<div class="base"></div>' +
              '</div><span class="dlabel">MacBook</span></div>' +
            '</div>';
          api = DEMOS.sync(qs('#cawxDevPhone', pad), qs('#cawxDevPad', pad), qs('#cawxDevMac', pad));
        } else {
          pad = el('div', 'cawx-ipad');
          var screen = el('div', 'cawx-screen');
          pad.appendChild(screen);
          api = (DEMOS[demo.demo] || DEMOS.lesson)(screen);
        }

        if (demo.pointer) {
          var pt = el('span', 'cawx-point', ICON.hand);
          pt.setAttribute('aria-hidden', 'true');
          pt.style.setProperty('--x', demo.pointer.x + '%');
          pt.style.setProperty('--y', demo.pointer.y + '%');
          pad.appendChild(pt);
        }

        /* An arrow each side of the frame steps to the previous or next screen.
           It goes through openDemo, so the pills above follow and the pop-up
           title and note change with it. */
        var order = C.demos.map(function (dm) { return dm.id; });
        var here = order.indexOf(demo.id);
        function stepper(dir, label) {
          var b = el('button', 'cawx-step ' + (dir < 0 ? 'prev' : 'next'),
                     dir < 0 ? ICON.back : ICON.chevron);
          b.type = 'button';
          b.setAttribute('aria-label', label);
          var to = order[here + dir];
          if (!to) { b.disabled = true; }
          else {
            b.addEventListener('click', function () {
              openDemo(to);
              CAW.track('demo_step', { to: to });
            });
          }
          return b;
        }
        frameWrap.appendChild(stepper(-1, 'Previous screen'));
        frameWrap.appendChild(pad);
        frameWrap.appendChild(stepper(1, 'Next screen'));

        /* The hero frames are laid out at their natural pixel size, then scaled
           as one group to fill the space — the alternative, restyling every
           frame in percentages, would stop them matching the home page. */
        if (demo.layout === 'devices') {
          var fit = function () {
            var line = qs('.lineup', pad);
            if (!line) { return; }
            line.style.transform = 'none';
            line.style.marginRight = '';
            /* the stage, not the hero: the hero is a scroll container on a phone
               and its own box is not what the group has to fit into */
            var box = pad.parentNode || pad;
            var w = Math.min(pad.clientWidth, box.clientWidth || pad.clientWidth);
            var h = box.clientHeight || pad.clientHeight;
            var nw = line.offsetWidth, nh = line.offsetHeight + 26;   /* + the labels */
            if (!nw || !nh) { return; }
            /* 0.86 headroom: hovering a device grows it to 1.16x, and it has to
               stay inside the frame when it does */
            var k = Math.min(w / nw, h / nh) * 0.86;
            /* On a phone the stage is tall and narrow, so fitting to the width
               leaves the devices small in a mostly empty box. Fit the HEIGHT
               instead — capped, so two frames never become absurd — and let the
               stage scroll sideways if the group is then wider than the screen. */
            if (w < 560) {
              /* Two devices on a phone: fill the stage's width, but never take
                 more than 60% of the screen's height. NOT w.innerHeight — `w` is
                 the stage width here and shadows the window alias. */
              var vh = (d.documentElement && d.documentElement.clientHeight) || h;
              k = Math.min((w / nw) * 0.99, (vh * 0.60) / nh);
            }
            line.style.transformOrigin = 'center center';
            line.style.transform = 'scale(' + k.toFixed(3) + ')';
            /* A transform does not change layout. Where the group is drawn LARGER
               than its box, the extra room is claimed with a margin so a scroller
               can reach it — never with a width, because .lineup is a flex row and
               a narrower width shrinks the frames themselves before the scale is
               applied. Where it is drawn smaller, no adjustment: the box stays as
               it is and the group sits centred inside it. */
            line.style.marginRight = k > 1 ? Math.round(nw * (k - 1)) + 'px' : '';
            /* what the fit actually measured — type CAW.fit in the console */
            CAW.fit = { stageW: w, stageH: h, groupW: nw, groupH: nh,
                        viewportH: (d.documentElement || {}).clientHeight,
                        scale: +k.toFixed(3), phone: w < 560 };
          };
          /* The stage is measured, so it has to be measured when it is REALLY
             there. The pop-up is built before it is shown, and on a phone the
             browser settles the height a frame or two later still, so a single
             rAF read a box that was too short and the group was fitted small.
             Watch the box instead, and re-fit whenever it changes. */
          w.requestAnimationFrame(fit);
          w.setTimeout(fit, 60);
          w.setTimeout(fit, 260);
          w.addEventListener('resize', fit);
          var ro = null;
          if (w.ResizeObserver) {
            ro = new w.ResizeObserver(function () { fit(); });
            ro.observe(pad);
          }
          var before = api && api.destroy;
          api = { destroy: function () {
            w.removeEventListener('resize', fit);
            if (ro) { ro.disconnect(); }
            if (before) { before(); }
          } };
        }
        /* An arrow at each end pages the row, for anyone who is not swiping. They
           show only while the row overflows, and each is disabled at its end of
           the travel. The row itself always starts at the far left, so the first
           screen is the one in view. */
        var bar = el('div', 'cawx-switchbar');
        var swPrev = el('button', 'cawx-swarrow', ICON.back);
        var swNext = el('button', 'cawx-swarrow', ICON.chevron);
        swPrev.type = swNext.type = 'button';
        swPrev.setAttribute('aria-label', 'Earlier screens');
        swNext.setAttribute('aria-label', 'Later screens');
        bar.appendChild(swPrev); bar.appendChild(sw); bar.appendChild(swNext);

        function page(dir) {
          var by = Math.round(sw.clientWidth * 0.8) * dir;
          if (sw.scrollBy) {
            sw.scrollBy({ left: by, behavior: reducedMotion() ? 'auto' : 'smooth' });
          } else { sw.scrollLeft += by; }
        }
        swPrev.addEventListener('click', function () { page(-1); });
        swNext.addEventListener('click', function () { page(1); });

        function arrows() {
          var over = sw.scrollWidth - sw.clientWidth > 2;
          bar.setAttribute('data-scrollable', over ? 'true' : 'false');
          swPrev.disabled = !over || sw.scrollLeft <= 1;
          swNext.disabled = !over || sw.scrollLeft >= sw.scrollWidth - sw.clientWidth - 1;
        }
        sw.addEventListener('scroll', arrows);
        w.addEventListener('resize', arrows);

        stage.appendChild(bar);
        var atLeft = function () { sw.scrollLeft = 0; arrows(); };
        w.requestAnimationFrame(atLeft);
        /* focus moves after the paint and the browser scrolls the focused pill
           into view, which left the row part-scrolled; put it back */
        w.requestAnimationFrame(function () { w.requestAnimationFrame(atLeft); });
        w.setTimeout(atLeft, 60);
        stage.appendChild(frameWrap);
        var inner = api && api.destroy;
        api = { destroy: function () {
          w.removeEventListener('resize', arrows);
          if (inner) { inner(); }
        } };
        /* the instruction is kept for assistive technology only: the pointer is
           decorative, so its meaning still has to exist as text somewhere */
        stage.appendChild(el('p', 'sr-only', 'What to look at: ' + esc(demo.instruction)));
        bodyEl.appendChild(stage);

        /* Switching screens replaces the modal body, which drops focus to the
           document body. Put it back on the switcher so keyboard users stay
           inside the dialog. On a first open the trigger still holds focus,
           so nothing is stolen. */
        if (d.activeElement === d.body) {
          var cur = qs('button[aria-current="true"]', sw);
          if (cur) { cur.focus(); }
        }

        demoCleanup = (api && api.destroy) ? api.destroy : null;
      },
      cleanup: function () { if (demoCleanup) { demoCleanup(); demoCleanup = null; } }
    };
    /* already inside a demo pop-up? repaint it in place instead of re-opening */
    if (trigger === undefined && Modal.isOpen() && Modal.swap(cfg)) { return; }
    Modal.show(cfg, trigger);
  }

  /* A QR-shaped graphic for the certificate mock-up: the three finder squares,
     their separators, the timing rows and a deterministic pseudo-random module
     field. It is a drawing, not an encoder — nothing is scannable, which is the
     point on a sample certificate. */
  function qrSvg(modules) {
    var n = modules || 25, cells = [], x, y, seed = 20260828;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    function finder(ox, oy) {
      for (var i = 0; i < 7; i++) {
        for (var j = 0; j < 7; j++) {
          var edge = (i === 0 || i === 6 || j === 0 || j === 6);
          var core = (i >= 2 && i <= 4 && j >= 2 && j <= 4);
          if (edge || core) { cells.push([ox + j, oy + i]); }
        }
      }
    }
    function inFinder(cx, cy) {
      return (cx < 8 && cy < 8) || (cx > n - 9 && cy < 8) || (cx < 8 && cy > n - 9);
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    for (x = 8; x < n - 8; x++) {                       /* timing patterns */
      if (x % 2 === 0) { cells.push([x, 6]); cells.push([6, x]); }
    }
    for (y = 0; y < n; y++) {
      for (x = 0; x < n; x++) {
        if (inFinder(x, y) || x === 6 || y === 6) { continue; }
        if (rnd() > 0.52) { cells.push([x, y]); }
      }
    }
    var rects = cells.map(function (c) {
      return '<rect x="' + c[0] + '" y="' + c[1] + '" width="1" height="1"/>';
    }).join('');
    return '<svg viewBox="0 0 ' + n + ' ' + n + '" aria-hidden="true" ' +
      'shape-rendering="crispEdges"><rect width="' + n + '" height="' + n +
      '" fill="#FDFBF3"/><g fill="#0C1843">' + rects + '</g></svg>';
  }

  /* The pale seal printed behind the middle of the certificate: eight rounded
     lobes around a centre, with a lighter tick inside it. Taken from the issued
     PDF, where it sits behind the holder name and the course. */
  function sealSvg() {
    var lobes = '', i, a, cx, cy;
    for (i = 0; i < 8; i++) {
      a = (Math.PI * 2 / 8) * i;
      cx = 50 + Math.cos(a) * 24;
      cy = 50 + Math.sin(a) * 24;
      lobes += '<rect x="' + (cx - 20).toFixed(1) + '" y="' + (cy - 20).toFixed(1) +
               '" width="40" height="40" rx="15"/>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<g fill="currentColor">' + lobes + '</g>' +
      '<path d="M36 50.5 46.5 61 68 39" fill="none" stroke="#FFFFFF" stroke-opacity=".55" ' +
      'stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* =======================================================================
     5. The app shell, reproduced
     Layout and proportions are taken from the real captures in
     website/screens/: -2 (lesson), -8 (lesson quiz), -6 (timed exam),
     -4 (glossary), -1 (dashboard). The iPad runs a SPLIT VIEW: a white
     sidebar card on the left, the detail pane on the right.
     ======================================================================= */
  function statusBar() {
    return '<div class="cawx-status"><span>20:27&nbsp;&nbsp;Fri 14 Aug</span>' +
           '<span class="r">' + ICON.wifi + '<span class="cawx-bat"></span></span></div>';
  }
  /* The tab bar is live: every tab leads to that page of the app, reproduced
     from the device. `home` returns to the screen this demo is about. */
  function tabBar(active, inert) {
    var tabs = [['Home', ICON.home, 'home'], ['Saved', ICON.saved, 'saved'],
                ['Stats', ICON.stats, 'stats'], ['Settings', ICON.gear, 'settings'],
                ['Profile', ICON.person, 'profile']];
    var h = '<div class="cawx-tabbar"><div class="in">';
    tabs.forEach(function (t) {
      h += inert
        ? '<span class="' + (t[0] === active ? 'on' : '') + '">' + t[1] + t[0] + '</span>'
        : '<button type="button" data-caw-nav="' + t[2] + '" class="' +
          (t[0] === active ? 'on' : '') + '">' + t[1] + t[0] + '</button>';
    });
    return h + '</div></div>';
  }

  /* the lesson list, as the sidebar shows it inside a course */
  function sidebar(currentId, marks, pickable) {
    var h = '<aside class="cawx-side">' +
      '<div class="cawx-side-h">CAW Academy<svg class="tog" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/>' +
        '<path d="M10 4v16"/></svg></div>' +
      '<button type="button" class="cawx-side-crumb" data-caw-nav="dashboard">' +
        ICON.back + 'Courses</button>' +
      '<div class="cawx-side-course">' + esc(D.course.name) + '</div>' +
      '<div class="cawx-side-list">';
    D.siblings.forEach(function (l, k) {
      var on = l.id === currentId;
      h += '<' + (pickable ? 'button type="button" data-lesson="' + esc(l.id) + '"' : 'div') +
           ' class="cawx-srow' + (on ? ' on' : '') + '">' +
           (k === 0 ? ICON.doneTick : ICON.lesson) +
           '<span><span class="code">' + esc(l.id) +
           (on && marks ? '<svg class="bm" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z"/></svg>' +
                          '<svg class="hl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>' : '') +
           '</span><span class="nm">' + esc(l.title) + '</span></span>' +
           (pickable ? '</button>' : '</div>');
    });
    return h + '</div></aside>';
  }

  function toolCapsule(kind) {
    /* The tools that lead somewhere in this preview are real buttons: the
       glossary, the highlighter (notes) and the speaker (read aloud). */
    function tool(icon, demo, cls) {
      return demo
        ? '<button type="button" class="' + (cls || '') + '" data-caw-demo="' + demo + '">' + icon + '</button>'
        : '<i class="' + (cls || '') + '">' + icon + '</i>';
    }
    function search() {   /* the magnifier opens the app's search sheet */
      return '<button type="button" data-caw-nav="search">' + ICON.search + '</button>';
    }
    if (kind === 'reading') {               /* read-aloud running */
      return '<span class="cawx-tools">' + search() + tool(ICON.book, 'glossary') +
             tool(ICON.marker, 'notes', 'hl') + tool(ICON.bookmarkO) +
             '<i class="on">' + ICON.speakerOn + '</i></span>';
    }
    if (kind === 'cards') {                 /* flashcards + quiz screens */
      return '<span class="cawx-tools">' + search() + tool(ICON.book, 'glossary') +
             tool(ICON.bookmarkO) + tool(ICON.speaker, 'voice') + '</span>';
    }
    if (kind === 'short') {
      return '<span class="cawx-tools">' + search() + tool(ICON.book, 'glossary') +
             tool(ICON.bookmarkO) + '</span>';
    }
    return '<span class="cawx-tools">' + search() + tool(ICON.book, 'glossary') +
      tool(ICON.marker, 'notes', 'hl') + tool(ICON.bookmark, null, 'bm') +
      tool(ICON.bookmarkO) + tool(ICON.speaker, 'voice') + '</span>';
  }

  /* cfg: {tab, side, title, tools, seg, page, foot, solo} */
  function shell(cfg) {
    var h = statusBar() + tabBar(cfg.tab || 'Home') +
      '<div class="cawx-shell' + (cfg.solo ? ' solo' : '') + '">' +
      (cfg.side || '') +
      '<div class="cawx-detail">' +
        '<div class="cawx-navrow">' +
        (cfg.back ? '<button type="button" class="cawx-back"' +
                    (typeof cfg.back === 'string'
                      ? ' data-caw-nav="' + cfg.back + '"'   /* goes to that page */
                      : ' data-caw-back') +                   /* the demo wires it */
                    ' aria-label="Back">' + ICON.back + '</button>'
                  : '<span class="cawx-back">' + ICON.back + '</span>') +
        '<span class="cawx-navtitle">' + esc(cfg.title) + '</span>' +
        (cfg.tools ? toolCapsule(cfg.tools)
                   : cfg.action ? '<span class="cawx-back">' + cfg.action + '</span>'
                                : '<span style="width:20px"></span>') +
        '</div>';
    if (cfg.seg) {
      /* the three tabs are live: they switch the demo, and the pills above the
         frame follow, because the pop-up is re-rendered for the new screen */
      var segs = [['Lesson', 'lesson'], ['Flashcards', 'flashcards'], ['Quiz', 'quiz']];
      h += '<div class="cawx-seg">';
      segs.forEach(function (n) {
        h += '<button type="button" data-caw-demo="' + n[1] + '" aria-selected="' +
             (n[0] === cfg.seg) + '">' + n[0] + '</button>';
      });
      h += '</div>';
    }
    h += cfg.page;
    if (cfg.foot) {
      /* live on the lesson screen, where the neighbouring lessons are carried;
         drawn grey elsewhere, so an inert control never looks live */
      var live = cfg.foot === 'live', tag = live ? 'button' : 'span';
      var at = live ? ' type="button" data-caw-step="' : '';
      h += '<div class="cawx-lfoot' + (live ? '' : ' dim') + '">' +
           '<' + tag + (live ? at + 'prev"' : '') + '>' + ICON.back + 'Previous</' + tag + '>' +
           '<span class="mid">' + (cfg.position || D.course.position) + ' / ' + D.course.lessons + '</span>' +
           '<' + tag + (live ? at + 'next"' : '') + '>Next' + ICON.chevron + '</' + tag + '></div>';
    }
    return h + '</div></div>';
  }

  var SECTION_ICON = {
    'In brief': ICON.bank, 'In depth': ICON.info, 'Examples in practice': ICON.bulb,
    'Where it goes wrong': ICON.alert, 'Where it applies': ICON.link
  };

  /* Render one exported lesson section into the app's card layout. */
  function sectionHTML(sec, n, opts) {
    opts = opts || {};
    var h = '<div class="cawx-sechead"><span class="ic">' +
            (SECTION_ICON[sec.title] || ICON.info) + '</span>' + n + ' &middot; ' +
            esc(sec.title).toUpperCase() + '</div><div class="cawx-appcard">';
    if (opts.bookmark) {
      h += '<div class="cawx-bmrule"><b>' + ICON.bookmark + 'Bookmark</b><i></i></div>';
    }
    var lis = [], i, b, txt;
    for (i = 0; i < sec.blocks.length; i++) {
      b = sec.blocks[i];
      txt = opts.transform ? opts.transform(b.t) : b.t;
      if (b.k === 'li' || b.k === 'ck') { lis.push(txt); continue; }
      if (lis.length) { h += listHTML(lis); lis = []; }
      if (b.k === 'h') { h += '<p class="cawx-ah">' + txt + '</p>'; }
      else if (b.k === 'key') {
        h += '<div class="cawx-akey"><b>Key principle</b><span>' + txt + '</span></div>';
      } else {
        h += '<p class="cawx-ap' + (i === 0 ? ' lead' : '') + '">' + txt + '</p>';
      }
      if (opts.limit && i >= opts.limit) { break; }
    }
    if (lis.length) { h += listHTML(lis); }
    return h + '</div>';
  }
  function listHTML(items) {
    var h = '<ul class="cawx-alist">';
    items.forEach(function (t) {
      h += '<li><span class="tick">' + ICON.check + '</span><span>' + t + '</span></li>';
    });
    return h + '</ul>';
  }
  function lessonHead(L) {
    L = L || D.lesson;
    return '<span class="cawx-subpart">' + esc(L.subpart) + '</span>' +
      '<h3 class="cawx-lt">' + esc(L.title) + '</h3>' +
      '<p class="cawx-lsub">' + esc(L.subtitle) + '</p>' +
      '<div class="cawx-lmeta">' +
        '<span>' + ICON.clock + L.minutes + ' min</span>' +
        '<span>' + ICON.cards + L.cards + ' cards</span>' +
        '<span>' + ICON.checkC + L.questions + ' questions</span>' +
      '</div>';
  }

  /* =======================================================================
     6. The eight demo screens
     ======================================================================= */
  var DEMOS = {

    /* ---- F1 · a lesson, as it is on the iPad ------------------------------
       Every lesson in the sidebar is real and openable: selecting one swaps the
       detail pane, exactly as it does on the device. */
    lesson: function (screen) {
      var current = D.lesson.id;

      function lessonById(id) {
        for (var i = 0; i < D.siblings.length; i++) {
          if (D.siblings[i].id === id) { return D.siblings[i]; }
        }
        return D.siblings[0];
      }

      function paint() {
        var L = lessonById(current), s = L.sections, body = '', n = 0;
        for (var i = 0; i < s.length; i++) {
          n++;
          body += sectionHTML(s[i], n, { bookmark: n === 1 && L.id === D.lesson.id });
        }
        screen.innerHTML = shell({
          tab: 'Home', side: sidebar(current, true, true), title: L.id,
          tools: 'long', seg: 'Lesson', foot: 'live', position: L.position,
          page: '<div class="cawx-page">' + lessonHead(L) + body + '</div>'
        });
        qsa('.cawx-srow[data-lesson]', screen).forEach(function (row) {
          row.addEventListener('click', function () {
            current = row.getAttribute('data-lesson');
            paint();
            CAW.track('demo_lesson_open', { lesson: current });
          });
        });
        /* Previous / Next step through the course, as they do on the device */
        qsa('[data-caw-step]', screen).forEach(function (b) {
          b.addEventListener('click', function () {
            var ids = D.siblings.map(function (x) { return x.id; }),
                at = ids.indexOf(current),
                to = b.getAttribute('data-caw-step') === 'next' ? at + 1 : at - 1;
            if (to < 0 || to >= ids.length) { return; }
            current = ids[to];
            paint();
            CAW.track('demo_lesson_step', { lesson: current });
          });
        });
      }
      paint();
    },

    /* ---- F2 · flashcards, as the real screens draw them -------------------- */
    flashcards: function (screen) {
      var cards = D.flashcards, idx = 0, flipped = false, mastered = {};
      screen.innerHTML = shell({
        tab: 'Home', side: sidebar(D.lesson.id, true), title: D.lesson.id,
        tools: 'cards', seg: 'Flashcards',
        page: '<div class="cawx-fc-wrap">' +
          '<div class="cawx-fc-head"><span id="cawxFcN"></span><span id="cawxFcM"></span></div>' +
          '<div class="cawx-fc-bar"><i id="cawxFcBar"></i></div>' +
          '<button class="cawx-fc" type="button" id="cawxFc" aria-live="polite"></button>' +
          '<div class="cawx-fc-rate">' +
            '<button type="button" class="need" data-r="need" disabled>' + ICON.again + 'Need review</button>' +
            '<button type="button" class="got" data-r="got" disabled>' + ICON.check + 'Got it</button>' +
          '</div></div>'
      });
      var card = qs('#cawxFc', screen), num = qs('#cawxFcN', screen),
          mas = qs('#cawxFcM', screen), bar = qs('#cawxFcBar', screen);
      function paint() {
        var c = cards[idx];
        card.setAttribute('data-face', flipped ? 'a' : 'q');
        card.innerHTML = flipped
          ? '<span class="txt">' + esc(c.a) + '</span>'
          : '<span class="chip">' + esc(D.lesson.id) + '</span>' +
            '<span class="txt">' + esc(c.q) + '</span>' +
            '<span class="wm" aria-hidden="true">CAW<em>Academy</em></span>' +
            '<span class="hint">' + ICON.tap + 'Tap to reveal answer</span>';
        num.textContent = 'Card ' + (idx + 1) + ' of ' + D.lesson.cards;
        mas.textContent = Object.keys(mastered).length + ' mastered';
        bar.style.width = Math.round((idx + 1) / D.lesson.cards * 100) + '%';
        /* the rating buttons only come alive once the answer is showing */
        qsa('.cawx-fc-rate button', screen).forEach(function (b) { b.disabled = !flipped; });
      }
      card.addEventListener('click', function () {
        flipped = !flipped; paint(); CAW.track('demo_flashcard_flip', { index: idx });
      });
      qsa('.cawx-fc-rate button', screen).forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) { return; }
          if (b.getAttribute('data-r') === 'got') { mastered[idx] = true; }
          else { delete mastered[idx]; }
          CAW.track('demo_flashcard_rate', { rating: b.getAttribute('data-r') });
          idx = (idx + 1) % cards.length; flipped = false; paint();
        });
      });
      paint();
    },

    /* ---- F3 · the lesson quiz, with the app's answer feedback ------------
       The worked examples in the app are PROSE inside the lesson body (see the
       Lessons screen, section 3). The interactive part of a lesson is its
       quiz, so that is what this demo shows. */
    quiz: function (screen) {
      var Q = D.quiz, i = 0, picked = null;
      screen.innerHTML = shell({
        tab: 'Home', side: sidebar(D.lesson.id, true), title: D.lesson.id,
        tools: 'short', seg: 'Quiz',
        page: '<div class="cawx-page" id="cawxQz" aria-live="polite"></div>'
      });
      var host = qs('#cawxQz', screen);
      function paint() {
        var q = Q[i], h = '', k;
        h += '<div class="cawx-qcount">Question ' + (i + 1) + ' of ' + D.lesson.questions + '</div>' +
             '<div class="cawx-qbar"><i style="width:' + Math.round((i + 1) / D.lesson.questions * 100) + '%"></i></div>' +
             '<p class="cawx-qtext">' + esc(q.q) + '</p><div class="cawx-opts">';
        for (k = 0; k < q.options.length; k++) {
          var state = '';
          if (picked !== null) {
            state = (k === q.correct) ? 'right' : (k === picked ? 'wrong' : 'dim');
          }
          h += '<button class="cawx-opt" type="button" data-i="' + k + '"' +
               (state ? ' data-state="' + state + '" disabled' : '') + '>' +
               '<span class="ltr">' + String.fromCharCode(65 + k) + '</span>' +
               '<span>' + esc(q.options[k]) + '</span></button>';
        }
        h += '</div>';
        if (picked !== null) {
          h += '<div class="cawx-why">' + ICON.bulb + '<span>' + esc(q.why) + '</span></div>' +
               '<button class="cawx-solid" type="button" id="cawxQzNext">' +
               (i === Q.length - 1 ? 'Start again' : 'Next question') + '</button>';
        }
        host.innerHTML = h;
        qsa('.cawx-opt[data-i]', host).forEach(function (btn) {
          btn.addEventListener('click', function () {
            picked = +btn.getAttribute('data-i');
            paint();
            CAW.track('demo_quiz_answer', { q: i, correct: picked === Q[i].correct });
          });
        });
        var nx = qs('#cawxQzNext', host);
        if (nx) {
          nx.addEventListener('click', function () {
            i = (i + 1) % Q.length; picked = null; paint();
          });
        }
      }
      paint();
    },

    /* ---- F4 · the timed assessment (exam mode) ----------------------------- */
    exam: function (screen) {
      var Q = D.quiz, total = D.quizTotal, active = Q.length, i = 0, answers = [];

      screen.innerHTML = shell({
        tab: 'Home', side: courseSidebar('Part-M Continuing Airworthiness'),
        title: D.course.short + ' Full exam', tools: false,
        page: '<div class="cawx-page">' +
          '<div class="cawx-timer">' + ICON.clock + '<span id="cawxClock">28:14</span></div>' +
          '<div class="cawx-qnav" id="cawxNav" role="group" aria-label="Questions"></div>' +
          '<div class="cawx-warn">' + ICON.warn + '<span>' + (total - active) +
            ' questions are not part of this preview</span>' + ICON.arrow + '</div>' +
          '<div id="cawxQ" aria-live="polite"></div></div>'
      });

      var nav = qs('#cawxNav', screen), host = qs('#cawxQ', screen);
      for (var n = 1; n <= total; n++) {
        var b = el('button', 'cawx-qn', String(n));
        b.type = 'button';
        if (n > active) {
          b.setAttribute('aria-disabled', 'true');
          b.setAttribute('tabindex', '-1');
          b.title = 'Not part of this preview';
        } else {
          (function (k) { b.addEventListener('click', function () { i = k; paint(); }); })(n - 1);
        }
        nav.appendChild(b);
      }
      function answered() {
        var c = 0, k;
        for (k = 0; k < active; k++) { if (answers[k] != null) { c++; } }
        return c;
      }
      function marks() {
        qsa('.cawx-qn', nav).forEach(function (b, k) {
          b.setAttribute('aria-current', k === i ? 'true' : 'false');
          b.setAttribute('data-done', answers[k] != null ? 'true' : 'false');
        });
      }
      function paint() {
        var q = Q[i], h = '', k;
        h += '<div class="cawx-qcount">Question ' + (i + 1) + ' of ' + total + '</div>' +
             '<div class="cawx-qbar"><i style="width:' + Math.round((i + 1) / total * 100) + '%"></i></div>' +
             '<p class="cawx-qtext">' + esc(q.q) + '</p><div class="cawx-opts">';
        for (k = 0; k < q.options.length; k++) {
          h += '<button class="cawx-opt" type="button" data-i="' + k + '"' +
               (answers[i] === k ? ' data-state="on"' : '') + '>' +
               '<span class="ltr">' + String.fromCharCode(65 + k) + '</span>' +
               '<span>' + esc(q.options[k]) + '</span></button>';
        }
        h += '</div><div class="cawx-btnrow">' +
             '<button class="cawx-solid cawx-ghost" type="button" id="cawxPrev"' +
             (i === 0 ? ' disabled' : '') + '>' + ICON.back + 'Previous</button>' +
             '<button class="cawx-solid" type="button" id="cawxNext"' +
             (i === active - 1 ? ' disabled' : '') + '>Next' + ICON.chevron + '</button></div>' +
             '<button class="cawx-solid" type="button" id="cawxExSubmit" disabled>' +
             ICON.check + 'Submit exam</button>' +
             '<p class="cawx-subnote">' + (answered() === active
               ? 'All three preview questions answered. In the app, Submit unlocks once every ' +
                 total + ' questions are answered — the result then shows the score against the ' +
                 '75% pass mark, and every wrong answer is reviewed with its reasoning and a link ' +
                 'back to the lesson.'
               : 'Submit unlocks only when all ' + total + ' questions are answered. ' +
                 'The other ' + (total - active) + ' are not part of this preview.') + '</p>';
        host.innerHTML = h;
        qsa('.cawx-opt[data-i]', host).forEach(function (btn) {
          btn.addEventListener('click', function () {
            answers[i] = +btn.getAttribute('data-i');
            paint(); CAW.track('demo_exam_answer', { q: i });
          });
        });
        var prev = qs('#cawxPrev', host), next = qs('#cawxNext', host);
        if (prev && !prev.disabled) { prev.addEventListener('click', function () { i--; paint(); }); }
        if (next && !next.disabled) { next.addEventListener('click', function () { i++; paint(); }); }
        marks();
      }
      paint();

      var left = 28 * 60 + 14, t = w.setInterval(function () {
        left--; if (left < 0) { left = 0; }
        var c = qs('#cawxClock', screen);
        if (c) { c.textContent = Math.floor(left / 60) + ':' + (left % 60 < 10 ? '0' : '') + (left % 60); }
      }, 1000);
      return { destroy: function () { w.clearInterval(t); } };
    },

    /* ---- F5 · the glossary sheet ------------------------------------------ */
    glossary: function (screen) {
      screen.innerHTML = shell({
        tab: 'Home', side: sidebar(D.lesson.id, true), title: D.lesson.id,
        tools: 'long', seg: 'Lesson', foot: true,
        page: '<div class="cawx-page">' + lessonHead() + sectionHTML(D.lesson.sections[0], 1, {}) + '</div>'
      }) +
        '<div class="cawx-dim" data-caw-nav="back" data-caw-fallback="demo:lesson"></div>' +
        '<div class="cawx-sheet">' +
          '<div class="cawx-sheet-h">Glossary' +
            '<button type="button" class="done" data-caw-nav="back" ' +
              'data-caw-fallback="demo:lesson">Done</button></div>' +
          '<div class="cawx-gl-field">' + ICON.search +
            '<input type="search" id="cawxGl" placeholder="Search the glossary" ' +
            'aria-label="Search the glossary" autocomplete="off" spellcheck="false"></div>' +
          '<p class="cawx-gl-count" id="cawxGlCount" role="status" aria-live="polite"></p>' +
          '<ul class="cawx-gl-list" id="cawxGlList"></ul>' +
        '</div>';

      var input = qs('#cawxGl', screen), list = qs('#cawxGlList', screen),
          count = qs('#cawxGlCount', screen), data = D.glossary;
      function paint(term) {
        var q = (term || '').trim().toLowerCase();
        var hits = data.filter(function (e) {
          if (!q) { return true; }
          return e.t.toLowerCase().indexOf(q) === 0 || e.full.toLowerCase().indexOf(q) >= 0;
        });
        if (!hits.length) {
          list.innerHTML = '<li class="cawx-gl-empty">No entry for &ldquo;' + esc(term) +
            '&rdquo; in this preview. The app searches all ' + D.glossaryTotal.toLocaleString() + ' entries.</li>';
          count.textContent = 'No results';
          return;
        }
        list.innerHTML = hits.map(function (e, k) {
          return '<li class="cawx-gl-item' + (q && k === 0 ? ' best' : '') + '">' +
            (q && k === 0 ? '<p class="cawx-gl-best">Best match</p>' : '') +
            '<p class="cawx-gl-t"><em>' + esc(e.t) + '</em> (' + esc(e.full) + ')</p>' +
            '<p class="cawx-gl-d">' + esc(e.d) + '</p></li>';
        }).join('');
        count.textContent = hits.length + (hits.length === 1 ? ' entry' : ' entries') +
          (q ? ' matching "' + term + '"' : ' shown of ' + D.glossaryTotal.toLocaleString() + ' in the app');
      }
      var t = null;
      input.addEventListener('input', function () {
        w.clearTimeout(t);
        t = w.setTimeout(function () {
          paint(input.value); CAW.track('demo_glossary_search', { q: input.value.slice(0, 24) });
        }, 120);
      });
      paint('');
      return { destroy: function () { w.clearTimeout(t); } };
    },

    /* ---- F6 · the certificate, laid out from the real issued PDF ---------- */
    certificate: function (screen) {
      var K = S.certificate;
      /* As the app does it: the certificate opens as a preview sheet over the
         My-certificates list, with Done at the top right. */
      screen.innerHTML = shell({
        tab: 'Profile', side: null, solo: true, title: 'My certificates', tools: false,
        back: 'profile',
        page: '<div class="cawx-page">' + rowList([{
          icon: ICON.award, tone: 'amber', label: esc(K.course),
          sub: 'Certificate issued &middot; tap to view or download', demo: 'certificate'
        }]) + '</div>'
      }) +
        '<div class="cawx-dim" data-caw-nav="back" data-caw-fallback="page:profile"></div>' +
        '<div class="cawx-sheet cawx-certsheet">' +
          '<div class="cawx-sheet-h">Certificate' +
            '<button type="button" class="done" data-caw-nav="back" ' +
              'data-caw-fallback="page:profile">Done</button></div>' +
        '<div class="cawx-cert-wrap">' +
          '<p class="cawx-cert-sample">Sample certificate &middot; not issued</p>' +
          '<div class="cawx-cert"><div class="cawx-cert-in">' +
          '<div class="cawx-cert-seal" aria-hidden="true">' + sealSvg() + '</div>' +
          '<div class="cawx-cert-head">' +
            '<p class="cawx-cert-brand">CAW <span>Academy</span></p>' +
            '<p class="cawx-cert-kind">Certificate of completion</p>' +
          '</div>' +
          '<div class="cawx-cert-mid">' +
            '<p class="cawx-cert-lede">This is to certify that</p>' +
            '<p class="cawx-cert-name">' + esc(K.holder) + '</p>' +
            '<span class="cawx-cert-rule"></span>' +
            '<p class="cawx-cert-lede">has successfully completed the course</p>' +
            '<p class="cawx-cert-course">' + esc(K.course) + '</p>' +
            '<p class="cawx-cert-meta">' + esc(K.duration) + '<i>·</i>' + esc(K.completed) +
              '<i>·</i>' + esc(K.score) + '</p>' +
            '<p class="cawx-cert-no">Certificate No. <b>' + esc(K.number) + '</b></p>' +
          '</div>' +
          '<div class="cawx-cert-bot">' +
            '<span class="cawx-cert-iss"><small>Issued by</small>' +
              '<b>CAW <span>Academy</span></b><em>' + esc(K.tagline) + '</em></span>' +
            '<span class="cawx-cert-qrwrap"><span class="cawx-cert-qr">' + qrSvg(25) + '</span>' +
            '<small>Scan to verify</small></span>' +
          '</div>' +
          '<p class="cawx-cert-disc">' + esc(K.disclaimer) + '</p>' +
        '</div></div></div></div>';
    },

    /* ---- F7 · reading a lesson aloud ---------------------------------------
       Rebuilt from the real screen: the transport sits at the FOOT of the
       detail pane, above the Previous/Next row — a speed control on the left,
       the transport centred, a close button on the right, and the position and
       time remaining underneath. The block being spoken is tinted across its
       full width, and the speaker in the toolbar is shown active. */
    voice: function (screen) {
      var playing = true, at = 0, timer = null;

      screen.innerHTML = shell({
        tab: 'Home', side: sidebar(D.lesson.id, true), title: D.lesson.id,
        tools: 'reading', seg: 'Lesson', foot: true,
        page: '<div class="cawx-page" id="cawxVp">' + lessonHead() +
            sectionHTML(D.lesson.sections[0], 1, {}) +
            sectionHTML(D.lesson.sections[1], 2, { limit: 3 }) + '</div>' +
          '<div class="cawx-voice">' +
            '<div class="cawx-vrow">' +
              '<span class="cawx-vspeed" aria-hidden="true">' + ICON.gauge + '</span>' +
              '<span class="cawx-vmid">' +
                '<button type="button" class="cawx-vbtn" aria-label="Back to the start">' + ICON.skipBack + '</button>' +
                '<button type="button" class="cawx-vbtn" id="cawxVprev" aria-label="Previous">' + ICON.rewind + '</button>' +
                '<button type="button" class="cawx-vbtn big" id="cawxPlay" aria-label="Pause">' + ICON.pause + '</button>' +
                '<button type="button" class="cawx-vbtn" id="cawxVnext" aria-label="Next">' + ICON.forward + '</button>' +
                '<button type="button" class="cawx-vbtn" aria-label="To the end">' + ICON.skipFwd + '</button>' +
              '</span>' +
              '<button type="button" class="cawx-vclose" data-caw-demo="lesson" aria-label="Stop reading">' +
                ICON.close + '</button>' +
            '</div>' +
            '<p class="cawx-vpos" id="cawxVstate"></p>' +
          '</div>'
      });

      var page = qs('#cawxVp', screen);
      var blocks = qsa('.cawx-ap, .cawx-alist li, .cawx-akey, .cawx-lt', page);
      var btn = qs('#cawxPlay', screen), state = qs('#cawxVstate', screen);

      function mark() {
        blocks.forEach(function (p, k) { p.classList.toggle('cawx-speaking', k === at); });
        var left = Math.max(1, Math.round(D.lesson.minutes * (1 - at / blocks.length)));
        state.textContent = (at + 1) + ' of ' + blocks.length + ' \u00b7 ' + left + ' min left';
        btn.innerHTML = playing ? ICON.pause : ICON.play;
        btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        if (blocks[at] && blocks[at].scrollIntoView) {
          blocks[at].scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
        }
      }
      function step() {
        at++;
        if (at >= blocks.length) { at = blocks.length - 1; playing = false; stop(); }
        mark();
      }
      function stop() { w.clearInterval(timer); timer = null; }
      function run() { stop(); timer = w.setInterval(step, reducedMotion() ? 3600 : 2400); }

      btn.addEventListener('click', function () {
        playing = !playing;
        if (playing) { run(); } else { stop(); }
        mark(); CAW.track('demo_voice_toggle', { playing: playing });
      });
      qs('#cawxVprev', screen).addEventListener('click', function () {
        at = Math.max(0, at - 1); mark();
      });
      qs('#cawxVnext', screen).addEventListener('click', function () {
        at = Math.min(blocks.length - 1, at + 1); mark();
      });
      mark();
      run();
      return { destroy: stop };
    },

    /* ---- F8 · "My notes", and the lesson behind each highlight -------------
       The list is the real screen. Selecting an entry opens the lesson at that
       highlight — which is what the app does — and the back arrow returns. */
    notes: function (screen) {
      var N = S.notes, view = 'list', at = 0;

      function tint(html) {
        N.forEach(function (n, k) {
          if (html.indexOf(n.anchor) >= 0) {
            html = html.replace(n.anchor, '<mark class="cawx-mark" data-c="' + n.colour +
              '" id="cawxMk' + k + '">' + n.anchor + '</mark>');
          }
        });
        return html;
      }

      function list() {
        var entries = N.map(function (n, k) {
          var quote = esc(n.quote).replace(esc(n.anchor),
            '<mark class="cawx-mark" data-c="' + n.colour + '">' + esc(n.anchor) + '</mark>');
          return '<button type="button" class="cawx-nentry" data-note="' + k + '" data-c="' + n.colour + '">' +
            '<span class="cawx-nbody">' +
              '<span class="cawx-nquote">' + quote + '</span>' +
              (n.note ? '<span class="cawx-nnote"><b>Your note</b><span>' + esc(n.note) + '</span></span>' : '') +
            '</span>' +
            '<span class="cawx-nedit" aria-hidden="true">' + ICON.edit + '</span>' +
          '</button>';
        }).join('');

        screen.innerHTML = shell({
          tab: 'Saved', side: null, solo: true, title: 'My notes', tools: false,
          back: 'saved', action: ICON.share,
          page: '<div class="cawx-page">' +
            '<div class="cawx-nsearch">' + ICON.search + '<span>Search your highlights and notes</span></div>' +
            '<div class="cawx-nfilters">' +
              '<span class="cawx-nfilter">' + ICON.book + 'All courses' + ICON.caret + '</span>' +
              '<span class="cawx-nfilter"><i class="dot"></i>All colours' + ICON.caret + '</span>' +
              '<span class="cawx-nfilter">' + ICON.sort + 'Course' + ICON.caret + '</span>' +
            '</div>' +
            '<div class="cawx-nbar"><span class="mut">Clear filters</span><span class="act">Expand all</span></div>' +
            '<div class="cawx-ncard">' +
              '<div class="cawx-nhead"><span>' + esc(D.course.name) + '</span><b>' + N.length + '</b></div>' +
              '<p class="cawx-nlesson">' + esc(D.lesson.id) + '&nbsp;&nbsp;' +
                esc(D.lesson.id) + ' - ' + esc(D.lesson.title) + '</p>' +
              entries +
            '</div></div>'
        });
        qsa('.cawx-nentry', screen).forEach(function (b) {
          b.addEventListener('click', function () {
            at = +b.getAttribute('data-note'); view = 'lesson'; paint();
            CAW.track('demo_notes_open_lesson', { index: at });
          });
        });
      }

      function lesson() {
        screen.innerHTML = shell({
          tab: 'Home', side: sidebar(D.lesson.id, true), title: D.lesson.id,
          tools: 'long', seg: 'Lesson', foot: true, back: true,
          page: '<div class="cawx-page">' + lessonHead() +
            sectionHTML(D.lesson.sections[0], 1, { transform: tint }) +
            sectionHTML(D.lesson.sections[1], 2, { limit: 3, transform: tint }) + '</div>'
        });
        var mk = qs('#cawxMk' + at, screen);
        if (mk) {
          mk.classList.add('cawx-mark-focus');
          if (mk.scrollIntoView) {
            mk.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
          }
        }
        var back = qs('[data-caw-back]', screen);
        if (back) {
          back.addEventListener('click', function () { view = 'list'; paint(); });
        }
      }

      function paint() { if (view === 'list') { list(); } else { lesson(); } }
      paint();
    },

    /* ---- F9 · the same progress on two devices ------------------------------
       Two frames, one account. The dashboard is identical on both because the
       progress, the Continue card and the course percentages are synced. */
    sync: function (phone, pad, mac) {
      phone.innerHTML = dashboard('phone');
      pad.innerHTML = dashboard('pad');
      if (mac) { mac.innerHTML = dashboard('mac'); }
    }
  };

  /* The Home dashboard, as it appears after signing in. Same numbers on both
     devices — that is the whole point of the screen. */
  /* `live` is set only for the full-size dashboard page. The three shrunken
     copies in the device lineup are drawn as plain chrome: a control too small
     to read should not also be a button that appears to do nothing.

     Everything on this page comes from the chosen edition's own catalogue, so
     switching framework changes the courses, their names and their lesson
     counts - not just the label on the chip. */
  function dashboard(kind, live, k) {
    var cat = catalogue(typeof k === 'number' ? k : CURRENT_FW);

    /* the course being continued: this edition's continuing-airworthiness
       anchor - Part-M / CAR-M, or 14 CFR Part 43 & 91 where there is no Part-M */
    var anchor = null;
    cat.courses.forEach(function (c) {
      if (!anchor && (c.id === 'm' || c.id === 'p43')) { anchor = c; }
    });
    anchor = anchor || cat.courses[1] || cat.courses[0];

    /* the opening courses of this edition, under the app's own section headings,
       carried far enough down the list to include the anchor below */
    var section = '', cards = '';
    var upto = Math.min(cat.courses.indexOf(anchor) + 1, 5) || 3;
    cat.courses.slice(0, upto).forEach(function (c, i) {
      var pc = c.id === anchor.id ? 60 : (i === 0 ? 100 : 0),
          done = Math.round(c.lessons * pc / 100);
      if (c.group !== section) {
        section = c.group;
        cards += '<p class="cawx-dsec">' + esc(section) + '</p>';
      }
      var open = live && c.id === cat.openable;
      cards += (open
          ? '<button type="button" class="cawx-dcard" data-caw-demo="lesson">'
          : '<div class="cawx-dcard' + (live ? ' dim' : '') + '">') +
        '<div class="top"><span class="ic">' + ICON.lesson + '</span>' +
        '<span class="nm"><b>' + esc(c.long) + '</b><small>' + esc(c.blurb) + '</small></span>' +
        (pc === 100 ? '<span class="seal">' + ICON.doneTick + '</span>' : '') + '</div>' +
        '<div class="meta"><span class="pill">' + c.lessons + ' LESSONS</span>' +
          '<span class="rd">' + done + '/' + c.lessons + ' done</span></div>' +
        '<div class="bar"><i style="width:' + pc + '%"></i></div>' +
        (open ? '</button>' : '</div>');
    });

    var body =
      '<div class="cawx-dhero">' +
        (live
          ? '<button type="button" class="cawx-fwchip" id="cawxFwChip" aria-haspopup="true" ' +
              'aria-expanded="false"><i>' + cat.flag + '</i><span>' + cat.label + '</span>' +
              ICON.caret + '</button>' +
            '<div class="cawx-fwmenu" id="cawxFwMenu" hidden role="menu">' +
              FRAMEWORK_ROWS.map(function (f, i) {
                return '<button type="button" role="menuitemradio" data-fw="' + i + '" ' +
                  'aria-checked="' + (i === cat.key) + '"><span class="tk">' + ICON.check +
                  '</span><i>' + f[1] + '</i>' + f[0] + '</button>';
              }).join('')
            + '</div>'
          : '<span class="cawx-fwchip"><i>' + cat.flag + '</i><span>' + cat.label +
            '</span>' + ICON.caret + '</span>') +
        '<b' + (live ? ' id="cawxDHeroT"' : '') + '>' + cat.label +
          ' Airworthiness &amp; Technical Asset Management</b>' +
        '<small>Airworthiness, maintenance economics &amp; technical asset value &mdash; ' +
        'expert lessons, flashcards and assessments.</small></div>' +
      (live && anchor.id === cat.openable
        ? '<button type="button" class="cawx-dcont" data-caw-demo="lesson">'
        : '<div class="cawx-dcont' + (live ? ' dim' : '') + '">') +
        '<span class="k">CONTINUE</span>' +
        '<b>' + esc(cat.key === 0 ? 'Responsibilities' : anchor.name) + '</b>' +
        '<span class="r"><span>' + esc(anchor.name) + (cat.key === 0 ? ' · M.A.201' : '') +
          '</span><span class="res">Resume' + ICON.chevron + '</span></span>' +
        (live && anchor.id === cat.openable ? '</button>' : '</div>') +
      '<div class="cawx-drow dim"><span class="ic red">' + ICON.due + '</span>' +
        '<span class="tx"><b>Courses due</b><small>1 due within 2 weeks</small></span>' +
        '<span class="bdg">1</span>' + ICON.chevron + '</div>' +
      cards;

    /* iPhone: the title row carries the search + glossary pill, and the tab bar
       at the foot is icons only - no labels - as iOS draws it. */
    if (kind === 'phone') {
      return '<div class="cawx-status"><span>20:27</span>' +
        '<span class="r">' + ICON.wifi + '<span class="cawx-bat"></span></span></div>' +
        '<div class="cawx-pnav"><span class="t">CAW Academy</span>' +
          '<span class="cawx-tools"><i>' + ICON.search + '</i><i>' + ICON.book + '</i></span></div>' +
        '<div class="cawx-page">' + body + '</div>' +
        '<div class="cawx-ptabs"><span class="on">' + ICON.home + '</span>' +
        '<span>' + ICON.saved + '</span><span>' + ICON.stats + '</span>' +
        '<span>' + ICON.gear + '</span><span>' + ICON.person + '</span></div>';
    }

    /* macOS: no status bar and no tab bar. Navigation lives in the window's own
       sidebar - Home / Saved / Stats, then Search and Glossary, then the course
       list, with Profile pinned at the foot. */
    if (kind === 'mac') {
      var navRow = function (icon, label, on) {
        return '<div class="cawx-mrow' + (on ? ' on' : '') + '">' + icon +
               '<span>' + label + '</span></div>';
      };
      var list = cat.courses.map(function (c) {
        return '<div class="cawx-mrow course">' + ICON.lesson +
               '<span>' + esc(c.long) + '</span></div>';
      }).join('');
      return '<div class="cawx-macwin">' +
        '<aside class="cawx-macside">' +
          '<div class="cawx-mtog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/>' +
            '<path d="M10 4v16"/></svg></div>' +
          navRow(ICON.home, 'Home', true) + navRow(ICON.saved, 'Saved') +
          navRow(ICON.stats, 'Stats') +
          '<div class="cawx-mdiv"></div>' +
          navRow(ICON.search, 'Search') + navRow(ICON.book, 'Glossary') +
          '<p class="cawx-msec">Courses</p>' + list +
          '<div class="cawx-mfoot">' + navRow(ICON.person, 'Profile') + '</div>' +
        '</aside>' +
        '<div class="cawx-macdetail"><div class="cawx-mactitle">CAW Academy</div>' +
        '<div class="cawx-page">' + body + '</div></div></div>';
    }

    return statusBar() + tabBar('Home', !live) +
      '<div class="cawx-shell">' + courseSidebar(null, live, cat) +
      '<div class="cawx-detail"><div class="cawx-navrow">' +
        '<span style="width:20px"></span><span class="cawx-navtitle">CAW Academy</span>' +
        (live
          ? '<span class="cawx-tools"><button type="button" data-caw-nav="search">' + ICON.search +
            '</button><button type="button" data-caw-demo="glossary">' + ICON.book + '</button></span>'
          : '<span class="cawx-tools"><i>' + ICON.search + '</i><i>' + ICON.book + '</i></span>') +
        '</div>' +
      '<div class="cawx-page">' + body + '</div></div></div>';
  }

  /* The sidebar OUTSIDE a lesson - the dashboard and the timed exam both show
     the course list, grouped by category, not the lesson list. It is built from
     the edition's catalogue, so it lists that authority's courses under that
     authority's names. */
  function courseSidebar(current, live, cat) {
    cat = cat || catalogue(CURRENT_FW);
    var h = '<aside class="cawx-side">' +
      '<div class="cawx-side-h">CAW Academy<svg class="tog" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/>' +
        '<path d="M10 4v16"/></svg></div>' +
      '<div class="cawx-side-list">' +
      (live
        ? '<button type="button" class="cawx-srow on" data-caw-nav="dashboard">'
        : '<div class="cawx-srow' + (current ? '' : ' on') + '">') + ICON.grid +
        '<span><span class="nm">Dashboard</span></span>' + (live ? '</button>' : '</div>');
    cat.groups.forEach(function (g) {
      h += '<p class="cawx-side-sec">' + g[0] + '</p>';
      g[1].forEach(function (c) {
        var on = current && c.long.indexOf(current) === 0,
            open = live && c.id === cat.openable;
        h += (open ? '<button type="button" class="cawx-srow" data-caw-demo="lesson">'
                   : '<div class="cawx-srow' + (on ? ' on grey' : '') +
                     (live ? ' dim' : '') + '">') + ICON.lesson +
             '<span><span class="nm">' + esc(c.long) + '</span></span>' +
             (open ? '</button>' : '</div>');
      });
    });
    return h + '</div></aside>';
  }

  /* =======================================================================
     6b. The rest of the app - the pages behind the tab bar
     ---------------------------------------------------------------------
     Tapping Saved, Stats, Settings or Profile inside a simulated screen opens
     that page of the app, reproduced from the device. Home returns to the
     screen the demo is about. Controls that lead nowhere in a preview are
     drawn dimmed and disabled, so nothing looks live and does nothing.
     ======================================================================= */

  /* The four editions. The third entry is the key the catalogue data is filed
     under in caw-content.js, so everything below is read from the real
     catalogue rather than retyped here. */
  var FRAMEWORK_ROWS = [
    ['EASA', '🇪🇺', 'EASA'], ['UK CAA', '🇬🇧', 'UK CAA'],
    ['UAE GCAA', '🇦🇪', 'UAE GCAA'], ['FAA', '🇺🇸', 'FAA']
  ];
  var CURRENT_FW = 0;          /* the edition the simulated app is showing */

  /* Where each course family sits on the dashboard, in order. A family absent
     from an edition simply has no entry in its `editions` block and drops out. */
  var CAT_GROUPS = [
    ['Introduction', ['aof']],
    ['Initial airworthiness', ['p21', 'cs', 'iawfam']],
    ['Continuing airworthiness', ['m', 'p43', 'camp', 'p39', 'p65', 'camo', 'p145',
      'partis', 'msg3', 'amp', 'reliability', 'arc', 'offshore']],
    ['Asset value', ['mec', 'lease', 'eng', 'recycle']],
    ['Essentials', ['hf', 'sms', 'ewis', 'fts']]
  ];

  /* The edition's own name for a course. The instrument differs by authority —
     EASA and the UK write Parts, the UAE writes CARs, the FAA writes 14 CFR —
     so a name is never carried across from one edition to another. */
  /* The full name, as the catalogue and the app's sidebar carry it. */
  var AOF_REGION = { 'EASA': 'EU', 'UK CAA': 'UK', 'UAE GCAA': 'UAE', 'FAA': 'US' };
  function longName(id, name, title, fw) {
    if (id === 'aof') { return 'Airline Operating Framework (' + AOF_REGION[fw] + ')'; }
    var dash = title.indexOf(' \u2014 ');
    return dash > 0 ? name + ' ' + title.slice(dash + 3) : title;
  }

  function courseName(id, label, fw) {
    if (fw === 'UAE GCAA') { return label.replace(/^Part-/, 'CAR-'); }
    if (fw === 'UK CAA') { return label.replace(/^Part-/, 'UK Part-'); }
    if (fw === 'FAA') {
      if (id === 'p145') { return '14 CFR Part 145'; }
      if (id === 'p21') { return '14 CFR Part 21'; }
      if (id === 'p43') { return '14 CFR Part 43 & 91'; }
      if (id === 'p39') { return '14 CFR Part 39'; }
      if (id === 'p65') { return '14 CFR Part 65'; }
    }
    return label;
  }

  /* One edition's catalogue, built from the real per-edition lesson counts. */
  function catalogue(k) {
    var row = FRAMEWORK_ROWS[k || 0], fw = row[2], groups = [], flat = [];
    CAT_GROUPS.forEach(function (g) {
      var items = [];
      g[1].forEach(function (id) {
        var c = C.courses[id], ed = c && c.editions && c.editions[fw];
        if (!ed) { return; }
        var nm = courseName(id, c.label, fw);
        var item = { id: id, name: nm, group: g[0],
                     long: longName(id, nm, c.title, fw),
                     blurb: c.description.split('. ')[0].replace(/\.$/, ''),
                     lessons: ed[0], hours: ed[1], free: !!c.free };
        items.push(item); flat.push(item);
      });
      if (items.length) { groups.push([g[0], items]); }
    });
    return { key: k || 0, label: row[0], flag: row[1], fw: fw,
             groups: groups, courses: flat,
             /* the one course this preview carries in full; the rest are dimmed
                rather than opening a course that is not really here */
             openable: (k || 0) === 0 ? 'm' : null };
  }
  var ICON_EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>';

  /* One inset list of rows, the way iOS groups them. A row that leads somewhere
     is a real button; a row that does not is dimmed and disabled. */
  function rowList(rows) {
    var h = '<div class="cawx-arows">';
    rows.forEach(function (r) {
      var to = r.nav ? ' data-caw-nav="' + r.nav + '"'
             : r.demo ? ' data-caw-demo="' + r.demo + '"' : '';
      h += '<button type="button" class="cawx-arow' + (to ? '' : ' dim') + '"' + to +
        (to ? '' : ' disabled') + '>' +
        (r.icon ? '<span class="ic" data-t="' + (r.tone || 'indigo') + '">' + r.icon + '</span>' : '') +
        '<span class="tx"><b>' + r.label + '</b>' +
          (r.sub ? '<small>' + r.sub + '</small>' : '') + '</span>' +
        (r.badge ? '<span class="bdg">' + r.badge + '</span>' : '') +
        (r.value ? '<span class="val">' + r.value + '</span>' : '') +
        '<span class="cv">' + (r.ext ? ICON_EXT : ICON.chevron) + '</span></button>';
    });
    return h + '</div>';
  }

  var PAGES = {}, AFTER = {};

  /* --- Home, as the dashboard ------------------------------------------- */
  PAGES.dashboard = function () { return dashboard('pad', true); };
  AFTER.dashboard = function (screen) {
    var chip = qs('#cawxFwChip', screen), menu = qs('#cawxFwMenu', screen);
    if (!chip) { return; }
    chip.addEventListener('click', function () {
      var openNow = menu.hidden;
      menu.hidden = !openNow;
      chip.setAttribute('aria-expanded', String(openNow));
    });
    qsa('[data-fw]', menu).forEach(function (b) {
      b.addEventListener('click', function () {
        /* Choosing an edition reloads the catalogue, as the app does: the
           courses, their names and their lesson counts all change with it. */
        CURRENT_FW = +b.getAttribute('data-fw');
        paintPage(screen, 'dashboard');
        CAW.track('demo_framework_pick', { framework: FRAMEWORK_ROWS[CURRENT_FW][0] });
      });
    });
  };

  /* --- Saved: the hub, and the saved-lesson list ------------------------- */
  PAGES.saved = function () {
    return shell({
      tab: 'Saved', solo: true, title: 'Saved', tools: false,
      page: '<div class="cawx-page">' + rowList([
        { icon: ICON.marker, tone: 'plain', label: 'My notes',
          sub: '7 highlights, 5 with notes', demo: 'notes' },
        { icon: ICON.saved, tone: 'plain', label: 'Saved lessons',
          sub: '3 saved lessons, 1 with a bookmark', nav: 'savedLessons' }
      ]) + '</div>'
    });
  };

  var SAVED_LESSONS = [
    { course: 'PART-CAMO', code: 'CAMO.A.005', title: 'CAMO.A.005 - Scope',
      note: true, mark: false },
    { course: 'RELIABILITY', code: 'REL 01',
      title: 'Reliability to the OEM, Availability to the Airline', note: true, mark: false },
    { course: 'AIRCRAFT LEASING', code: 'LEASE 00', title: 'Why Airlines Lease Aircraft',
      note: false, mark: true }
  ];
  PAGES.savedLessons = function (state) {
    var filter = (state && state.filter) || 'All';
    var rows = SAVED_LESSONS.filter(function (r) {
      return filter === 'All' || (filter === 'Bookmarked' ? r.mark : true);
    }).map(function (r) {
      return '<div class="cawx-slrow"><span class="mk">' + ICON.saved +
        (r.mark ? '<i class="bm">' + ICON.bookmark + '</i>' : '') + '</span>' +
        '<span class="tx"><span class="hd"><em>' + r.course + '</em>' + r.code +
          (r.note ? '<b class="nt">' + ICON.marker + ICON.notes + '</b>' : '') + '</span>' +
          '<b>' + esc(r.title) + '</b></span>' +
        '<span class="tr" aria-hidden="true">' + ICON.bin + '</span></div>';
    }).join('');
    return shell({
      tab: 'Saved', solo: true, title: 'Saved lessons', tools: false, back: 'saved',
      page: '<div class="cawx-page">' +
        '<div class="cawx-slbar"><div class="cawx-seglist" role="tablist">' +
          ['All', 'Saved', 'Bookmarked'].map(function (n) {
            return '<button type="button" role="tab" data-sl="' + n + '" aria-selected="' +
              (n === filter) + '">' + n + '</button>';
          }).join('') +
        '</div><span class="cawx-nfilter dim">' + ICON.book + 'All courses' + ICON.caret + '</span></div>' +
        rows + '</div>'
    });
  };
  AFTER.savedLessons = function (screen) {
    qsa('[data-sl]', screen).forEach(function (b) {
      b.addEventListener('click', function () {
        paintPage(screen, 'savedLessons', { filter: b.getAttribute('data-sl') });
        CAW.track('demo_saved_filter', { filter: b.getAttribute('data-sl') });
      });
    });
  };

  /* --- Stats ------------------------------------------------------------- */
  var STAT_COURSES = [
    ['Airline Operating Framework (EU)', '36/36', 100, '92%', '92%', '0'],
    ['Part-M Continuing Airworthiness Management Requirements', '39/65', 60, '84%', '–', '4'],
    ['Part-CAMO Continuing Airworthiness Management Organisation', '0/32', 0, '–', '–', '0']
  ];
  PAGES.stats = function () {
    var cards = STAT_COURSES.map(function (c) {
      return '<div class="cawx-stcard">' +
        '<div class="hd"><span class="ic">' + ICON.lesson + '</span><b>' + esc(c[0]) + '</b>' +
          '<span class="n">' + c[1] + '</span></div>' +
        '<div class="bar"><i style="width:' + c[2] + '%"></i></div>' +
        '<div class="tiles">' +
          '<span class="t"><b' + (c[3] !== '–' ? ' class="ok"' : '') + '>' + c[3] + '</b>Quiz avg</span>' +
          '<span class="t"><b>' + c[4] + '</b>Best exam</span>' +
          '<span class="t"><b>' + c[5] + '</b>To review</span>' +
        '</div></div>';
    }).join('');
    return shell({
      tab: 'Stats', solo: true, title: 'Stats', tools: false,
      page: '<div class="cawx-page">' + rowList([
        { icon: ICON.share, label: 'Export progress report',
          sub: 'A PDF you can share with your training manager' },
        { icon: ICON.again, tone: 'red', label: 'Manage &amp; reset progress',
          sub: 'Per-course detail and reset' }
      ]) +
      '<div class="cawx-stov"><span class="ring"><i>44%</i></span>' +
        '<span class="px"><b>Overall progress</b><small>75 of 133 lessons read</small>' +
        '<small>4 questions to review</small></span></div>' + cards + '</div>'
    });
  };

  /* --- Settings ---------------------------------------------------------- */
  PAGES.settings = function () {
    return shell({
      tab: 'Settings', solo: true, title: 'Settings', tools: false,
      page: '<div class="cawx-page">' +
        '<p class="cawx-setsec">Appearance</p>' +
        rowList([{ label: 'Theme', value: 'Light' }]) +
        '<p class="cawx-setsec">Text size</p>' +
        rowList([{ label: 'Text size', value: 'Standard' }]) +
        '<p class="cawx-setnote">Sizes the lesson reading text (menus and controls stay the ' +
          'same). Standard is the original size.</p>' +
        '<p class="cawx-setsec">Reading voice</p>' +
        rowList([{ label: 'Voice', value: 'Fable · British', demo: 'voice' }]) +
        '<p class="cawx-setnote">Used when a lesson is read aloud. Choosing a voice plays a ' +
          'sample.</p>' +
        '<p class="cawx-setsec">Notifications</p>' +
        rowList([{ icon: ICON.warn, tone: 'amber', label: 'Notifications' }]) +
        '<p class="cawx-setsec">Help &amp; info</p>' +
        rowList([
          { icon: ICON.info, label: 'What’s new' },
          { icon: ICON.share, tone: 'green', label: 'Feedback' },
          { icon: ICON.bulb, label: 'About CAW Academy' }
        ]) +
        '<p class="cawx-setsec">Version &amp; legal</p>' +
        '<div class="cawx-arows"><div class="cawx-vrow"><span>Version</span><b>9.5</b></div>' +
        '<div class="cawx-vrow"><span>Content updated</span><b>28 Aug 2026</b></div>' +
        '<div class="cawx-vrow link"><span>Privacy Policy</span></div>' +
        '<div class="cawx-vrow link"><span>Terms of Use</span></div></div></div>'
    });
  };

  /* --- Profile ----------------------------------------------------------- */
  PAGES.profile = function () {
    return shell({
      tab: 'Profile', solo: true, title: 'Profile', tools: false,
      page: '<div class="cawx-page">' +
        '<div class="cawx-pcard"><span class="av">' + ICON.person + '</span>' +
          '<b>' + esc(S.certificate.holder.split(' ')[0]) + '</b></div>' +
        rowList([
          { icon: ICON.person, label: 'My account' },
          { icon: ICON.bank, label: 'My subscriptions' },
          { icon: ICON.award, tone: 'amber', label: 'My certificates', demo: 'certificate' },
          { icon: ICON.due, tone: 'red', label: 'Courses due', badge: '1' }
        ]) +
        rowList([{ icon: ICON.link, tone: 'blue', label: 'Follow on LinkedIn', ext: true }]) +
        '<div class="cawx-arows"><div class="cawx-signout">Sign out</div></div></div>'
    });
  };

  /* --- Search, as the sheet over the dashboard --------------------------- */
  PAGES.search = function () {
    return dashboard('pad', true) +
      '<div class="cawx-dim" data-caw-nav="back" data-caw-fallback="page:dashboard"></div>' +
      '<div class="cawx-sheet">' +
        '<div class="cawx-sheet-h">Search' +
          '<button type="button" class="done" data-caw-nav="back" ' +
            'data-caw-fallback="page:dashboard">Done</button></div>' +
        '<div class="cawx-gl-field">' + ICON.search +
          '<input type="search" id="cawxSe" placeholder="Search lessons, content, quiz" ' +
          'aria-label="Search lessons, content and quiz" autocomplete="off" spellcheck="false"></div>' +
        '<div class="cawx-se-body" id="cawxSeBody" role="status" aria-live="polite"></div>' +
      '</div>';
  };
  AFTER.search = function (screen) {
    var input = qs('#cawxSe', screen), body = qs('#cawxSeBody', screen);
    if (!input) { return; }
    /* the preview searches the lessons it carries; the app searches every course */
    function paint(term) {
      var q = (term || '').trim().toLowerCase();
      if (!q) {
        body.innerHTML = '<div class="cawx-se-empty">' + ICON.search +
          '<b>Search courses</b><span>Find lessons by title, content or quiz.</span></div>';
        return;
      }
      var hits = D.siblings.filter(function (l) {
        return (l.id + ' ' + l.title + ' ' + l.subtitle).toLowerCase().indexOf(q) >= 0;
      });
      if (!hits.length) {
        body.innerHTML = '<div class="cawx-se-empty">' + ICON.search +
          '<b>No match in this preview</b><span>The preview carries ' + D.siblings.length +
          ' lessons of Part-M. The app searches all 1,600+ lessons.</span></div>';
        return;
      }
      body.innerHTML = hits.map(function (l) {
        return '<button type="button" class="cawx-se-hit" data-caw-demo="lesson">' +
          '<span class="cd">' + esc(l.id) + '</span>' +
          '<span class="tx"><b>' + esc(l.title) + '</b><small>' + esc(D.course.short) +
          ' · ' + esc(l.subtitle) + '</small></span>' + ICON.chevron + '</button>';
      }).join('');
    }
    var t = null;
    input.addEventListener('input', function () {
      w.clearTimeout(t);
      t = w.setTimeout(function () {
        paint(input.value);
        CAW.track('demo_app_search', { q: input.value.slice(0, 24) });
      }, 120);
    });
    paint('');
  };

  /* Paint one of those pages into a simulated screen, remembering where the
     visitor was so Done and Back can return there. */
  function paintPage(screen, name, state, noPush) {
    if (!PAGES[name]) { return; }
    if (!noPush && name !== CURRENT_PAGE) {
      NAV_STACK.push(CURRENT_PAGE ? { p: CURRENT_PAGE } : { d: CURRENT_DEMO });
      if (NAV_STACK.length > 12) { NAV_STACK.shift(); }
    }
    CURRENT_PAGE = name;
    screen.innerHTML = PAGES[name](state);
    if (AFTER[name]) { AFTER[name](screen); }
  }

  /* Step back one place. With no trail to follow - the visitor came straight to
     this screen from a pill - fall back to whatever the screen sits on top of,
     named by the control itself (`demo:lesson`, `page:dashboard`). */
  function navBack(screen, fallback) {
    var at = NAV_STACK.pop();
    if (at && at.p) { paintPage(screen, at.p, null, true); return; }
    if (at && at.d) { openDemo(at.d, undefined, true); return; }
    var fb = (fallback || 'page:dashboard').split(':');
    if (fb[0] === 'demo') { openDemo(fb[1], undefined, true); }
    else { paintPage(screen, fb[1], null, true); }
  }

  /* =======================================================================
     7. Wiring
     ======================================================================= */
  var OPENERS = {
    group: openGroup, benefit: openBenefit, clarity: openClarity,
    track: openTrack, framework: openFramework, demo: openDemo
  };

  /* ------------------------------------------------------------------------
     Navigation INSIDE a simulated screen. The tab bar, the sidebar crumb and
     the rows on each page all go through here: the click is caught once, the
     enclosing screen is found, and that page is painted into it. `home` hands
     back to whichever demo the pop-up is showing, so the pills stay honest.
     ------------------------------------------------------------------------ */
  d.addEventListener('click', function (e) {
    var nav = e.target.closest && e.target.closest('[data-caw-nav]');
    if (!nav || nav.disabled) { return; }
    var screen = nav.closest('.cawx-screen');
    if (!screen) { return; }
    e.preventDefault();
    e.stopPropagation();
    var to = nav.getAttribute('data-caw-nav');
    if (to === 'home') { paintPage(screen, 'dashboard'); }
    else if (to === 'back') { navBack(screen, nav.getAttribute('data-caw-fallback')); }
    else { paintPage(screen, to); }
    CAW.track('demo_nav', { to: to });
  }, true);

  d.addEventListener('click', function (e) {
    /* an in-modal link to a page section: close the pop-up, then scroll there */
    var goTo = e.target.closest && e.target.closest('[data-cawx-goto]');
    if (goTo) {
      e.preventDefault();
      var sel = goTo.getAttribute('data-cawx-goto');
      Modal.close();
      w.setTimeout(function () {
        var target = qs(sel);
        if (target && target.scrollIntoView) {
          target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        }
      }, 80);
      CAW.track('demo_goto_gallery', {});
      return;
    }
    /* a control INSIDE a simulated screen that switches to another screen */
    var jump = e.target.closest && e.target.closest('[data-caw-demo]');
    if (jump) {
      e.preventDefault();
      openDemo(jump.getAttribute('data-caw-demo'), undefined, true);
      CAW.track('demo_jump', { to: jump.getAttribute('data-caw-demo') });
      return;
    }
    var trial = e.target.closest && e.target.closest('[data-cawx-trial]');
    if (trial) {
      e.preventDefault();
      Modal.close();
      var opener = qs('.open-trial');
      if (opener) { w.setTimeout(function () { opener.click(); }, 60); }
      return;
    }
    var t = e.target.closest && e.target.closest('[data-caw-open]');
    if (!t) { return; }
    e.preventDefault();
    t.setAttribute('data-visited', 'true');
    var kind = t.getAttribute('data-caw-open');
    if (OPENERS[kind]) { OPENERS[kind](t.getAttribute('data-caw-id'), t); }
  });

  /* --- deep links: #demo-glossary, #framework-faa, #group-camo-staff ------- */
  function fromHash() {
    var h = (w.location.hash || '').replace('#', '');
    if (!h) { return; }
    var parts = h.split('-'), kind = parts.shift(), id = parts.join('-');
    if (OPENERS[kind] && id) {
      OPENERS[kind](id, qs('[data-caw-open="' + kind + '"][data-caw-id="' + id + '"]'));
    }
  }
  w.addEventListener('hashchange', fromHash);
  if (d.readyState !== 'loading') { fromHash(); }
  else { d.addEventListener('DOMContentLoaded', fromHash); }

  /* type CAW.build in the console to see which copy the browser is running */
  CAW.build = '2026-08-28 19:34';
  CAW.open = function (kind, id) { if (OPENERS[kind]) { OPENERS[kind](id, null); } };
  CAW.closeModal = Modal.close;

})(window, document);
