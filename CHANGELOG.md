# Changelog — ZineIt by Storitellah

## v4.3 — 2026-07-18
The cover-template library, transparent graphics, a fixed export, and a light backup that relinks.

### Fixed — export fidelity (important)
- **Text colour now exports.** The print/PDF path was hardcoding near-black and ignoring
  your chosen colour — so a coral heading printed black. It now uses the element's real
  colour everywhere: screen, print/PDF, and the 300 DPI JPG export all agree.
- **Hidden text layers no longer print.** A layer you hid on screen was still appearing in
  the print/PDF export. Now hidden means hidden, in every output.
- Text also gets the same inner padding in print as it has on screen and in the JPG export,
  so nothing shifts between preview and paper.

### Added — cover-template library
- A dedicated **Front cover…** and **Back cover…** browser with a **large, centred preview**
  that holds your true page proportions and scales to the screen — on desktop the preview
  sits beside the list; on a phone it moves to the top and the list becomes a swipe strip.
- **12 front-cover designs**: full-bleed photo, photo plate + title band, minimal title,
  big typography, split image/title, magazine, photo grid, documentary, fine-art,
  youth/community, black & white, and a panorama band.
- **8 back-cover designs**: summary + byline, closing photo, logo + contact, supporter
  logos, contact card, QR + link, colophon, and solid colour.
- Covers inherit your project's fonts and accent, pull the title from your project name,
  and **keep your existing photos and text**, re-flowing them into the new layout. Front
  applies to the first page, back to the last.

### Added — transparent graphics (QR codes, logos, PNGs)
- **+ Graphic / QR (transparent)…** imports PNG/SVG/WebP/GIF and **keeps the transparency**
  all the way through — preview, thumbnail and export are PNG, never flattened to a white
  box. Drop a normal transparent PNG in and ZineIt detects the alpha automatically.
- Graphics are placed **contained** (the whole mark is visible) with **no matte**, and a
  **Transparent graphic** toggle in the inspector converts any image to a graphic (or back).
- Transparency is preserved in the print/PDF output and composites correctly over photos in
  the 300 DPI JPG export.

### Added — light backup + relink (small files)
- **Save light backup (references photos)** writes a **kilobyte-sized** file: your full
  layout plus a fingerprint of each photo (name, byte size, dimensions) — but not the pixels.
- **Relink photos…** reconnects those photos from disk by matching the fingerprints, so as
  long as the originals are on the same computer you get everything back. Restoring a light
  backup offers to relink straight away. Your originals are never modified.
- The original **full .bak** (everything embedded, verified by a test restore) is unchanged
  and still the one-file option.

### Tested
- 182 automated jsdom tests + 22 Lua tests, all green. New coverage: the export-colour and
  hidden-layer regressions, every cover/back recipe, transparent-graphic detection and
  rendering, and the light backup + relink matching.

## v4.2 — 2026-07-18
A user-experience pass across the whole tool: clearer toolbar, a real crop window,
rulers and draggable guides, and a pan toggle that stays put.

### Added — crop editor window
- **Double-click any placed photo (or press ✂ Crop photo…) to open it in a dedicated
  window.** A large working view of the photo inside its frame, with the cropped-out
  area shaded and the whole-photo boundary marked.
- **Everything a crop needs, in one place:** Fit / Fill / Centre, a zoom slider and
  buttons, a straighten slider (−45°…45°) plus 90° rotate, **flip horizontal and
  vertical**, a rule-of-thirds grid, and Reset.
- **Non-destructive by construction.** The window edits a *working copy* of the photo's
  transform. Nothing is written back until you press **Apply**; **Cancel** discards
  everything, and your original file is never touched. Keyboard: F fit, ⇧F fill, C
  centre, Enter applies, Esc cancels.
- **Flip is now a first-class transform** — it survives save/restore and renders
  identically on screen, in print, and in the 300 DPI JPG export.

### Added — rulers & draggable guides
- **Inch rulers** along the top and left of the canvas (toggle in Guides & bleed).
  They track the zoom.
- **Drag from a ruler onto the page to drop a guide; drag a guide off the page to
  remove it.** Add horizontal/vertical guides from buttons, or clear them all.
- Guides are teal, become **snap targets** (along with page edges, margins and element
  centres) when object-snapping is on, and **never print or export** — they are for
  your eye only.

### Changed — toolbar & layout
- **Toolbar buttons now carry text labels**, not bare icons — Undo, Redo, Add page,
  Spread, Templates, Pan, Focus, Preview. Nobody has to guess what “+” means. Labels
  collapse to icons only when the window is genuinely narrow.
- **Export stands alone** — its own yellow button in its own corner, separated from the
  editing tools.
- **The clock and the autosave indicator moved out of the header** and into a status
  strip at the bottom of the Page pane, under the Layout system.
- **Pan mode is a proper toggle** in the toolbar (and still in Properties); both stay in
  sync, and the cursor changes to a grab hand while it is on.
- Clicking an element selects exactly what is under the cursor and **never reorders the
  stack** — whatever you click is what you edit, and nothing else on the page moves.

### Tested
- 163 automated jsdom tests + 22 Lua tests, all green. New coverage: the crop window's
  working-copy/apply/cancel contract, flip across every render path, rulers & guides
  state and the guarantee that guides never print, the labelled toolbar, the standalone
  Export, the pan toggle, and the relocated clock.

## v4.1 — 2026-07-17
The one-window workspace. **Phase 2 of the v4 brief**, plus the PWA and the Android
build project from Phase 6 — see `docs/ROADMAP.md` for what is still open and why.

### Added — one-window workspace
- **The right panel is no longer one endless scroll.** It is five tabbed panes —
  Properties, Page, Layers, Guides, Export — and only one is on screen at a time. This
  was the main objective of the release and the thing the brief actually complained about.
- **Compact top toolbar** (44px): undo, redo, page size, add page, add spread,
  templates, zoom out/fit/in, focus mode, preview-only, reset workspace, save status,
  export. Icons with tooltips, no oversized labels.
- **Compact project title** — a click-to-edit field in the toolbar. It truncates
  visually with an ellipsis, shows the full title on hover and on focus, and **never
  truncates the title that is actually saved**.
- **Resizable, collapsible panels.** Drag the left panel, the right panel or the
  timeline. Collapse any of them. The arrangement is saved to local storage and comes
  back next time. There is a reset button when it all goes wrong.
- **Focus mode** hides both side panels; **preview-only** leaves just the pages.
  **Esc always gets you back** — it is now checked *before* the typing guard, so it
  works even when a field has focus.

### Added — layers
- **An Illustrator-style layer stack per page**, front to back, with type icons in the
  brand palette: photo, empty frame, panorama/spread, text, caption, page number.
- Select, **rename** (double-click), **drag to reorder**, bring to front, move forward,
  move backward, send to back, duplicate, delete.
- **Hide** and **lock**. Hidden layers are skipped on the canvas, in the print path and
  in the 300 DPI export — but **stay in your file**. Hiding is not deleting. Locked
  layers cannot be dragged by accident.
- Renaming a layer never touches the photo record.

### Added — undo / redo
- 60 steps. `Ctrl/⌘ Z`, `⇧` to redo, `Ctrl/⌘ Y` as well. The buttons disable themselves
  when there is nothing to do.
- **Snapshots the project, never the photographs.** Photos live in IndexedDB and are
  never rewritten, so undo is both honest and cheap. A fresh edit clears the redo branch
  rather than corrupting it.

### Added — text colour system
- Colour picker, HEX input with forgiving parsing (`#FFC43D`, `ffc43d`, `#fc3` all work;
  junk is refused with a reason), live RGB readout, recent colours, and the seven brand
  presets.
- **Apply by scope**: this text, this page, this spread, or the whole publication —
  matching **by role**, so recolouring every title leaves the captions alone.

### Added — platform
- **PWA**: `manifest.webmanifest` and a network-first service worker. Installable,
  offline-capable. **Skipped entirely on `file://`** — the manifest link is removed and
  the worker never registers, so double-clicking the file gives no 404 and no console
  error. The single-file case remains the primary one.
- **Android build project**: a complete, branded Capacitor 6 Android Studio project
  (`android/`), package `com.storitellah.zineit`, adaptive icon (yellow Z on Ink Black)
  at every density, Ink Black splash, minSdk 22 / target 34.
  **One permission: `INTERNET`.** No contacts, call logs, microphone, location,
  background services — and deliberately **no photo-library permission**, because photos
  arrive through the system picker one explicit tap at a time.
  `npm run android:debug` builds it in about ten minutes.

### Fixed
- **The Guides & Bleed hint still said "controlled ⅛″ spill"** after v4.0 moved bleed to
  3 mm / 5 mm — in the hint *and* in the toast. Both now track the real setting live.
  (Caught from a screenshot, which is a fair reminder that prose goes stale too.)
- **The timeline's resize handle was being eaten** by `renderTimeline`'s `innerHTML`
  reset on every render.
- **Esc was swallowed by the typing guard**, so it would not leave preview or focus mode
  while a field had focus.

### Not in this release — stated plainly
- **There is no compiled APK.** The build environment has Java but no Android SDK, and
  `dl.google.com`, `maven.google.com` and `services.gradle.org` are all blocked (HTTP
  403) — `./gradlew` cannot even download Gradle. The project is complete and real; the
  ten-minute compile is yours. See `docs/ANDROID-BUILD.md`.
- **A signed release APK needs your developer signing key.** It is not mine to make.
  See `docs/APK-SIGNING.md`.
- **Rulers, draggable guides, the dedicated crop editor modal, the equirectangular
  panorama system and the front/back cover template library are not built.** They are
  sequenced in `docs/ROADMAP.md` rather than half-shipped. A double-page spread already
  spans the fold without stretching; panorama-*aware* tooling is what is missing.

### Testing
- **153 app tests + 22 Lua tests, all passing.** New coverage: the tabbed right panel;
  every toolbar and panel control present; the compact title never truncating the saved
  value; panels resizing, collapsing, persisting and resetting; focus and preview-only
  with Esc; the bleed hint tracking millimetres; the layer stack order, reorder,
  hide-is-not-delete, lock-stops-drag, rename-does-not-touch-the-photo; undo/redo
  walking the project without ever rewriting a photograph, and clearing the redo branch
  on a new edit; hex parsing, brand presets, and scope-by-role recolouring.
- Three real bugs were caught by these tests before release — the wiped resize handle,
  the swallowed Esc, and a call to a `fitScale()` that never existed.

## v4.0 — 2026-07-16
Brand system, a real image engine, the 16-page zine, and high-resolution export.
**Phase 1 of the v4 brief** — see `docs/ROADMAP.md` for what is sequenced next and why.

### Added — non-destructive image engine (the heart of this release)
- **The frame is now a clipping mask.** A photo may be moved anywhere — including far
  outside its frame — scaled beyond it, or rotated, and only the part inside the frame
  prints. The behaviour photographers expect from Illustrator, InDesign, or Fundy.
- **The original is never altered.** Crops, zooms and rotations live in a transform
  (`{w, ox, oy, rot}` in inches and degrees) attached to the element, not baked into the
  photo. Every crop is reversible, always.
- **Fit / Fill / Centre / Reset Crop / Reset Frame**, each instant, with keyboard
  shortcuts **F**, **⇧F**, **C**, **R**, **⇧R**. Centre keeps your zoom; Reset Frame
  restores the template frame the photo came from.
- **Zoom** by scroll wheel or two-finger pinch; **rotate** by handle (⇧ snaps to 15°)
  or 90° buttons; eight resize handles crop the frame without ever stretching the photo.
- v3 projects migrate automatically: `object-position` percentages and `object-fit`
  become an equivalent transform, with the photo left exactly where it was.

### Added — template library
- **Nine templates**, each answering for all **eleven page types** (cover, intro, single,
  two-photo, three-photo, grid, caption, quote, full bleed, closing, back cover): Blank —
  still the default — plus Minimalist editorial, Documentary essay, Photojournalism,
  Magazine, Travel journal, Contact sheet, Portfolio and Newspaper, the seven named in the
  brand guidelines.
- **Recipes are page-relative**, written in fractions of the content box rather than
  inches, so one recipe lays out correctly on a 2.75in mini zine and a 12in photobook.
  Type scales with the page instead of staying stranded at one size.
- **Template browser** with live previews drawn from the real recipes; apply to this page,
  selected pages, or the whole zine — which assigns cover, intro, closing and back cover
  automatically and cycles the body through the remaining types.
- **Replace without losing work.** Photos re-flow into the new frames in order at their
  true aspect ratio; photos the new layout has no room for are kept rather than deleted;
  text carries across by role, so a quote stays a quote.
- **Custom templates**: save the current page as a template, duplicate any template
  including the built-ins, export to JSON and import back. Stored locally; junk files are
  refused rather than half-loaded.
- **Text colour** is now part of the model — rendered on canvas, in print, and in the
  300 DPI export.

### Added — print and export
- **16-page saddle-stitch mini zine**: fixed 16-page format, correct imposition across
  four duplex sheets, **reading-order and print-order previews**, and fold/staple/
  stitch/trim instructions. Full guide in `docs/MINI-ZINE-GUIDE.md`.
- **Full-bleed A4** zines, portrait and landscape — edge to edge by default, margins
  still available on request.
- **Bleed in millimetres**: 3 mm default, 5 mm option (replaces the ⅛″ assumption).
- **3:2 and 2:3 photobook formats.**
- **Download all pages as high-resolution JPGs**: rendered at a true **300 DPI** from
  your *original* photos, not the screen previews, with the same clipping and transform
  the editor shows. Numbered in reading order (`Project-Name_001.jpg`), spreads
  numbered separately (`_Spread-001.jpg`), optional single-ZIP packaging via a
  dependency-free store-only archive.
- **File naming scheme**: exports as `Title_Made with ZineIt_Date_Time`, backups as
  `Title_ZineIt_Date_Time`, sanitised for every filesystem, with an optional suffix.

### Changed
- **Brand system applied from the official guidelines**: Ink Black, Paper White and
  Warm Yellow with teal/coral/indigo/forest secondaries; Poppins ExtraBold wordmark,
  Poppins Bold headings, Inter UI, Source Serif 4 body, Manrope captions; dark
  workspace against a light page canvas; yellow buttons carry ink text so contrast
  stays above 4.5:1 rather than the white-on-yellow that would fail it.
- Support and feedback now go to **hello@storitellah.com** everywhere — Support panel,
  ✉ Feedback button, error toasts, boot-failure screen, and the Lightroom plug-in.

### Removed
- **Page audio notes**, completely: markup, state, handlers, timeline indicator,
  migration. Old projects are stripped of the field on load. No dead controls left.

### Fixed
- `.bak` files were stamped `ver:3` even after the v4 model landed — a saved project
  would have described itself incorrectly to a future importer. Now stamps v4.

### Testing
- 133 app tests + 22 Lua tests, all passing. New coverage: clipping-mask overhang,
  aspect preservation on Fit/Fill, original-untouched guarantees, keyboard shortcuts,
  rotation, v3→v4 migration, corrupt-transform rejection, 16-page imposition (including
  the pages-sum-to-17 invariant and every-page-printed-once), A4 full bleed, 3:2 ratios,
  mm bleed, file naming, JPG numbering, CRC32/ZIP correctness, 300 DPI export path,
  audio removal, brand palette and type system. Templates: every template supplies all
  eleven page types; **every recipe materialises on the page in all seven formats**;
  type scales with the page; replace keeps photos, their order and their aspect ratio;
  surplus photos are never discarded; text carries by role; whole-zine application
  assigns covers correctly and leaves a valid, saveable project; custom save/duplicate/
  export/import round-trips; junk template files rejected; browser UI previews and
  applies.

## v3.3 — 2026-07-15
Lightroom Classic plug-in (plug-in v1.0.0).

### Added
- **`lightroom/zineit.lrplugin`** — a Lightroom Classic plug-in that bridges the catalogue into ZineIt. Adds an export destination (*ZineIt zine / photobook*) that renders the selection with its develop settings, reads IPTC caption/title/headline, places one photo per page at its true aspect ratio, adds a Bebas Neue title to the cover, and writes a self-contained `.bak` ready to restore. Also adds Library ▸ Plug-in Extras items (Open ZineIt, Report a bug) and a Plug-in Manager panel with feedback links to bryanjaybee@gmail.com.
- Scope, honestly: the **editor cannot run inside Lightroom** — the SDK has no webview or canvas — so the plug-in owns selection→project and ZineIt owns layout. See `docs/LIGHTROOM.md`.
- Engineering notes: `ZineItProject`/`ZineItJson` import no Lr modules and are unit-tested on plain Lua; the `.bak` is **streamed** (project JSON, brace trimmed, photos base64-appended one at a time) so peak memory stays at ~one photo no matter the export size; over-capacity selections are reported before rendering starts.
- **`run-tests.sh`** — runs Lua syntax checks, Lua unit tests, fixture regeneration, and the JS suite in one command.
- 22 Lua unit tests + 5 JS contract tests (22 Lua · 97 JS, all passing).

### Changed
- ZineIt now supports **thumbnail-less imported projects**: the library falls back to the stored preview instead of a blank tile, and restore regenerates proper preview/thumbnail tiers for any asset arriving without them (reusing the tested legacy-migration path). This is what lets an importer ship photos without pre-baking thumbnails.

## v3.2 — 2026-07-07
Type system + production readiness.

### Changed
- **New UI type system**: **Bebas Neue** for display (wordmark, panel headers, dialog titles) and **Source Sans** for all body text — loaded from Google Fonts as *Source Sans 3*, Adobe's current name for Source Sans Pro, with the classic name kept in the CSS stack and full system fallbacks so the tool still reads well offline. Monospace is retained where it belongs: the clock, zoom %, page readouts, and timeline tags. Source Sans is also available in the zine text-font picker.

### Added — production hardening
- **Crash guards**: boot is wrapped — a startup failure shows a readable message pointing to bryanjaybee@gmail.com instead of a blank page; uncaught errors and async rejections raise a gentle toast that names the error, reassures that work is autosaved, and routes to ✉ Feedback (throttled — never a toast storm).
- **Inline SVG favicon** (no 404s in production), **noscript** message, **version badge** in the header (so bug reports say which build), and a console version banner.
- **Accessibility**: aria-labels on all icon-only controls; `prefers-reduced-motion` disables drawer/toast animation.
- 9 new automated tests (92 total, all passing).

- **Shipped favicon set for the Cloudflare deployment**: `favicon.ico` (16/32/48 multi-size), scalable `favicon.svg`, `apple-touch-icon.png` (iOS Add-to-Home-Screen finds it at the root by convention), and 192/512 px PNGs for future PWA use — all the gradient Z mark, all cache-controlled for a week in `_headers`. No icon links were added to the HTML: browsers use the inline data-URI (which keeps a locally saved single ZineIt.html fully working), while crawlers, bookmark services, and iOS fetch the root files directly — so production logs stop showing favicon 404s.

### Notes
- The file ships readable, not minified — Cloudflare compresses on the wire (the gap is a few KB), and an auditable single file is part of ZineIt's local-first promise.

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
