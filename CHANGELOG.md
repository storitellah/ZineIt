# Changelog — ZineIt by Storitellah

## v3.1 — 2026-07-07
Mobile platform release: seamless on Android and iOS, plus a cleaner support card.

### Changed
- **Notch & home-indicator safe**: the header, mobile toolbar, drawers, timeline sheet, toast, Edit chip, and fullscreen controls all respect `env(safe-area-inset-*)`, so nothing hides behind iPhone notches or Android gesture bars.
- **iOS dynamic-toolbar safe**: the app frame uses `100dvh` (with `100vh` fallback), so Safari's collapsing address bar never clips the timeline or toolbar.
- **No accidental zoom**: form controls are ≥16 px on mobile (stops iOS zoom-on-focus), controls use `touch-action:manipulation` (no double-tap zoom), tap highlights and iOS long-press callouts are suppressed on page elements, and `overscroll-behavior:none` keeps pull-to-refresh from hijacking canvas gestures. Pinch-zoom remains enabled for accessibility.
- **Touch drags stay glued to the finger**: pointer capture is engaged on drag start, making drag/pan/resize reliable on Android Chrome and iOS Safari even when the finger leaves the frame.
- **Single-row view bar** on phones: horizontally scrollable instead of wrapping into a tall stack.
- **Support card redesigned**: Ko-fi and Patreon are now compact icon buttons (brand-coloured, accessible labels, no raw URLs). **M-Pesa removed.**
- 8 new automated tests (83 total, all passing).

## v3.0 — 2026-07-07
Performance architecture release: less memory everywhere, photos that always load fast, every format in, and a feedback channel.

### Changed — the photo engine
- **Photos moved out of the project JSON into IndexedDB as blobs.** State now carries only metadata plus a ~15 KB thumbnail per photo, so autosave is instant and tiny regardless of how many photos a project holds, and the browser never keeps full-resolution images decoded just to draw the editor.
- **Three-tier rendering**: 192 px thumbs for the library and timeline (lazy-loaded), ~1600 px previews for the canvas (progressively hydrated — thumb appears instantly, preview swaps in), and full-resolution originals touched **only** for print/PDF and the lightbox. On a phone this is the difference between decoding megapixels and decoding kilobytes.
- **Print quality unchanged**: exports preload the untouched originals from the store before the print dialog opens.
- **.bak files remain fully self-contained** — export embeds the originals and previews, restore rehydrates the store. Old v1/v2 projects and .bak files migrate automatically: inline photos move to fast storage on first load and previews regenerate in the background.
- Deleting a photo (or starting a new project) frees its stored blobs and revokes object URLs — memory is actually reclaimed, and orphaned blobs are swept at startup.
- Imports run sequentially through one decoder to cap peak memory on mobile during multi-photo drops; decoding uses `createImageBitmap` with high-quality downscaling.

### Added
- **All photo formats import, including HEIC/HEIF** (iPhone default). Native decode is tried first (Safari handles HEIC itself); elsewhere a converter loads lazily from a CDN only when a HEIC file actually arrives — the app stays fully offline for every other format. Detection works by MIME type *and* extension, since HEIC files often arrive with no MIME type on Windows/Android.
- **Feedback channel**: "Found a bug? Have an idea?" in the Support panel and a ✉ Feedback button in the view bar — both open a pre-addressed email to **bryanjaybee@gmail.com** with the app version, format, and browser prefilled.
- 10 new automated tests (75 total, all passing).

## v2.1 — 2026-07-05
Mobile optimisation + a dedicated Mini Zine print mode.

### Added
- **Fully responsive mobile shell** (≤820 px): single-column layout, Photos/Tools panels as slide-in drawers with a tap-to-close backdrop, collapsible timeline bottom sheet, five-button mobile toolbar (Photos · Tools · Timeline · Text · Full), compact header, overflow-safe canvas.
- **Touch controls**: drag, pan, and 8-way resize on the unified pointer-event pipeline; `touch-action:none` keeps gestures on the frames; 18 px handles and larger tap targets on coarse pointers; tap-to-select with an **Edit chip** that opens the tools drawer (and focuses the text field for text blocks).
- **Swipe navigation**: horizontal swipes on the canvas step pages in single view and whole spreads in spread view; vertical gestures and element drags never trigger it.
- **Fullscreen preview** (mobile + desktop): chrome-free view with ‹ › navigation, page indicator, Esc/✕ to exit; single-page, facing-spread, and fullscreen views all switchable on mobile.
- **Mini Zine print mode**: dedicated dialog with **A4 / US Letter** paper toggle, **live print preview** of the real imposed sheet, dashed **fold marks** + printer-style edge ticks, ✂ **cut mark** across the middle two panels, show/hide toggles for both, page-number toggle, **fit-to-paper** via a single uniform scale (image aspect ratios preserved), optional ¼″ paper margin, correct `@page` size per paper for browser print-to-PDF, clipping warning when 100% doesn't fit A4, and collapsible fold/cut instructions.
- Imposition settings persist in the project (and .bak files); migration fills defaults for older projects.
- 22 new automated tests (65 total, all passing — see TESTING.md).

## v2.0 — 2026-07-05
A visual-layout-tool release: spreads, a text pipeline, and a tested render.

### Added
- **Facing-page preview**: Single/Spread view toggle; left and right pages always shown together with a centre-fold guide; pagination model (cover alone → interior pairs → back alone).
- **Double-page spread photos**: one image spans both facing pages, stored once, aligned across the fold in editor, preview, print, and mini-zine imposition; gutter bleed when bleed mode is on; one-click return to single-page mode.
- **Text Editor tab**: every text block in the zine in one list — page number, spread number, content type (13 roles: title, page-title, caption, quote, name, bio, reflection, note, credits, back-cover, copyright, page-number, custom), inline editing, "Show →" live-preview jump, per-row save status; zine title editing with add-to-cover.
- **Enlarged timeline** (178 px): 96 px page thumbnails grouped by spread, page numbers, drag-and-drop page reorder, current-spread highlight, ⇔ spread / ▣ photo / T text / ♪ audio / empty-page indicators; photos draggable from timeline thumbs onto the page.
- **Zoom controls**: Fit (capped for a calmer, centred preview), 100%, +/− stepping with a live percentage readout.
- **8-way resize** (4 corners + 4 edges) with a live **crop ghost** showing the full uncropped image extent plus a crop-% readout; Reset crop and Reset frame.
- **Guides & bleed system**: margin, safe-area, bleed, centre-fold, and grid guides with snap; bleed mode allowing a controlled ⅛″ spill past trim (hard clamp at trim when off); margin-crossing warnings on the offending sides.
- **Navigation**: prev/next page and prev/next spread buttons; arrow keys navigate when nothing is selected and nudge when something is; timeline click; covers included, no skips.
- **Page numbers**: independent preview and print toggles; covers always unnumbered; outer-corner placement.
- **Page audio notes**: attach field audio to a page (editor-only, never printed) with a ♪ timeline indicator.
- **Pan mode** button as a modifier-free alternative to Shift-drag.
- **v1 → v2 migration**: existing autosaves and .bak files load cleanly.
- **Automated test-suite**: 43 jsdom tests (`tests/run-tests.js`) covering the entire release checklist.

### Fixed
- Shift+drag photo panning (selection no longer rebuilds the DOM mid-gesture).
- Elements can now genuinely cross the fold in spread view and re-home to the facing page.
- Timeline crash when painting the cover spread (null left page).
- Spread halves no longer hang off the paper in single-page view.

## v1.1 — 2026-07-05
- Lively colour system (gradient wordmark, rainbow rule, colour-coded panels) on a neutral canvas.
- 40 Google Fonts with offline system-stack fallback.
- Keep-original-aspect-ratio placement toggle.
- `docs/ARCHITECTURE.md` and optional Phase-2 sync API scaffold (`server/`).

## v1.0 — 2026-07-04
- Core local-first editor: zine + photobook formats, front/back covers, drag-drop full-resolution photos, five templates, ⅛″ snap grid, text with date stamps, live clock.
- PDF/print export at exact trim size; 8-page mini-zine imposition with fold instructions.
- Verified `.bak` backups (test-restore before download), autosave, daily reminder.
