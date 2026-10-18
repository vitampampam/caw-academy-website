# CIS Flight Support — website

Multi-page site for CIS Flight Support GmbH (Stadtbergen, Germany). Static HTML,
no build step, no dependencies. One responsive stylesheet serves phone, tablet
and desktop.

## Structure

```
index.html        Home — hero, figures, about, why-us bento
services.html     Nine service lines + turnaround timeline
coverage.html     Station network map (Europe, CIS, Middle East)
fleet.html        Aircraft for sale and acquisition
prebuy.html       Pre-buy inspection process
training.html     CAW Academy platform
team.html         Who you deal with
contact.html      Enquiry form and contact details
impressum.html    German legal notice
assets/site.css   All styling, including the responsive breakpoints
assets/site.js    Nav, carousels, map, reveals, theme toggle
assets/img/       Aircraft silhouettes and CAW Academy artwork
```

## Breakpoints

| Range | Layout |
|---|---|
| ≤ 640px | One column, sticky call bar, swipe carousels, tap-to-read map |
| 641–1180px | Two columns, sheet menu, 44px+ touch targets |
| > 1180px | Dropdown nav, coverflow carousel, hover states |

## Publishing (GitHub Pages)

Upload everything **including the `assets` folder** to the repository root, then
Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)` → Save.
The site appears at `https://vitampampam.github.io/cisflightsupport/`.

## Before going live

- Contact form does not submit — wire it to a handler (Formspree, Basin, or similar)
- Directors' names and per-person email addresses are placeholders
- Hero figures (2004, 180, 40) and all fleet listings are placeholders
- Turnaround timeline is an illustrative sequence, not measured data
- App Store / Google Play badges are approximations; replace with official artwork
- No logo — the header is typographic


## Trip estimator

`trip-estimator.html` + `assets/trip.js` + `assets/data/`.

- `airports.json` — 5,448 airports (ICAO, IATA, city, coordinates) built from the
  OurAirports dataset: large and medium fields worldwide, plus smaller fields across
  Europe, the CIS and the Middle East. Loaded only on the estimator page.
- `aircraft.json` — six categories with long-range cruise TAS, normal (not max) range,
  seats and an indicative hourly rate. Rates are category averages for European ad-hoc
  charter, cross-checked against published 2026 guides; edit them in `admin.html`.
- `routing.json` — route-extension bands, terminal allowance, positioning allowance and
  the restricted-airspace polygons (Russia, Belarus, Ukraine, from Natural Earth 110m).
- `empty-legs.json` — **ships empty on purpose.** Add real listings only:
  `{"from":"EDMA","to":"OMDB","date":"2026-11-04","category":"supermid","seats":8,"price_eur":19500}`
  With an empty list the panel tells the visitor nothing is listed and invites their dates.

Model:
- Track miles = great circle x a distance-banded factor (12% under 200 nm down to 2.5%
  over 4,000 nm) + up to 25 nm for SID/STAR track miles, capped at 18% of the sector.
- Routes crossing Russia, Belarus or Ukraine take that country's detour factor instead,
  unless the trip starts or ends there — then the tool says an EU/UK/US registered
  aircraft cannot operate there at all.
- Planned range = 88% of normal range. Block time = track / TAS + 15 min climb and
  descent + 15 min taxi + 1 h per fuel stop.
- Cost = (block hours + 0.8 h positioning on one-ways) x rate + EUR 2,500 per tech stop,
  shown as a band of +/-15%. It is an estimate, not a quotation, and the page says so.

## Admin editor

`admin.html` + `assets/admin.js` — edits hourly rates, cruise TAS, range and seats per
category, and the empty-leg list. It writes nothing to the server (there is none):
you edit, download `aircraft.json` / `empty-legs.json`, commit them to `assets/data/`
and push. ICAO codes are validated against the airport list as you type.

The page carries `noindex` and is not linked from anywhere, but it is **not protected** —
static hosting cannot authenticate. For real access control the site needs Cloudflare
Pages / Netlify access rules, or a small CMS with a GitHub login.

## Temporarily withdrawn

The fleet / aircraft-for-sale pages and the coverage page are hidden, not deleted: links carry `class="temp-off"`,
`fleet.html` and `coverage.html` carry a `noindex` meta. To restore, delete the `.temp-off` rule at the end of
`assets/site.css` and that meta tag.
