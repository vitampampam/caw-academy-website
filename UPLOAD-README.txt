CAW Academy - website change package
Date: 9 Oct 2026
Fix: the "Request a free trial" band on phones - missing button, then a
     duplicated one

UPLOAD THESE THREE FILES to the web host, keeping them at the site root
(same folder as each other):

  1. index.html
  2. style.css
  3. photo-bands.css

Nothing else changed. No images, no JS, no other HTML page.

WHAT CHANGED
------------
1) index.html - the trial buttons were invisible on phones
   Inside the inline <style>, the @media (max-width:640px) "Mobile-only trims"
   block hid every trial button and re-showed only the hero one. Three lines
   removed:
        .btn.open-trial{display:none}
        .hero-bottom .btn.open-trial{display:flex}
        .reveal:has(> .btn.open-trial){display:none}
   They date from when the mid-page trial buttons were repeats sitting INSIDE
   each section. Since the trial band became a band of its own (5 Oct) the
   button is that band's ONLY content, so hiding it left seven stretches of
   empty grey - a card with no button in it. The collapse rule never fired
   anyway: `reveal` sits on the anchor itself, not on a wrapper, so
   :has(> .btn.open-trial) matched nothing.
   The arrow glyph is still hidden on phones (.btn.open-trial svg).

2) index.html + style.css - the button then appeared TWICE below the
   frameworks card
   Not a duplicate in the markup: #console ("Drive the admin console
   yourself") is desktop-only and hidden at <=1024px and on touch, so ITS
   trial band landed directly under the curriculum section's own band. The
   console's band now carries a `console-band` class and is hidden by the
   same two media queries as the section it belongs to (style.css, under
   "THE CONSOLE SECTION IS DESKTOP-ONLY"). The curriculum band still does
   the separating between the two photo sections.
   No other section is hidden on phones, so no other pair can collide.

3) photo-bands.css - removed one stray extra closing brace at the end of the
   file (it was 24 "{" vs 25 "}"). Browsers discarded it; no visual change.

AFTER UPLOAD - CHECK ON AN iPHONE
---------------------------------
  - Every grey trial band shows one full-width "Request a free trial" button
    (no arrow).
  - Below the frameworks/curriculum card there is now ONE button, not two,
    then the FEATURES section.
  - Hero button and the closing "Equip your team..." CTA button unchanged.
  - Tapping any of them opens the free-trial enquiry popup.
  - On a desktop browser the admin-console section and its own trial band are
    both still there.

GIT
---
  git add website/index.html website/style.css website/photo-bands.css
  git commit -m "website: keep the trial-band buttons on phones, hide the console's band with the console, drop a stray brace"
  git push origin main
