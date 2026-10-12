/* CAW Academy — the printable certificate, in the admin console.
   =============================================================================

   THIS IS THE THIRD RENDERER OF ONE DOCUMENT, and that is the whole problem it
   has to solve. The learner's copy is drawn by SwiftUI's ImageRenderer on iOS
   (CertificateView.swift) and by a Canvas on Android (CertificateRenderer.kt).
   An administrator exporting a member's certificate must produce the SAME
   document — it is the artefact that goes to an auditor, beside the learner's
   own copy of it.

   So nothing here is designed. Every number below is copied from
   CertificateRenderer.kt, which in turn carries iOS's numbers with the line it
   took each from. Where the two apps already agree, this agrees with both; where
   this file departs from them, it says so and why (there are three, all marked
   DIVERGES, all forced by the medium).

   WHY SVG, AND NOT HTML OR A CANVAS
   ---------------------------------
   The apps draw procedurally: `drawText(string, x, baselineY)` with a centre
   alignment. SVG's `<text x y text-anchor="middle">` is that same model — y IS
   the baseline — so every coordinate transfers verbatim with no translation and
   nothing to get subtly wrong. HTML would have meant deriving each baseline from
   line-box metrics, which is exactly the kind of re-derivation that produces a
   near-miss. A canvas would have transferred just as cleanly but prints as a
   raster: the learner's copy is vector, and a reprint that goes soft under a
   magnifier is visibly the lesser document.

   The output is produced by the browser's own print-to-PDF, the pattern this
   console already uses for its reports (`exportRosterPdf`). No new dependency.

   WHAT THE CALLER MUST SUPPLY is one roster certificate, as the server sends it:
   every printed line comes from the registry row, never from the roster's live
   data — see RosterCertificate in assignmentService.ts for why the holder name
   and the course title are snapshots.
   ========================================================================== */

(function (global) {
  "use strict";

  // ── The page, and the fixed print palette ───────────────────────────────
  // CertificateRenderer.kt:101-109. Fixed, not tokenised: a certificate is the
  // same document whatever theme the console is being read in.
  var W = 842;
  var H = 595;
  var INDIGO = "#3E44B5";
  var AMBER = "#FB8C00";
  var INK = "#0C1843";
  var MUTED = "#666B80"; // Color.rgb(102, 107, 128)
  var CREAM = "#FBF9F1";

  // The app's own faces. `opsz` is PINNED at 20 and optical sizing is turned
  // off, which is not a detail: Source Serif 4 carries an optical-size axis
  // (8-60) and a browser left to itself drives it from the font size, so the
  // 40pt name would be drawn at opsz 40 — a visibly different cut from the one
  // Android gets, where `Typeface.create(tf, weight, false)` moves the weight
  // axis alone and leaves opsz at the font's default of 20.
  var SERIF = '"Source Serif 4", Georgia, serif';
  var SANS = '"Inter", Arial, Helvetica, sans-serif';
  var SERIF_VAR = '"opsz" 20';
  // The certificate number is set in a monospaced face so its groups line up,
  // as both apps set it (iOS `.monospaced`, Android `Typeface.MONOSPACE`).
  var MONO = "ui-monospace, Menlo, Consolas, monospace";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Measuring ───────────────────────────────────────────────────────────
  /* The wrap has to be MEASURED, because the apps measure it: the course title
     and the disclaimer are wrapped by `Paint.measureText` into a fixed box, and
     where the line breaks fall is the most visible thing on the page. A canvas
     is used purely as a ruler here — nothing is drawn on it. */
  var ruler = null;
  function measure(text, font, letterSpacing) {
    if (!ruler) ruler = document.createElement("canvas").getContext("2d");
    ruler.font = font;
    // Chrome 99+ / Safari 17.4+. Where it is unsupported the measurement is
    // short by the tracking, which can only cost a slightly early line break on
    // the title — a wrong break, never an overlap, because the layout below
    // flows from the line COUNT rather than from fixed baselines.
    try { ruler.letterSpacing = (letterSpacing || 0) + "px"; } catch (e) { /* older engine */ }
    var w = ruler.measureText(text).width;
    try { ruler.letterSpacing = "0px"; } catch (e) { /* ignore */ }
    return w;
  }

  /** CertificateRenderer.kt `wrapLines` — greedy, on spaces, exactly as both
   *  apps break their text. */
  function wrapLines(text, maxW, font, letterSpacing) {
    var words = String(text).split(" ");
    var lines = [];
    var cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur === "" ? words[i] : cur + " " + words[i];
      if (measure(t, font, letterSpacing) > maxW && cur !== "") {
        lines.push(cur);
        cur = words[i];
      } else {
        cur = t;
      }
    }
    if (cur !== "") lines.push(cur);
    return lines;
  }

  /** Inter's own dynamic tracking, in ems: a + b * e^(c * size).
   *  CertificateRenderer.kt:491. Inter is drawn to tighten as it grows and
   *  ships this curve for the purpose; it returns about zero at the sizes the
   *  rest of the document uses, which is why only the title is tracked. */
  function interTracking(size) {
    return -0.0223 + 0.185 * Math.exp(-0.1745 * size);
  }

  // ── The document ────────────────────────────────────────────────────────
  /**
   * Build the certificate as an SVG string.
   *
   * @param {object} c  One roster certificate:
   *   holderName, courseTitle, number, issuedAt (ISO), examScore|null,
   *   durationHours|null, disclaimer|null, verifyUrl|null
   */
  function svg(c) {
    var cx = W / 2;
    var out = [];
    function push(s) { out.push(s); }

    /* The two-colour wordmark, MEASURED AND PLACED rather than set as two
       tspans in one line.
       The tspan version lost the space in "CAW Academy": the separating space
       is trailing inside the first tspan, and whitespace handling there varies
       between renderers — one of them drew "CAWcademy". The apps do not have
       the problem because they do not have tspans: Android measures "CAW " and
       advances by it (CertificateRenderer.kt:266-276), and this now does the
       same, which also makes the centring arithmetic identical to Android's
       rather than left to a text engine. */
    function wordmark(x, y, size, centred) {
      var font = "700 " + size + 'px "Source Serif 4"';
      var cawW = measure("CAW ", font, 0);
      var left = centred ? x - (cawW + measure("Academy", font, 0)) / 2 : x;
      function part(s, px, fill) {
        return text(s, px, y, {
          size: size, weight: 700, family: SERIF, variation: SERIF_VAR, fill: fill,
        });
      }
      return part("CAW", left, INK) + part("Academy", left + cawW, INDIGO);
    }

    function text(s, x, y, opts) {
      opts = opts || {};
      // ONE font-family ATTRIBUTE. An earlier version appended a second one for
      // the monospaced certificate number instead of replacing the first, which
      // is invalid XML — a strict parser refuses the document outright and a
      // browser quietly keeps the FIRST, drawing the number in the sans face.
      // The silent half is the dangerous one: the page still renders, and only
      // the one line a third party checks against the registry is wrong.
      var family = opts.mono ? MONO : (opts.family || SANS);
      var a = [
        'x="' + x + '"', 'y="' + y + '"',
        'font-family="' + esc(family) + '"',
        'font-size="' + opts.size + '"',
        'font-weight="' + (opts.weight || 400) + '"',
        'fill="' + (opts.fill || MUTED) + '"',
      ];
      if (opts.anchor) a.push('text-anchor="' + opts.anchor + '"');
      if (opts.tracking) a.push('letter-spacing="' + opts.tracking + '"');
      if (opts.opacity) a.push('opacity="' + opts.opacity + '"');
      if (opts.variation) a.push('font-variation-settings=\'' + opts.variation + "'");
      return "<text " + a.join(" ") + ' xml:space="preserve">' + esc(s) + "</text>";
    }

    push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + 'pt" height="' + H +
      'pt" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Certificate of completion">');

    // THE PAGE IS CREAM, NOT WHITE (`c.drawColor(CREAM)` — iOS's page colour).
    // Easy to leave out, because an SVG with no background looks finished on a
    // white screen and prints on white paper; it is only wrong beside the
    // learner's own copy, which is the one place it will be seen.
    push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + CREAM + '"/>');

    // THE FAINT BRAND WATERMARK — iOS's `checkmark.seal.fill` at 360pt, indigo
    // at 5%. Android draws it as two rounded squares 45 degrees apart (which is
    // what the scalloped seal IS — an eight-pointed star with soft points, not
    // a ring and not a circle of blobs) with the tick knocked OUT, so the two
    // never double their opacity where they cross. The knockout is a mask here
    // and a Path.Op.DIFFERENCE there; the geometry is identical.
    var r = 150, mid = H / 2, rx = r * 0.34;
    push('<defs><mask id="cawSealTick" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '">');
    push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>');
    push('<polyline points="' + (cx - 62) + "," + (mid + 4) + " " + (cx - 20) + "," + (mid + 48) +
      " " + (cx + 64) + "," + (mid - 54) + '" fill="none" stroke="#000" stroke-width="30" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>');
    push("</mask></defs>");
    // The group carries the opacity so the two overlapping squares composite as
    // a union rather than doubling in the overlap.
    push('<g mask="url(#cawSealTick)" fill="' + INDIGO + '" opacity="0.051">');
    push('<rect x="' + (cx - r) + '" y="' + (mid - r) + '" width="' + (2 * r) + '" height="' +
      (2 * r) + '" rx="' + rx + '" ry="' + rx + '"/>');
    push('<rect x="' + (cx - r) + '" y="' + (mid - r) + '" width="' + (2 * r) + '" height="' +
      (2 * r) + '" rx="' + rx + '" ry="' + rx + '" transform="rotate(45 ' + cx + " " + mid + ')"/>');
    push("</g>");

    // The double border: indigo frame inset 18 (3pt stroke, 6pt corner) and a
    // thin amber line inset 25 (1pt stroke, 3pt corner).
    push('<rect x="18" y="18" width="' + (W - 36) + '" height="' + (H - 36) +
      '" rx="6" ry="6" fill="none" stroke="' + INDIGO + '" stroke-width="3" opacity="0.85"/>');
    push('<rect x="25" y="25" width="' + (W - 50) + '" height="' + (H - 50) +
      '" rx="3" ry="3" fill="none" stroke="' + AMBER + '" stroke-width="1" opacity="0.902"/>');

    push(wordmark(cx, 96, 26, true));

    push(text("CERTIFICATE OF COMPLETION", cx, 118,
      { size: 11, weight: 600, anchor: "middle", tracking: 3 }));

    push(text("This is to certify that", cx, 188, { size: 15, anchor: "middle" }));

    push(text(c.holderName || "", cx, 238,
      { size: 40, weight: 700, fill: INK, anchor: "middle", family: SERIF, variation: SERIF_VAR }));

    // ── The title block flows, and the caption above it flows with it ──────
    // Everything above the caption is absolute; from here down the layout is
    // driven by how many lines the title takes, exactly as
    // CertificateRenderer.kt:314-397 describes. A one-line title still lands on
    // 288 / 322 / 372 / 390, so a reprint of an existing certificate is
    // unchanged.
    var caption = "has successfully completed the course";
    var captionFont = "400 15px " + SANS;
    var ruleHalf = measure(caption, captionFont, 0) / 2;

    // The amber rule is as wide as the caption beneath it (SME, 2026-10-11),
    // and is NOT lifted with it: the name above sits on a fixed baseline at 238
    // and a 40pt serif descender reaches ~248, so a rule rising with the
    // caption would strike the tail of a name like "Jorge".
    push('<rect x="' + (cx - ruleHalf) + '" y="256" width="' + (2 * ruleHalf) +
      '" height="2" fill="' + AMBER + '"/>');

    var titleSize = 24;
    var titleFont = function (s) { return "700 " + s + "px " + SANS; };
    var tracking = function (s) { return interTracking(s) * s; }; // ems -> px
    var TITLE_BOX = W - 148; // Android's widened box; this draws in Inter too.
    var lines = wrapLines(c.courseTitle || "", TITLE_BOX, titleFont(titleSize), tracking(titleSize));
    // A fourth line cannot be drawn — it would put the certificate number on
    // top of the QR block at 448 — so it is prevented rather than overlapped.
    while (lines.length > 3 && titleSize > 20) {
      titleSize -= 1;
      lines = wrapLines(c.courseTitle || "", TITLE_BOX, titleFont(titleSize), tracking(titleSize));
    }
    var leading = titleSize * 29 / 24;
    var lift = Math.min((lines.length - 1) * leading / 2, 10);

    push(text(caption, cx, 288 - lift, { size: 15, anchor: "middle" }));

    var titleTop = 322 - lift;
    for (var i = 0; i < lines.length; i++) {
      push(text(lines[i], cx, titleTop + i * leading, {
        size: titleSize, weight: 700, fill: INDIGO, anchor: "middle",
        tracking: tracking(titleSize),
      }));
    }
    var titleLast = titleTop + (lines.length - 1) * leading;

    // "Duration: 6 hours    ·    11 October 2026    ·    exam score 100%"
    var sep = "    ·    ";
    var meta = "";
    // Duration and the disclaimer are the two lines the registry does not hold;
    // the server derives them from the generated course-facts table and sends
    // null for a course key that has left the catalogue. A missing line is a
    // visible gap — a guessed one would be a false record.
    if (c.durationHours != null) {
      meta += "Duration: " + c.durationHours + " hour" + (c.durationHours === 1 ? "" : "s");
    }
    var when = printedDate(c.issuedAt);
    meta += (meta ? sep : "") + when;
    if (c.examScore != null) meta += sep + "exam score " + c.examScore + "%";
    var metaY = titleLast + 50;
    push(text(meta, cx, metaY, { size: 13, weight: 500, fill: INK, anchor: "middle" }));

    // The certificate number: a 10pt label beside the number itself at 11 in a
    // monospaced face, the pair centred — so the two are drawn separately.
    var label = "Certificate No.  ";
    var labelW = measure(label, "400 10px " + SANS, 0);
    var idW = measure(c.number || "", "400 11px " + MONO, 0);
    var numX = cx - (labelW + idW) / 2;
    var numY = metaY + 18;
    push(text(label, numX, numY, { size: 10 }));
    push(text(c.number || "", numX + labelW, numY, { size: 11, mono: true }));

    // The foot: issuer on the left, QR on the right, both inset 70.
    push(text("Issued by", 70, 486, { size: 9 }));
    push(wordmark(70, 504, 15, false));
    push(text("Airworthiness made learnable", 70, 517, { size: 9 }));

    if (c.verifyUrl) {
      var qSize = 56, qLeft = W - 70 - qSize, qTop = 448;
      push(qrSvg(c.verifyUrl, qLeft, qTop, qSize));
      push(text("Scan to verify", qLeft + qSize / 2, qTop + qSize + 9, { size: 7, anchor: "middle" }));
    }

    if (c.disclaimer) {
      var dLines = wrapLines(c.disclaimer, W - 140, "400 7px " + SANS, 0);
      for (var j = 0; j < dLines.length; j++) {
        push(text(dLines[j], cx, 538 + j * 9, { size: 7, anchor: "middle", opacity: 0.85 }));
      }
    }

    push("</svg>");
    return out.join("");
  }

  /** The printed date.
   *
   *  DIVERGES FROM THE APPS, DELIBERATELY: they format `Date(dateMillis)` in the
   *  device's own time zone, which is right for a learner printing their own
   *  certificate. An administrator is a third party, often in another office, and
   *  the date on a record should not depend on who pressed print — a certificate
   *  issued at 23:30 UTC would otherwise read as the next day in Dubai and the
   *  same day in London. This prints the registry's date, in UTC, which is also
   *  the date the public verify page reports. */
  function printedDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var months = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];
    return d.getUTCDate() + " " + months[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  // ── QR ──────────────────────────────────────────────────────────────────
  /* A QR encoder, because neither this console nor the server has one — the
     apps use ZXing (Android) and CoreImage (iOS), and the printed page needs the
     same scannable square or it is a different document.

     IT DOES NOT HAVE TO MATCH THE APPS BIT FOR BIT, and that is worth stating
     because it looks as though it should. A QR symbol is not canonical: the mask
     is chosen by a penalty score and the two apps' libraries may already pick
     differently for the same URL. What has to match is what it SCANS to.

     Scope is deliberately narrow — byte mode, error correction M, versions 1-10.
     That covers a verify URL several times over (version 10 holds 213 bytes
     against the ~58 this prints) and leaves out the tables that would never be
     reached. It throws rather than truncating if a payload ever exceeds it: a
     silently wrong QR is worse than a missing one, because it looks verifiable.

     VERIFIED BY DECODING, NOT BY READING. Symbols were generated for payloads
     from 1 to 213 bytes and put through a QR decoder; every one came back as
     the exact URL that went in. Two notes from that run, both worth keeping:

     * The first version of `writeFormat` had the two format copies transposed.
       Every function pattern still looked right — finders, timing and alignment
       all matched a reference symbol — and only fifteen modules were wrong. It
       was invisible to inspection and obvious to a decoder.
     * Versions 7 and 9 failed to decode in that harness, and so did the
       REFERENCE encoder's symbols at those versions. It is a limitation of that
       decoder, not of either encoder. Do not "fix" it here.

     Comparing module-for-module against another encoder is NOT a valid check:
     a QR symbol is not canonical. The mask is chosen by a penalty score, and a
     library that splits a URL into byte and alphanumeric segments produces
     entirely different codewords for the same string. Decode it instead. */

  var EC_M = { // [data codewords, ec codewords per block, blocks]
    1: [16, 10, 1], 2: [28, 16, 1], 3: [44, 26, 1], 4: [64, 18, 2], 5: [86, 24, 2],
    6: [108, 16, 4], 7: [124, 18, 4], 8: [154, 22, 4], 9: [182, 22, 5], 10: [216, 26, 5],
  };
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
    7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };

  var GF_EXP = new Uint8Array(512), GF_LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x; GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();
  function gfMul(a, b) { return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]; }

  function rsGenerator(n) {
    var poly = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= gfMul(poly[j], 1);
        next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, n) {
    var gen = rsGenerator(n);
    var rem = new Array(n).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift(); rem.push(0);
      for (var j = 0; j < n; j++) rem[j] ^= gfMul(gen[j + 1], factor);
    }
    return rem;
  }

  function utf8Bytes(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c < 0xdc00) {
        var cp = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function qrCodewords(text) {
    var bytes = utf8Bytes(text);
    var version = 0;
    for (var v = 1; v <= 10; v++) {
      var countBits = v < 10 ? 8 : 16;
      if (EC_M[v][0] * 8 >= 4 + countBits + bytes.length * 8) { version = v; break; }
    }
    if (!version) throw new Error("certificate QR payload too long: " + bytes.length + " bytes");

    var bits = [];
    function put(value, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((value >> i) & 1);
    }
    put(4, 4);                                   // byte mode
    put(bytes.length, version < 10 ? 8 : 16);
    for (var i = 0; i < bytes.length; i++) put(bytes[i], 8);

    var capacity = EC_M[version][0] * 8;
    for (var t = 0; t < 4 && bits.length < capacity; t++) bits.push(0);  // terminator
    while (bits.length % 8 !== 0) bits.push(0);
    var data = [];
    for (var b = 0; b < bits.length; b += 8) {
      var byte = 0;
      for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[b + k];
      data.push(byte);
    }
    var pads = [0xec, 0x11], pi = 0;
    while (data.length < EC_M[version][0]) data.push(pads[pi++ % 2]);

    // Split into blocks, RS-encode each, then interleave.
    var total = EC_M[version][0], ecLen = EC_M[version][1], blocks = EC_M[version][2];
    var short = Math.floor(total / blocks), extra = total % blocks;
    var dBlocks = [], eBlocks = [], at = 0;
    for (var n = 0; n < blocks; n++) {
      var len = short + (n >= blocks - extra ? 1 : 0);
      var chunk = data.slice(at, at + len); at += len;
      dBlocks.push(chunk);
      eBlocks.push(rsEncode(chunk, ecLen));
    }
    var out = [], maxLen = short + (extra ? 1 : 0);
    for (var col = 0; col < maxLen; col++) {
      for (var bI = 0; bI < blocks; bI++) if (col < dBlocks[bI].length) out.push(dBlocks[bI][col]);
    }
    for (var ec = 0; ec < ecLen; ec++) {
      for (var bJ = 0; bJ < blocks; bJ++) out.push(eBlocks[bJ][ec]);
    }
    return { version: version, codewords: out };
  }

  function qrMatrix(text) {
    var enc = qrCodewords(text), version = enc.version;
    var size = version * 4 + 17;
    var m = [], fixed = [];
    for (var i = 0; i < size; i++) {
      m.push(new Array(size).fill(0));
      fixed.push(new Array(size).fill(false));
    }
    function set(x, y, v) { m[y][x] = v ? 1 : 0; fixed[y][x] = true; }

    function finder(ox, oy) {
      for (var dy = -1; dy <= 7; dy++) {
        for (var dx = -1; dx <= 7; dx++) {
          var x = ox + dx, y = oy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          var inRing = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
            (dx === 0 || dx === 6 || dy === 0 || dy === 6);
          var inCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          set(x, y, inRing || inCore);
        }
      }
    }
    finder(0, 0); finder(size - 7, 0); finder(0, size - 7);

    for (var t = 8; t < size - 8; t++) {           // timing
      set(t, 6, t % 2 === 0);
      set(6, t, t % 2 === 0);
    }

    var pos = ALIGN[version];
    for (var a = 0; a < pos.length; a++) {
      for (var b = 0; b < pos.length; b++) {
        var ax = pos[a], ay = pos[b];
        if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
        for (var dy2 = -2; dy2 <= 2; dy2++) {
          for (var dx2 = -2; dx2 <= 2; dx2++) {
            set(ax + dx2, ay + dy2,
              Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
          }
        }
      }
    }

    set(8, size - 8, 1);                            // the dark module

    // Reserve the format areas (written per mask below) and, from version 7,
    // the version blocks.
    for (var f = 0; f <= 8; f++) {
      if (f !== 6) { fixed[8][f] = true; fixed[f][8] = true; }
    }
    for (var g = 0; g < 8; g++) { fixed[8][size - 1 - g] = true; fixed[size - 1 - g][8] = true; }
    fixed[8][8] = true;
    if (version >= 7) {
      var vbits = versionBits(version);
      for (var vi = 0; vi < 18; vi++) {
        var bit = (vbits >> vi) & 1;
        var rr = Math.floor(vi / 3), cc = vi % 3;
        set(rr, size - 11 + cc, bit);
        set(size - 11 + cc, rr, bit);
      }
    }

    // Data, in the standard upward/downward zigzag of two-module columns.
    var words = enc.codewords, bitIdx = 0, dir = -1, row = size - 1;
    for (var col2 = size - 1; col2 > 0; col2 -= 2) {
      if (col2 === 6) col2--;                       // skip the timing column
      while (true) {
        for (var c2 = 0; c2 < 2; c2++) {
          var xx = col2 - c2;
          if (!fixed[row][xx]) {
            var v2 = 0;
            if (bitIdx < words.length * 8) {
              v2 = (words[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            }
            bitIdx++;
            m[row][xx] = v2;
          }
        }
        row += dir;
        if (row < 0 || row >= size) { row -= dir; dir = -dir; break; }
      }
    }

    // Try every mask, keep the least penalised — the standard selection, and
    // the reason this symbol may differ from the apps' while scanning the same.
    var best = null, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var cand = applyMask(m, fixed, mask, size);
      writeFormat(cand, mask, size);
      var sc = penalty(cand, size);
      if (sc < bestScore) { bestScore = sc; best = cand; }
    }
    return best;
  }

  function maskFn(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  }

  function applyMask(m, fixed, mask, size) {
    var out = [];
    for (var y = 0; y < size; y++) {
      out.push(m[y].slice());
      for (var x = 0; x < size; x++) {
        if (!fixed[y][x] && maskFn(mask, x, y)) out[y][x] ^= 1;
      }
    }
    return out;
  }

  /** 15-bit BCH format information for error correction M (bits 00). */
  function formatBits(mask) {
    var data = (0 << 3) | mask;          // 00 = level M
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
  }

  /** 18-bit BCH version information, versions 7 and up. */
  function versionBits(version) {
    var rem = version;
    for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    return (version << 12) | (rem & 0xfff);
  }

  /* Format information, written twice.
   *
   *  THE TWO COPIES RUN IN OPPOSITE ORIENTATIONS, and transposing either of
   *  them is a mistake that leaves every function pattern looking right: the
   *  finders, the timing and the alignment all still match a reference symbol,
   *  and only the fifteen format modules differ. The first version of this did
   *  exactly that, and it was caught by comparing the whole matrix against a
   *  reference encoder rather than by reading the code. Indices are written
   *  below as (column, row) because that is how the specification numbers them;
   *  `m` is indexed [row][column]. */
  function writeFormat(m, mask, size) {
    var bits = formatBits(mask);
    for (var i = 0; i < 15; i++) {
      var bit = (bits >> i) & 1;
      // Copy 1 — down the left of the top-left finder, then along beneath it.
      if (i < 6) m[i][8] = bit;              // (8, i)
      else if (i === 6) m[7][8] = bit;       // (8, 7)
      else if (i === 7) m[8][8] = bit;       // (8, 8)
      else if (i === 8) m[8][7] = bit;       // (7, 8)
      else m[8][14 - i] = bit;               // (14 - i, 8)
      // Copy 2 — along the bottom-left finder, then up the top-right one.
      if (i < 8) m[8][size - 1 - i] = bit;   // (size - 1 - i, 8)
      else m[size - 15 + i][8] = bit;        // (8, size - 15 + i)
    }
    m[size - 8][8] = 1;                 // the dark module is never masked away
  }

  function penalty(m, size) {
    var score = 0, x, y, run, i;
    // Rule 1 — runs of five or more in a row or column.
    for (y = 0; y < size; y++) {
      run = 1;
      for (x = 1; x < size; x++) {
        if (m[y][x] === m[y][x - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    for (x = 0; x < size; x++) {
      run = 1;
      for (y = 1; y < size; y++) {
        if (m[y][x] === m[y - 1][x]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    // Rule 2 — 2x2 blocks of one colour.
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var v = m[y][x];
        if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) score += 3;
      }
    }
    // Rule 3 — the finder-like 1:1:3:1:1 pattern with four light modules beside it.
    var p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function runsMatch(get, n) {
      var hits = 0;
      for (var s = 0; s + 11 <= n; s++) {
        var ok1 = true, ok2 = true;
        for (var k = 0; k < 11; k++) {
          if (get(s + k) !== p1[k]) ok1 = false;
          if (get(s + k) !== p2[k]) ok2 = false;
        }
        if (ok1 || ok2) hits++;
      }
      return hits;
    }
    for (y = 0; y < size; y++) {
      score += 40 * runsMatch(function (k) { return m[y][k]; }, size); // eslint-disable-line no-loop-func
    }
    for (x = 0; x < size; x++) {
      score += 40 * runsMatch((function (col) {
        return function (k) { return m[k][col]; };
      })(x), size);
    }
    // Rule 4 — deviation from an even split of dark and light.
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) dark += m[y][x];
    var pct = (dark * 100) / (size * size);
    score += 10 * Math.floor(Math.abs(pct - 50) / 5);
    return score;
  }

  /** The QR as SVG, drawn at `size` points from `left`,`top`.
   *  QUIET ZONE 1 MODULE, matching the apps (ZXing is given MARGIN 1). */
  function qrSvg(url, left, top, size) {
    var m;
    try { m = qrMatrix(url); } catch (e) { return ""; }
    var n = m.length, quiet = 1, span = n + quiet * 2, unit = size / span;
    var parts = ['<g transform="translate(' + left + " " + top + ')">'];
    parts.push('<rect x="0" y="0" width="' + size + '" height="' + size + '" fill="#fff"/>');
    // One path for the whole symbol — thousands of <rect>s would bloat the page
    // and leave hairlines between modules in some print pipelines.
    var d = [];
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (!m[y][x]) continue;
        var px = (x + quiet) * unit, py = (y + quiet) * unit;
        d.push("M" + px.toFixed(3) + " " + py.toFixed(3) + "h" + unit.toFixed(3) +
          "v" + unit.toFixed(3) + "h-" + unit.toFixed(3) + "z");
      }
    }
    parts.push('<path d="' + d.join("") + '" fill="#000" shape-rendering="crispEdges"/>');
    parts.push("</g>");
    return parts.join("");
  }

  // ── Printing ────────────────────────────────────────────────────────────
  /* The console's reports print A4 portrait; a certificate is 842x595pt
     landscape. `@page` cannot be written inside a class selector, so the page
     box is swapped by injecting a rule that comes later in the cascade than
     index.html's, and removed again afterwards. */
  var pageStyle = null;

  function setLandscapePage(on) {
    if (on) {
      if (pageStyle) return;
      pageStyle = document.createElement("style");
      pageStyle.id = "certPageStyle";
      pageStyle.textContent = "@media print{@page{size:" + W + "pt " + H + "pt; margin:0}}";
      document.head.appendChild(pageStyle);
    } else if (pageStyle) {
      pageStyle.parentNode.removeChild(pageStyle);
      pageStyle = null;
    }
  }

  /**
   * Render one certificate and open the print dialog.
   *
   * @param {object} cert  a roster certificate (see `svg` above)
   * @param {function} [onMessage]  called with a one-line status for the caller
   *                                to show where its other exports show theirs
   */
  function print(cert, onMessage) {
    var host = document.getElementById("printCert");
    if (!host) return;
    // The report host and the certificate host are both printable; only one may
    // hold anything at a time or the dialog would be handed two documents.
    var report = document.getElementById("printReport");
    if (report) report.textContent = "";

    // THE FONTS MUST BE LOADED BEFORE THE RULER IS USED, not merely requested.
    // The title's wrap and the amber rule's width are both measured, and
    // measuring against a fallback face would break the lines in the wrong
    // places — on the one page where the line breaks are the whole of what a
    // reader compares against their own copy.
    var fonts = [
      '700 24px "Inter"', '400 15px "Inter"', '500 13px "Inter"',
      '400 10px "Inter"', '400 7px "Inter"',
      '700 40px "Source Serif 4"', '700 26px "Source Serif 4"',
    ];
    var ready = (document.fonts && document.fonts.load)
      ? Promise.all(fonts.map(function (f) { return document.fonts.load(f); }))
          .catch(function () { /* print in the fallback face rather than not at all */ })
      : Promise.resolve();

    if (onMessage) {
      onMessage("Choose “Save as PDF” as the destination in the print dialog.");
    }

    return ready.then(function () {
      host.innerHTML = svg(cert);
      setLandscapePage(true);
      var done = function () {
        setLandscapePage(false);
        host.textContent = "";
        window.removeEventListener("afterprint", done);
      };
      window.addEventListener("afterprint", done);
      // A tick so the status message paints before the modal dialog blocks.
      setTimeout(function () { window.print(); }, 60);
    });
  }

  global.CawCertificate = {
    svg: svg,
    print: print,
    printedDate: printedDate,
    // Exported for the test harness, which checks the symbol against a
    // reference encoder rather than trusting this one by reading it.
    qrMatrix: qrMatrix,
  };
})(typeof window !== "undefined" ? window : this);
