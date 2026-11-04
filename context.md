# Project context — Bharat Jodo Yuva Sanghas microsite (Deccan Herald)

## What this is
A single-page **sponsored-content microsite** produced by **Deccan Herald (DH)** for the **Government of Karnataka** (Department of Youth Empowerment and Sports). It explains the *Bharat Jodo Yuva Sanghas* (BJYS) scheme and sends readers to the official portal (`bjys.karnataka.gov.in`) to register.

**Version 2 (Nov 2026):** redesigned to attract young readers rather than mirror the government site. After the first fold:
- dark, neon look
- facts as an animated, pinned flashcard deck
- DH Stories as the highlight
- facts deck, quote, and links to the official portal
- no ad slots

Status: **draft**, with copy and several decisions still pending (see TODOs).

- Intended URL / canonical: `https://www.deccanherald.com/pages/bharat-jodo-yuva-sanghas` (still to be confirmed)
- Plain static HTML/CSS/JS with no build step. Animation libraries load from a CDN with pinned versions (see below).
- Run locally: `py -m http.server 8000` (on this machine `python` is only the Microsoft Store shortcut), then open `http://localhost:8000`. Over `file://` the stories `fetch` fails and the Stories section hides itself.
- **Caching:** `http.server` lets the browser cache files. After editing, hard-refresh with **Ctrl+F5**.

## File map
| Path | Purpose |
|---|---|
| `index.html` | The whole page |
| `css/style.css` | Tokens on `:root` → header/hero (light) → after-fold dark sections → responsive rules |
| `js/main.js` | One IIFE: Lenis smooth scroll, anchor scrolling, drawer, active nav, stories render, GSAP animations, share |
| `data/stories.json` | DH story cards `{tag, title, summary, url, image}`. **The first item is the lead card (no badge; its `tag` is ignored).** Currently 4 placeholders |
| `assets/img/` | `KarnatakaLogo.png`, `CM.jpeg` (hero), `CMwithName.png` (quote), `favicon.svg` |

**External resources:**
- Google Fonts: DM Sans, Playfair Display
- DH logo SVG from the DH CDN (white, so the header stays navy)
- `gsap@3.12.5` + `ScrollTrigger` (cdnjs)
- `lenis@1.1.13` (jsdelivr)

## Page structure (top to bottom)
1. **Header** (sticky, navy): DH logo · event mark · nav (Home, Stories, Quick facts, Join) · "Presented by" Karnataka logo · hamburger (≤960px). The sponsor bar and mobile drawer sit underneath.
2. `#home` **Hero (first fold, deliberately unchanged):** light background, CM portrait, headline, "Join the Mission" button → portal registration, and "How to apply" → `#join`. The 4 stat tiles count up on load.
3. **Ticker ribbon:** a decorative gradient band whose speed and direction follow scroll velocity.
4. `#stories` **Stories (highlight, straight after the fold):** `#story-root` is filled by JS. The first story renders as a large lead card with **no badge**; the rest go in a 3-column grid. On mobile the grid cards are shorter than the lead card (21:9 image, tighter text).
5. `#quick-facts` **Sticky stacking deck:** 9 `.fact-card`s. The section pins below the header; each card slides up over the previous one. There's a counter, a progress bar, and the scroll snaps to each card.
6. **CM quote:** image plus a placeholder quote whose words light up as you scroll.
7. `#join` **"Ready to join?":**
   - register online (portal)
   - offline centres
   - helpline
   - the 2 GO PDFs
   - the DYES website
8. `#share`: WhatsApp / X / Facebook / copy link.
9. **Footer:** sponsored-content disclaimer.
10. **Bottom nav** (≤560px, fixed): Home · Stories · Facts · Join.

The separate **Benefits section was removed** (v3) because the fact deck covers the key figures. Facts that only lived there and are no longer on the page: ₹24,000 trainer honorarium, free use of school/college rooms, halls and playgrounds, the activity list, and the full ₹1,010 cr outlay line (₹1,010 cr is still in the hero stats).

## Fact sources (every figure on the page should trace to one of these)
The `data-src` attribute on each fact card records its source:
- **P** = the official portal bjys.karnataka.gov.in. It's a React app, so the facts were read from its JS bundle: the age check "between 16 and 35 as of August 15, 2026", "Karnataka citizens only", the 8 interest categories with a maximum of 3, and the 7 registration step names. Also the GO PDF links.
- **G** = govtschemes.in/karnataka-bharat-jodo-yuva-sanghas-scheme (a third party): ₹10 lakh grant, 100–250 members, 15-member EC, the local-body norms, the ₹1,010 cr outlay, eligibility, ₹10 fee, offline centres, helpline.
- Deliberately **not** claimed: launch date, deadlines, registration counts, "takes X minutes", EC reservations. The portal mentions an Android app, but no store link was found, so there's a TODO.

## Design system
- **First fold:** the original light palette: `--navy #102d84`, `--gold`, `--saffron`, `--green`, `--hero-bg #e9ebe3`.
- **After the fold:**
  - backgrounds `--bg-dark #060a1c` / `--bg-dark-2`; glass surfaces `--glass` / `--glass-line`
  - neon tones `--neon-saffron/green/blue/purple/pink`
  - each card sets `--tone` inline, and `color-mix()` derives its glows and borders
- **Type:** DM Sans 800 for big headings and numbers; Playfair Display italic for accents (`h2 em`, story titles, quote).
- **Breakpoints:** 960px (drawer, grids collapse) and 560px (single column, bottom nav, compact deck).
- `--hh` holds the measured sticky-header height (set by JS). It's used for the pin start, the deck height and `scroll-padding-top`.

## JS / animation notes
- `html.anim` is added **only** when GSAP and ScrollTrigger loaded and `prefers-reduced-motion` is off. Without it the deck is a plain grid, `[data-reveal]` elements stay visible, and the ticker runs on CSS (or not at all with reduced motion). **The content is always readable without JS animation.**
- Lenis drives smooth scrolling (`lenis.on('scroll', ScrollTrigger.update)`, using the gsap ticker). All `a[href^="#"]` clicks go through `scrollToTarget()`, which offsets by the header height. The drawer calls `lenis.stop()` / `start()`.
- `[data-reveal="up|left|right|zoom"]` gives enter, exit-up and exit-down animations via `ScrollTrigger.create` callbacks. Children of a `[data-stagger]` element get staggered delays. Story cards are wired up after they render (`initReveals(storyRoot)` + `ScrollTrigger.refresh()`).
- Errors log to the console with a `[BJYS]` prefix. The Stories section hides only if the JSON fetch itself fails.
- Analytics: `data-track` attributes (`join_mission`, `join_mission_deck`, `join_mission_bottom`, `doc_establishment_order`, `doc_joining_order`) are in place, but GTM isn't added yet.

## Open TODOs / pending decisions
- [ ] Final canonical URL and `og:image`
- [ ] DH Google Tag Manager snippet (ID not yet supplied)
- [ ] DH sponsored-content label wording (sponsor bar)
- [ ] Final hero headline copy
- [ ] Confirm the CM designation/caption
- [ ] CM message quote (currently a bracketed placeholder)
- [ ] Real DH stories and images in `data/stories.json`
- [ ] BJYS Android app store link (if it should be promoted)
- [ ] Permission to reuse the images copied from bjys.karnataka.gov.in
- [ ] Final fact check against the official guidelines and GOs before go-live (the G-sourced figures especially)

## Quirks
- `.button-red` is actually **navy** (a legacy name, used in the hero).
- Nav links are duplicated in 3 places (desktop nav, drawer, bottom nav), and the portal URL and helpline numbers appear more than once. Update every copy together.
- The folder is **not a git repository**. A copy of the pre-redesign files is in the session scratchpad (`backup-v1`), but that is temporary.
