# CAW Academy website

Website repository for **CAW Academy**: https://caw-academy.com

This repository contains the public CAW Academy marketing site, preview pages,
interactive demonstrations, account and organisation administration interfaces,
website assets, and customer-facing legal/support pages.

**It is not the native iOS, macOS, or Android app source repository.**

## Main files and folders

- `index.html` — main public website
- `preview.html` — alternate preview page
- `style.css`, `photo-bands.css`, `caw-interactive.css` — website styles
- `caw-content.js`, `caw-demo-content.js`, `caw-interactive.js` — course and interactive demo content
- `account.html`, `account.js`, `verify.html`, `reset.html` — account flows
- `admin/` — CAW Academy organisation console (separate from the retired, unrelated root `admin.html`)
- `screens/`, `photos/`, `images/`, `fonts/`, `guide/` — CAW Academy visual and educational assets
- `terms.html`, `privacy.html`, `support.html` — policies and support
- `CNAME` — custom domain

## Temporary pre-launch state

Free-trial request buttons currently display **“Free trial — coming soon”** and are
disabled until the app is published and the enrolment process is ready. This
applies to the main and preview sites as well as interactive modal CTAs.

## Repository housekeeping

Unrelated CIS Flight Support GmbH pages, scripts, estimator and media assets were
removed from the current source tree in October 2026. Their history remains
available through earlier Git commits if ever needed.

Before making public changes, test links, mobile responsiveness, account flows and
interactive demos. GitHub Pages deployments may take a short time to propagate.
