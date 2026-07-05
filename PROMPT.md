# PROMPT.md — ZineIt v2.0 build record

This file documents the prompt and requirements that produced ZineIt v2.0, so the build
can be reproduced, audited, or extended.

---

## Full build prompt (v2.0)

> Update the zine and photobook builder with a stronger editing interface, better preview
> layout, improved image handling, and complete testing before rendering.
>
> **Text Editor tab** — all text used inside the zine editable from one place: zine title,
> page titles, captions, quotes, participant names, participant bios, reflections, project
> notes, credits, back cover text, copyright text, page number text, custom blocks. Each
> item shows page number, spread number, content type, editable field, live preview link,
> save status.
>
> **Double-page spread** — one photo spans two facing pages, aligned across the centre
> fold, centre fold guide, bleed across the gutter when enabled, safe-margin crop preview,
> crop adjustment without stretching, and a way back to single-page mode.
>
> **Facing page preview** — left and right pages always appear together, spreads never
> shown as isolated pages, preview reflects page flow, page number toggle.
>
> **Preview panel layout** — reduce preview size, centre it, enlarge the timeline, larger
> thumbnails, zoom controls (fit-to-screen, 100%, spread view).
>
> **Timeline** — page + spread thumbnails, page numbers, drag-and-drop reorder, selected
> highlight, double-spread / text / photo / audio indicators, empty page warning.
>
> **Image placement** — fix Shift+drag repositioning; quick drag placement; drag from
> library, timeline, and between frames; snap into layout frames.
>
> **Fit / Fill / Centre** — instant; aspect ratio always preserved; Fill crops, never
> stretches.
>
> **Resizing** — 8 handles (4 corners + 4 edges); resize crops, never stretches; photo
> stays centred unless repositioned; crop preview during resize; reset crop; reset frame.
>
> **Margins & guides** — margin / safe area / bleed / gutter / centre fold / grid guides,
> snap-to-guide, toggles; images stay inside margins by default, warning when crossed,
> controlled ⅛″ spill only when bleed mode is enabled, never accidental spill past the
> print-safe area.
>
> **Navigation** — next/previous page, next/previous spread, keyboard arrows, updates
> preview + timeline, never skips, never breaks on covers.
>
> **Page numbers** — separate toggles for preview and print export.
>
> **Deliverables** — GitHub repo, updated HTML (zine + photobook builders), PROMPT.md,
> README.md, CHANGELOG.md, testing report. Test the entire tool before rendering.

## Project requirements (carried through all versions)

- Fully local, standalone `index.html` — no build step, no server, works by double-click.
- Branding: **ZineIt by Storitellah** (storitellah.com); support links to
  ko-fi.com/kiberastories, patreon.com/c/kiberastories, and M-Pesa 0711 254 986.
- Zine formats: mini zine (8-page one-sheet with fold/cut imposition), quarter,
  half-letter, A5. Photobook formats: 8×8, 8×10, 10×8, A4. Front + back covers always.
- Full-resolution photo import; drag/resize/reposition; PDF download and highest-quality
  print via the browser print engine (`@page` at exact trim size, margins none, 100%).
- Verified local backups (`.bak` passes a test restore before download), autosave,
  daily backup reminder, live clock, insertable date stamps.
- 40 Google Fonts with offline system-stack fallback; lively colour system with a
  neutral canvas so photographs read true.

## Version notes

- **v1.0** — core layout engine (inches → pixels at render time), formats, templates,
  snap grid, backups, print/PDF, mini-zine imposition.
- **v1.1** — colour system, 40-font picker, keep-aspect-ratio placement, lightbox,
  in-frame photo panning, architecture docs + Phase-2 sync API scaffold.
- **v2.0** — this build: facing-page spreads, double-page spread photos, Text Editor tab,
  enlarged timeline with reorder + indicators, zoom controls, 8-way resize with live crop
  ghost, guides & bleed system with margin warnings, full navigation, page-number
  toggles, page audio notes, v1→v2 migration, automated jsdom test-suite (43 tests).

## Feature list (v2.0)

Layout · spreads: single/spread view, centre fold guide, double-page spread photos
stored once and rendered on both pages (editor, preview, print, imposition), gutter
bleed, cross-fold element transfer while dragging.
Text: Text Editor tab (page, spread, content type, live preview link, save status),
13 content roles, zine title sync, add-to-cover.
Images: full-res import, library/timeline drag sources, drop-on-frame replacement,
snap-into-empty-frame, Fit/Fill/Centre, reset crop/frame, Shift-or-Alt-drag and Pan-mode
panning, 8-way resize, live crop ghost + crop % readout, lightbox.
Guides: margins, safe area, bleed, fold, grid, snap; bleed mode (hard clamp at trim when
off, exactly ⅛″ when on); margin-crossing warnings.
Navigation: page/spread buttons, arrow keys (navigate unselected, nudge selected),
timeline click, no skips, covers safe.
Timeline: 96 px thumbs grouped by spread, page numbers, drag-reorder, ⇔/▣/T/♪/empty
indicators.
Output: sequential print/PDF at trim size, page-number print toggle (covers skipped,
outer corners), 8-panel mini-zine imposition with fold instructions.
Data: autosave, verified .bak backup/restore, v1 migration, page audio notes
(editor-only).

## Known fixes in this build

1. **Shift+drag pan** — selection no longer rebuilds the page DOM on pointerdown
   (`updateSelectionDom` mutates classes/handles in place), so the pressed node
   survives and the pan drag tracks; a Pan-mode button gives a modifier-free path.
2. **Timeline crash on the cover spread** — painting spread halves dereferenced a null
   left page (`{left:null,right:0}`); found by the automated suite, guarded.
3. **Cross-fold transfer was dead code** — per-page clamping ran before the transfer
   check; dragging in spread view now clamps in spread space so elements can cross the
   fold and re-home to the facing page.
4. **Spread halves hung off the paper in single view** — `#page` now clips at the trim.
5. **Invalid CSS colour token** in the page-number style, corrected.

## Testing checklist (all verified — see TESTING.md)

Text Editor tab · double-page spread (make, render, print, unmake) · facing pages side
by side · reduced/centred preview with Fit/100%/± zoom · larger timeline · Shift+drag ·
quick drag placement · Fit / Fill / Centre · 8 resize handles · resize never stretches ·
crop ghost + reset · margin clamps and warnings · bleed exactly ⅛″ · guides · forward
and backward page/spread/keyboard navigation · page-number toggles (preview + print,
covers skipped) · zine preview · photobook preview · print DOM (8 pages) · imposition
(8 panels, 4 rotated) · backup round-trip + corrupt-file rejection · v1→v2 migration ·
zero console errors.

## Future improvement notes

- True PDF generation with embedded bleed + crop marks (page size = trim + 2×⅛″).
- Booklet imposition for quarter/half-letter/A5 (saddle-stitch page pairing).
- Undo/redo history (the single JSON document model makes snapshots cheap).
- IndexedDB autosave for very large photo sets (localStorage has a ~5 MB ceiling).
- Optional cloud sync via the Phase-2 API scaffold in `server/` (see
  `docs/ARCHITECTURE.md`).
- Text auto-flow between linked frames; per-role default styles.

---

## v2.1 build prompt (mobile + mini-zine print)

> Optimise the zine and photobook builder for mobile: fully responsive interface,
> mobile-friendly preview, touch drag and touch resize, swipe navigation between pages,
> tap to edit page blocks, a mobile toolbar, collapsible timeline and text editor
> panels, fit preview to screen, prevent layout overflow, keep facing pages readable,
> and allow switching between single-page, facing-spread, and fullscreen preview.
>
> Add a dedicated Mini Zine print mode: A4 and Letter layouts with a toggle, correct
> fold marks, correct cut marks, page order arranged for folding, print preview before
> export, browser print-to-PDF, and clear folding/cutting instructions. Export
> settings: A4/Letter, PDF export, show/hide fold guide, show/hide cut guide,
> include/hide page numbers, fit to paper, maintain margins, preserve image aspect
> ratios. Test mobile preview, touch controls, swipe navigation, both paper layouts,
> fold marks, cut marks, and PDF export before rendering.

### v2.1 version note

Delivered as above; see CHANGELOG.md for the feature breakdown and TESTING.md for the
65-test report (22 new tests, all green, no defects found in this round). Design
decisions worth knowing: the imposition is authored on a fixed 11 × 8.5″ design sheet
(4 × 2.75 by 2 × 4.25 panels) and mapped onto the chosen paper with one uniform
`scale()` — that is what guarantees "preserve image aspect ratios" by construction;
A4 output is therefore 97.3% size (limited by A4's shorter height). Swipe recognition
runs on pointer events with a 60 px horizontal / <50 px vertical threshold and yields
to element drags. The mobile breakpoint is 820 px, read from `window.innerWidth` so it
is testable in jsdom.
