CAW Academy - website change package
Date: 9 Oct 2026
Fix: "Request a free trial" button invisible in its band on iPhone

UPLOAD THESE TWO FILES to the web host, keeping them at the site root
(same folder as style.css):

  1. index.html
  2. photo-bands.css

Nothing else changed. No images, no JS, no other HTML page.

WHAT CHANGED
------------
index.html  - inside the inline <style>, the @media (max-width:640px)
              "Mobile-only trims" block no longer hides the trial buttons.
              Removed three lines:
                 .btn.open-trial{display:none}
                 .hero-bottom .btn.open-trial{display:flex}
                 .reveal:has(> .btn.open-trial){display:none}
              They were written when the mid-page trial buttons were repeats
              sitting inside each section. Since the trial band became a band
              of its own (5 Oct), the button is that band's ONLY content, so
              hiding it left seven stretches of empty grey - the "card with no
              button" that was reported. The collapse rule never fired anyway:
              `reveal` is on the anchor itself, not on a wrapper, so
              :has(> .btn.open-trial) matched nothing.
              The hero button and the closing #get CTA button were unaffected
              before and after (one was re-shown explicitly, the other is
              matched by an id rule).
              The arrow glyph is still hidden on phones (.btn.open-trial svg).

photo-bands.css - removed one stray extra closing brace at the end of the file
              (24 "{" vs 25 "}"). Browsers discarded it; no visual change.

AFTER UPLOAD - CHECK ON AN iPHONE
---------------------------------
  - All seven grey trial bands between the photo sections show a full-width
    "Request a free trial" button (no arrow).
  - Hero button and the closing "Equip your team..." CTA button unchanged.
  - Tapping any of them opens the free-trial enquiry popup.
  - iPad and desktop unchanged.

GIT
---
  git add website/index.html website/photo-bands.css
  git commit -m "website: keep the trial-band buttons on phones; drop stray brace"
  git push origin main
