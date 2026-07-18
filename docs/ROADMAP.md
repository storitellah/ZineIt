# ZineIt v4 roadmap

The v4 brief describes a professional print application. It is a genuinely good
brief — and it is six to ten weeks of work, not one build. Shipping all of it at
once would mean twenty half-features and a tool that impresses in a screenshot and
fails on a deadline.

So it is being built in phases. Each is shippable on its own and gated by the same
rule as every ZineIt release: automated tests pass before anything renders.

**v4.0** shipped the foundation and the template library. **v4.1** shipped the
one-window workspace, layers, undo/redo, the text colour system, the PWA and the
Android build project. **v4.2** shipped the crop-editor window, rulers and draggable
guides, and a UI pass (labelled toolbar, standalone Export, pan toggle, relocated
clock). What is left is listed honestly below — nothing here is half-built and quietly
claimed.

> **v4.3 shipped the cover-template library** (12 front + 8 back designs with a large
> centred, mobile-optimised preview), **transparent graphics** (QR/logo/PNG with alpha
> preserved through export), a **fixed export** (text colour + hidden layers now honoured),
> and a **light backup + relink** system (kilobyte reference files that reconnect photos
> from disk).
>
> **The one big thing still NOT built — flagged loudly, not buried:**
> - **The equirectangular panorama photobook system** (2:1/3:1/4:1 ratios, seam/fold/
>    gutter controls, subject-protection, 4-page splits, wraparound cover, panorama-aware
>    cropping, low-res/ratio warnings). A double-page spread already crosses the fold
>    without stretching, and there is now a panorama-band *cover*, but the panorama-*aware*
>    tooling is a substantial build of its own and is scheduled as its own phase. See Phase 5.

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

## Phase 2 — the workspace ✅ mostly shipped in v4.1

| Area | What landed |
|---|---|
| **One window** | Compact 44px toolbar, left media panel, centre preview, tabbed right panel, bottom timeline. The right rail was one endless scroll; it is now five panes — Properties, Page, Layers, Guides, Export — and only one is on screen at a time |
| **Compact title** | Click-to-edit field in the toolbar, truncates visually with the full title on hover, never truncated in the saved file |
| **Panels** | Resize left/right/timeline by dragging, collapse any of them, arrangement saved to local storage, reset button, focus mode, preview-only mode, Esc always gets you out |
| **Layers** | Full stack front-to-back, type icons and brand colours, select, rename, drag-reorder, bring to front / send to back, hide, lock, duplicate, delete. Hidden layers are skipped on canvas, in print and in the 300 DPI export — but stay in the file |
| **Undo / redo** | 60 steps, Ctrl/⌘Z and ⇧ to redo, buttons reflect what is actually possible. Snapshots the project, never the photographs |
| **Text colour** | Picker, HEX input with forgiving parsing, RGB readout, the seven brand presets, recent colours, and apply-by-scope (text / page / spread / whole publication) that respects the text's role |
| **PWA** | Manifest, network-first service worker, installable — and skipped entirely on `file://` so the double-click case stays clean |
| **Android** | Complete Capacitor 6 Android Studio project, branded icons and splash, one permission (`INTERNET`) |

### Shipped in v4.2

- **Rulers** along the top and left of the canvas (inch), tracking the zoom ✅
- **Draggable guides** — drag from a ruler to add, drag off the page to remove, add
  from buttons, clear all ✅
- **Snapping** to guides, page edges, margins and element centres (object-snap toggle) ✅
- **Dedicated crop editor window**: large preview with Fit/Fill/Centre, zoom, straighten
  (−45°…45°), 90° rotate, **flip H/V**, rule-of-thirds grid, non-destructive
  working-copy/apply/cancel ✅

### Still open from Phase 2

- **More guide types**: baseline grid, explicit gutter/spine guides (margin, bleed and
  centre are covered by the existing bleed/margin guides + user guides)
- **Ruler units**: mm/cm/px and a settable origin (currently inch, page-origin)
- **Perspective correction** in the crop window (flip + straighten shipped; keystone
  correction did not)
- **Mini-zine setup wizard**: paper → finished size → orientation → pages → binding →
  bleed → colour profile → quality → template
- **Paper and finished-size options**: A3/A4/Letter/custom sheets, A6/A7/custom trims
- **Front/back cover template library** ✅ **shipped in v4.3**: 12 front-cover designs
  (full-bleed photo, photo plate, minimal title, big typography, split image/title,
  magazine, photo grid, documentary, fine-art, youth/community, black & white, panorama
  band) and 8 back-cover designs (summary + byline, closing photo, logo + contact,
  supporter logos, contact card, QR + link, colophon, solid colour), with a large centred
  preview that is mobile-optimised.

### Also shipped in v4.3
- **Transparent graphics** ✅: import QR codes, logos and PNG/SVG/WebP/GIF with alpha
  preserved end to end (no white matte), placed contained, with an inspector toggle. Alpha
  is auto-detected on import.
- **Light backup + relink** ✅: kilobyte reference backups store the layout plus a
  fingerprint of each photo (name, byte size, dimensions) but not the pixels; **Relink
  photos…** reconnects them from disk by matching the fingerprints. Originals untouched.
- **Export fidelity fix** ✅: the print/PDF path now honours the chosen text colour and
  skips hidden layers, matching screen and the 300 DPI JPG export.

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

- Equirectangular panorama books (2:1, 3:1, 4:1, custom): fit, fill, visual centre,
  horizontal shift, seam and fold position, gutter preview with subject protection,
  split across two or four pages, continuous sequence, wraparound cover, foldout
  preview, export as full panorama or page sequence, warnings on low resolution,
  unsuitable ratios, subjects crossing the gutter, and over-aggressive crops
- A panorama-specific crop editor with a wide viewport and horizontal navigation

  *Note: a double-page spread already spans the fold correctly and never stretches a
  photo (v4.0). What is missing is the panorama-aware tooling above, not the ability
  to place a wide image across two pages.*
- Mockups: flat page, facing spread, folded mini zine, saddle-stitched booklet,
  stapled zine, softcover, hardcover, open/closed book, page-turn, print sheet
- Printmaker guide + downloadable print specification sheet
- Downloadable instruction sheet with step-by-step folding/binding diagrams

## Phase 6 — platform and formats

- ~~PWA: manifest, service worker, installable, offline-first~~ ✅ **shipped in v4.1**
- ~~Android APK build project~~ ✅ **shipped in v4.1** — the project, not a compiled
  binary; see `docs/ANDROID-BUILD.md` for why, and for the ten-minute build
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
