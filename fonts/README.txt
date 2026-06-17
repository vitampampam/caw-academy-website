CAW Academy — self-hosted fonts
================================

Place TWO variable-font files here (free, open-source, SIL OFL):

  Inter-Variable.woff2
  Fraunces-Variable.woff2

Download:
  Inter    -> https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2
  Fraunces -> https://cdn.jsdelivr.net/fontsource/fonts/fraunces:vf@latest/latin-wght-normal.woff2

Open each link in a browser, then rename the downloaded file to the name above
and keep it in this /fonts/ folder. style.css references them via @font-face.

If these files are absent the site still works — it falls back to the system
font (San Francisco / Segoe UI) until they are added.
