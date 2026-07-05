# TESTING.md — ZineIt v2.0 test report

**Result: 43 passed · 0 failed · 0 console errors.** The whole tool was tested before
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
| Console health | Zero page errors or uncaught exceptions across all 43 tests |

## Defects found by this suite and fixed before render

1. **Timeline crash on the cover spread** — painting spread halves dereferenced a null
   left page. One guard fixed a 24-test failure cascade.
2. **Cross-fold transfer unreachable** — per-page clamping ran before the transfer
   check; dragging in spread view now clamps in spread space.
3. **Spread halves overflowed the paper** in single view — `#page` now clips at trim.
4. Invalid CSS colour token in the page-number rule.

## Limits of this environment

jsdom has no layout engine or real renderer, so pixel-perfect visual output, actual
print rasterisation, Google Fonts loading, and OS-level file dialogs were verified by
construction (exact-inch assertions on the print DOM) rather than by screenshot. A
quick human pass in Chrome/Firefox — open, drop a photo, make a spread, print preview —
remains the final gate before distributing copies.

## Latest raw run
See `tests/last-run.txt` (written on every run).
