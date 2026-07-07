# TESTING.md — ZineIt v2.0 test report

**Result: 75 passed · 0 failed · 0 console errors.** The whole tool — including the
v3.0 memory architecture, HEIC import path, and feedback channel — was tested before
this render, as required.

## How it was tested

The app is a single self-contained HTML file, so the suite boots the *real*
`index.html` inside [jsdom] and drives it two ways:

1. **Through the UI** — real DOM events: `pointerdown/move/up` for drags, pans, and all
   eight resize handles; `click` on the view-bar, Fit/Fill/Centre, pan-mode, and text
   editor buttons; `keydown` for arrow navigation and nudging; `change`/`input` on
   toggles and text fields.
2. **Through the model** — a `window.__zineit` test API exposes the pure functions
   (spread math, clamping, crop geometry, validation, migration, print DOM builders)
   for exact numeric assertions in inches.

A virtual console captures every page error; the final test fails the run if *any*
uncaught exception occurred at *any* point. Run it yourself:

```bash
cd tests && npm install && npm test
```

## What the run verified (mapped to the release checklist)

| Area | Verified behaviour |
|---|---|
| Boot & model | Valid 8-page mini-zine; spread model = cover · 3 pairs · back |
| Text Editor tab | Rows show page, spread, content type, editable field, live-preview link, save status; edits mutate the real element; status flips editing→saved on persist; title syncs both ways; add-to-cover; add-by-role-and-page |
| Double-page spread | Make-spread re-homes the photo to the left page at exactly 2 page-widths; renders once across the fold with a SPREAD badge; each half locked and correctly offset (−W) in single view; **prints on both sequential pages with the right half shifted by exactly one page width**; unspread returns to one page |
| Facing pages | Spread view canvas is two pages wide with a fold guide; single view is one page |
| Preview & zoom | Fit capped at 110 px/in (reduced, centred preview); 100% = 96 px/in; ± stepping |
| Timeline | One item per spread; ≥7 page thumbs at the larger 96 px size; page numbers; photo/text indicators; empty-page warning; ♪ audio indicator; click-to-select |
| Shift+drag | Panning changes object-position, stays clamped 0–100%, crop ghost appears during the gesture and is removed after; Pan-mode button works without a modifier |
| Drag & placement | Plain drag moves ~1 in and snaps to the ⅛″ grid; dropping a placed photo onto an empty frame transfers the asset and removes the floater |
| Resize | All 8 handles present; SE corner resizes both axes, N edge never touches width; floors at 0.3×0.25 in; object-fit classes guarantee no stretching |
| Fit / Fill / Centre | Instant: contain / cover / px=py=50; reset crop re-centres; reset frame restores the photo's true proportions |
| Margins & bleed | Bleed off: hard clamp at trim on all four sides; bleed on: exactly ⅛″ and no more; toggling bleed off pulls everything back inside trim; margin-crossing warning names the offending side |
| Navigation | Page stepping visits 0…7 with no skips and holds at both covers; spread stepping visits each spread in order; view-bar buttons; arrows navigate when nothing selected and nudge when something is |
| Page numbers | Preview: interiors only, covers never, toggle off hides; Print: interiors carry `.ppn` with the right number, covers don't, toggle off removes |
| Print & imposition | Sequential print DOM = one `.pp` per page (8); imposition = one sheet, 8 panels, exactly 4 rotated 180° |
| Backups | Live state round-trips the validator (the same check every .bak download runs); corrupt files rejected with a reason (missing asset, NaN geometry, wrong app); v1 .bak migrates to v2 (roles, guides, audio slots) |
| Mobile shell | ≤820 px activates `body.mobile`; wide viewport restores desktop; Photos/Tools drawers open from the toolbar and are mutually exclusive; backdrop tap closes; timeline sheet and text editor toggle from the toolbar |
| Touch controls | Drag, pan, and 8-way resize run on the unified pointer-event pipeline (verified structurally: no mouse-/touch-only handlers, `touch-action:none` set); tap selects; the Edit chip appears on selection and opens the tools drawer (focusing the text field for text blocks) |
| Swipe navigation | Swipe left/right on the canvas steps pages (single view) or whole spreads (spread view); vertical gestures ignored; swipes starting on an element never fire — the drag wins |
| Fullscreen preview | Enters/exits, shows "n / 8" indicator, ‹ › navigate, Esc exits; single, spread, and fullscreen views all reachable on mobile |
| Mini zine · Letter | Exact 11 × 8.5″ paper, 8 panels, 4 rotated 180°, scale = 1 (native) |
| Mini zine · A4 | Paper 11.69 × 8.27″, sheet scaled by exactly 8.27/8.5 with a single uniform `scale()` (aspect ratios preserved), centred on the paper |
| Fold & cut marks | 4 dashed fold lines at 2.75 / 5.5 / 8.25″ + the horizontal centre fold, 8 printer-style edge ticks; one ✂ cut line spanning exactly the middle two panels; both fully hideable |
| Fit & margins | Fit-to-paper limited by A4 height; maintain-margins shrinks to keep a ¼″ border; 100% on A4 raises a clipping warning that names the remedy; fitting clears it |
| Print preview | Modal opens with settings synced from state; the preview embeds the real imposed sheet; paper, fold, and page-number toggles live-rebuild it |
| PDF / @page | `@page` follows the chosen paper (11×8.5 or 11.69×8.27 landscape) so browser print-to-PDF exports at the right size |
| Imposition persistence | Settings survive the .bak round-trip; migration restores defaults when absent |
| Lean memory | Project state carries **no** full-resolution photo data — metadata + tiny thumb strings only; lean autosave persists |
| Asset store | Blobs round-trip through the store (IndexedDB path in browsers, verified here on the identical in-memory fallback), URLs served and cached for sync render paths, deletes reclaim storage |
| Fast loading | Canvas hydrates progressively (thumb instantly, preview on arrival, `decoding=async`); library thumbs lazy-load; every placed photo resolves a print source; lightbox opens instantly and upgrades to full resolution |
| Self-contained .bak | v3 export embeds originals + previews per asset and passes the verifier; live state stays lean; legacy v1/v2 ingest moves inline photos to the store and slims state |
| HEIC | `.heic`/`.heif` accepted by the picker; detection by MIME **and** extension (HEIC often ships with no MIME type); native `createImageBitmap` decode attempted first, lazy heic2any fallback present |
| Feedback | Support-card link and view-bar ✉ button both address bryanjaybee@gmail.com with a prefilled subject and bug-report template |
| Cleanup | Deleting a library photo removes metadata **and** stored blobs |
| Console health | Zero page errors or uncaught exceptions across all 75 tests |

## Defects found by this suite and fixed before render

1. **Timeline crash on the cover spread** — painting spread halves dereferenced a null
   left page. One guard fixed a 24-test failure cascade.
2. **Cross-fold transfer unreachable** — per-page clamping ran before the transfer
   check; dragging in spread view now clamps in spread space.
3. **Spread halves overflowed the paper** in single view — `#page` now clips at trim.
4. Invalid CSS colour token in the page-number rule.

The v2.1 round (mobile + Mini Zine print mode) passed all 22 new tests on the first
run with no defects found.

The v3.0 round surfaced one real portability defect — `img.loading`/`img.decoding` set
as IDL properties don't reflect to attributes in all engines; switched to
`setAttribute`, which behaves identically everywhere — plus one test-fixture name
collision (two assets named `d.png`), fixed in the suite.

## Limits of this environment

jsdom has no layout engine or real renderer, so pixel-perfect visual output, actual
print rasterisation, Google Fonts loading, and OS-level file dialogs were verified by
construction (exact-inch assertions on the print DOM) rather than by screenshot. A
quick human pass in Chrome/Firefox — open, drop a photo, make a spread, print preview —
remains the final gate before distributing copies.

## Latest raw run
See `tests/last-run.txt` (written on every run).
