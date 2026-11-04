# Bharat Jodo Yuva Sanghas — DH microsite (v2 draft)

Static HTML/CSS/JS, no build step. Serve locally: `py -m http.server 8000` in this folder, then open http://localhost:8000. Hard-refresh (Ctrl+F5) after editing.

- `index.html`: all sections. `TODO` comments mark copy and decisions that are still pending.
- `css/style.css`: light first fold; dark neon design after the fold.
- `js/main.js`: smooth scroll (Lenis), the pinned fact deck, scroll reveals (GSAP ScrollTrigger), drawer, stories, share. If the CDN libraries are missing, or reduced motion is on, the page falls back to a static layout.
- `data/stories.json`: DH story cards. The **first item is the lead story**. To refresh it with real stories from the DH Karnataka collection, run `py tools/fetch_stories.py` (options: `--count`, `--collection`).
- `assets/img/`: `KarnatakaLogo.png`, `CM.jpeg`, `CMwithName.png`, copied from bjys.karnataka.gov.in. **Confirm reuse permission before go-live.**
- CDN dependencies (pinned): `gsap@3.12.5` + ScrollTrigger (cdnjs), `lenis@1.1.13` (jsdelivr). The DH logo comes from the DH asset CDN.

See `context.md` for the section map, fact sources and implementation notes.

Before publishing: verify the facts against the official guidelines and GOs, add the GTM snippet, and confirm the sponsored-content label, the designation caption and the final URL/canonical.
