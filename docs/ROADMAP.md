# ZineIt v4 roadmap

The v4 brief describes a professional print application. It is a genuinely good
brief — and it is six to ten weeks of work, not one build. Shipping all of it at
once would mean twenty half-features and a tool that impresses in a screenshot and
fails on a deadline.

So v4.0 is **Phase 1: the foundation**. Everything below it in this document sits
on top of the engine, formats, and export path that Phase 1 puts in place. Each
phase is shippable on its own and gated by the same rule as every ZineIt release:
automated tests pass before anything renders.

---

## Phase 1 — shipped in v4.0

| Area | What landed |
|---|---|
| **Brand system** | Full palette, Poppins/Inter/Source Serif 4/Manrope type system, wordmark treatment with clear space, yellow-on-ink buttons at 4.5:1, dark workspace + light page canvas |
| **Non-destructive image engine** | Frame = clipping mask; photo moves freely beyond it, scales, rotates; Fit/Fill/Centre/Reset Crop/Reset Frame; F/⇧F/C/R/⇧R; wheel + pinch zoom; 8 resize handles + rotate; original file never altered |
| **16-page mini zine** | Format, saddle-stitch imposition, reading-order and print-order previews, fold/staple/stitch/trim instructions |
| **Full-bleed A4** | A4 portrait + landscape, edge-to-edge by default, 3 mm / 5 mm bleed |
| **Photobook ratios** | 3:2 landscape and 2:3 portrait |
| **High-res export** | 300 DPI JPGs from the originals, numbered in reading order, spreads, ZIP packaging |
| **File naming** | `Title_Made with ZineIt_Date_Time` / `Title_ZineIt_Date_Time`, sanitised, optional suffix |
| **Template library** | Nine templates (Blank + the seven named in the brand guidelines + Photojournalism), all eleven page types each, page-relative recipes that fit every format, browser with live previews, apply to page/selection/whole zine, non-destructive replace, save/duplicate/export/import |
| **Text colour** | Colour is now part of the text model, rendered on canvas and in the 300 DPI export |
| **Removals** | Page audio notes gone from every surface |

## Phase 2 — the workspace (next)

- **Rulers** in inch/mm/cm/px with a settable origin
- **Draggable guides** from the rulers; lock, hide, clear all
- **Guide types**: margin, safe area, bleed, centre, gutter, spine, grid, baseline
- **Snapping**: to guides, page centre, margins, other objects, grid
- **Mini-zine setup wizard**: paper → finished size → orientation → pages → binding →
  bleed → colour profile → quality → template
- **Paper and finished-size options**: A3/A4/Letter/custom sheets, A6/A7/custom trims

## Phase 3 — templates ✅ shipped (brought forward)

The engine and the brand guidelines' seven named templates shipped in v4.0 — see
`docs/TEMPLATE-GUIDE.md`. Remaining, and cheap now the engine exists: the rest of the
brief's categories (Fine Art, Youth Zine, Family Archive, Exhibition Catalogue, Black
and White, Bold Typography, Interview, Photo Essay, Community Story, Annual Report,
Panorama Book). Each is a style block plus a handful of overrides — roughly an hour
each, not a subsystem.

## Phase 4 — colour and proofing

- Profile selection: sRGB, Adobe RGB, Display P3, CMYK simulation, FOGRA39, FOGRA51,
  GRACoL, black-and-white, custom label
- Soft-proof preview: screen, standard print, fine art, commercial press, home printer
- **Honest labelling throughout.** A browser cannot do a real ICC CMYK conversion.
  Each option will state plainly whether it is an embedded profile, a preview
  simulation, an export label only, or a job that needs professional conversion —
  with a warning where a true CMYK export is not possible. Quietly implying otherwise
  would cost someone a print run.

## Phase 5 — panorama, mockups, printmaker guide

- Equirectangular 2:1 panorama books: fit, crop, centre point, horizontal shift, seam
  position, wraparound preview, split across two or four pages, foldout preview,
  export as full panorama or page sequence, warnings on unsuitable ratios
- Mockups: flat page, facing spread, folded mini zine, saddle-stitched booklet,
  stapled zine, softcover, hardcover, open/closed book, page-turn, print sheet
- Printmaker guide + downloadable print specification sheet
- Downloadable instruction sheet with step-by-step folding/binding diagrams

## Phase 6 — platform and formats

- PWA: manifest, service worker, installable, offline-first
- Export formats: PNG, print-ready PDF with crop marks, screen PDF, multi-page and
  individual PDFs, HTML flipbook, print package ZIP
- Demo content and sample exports

---

## Standing principles

1. **Tests gate every release.** No feature renders before the suite is green.
2. **Never stretch a photo.** Frames crop; photos keep their true ratio, always.
3. **Never alter the original.** Every crop, rotation and zoom is reversible.
4. **Local-first.** Nothing is uploaded. A single HTML file must still work offline.
5. **Say what the browser cannot do.** Especially about colour.
