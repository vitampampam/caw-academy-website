/* Trip estimator — distance, block time, fuel stops, indicative cost.
   Loaded only on trip-estimator.html. */
(function () {
  var root = document.getElementById('te');
  if (!root) return;

  var $ = function (id) { return document.getElementById(id); };
  var R_NM = 3440.065;                 // earth radius in nautical miles
  var airports = null, cats = null, legs = null;
  var from = null, to = null;

  /* ---------- data ---------- */
  function load(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  Promise.all([
    load('assets/data/airports.json'),
    load('assets/data/aircraft.json'),
    load('assets/data/routing.json')
  ]).then(function (d) {
    airports = d[0];
    cats = d[1];
    routing = d[2];
    wire();
  }).catch(function (e) {
    $('teHint').textContent = 'The airport list could not be loaded. Please send us the route instead and we will work it out.';
    if (window.console) console.error(e);
  });

  load('assets/data/empty-legs.json')
    .then(function (d) { legs = (d && d.legs) || []; })
    .catch(function () { legs = []; });

  /* ---------- search ---------- */
  function score(a, q) {
    var icao = a.i.toLowerCase(), iata = (a.a || '').toLowerCase();
    var city = (a.c || '').toLowerCase(), name = a.n.toLowerCase();
    if (icao === q || iata === q) return 0;
    if (city === q) return 1;
    if (icao.indexOf(q) === 0 || iata.indexOf(q) === 0) return 2;
    if (city.indexOf(q) === 0) return 3;
    if (name.indexOf(q) === 0) return 4;
    if (city.indexOf(q) > -1) return 5;
    if (name.indexOf(q) > -1) return 6;
    return -1;
  }

  function search(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    var hits = [];
    for (var i = 0; i < airports.length; i++) {
      var s = score(airports[i], q);
      if (s > -1) hits.push([s - airports[i].t * 0.3, airports[i]]);
    }
    hits.sort(function (a, b) { return a[0] - b[0]; });
    return hits.slice(0, 8).map(function (h) { return h[1]; });
  }

  function label(a) {
    return a.i + (a.a ? ' / ' + a.a : '') + ' — ' + (a.c ? a.c + ', ' : '') + a.n;
  }

  /* ---------- geometry ---------- */
  function rad(d) { return d * Math.PI / 180; }

  function distanceNm(a, b) {
    var la1 = rad(a.y), la2 = rad(b.y), dla = rad(b.y - a.y), dlo = rad(b.x - a.x);
    var h = Math.sin(dla / 2) * Math.sin(dla / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
    return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function bearing(a, b) {
    var la1 = rad(a.y), la2 = rad(b.y), dlo = rad(b.x - a.x);
    var y = Math.sin(dlo) * Math.cos(la2);
    var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dlo);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /* ---------- routing model ----------
     Track miles are not great-circle miles. Extension is largest on short sectors,
     where SIDs, STARs and radar vectors dominate, and converges towards 2-3% on
     long ones. Closed airspace is a separate, much larger penalty: an EU, UK or
     US registered aircraft cannot overfly Russia or Belarus, which reshapes
     anything routing towards Central Asia. Values live in routing.json. */
  var routing = null;

  function bandFactor(nm) {
    if (!routing) return 1.04;
    for (var i = 0; i < routing.bands.length; i++) {
      if (nm <= routing.bands[i].upto) return routing.bands[i].factor;
    }
    return 1.03;
  }

  /* point in polygon, ray casting on [lat,lon] rings */
  function inRings(rings, la, lo) {
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r], inside = false;
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
        if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }

  /* which restricted countries does the direct track pass through?
     Departing from or arriving in one is not a crossing — you are going there. */
  function endpointBlocks(a, b) {
    if (!routing || !$('teAvoid').checked) return [];
    return routing.restricted.filter(function (r) {
      return inRings(r.rings, a.y, a.x) || inRings(r.rings, b.y, b.x);
    });
  }

  function crossings(a, b) {
    if (!routing || !$('teAvoid').checked) return [];
    var ends = {};
    routing.restricted.forEach(function (r) {
      if (inRings(r.rings, a.y, a.x) || inRings(r.rings, b.y, b.x)) ends[r.id] = true;
    });

    var hit = {}, steps = Math.max(16, Math.round(distanceNm(a, b) / 20));
    var la1 = rad(a.y), lo1 = rad(a.x), la2 = rad(b.y), lo2 = rad(b.x);
    var d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((la2 - la1) / 2), 2) +
      Math.cos(la1) * Math.cos(la2) * Math.pow(Math.sin((lo2 - lo1) / 2), 2)));
    if (!d) return [];
    for (var s = 0; s <= steps; s++) {
      var f = s / steps;
      var A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      var x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
      var y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
      var z = A * Math.sin(la1) + B * Math.sin(la2);
      var plat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
      var plon = Math.atan2(y, x) * 180 / Math.PI;
      routing.restricted.forEach(function (r) {
        if (!ends[r.id] && inRings(r.rings, plat, plon)) hit[r.id] = r;
      });
    }
    return Object.keys(hit).map(function (k) { return hit[k]; });
  }

  /* great circle -> planned track miles */
  function trackMiles(nm, blocks) {
    var f = bandFactor(nm);
    blocks.forEach(function (r) { f = Math.max(f, r.factor); });
    var term = routing ? routing.terminal_nm : 25;
    var cap = routing && routing.terminal_cap ? routing.terminal_cap : 0.18;
    return nm * f + Math.min(term, nm * cap);
  }

  var USABLE = 0.88;      // of normal range, planned (reserves, winds, payload)
  var TAXI_H = 0.25;      // taxi out + in
  var TERMINAL_H = 0.15;  // climb and descent inefficiency vs cruise TAS
  var STOP_H = 1.0;       // descent, turn, climb for a tech stop
  var STOP_FEE = 2500;    // landing, handling and fuel uplift at a tech stop

  function estimate(cat, track, oneWay) {
    var usable = cat.range * USABLE;
    var stops = Math.max(0, Math.ceil(track / usable) - 1);
    var hours = track / cat.tas + TERMINAL_H + TAXI_H + stops * STOP_H;
    /* one-way work still pays for the aircraft to reach you and go home again */
    var ferry = oneWay && routing && routing.positioning_h ? routing.positioning_h : 0;
    var cost = (hours + ferry) * cat.rate + stops * STOP_FEE;
    return { stops: stops, hours: hours, cost: cost, viable: stops <= 2 };
  }

  function hhmm(h) {
    var m = Math.round(h * 60);
    return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
  }

  function money(n) {
    var lo = Math.round(n * 0.85 / 1000) * 1000;
    var hi = Math.round(n * 1.15 / 1000) * 1000;
    var f = function (v) { return '€' + v.toLocaleString('en-GB'); };
    return f(lo) + ' – ' + f(hi);
  }

  /* ---------- render ---------- */
  function render() {
    var out = $('teOut'), hint = $('teHint');
    if (!from || !to) { out.hidden = true; hint.hidden = false; return; }
    if (from.i === to.i) {
      out.hidden = true; hint.hidden = false;
      hint.textContent = 'Departure and destination are the same airport.';
      return;
    }
    hint.hidden = true; out.hidden = false;

    var nm = distanceNm(from, to);                 // great circle
    var blocks = crossings(from, to);              // closed airspace on the direct path
    var track = trackMiles(nm, blocks);            // planned track miles
    var ret = $('teReturn').checked;
    var shown = ret ? track * 2 : track;

    $('teNm').textContent = Math.round(track).toLocaleString('en-GB');
    $('teKm').textContent = Math.round(track * 1.852).toLocaleString('en-GB');
    $('teBear').textContent = Math.round(bearing(from, to)) + '°';

    var pct = Math.round((track / nm - 1) * 100);
    var ext = 'Great circle ' + Math.round(nm).toLocaleString('en-GB') +
              ' nm — about ' + pct + '% is added for airways, SIDs and STARs';
    if (blocks.length) {
      ext += ', and for routing around ' +
             blocks.map(function (r) { return r.name; }).join(' and ');
    }
    ext += '.';
    var ep = endpointBlocks(from, to);
    if (ep.length) {
      ext += ' Note: an EU, UK or US registered aircraft cannot operate to or from ' +
             ep.map(function (r) { return r.name; }).join(' or ') +
             ' — this sector would need an operator from another registry.';
    }
    $('teExt').textContent = ext;

    var pax = parseInt($('tePax').value, 10) || 1;
    var rows = cats.map(function (c) {
      var e = estimate(c, track, !ret);
      var hrs = ret ? e.hours * 2 : e.hours;
      var cost = ret ? e.cost * 2 : e.cost;
      var seats = parseInt(String(c.pax).split('–').pop(), 10);
      var tight = pax > seats;
      var cls = (!e.viable || tight) ? ' class="te-no"' : '';
      var note = !e.viable ? 'beyond sensible range'
               : tight ? 'too many passengers'
               : (e.stops ? e.stops + (e.stops > 1 ? ' fuel stops' : ' fuel stop') : 'non-stop');
      return '<tr' + cls + '>' +
        '<td><b>' + c.name + '</b><span>' + c.examples + ' · ' + c.pax + ' pax</span></td>' +
        '<td>' + hhmm(hrs) + '</td>' +
        '<td>' + note + '</td>' +
        '<td>' + ((!e.viable || tight) ? '—' : money(cost)) + '</td>' +
        '</tr>';
    }).join('');
    $('teRows').innerHTML = rows;

    var q = 'service=Charter organisation&msg=' + encodeURIComponent(
      'Quote request: ' + from.i + ' (' + (from.c || from.n) + ') to ' + to.i +
      ' (' + (to.c || to.n) + ')' + (ret ? ', return' : ', one way') +
      ', ' + pax + ' passengers. Approximately ' + Math.round(shown) +
      ' nm track miles. Dates and times: ');
    $('teSend').href = 'contact.html?' + q;

    showLegs();
  }

  function showLegs() {
    var box = $('teLegs'), body = $('teLegsBody');
    if (!legs) { box.hidden = true; return; }
    var match = legs.filter(function (l) {
      return (l.from === from.i && l.to === to.i) || (l.from === to.i && l.to === from.i);
    });
    box.hidden = false;
    if (!match.length) {
      body.innerHTML = '<p class="te-note">Nothing listed on this route at the moment. ' +
        'Empty legs appear at short notice — tell us your dates and we will watch for one.</p>';
      return;
    }
    body.innerHTML = '<ul class="te-leglist">' + match.map(function (l) {
      var c = cats.filter(function (x) { return x.id === l.category; })[0];
      return '<li><b>' + l.from + ' → ' + l.to + '</b>' +
        '<span>' + l.date + (c ? ' · ' + c.name : '') +
        (l.seats ? ' · ' + l.seats + ' seats' : '') + '</span>' +
        (l.price_eur ? '<em>€' + l.price_eur.toLocaleString('en-GB') + '</em>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- inputs ---------- */
  function attach(inputId, pickId, nameId, set) {
    var input = $(inputId), pick = $(pickId), name = $(nameId);
    var idx = -1, items = [];

    function close() { pick.hidden = true; idx = -1; }

    function open(list) {
      items = list;
      if (!list.length) { close(); return; }
      pick.innerHTML = list.map(function (a, n) {
        return '<button type="button" role="option" data-n="' + n + '">' +
          '<b>' + a.i + '</b> ' + (a.c ? a.c + ', ' : '') + a.n +
          (a.a ? '<i>' + a.a + '</i>' : '') + '</button>';
      }).join('');
      pick.hidden = false;
    }

    function choose(a) {
      set(a);
      input.value = a.i;
      name.textContent = (a.c ? a.c + ', ' : '') + a.n;
      close();
      render();
    }

    input.addEventListener('input', function () {
      set(null); name.textContent = '';
      open(search(input.value));
      render();
    });
    input.addEventListener('keydown', function (e) {
      if (pick.hidden) return;
      var btns = pick.querySelectorAll('button');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx += (e.key === 'ArrowDown' ? 1 : -1);
        if (idx < 0) idx = btns.length - 1;
        if (idx >= btns.length) idx = 0;
        btns.forEach(function (b, n) { b.classList.toggle('on', n === idx); });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choose(items[idx > -1 ? idx : 0]);
      } else if (e.key === 'Escape') { close(); }
    });
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) choose(items[+b.dataset.n]);
    });
    document.addEventListener('click', function (e) {
      if (!pick.contains(e.target) && e.target !== input) close();
    });
  }

  function wire() {
    attach('teFrom', 'teFromPick', 'teFromName', function (a) { from = a; });
    attach('teTo', 'teToPick', 'teToName', function (a) { to = a; });
    $('teReturn').addEventListener('change', render);
    $('teAvoid').addEventListener('change', render);
    $('tePax').addEventListener('input', render);
    $('teSwap').addEventListener('click', function () {
      var a = from, b = to;
      from = b; to = a;
      $('teFrom').value = from ? from.i : '';
      $('teTo').value = to ? to.i : '';
      $('teFromName').textContent = from ? (from.c ? from.c + ', ' : '') + from.n : '';
      $('teToName').textContent = to ? (to.c ? to.c + ', ' : '') + to.n : '';
      render();
    });

    /* deep link: trip-estimator.html?from=EDMA&to=OMDB */
    var p = new URLSearchParams(location.search);
    ['from', 'to'].forEach(function (k) {
      var v = (p.get(k) || '').toUpperCase();
      if (!v) return;
      var hit = airports.filter(function (a) { return a.i === v || a.a === v; })[0];
      if (!hit) return;
      if (k === 'from') { from = hit; $('teFrom').value = hit.i; $('teFromName').textContent = (hit.c ? hit.c + ', ' : '') + hit.n; }
      else { to = hit; $('teTo').value = hit.i; $('teToName').textContent = (hit.c ? hit.c + ', ' : '') + hit.n; }
    });
    render();
  }
})();
