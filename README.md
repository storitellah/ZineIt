# ZineIt — by [Storitellah](https://storitellah.com)

A fully local, print-quality **zine and photobook layout tool** for photojournalists and photographers. One HTML file. No server, no account, no uploads — your photos never leave your machine.

**Open `index.html` in any modern browser (Chrome/Edge recommended for printing) and start laying out.**

---

## Formats

**Zines**
- Mini zine — 8-page, folded from a single letter sheet (with a one-click imposition print + fold guide)
- Quarter zine — 4.25 × 5.5 in
- Half-letter zine — 5.5 × 8.5 in
- A5 zine — 148 × 210 mm

**Photobooks**
- 8 × 8 in square
- 8 × 10 in portrait
- 10 × 8 in landscape
- A4 portrait

Every project automatically includes a **front cover** and **back cover**; interior pages can be added, reordered, and removed (mini zines stay fixed at 8 pages, as the fold requires).

## Working with photos

- **Drag and drop** photos into the library (or click to browse). Originals are kept at full resolution.
- Drag a photo onto the page to place it, or onto a layout frame to fill it.
- **Resize** from any corner, **reposition** by dragging, nudge with arrow keys (Shift for ⅛″ steps).
- Fit / Fill, duplicate, reorder (forward/backward), delete.

## Clean, consistent layout system








### New in v4.0 — a real print tool

- **Photos behave like they do in InDesign.** The frame is a mask: move a photo
  anywhere, even outside its frame, zoom past it, rotate it — only what's inside
  prints, and your original file is never touched. `F` fit · `⇧F` fill · `C` centre ·
  `R` reset crop · `⇧R` reset frame. Scroll or pinch to zoom.
- **16-page saddle-stitch zine**, with the imposition worked out for you and both
  reading order and print order shown before you waste paper. See
  [`docs/MINI-ZINE-GUIDE.md`](docs/MINI-ZINE-GUIDE.md).
- **Full-bleed A4**, portrait and landscape, with 3 mm or 5 mm bleed.
- **Download all pages as 300 DPI JPGs**, numbered in reading order, rendered from
  your originals, packaged as a ZIP.
- **3:2 and 2:3 photobooks.**
- **A real template library**: nine templates × eleven page types, live previews, apply
  to a page or the whole zine, and a *replace* that re-flows your photos instead of
  eating them. Save, duplicate, export and import your own. See
  [`docs/TEMPLATE-GUIDE.md`](docs/TEMPLATE-GUIDE.md).
- Brand system applied throughout; page audio notes removed.

**v4.1 — the one-window workspace**

- **Everything in one window.** Compact toolbar, media on the left, pages in the middle,
  a **tabbed** properties panel on the right (it used to be one endless scroll), timeline
  along the bottom. Panels resize, collapse, and remember where you left them.
- **Layers** — the page stack, front to back. Reorder, rename, hide, lock. Hiding is not
  deleting: a hidden layer leaves the page and the export, but stays in your file.
- **Undo and redo**, 60 steps, `Ctrl/⌘ Z`. It snapshots the project, never your photographs.
- **Text colour**: picker, HEX, RGB, the brand palette, recent colours, and apply-by-scope
  that respects the text's role.
- **Installable PWA** — and still just a file you can double-click. The service worker
  skips itself on `file://` rather than throwing errors at you.
- **Android build project** — a real Capacitor project you can build in ten minutes.
  See [`docs/ANDROID-BUILD.md`](docs/ANDROID-BUILD.md). There is no compiled APK in here,
  and that doc explains exactly why.

**v4.2 — the crop window, rulers & guides, and a UI pass**

- **A dedicated crop window.** Double-click a photo (or press ✂ Crop photo…) to open it
  large: Fit / Fill / Centre, zoom, straighten (−45°…45°), 90° rotate, **flip H/V**, a
  rule-of-thirds grid, and Reset. It edits a working copy — **Apply** commits, **Cancel**
  discards, your original file is never touched.
- **Rulers and draggable guides.** Inch rulers on the top and left; drag from a ruler to
  drop a guide, drag it off the page to remove it, snap to guides, edges, margins and
  element centres. Guides never print.
- **A clearer workspace.** Toolbar buttons now carry **text labels** (no more guessing
  what “+” means), **Export stands alone**, the clock and autosave moved into the Page
  pane, and **pan mode is a proper toggle**.

**v4.3 — covers, transparent graphics, a fixed export, and light backups**

- **Cover-template library.** Front cover… and Back cover… open a browser with a large,
  centred preview (mobile-optimised): 12 front designs and 8 back designs. Covers keep your
  photos and title and re-flow them into the new layout.
- **Transparent graphics.** + Graphic / QR imports PNG/SVG/WebP/GIF with transparency
  preserved through export — no white box. Drop a transparent PNG and it's detected
  automatically; a toggle converts any image to a graphic.
- **Export fidelity fix.** Text colour now exports (it was printing black), and hidden
  layers no longer appear in the print/PDF output.
- **Light backup + relink.** Save a kilobyte-sized reference backup that remembers your
  layout and which photos go where, then Relink photos… reconnects them from disk. The
  full one-file .bak is unchanged.

**Not in v4.3 (flagged, not buried):** the **equirectangular panorama photobook** system
is still ahead — a substantial build sequenced in [`docs/ROADMAP.md`](docs/ROADMAP.md).

v4.0 is Phase 1 of a larger brief — colour proofing, panorama books, mockups and the
printmaker guide are sequenced in [`docs/ROADMAP.md`](docs/ROADMAP.md).

### New in v3.3 — Lightroom Classic plug-in

Select photos in Lightroom, choose a zine format, and get a laid-out ZineIt project: your develop settings rendered in, your IPTC captions carried across, one photo per page at its true proportions. The editor stays in ZineIt (Lightroom's SDK has no canvas to host it) — Lightroom does the selecting and developing, ZineIt does the layout. Install `lightroom/zineit.lrplugin` via **File ▸ Plug-in Manager ▸ Add**; full guide in [`docs/LIGHTROOM.md`](docs/LIGHTROOM.md).

### New in v3.2 — dressed for production

- A proper type system: **Bebas Neue** headlines, **Source Sans** text (Source Sans 3, the current name of Source Sans Pro), monospace kept for the clock and readouts — with system fallbacks so offline still looks right.
- Production hardening: guarded startup (a readable message instead of a blank page), gentle error toasts that route to ✉ Feedback, a favicon, a visible version badge, labelled controls for screen readers, and reduced-motion support.

### New in v3.1 — at home on Android and iOS

- Safe-area aware: nothing hides behind notches, cutouts, or gesture bars; the layout survives Safari's collapsing address bar.
- No accidental zoom or text selection while editing; pinch-zoom stays available for accessibility.
- Touch drags, pans, and resizes are captured to the finger for reliability on Android Chrome and iOS Safari.
- Support card: Ko-fi and Patreon as one-tap buttons.

### New in v3.0 — light on memory, fast on photos, open to feedback

- **A new photo engine**: originals live in fast browser storage (IndexedDB) instead of inside the project file. The editor draws small previews — thumbnails appear instantly, sharper previews swap in — and full resolution is touched only for print, PDF, and the lightbox. Projects with dozens of photos stay light on RAM, on desktop and especially on phones, and autosave is instant no matter the photo count.
- **Every format imports, including HEIC** (the iPhone default): native decoding where the browser supports it, with an automatic converter fetched only if needed. JPG, PNG, WebP, GIF, BMP, AVIF, and TIFF all work — and the app stays fully offline for everything except first-time HEIC conversion.
- **Print quality is untouched**: exports always use your original files at full resolution.
- **Your projects carry over**: older projects and .bak files migrate automatically on first load.
- **Found a bug? Have an idea?** Use the ✉ Feedback button (or the link in the Support panel) — it opens an email to **bryanjaybee@gmail.com** with the details prefilled. Every message gets read.

### New in v2.1 — pocket studio, print shop

- **Works on your phone**: below 820 px the editor becomes a mobile app — Photos and Tools slide in as drawers, the timeline collapses into a bottom sheet, and a five-button toolbar (Photos · Tools · Timeline · Text · Full) drives everything. Touch drag, touch pan, and touch resize use the same pointer pipeline as the desktop, with larger 18 px handles on touch screens.
- **Swipe to turn pages**: swipe the canvas left/right to step pages (or whole spreads in spread view). Tap a block to select it — an Edit chip opens the tools drawer straight to its settings.
- **Fullscreen preview**: distraction-free reading view with ‹ › navigation and a page indicator, on mobile and desktop. Esc exits.
- **Mini Zine print mode**: a dedicated print dialog with an **A4 / US Letter** toggle, live print preview of the actual imposed sheet, dashed **fold marks** with printer-style edge ticks, a ✂ **cut mark** across the middle two panels, page-number and guide toggles, **fit-to-paper** (uniform scaling — aspect ratios always preserved), an optional ¼″ paper margin, and a clear warning if 100% would clip on A4. Export to PDF through the browser's Save-as-PDF at the exact paper size.

### New in v2.0 — a proper visual layout tool

- **Facing-page spreads**: Single/Spread view toggle — left and right pages always preview together, with a centre-fold guide, exactly as they'll sit in the reader's hands.
- **Double-page spread photos**: one photograph spans both facing pages, aligned across the fold in the editor, the preview, the print export, and the mini-zine imposition. Gutter bleed supported; one click returns it to a single page.
- **Text Editor tab**: every word in the zine in one place — titles, captions, quotes, names, bios, reflections, notes, credits, copyright — each row showing its page and spread number, content type, a live-preview jump, and save status.
- **A real timeline**: large page thumbnails grouped by spread, page numbers, drag-and-drop reordering, and at-a-glance indicators for spreads, photos, text, audio notes, and empty pages.
- **Precision image control**: 8 resize handles, a live crop ghost showing the full uncropped image while you pan or resize, crop-% readout, Fit / Fill / Centre, and Reset crop / Reset frame. Resizing crops — it never stretches.
- **Guides & bleed**: margin, safe-area, bleed, fold, and grid guides with snap; bleed mode allows a controlled ⅛″ spill past trim (with it off, nothing can pass the trim edge, ever); warnings when a photo crosses the margins.
- **Navigation that never breaks**: page and spread stepping, arrow keys, timeline clicks — covers included, no skips.
- **Page numbers** with separate preview and print toggles (covers stay unnumbered).
- **Page audio notes**: attach field audio to a page for editing context — editor-only, never printed.
- Tested before render: a 43-test automated suite (`tests/`) drives the real HTML through drags, resizes, spreads, navigation, print DOM, and backups. See `TESTING.md`.

- Page templates: full bleed, single inside margins, two-up (stacked / side-by-side), four-grid — all built from the same margin so every page lines up identically.
- ⅛″ snap grid and margin guides (⅛–½″ margins) keep everything perfectly consistent.
- **Keep original aspect ratio** (toggle, on by default): photos dropped into layout frames reshape the frame to the photo's true proportions, and corner-resizing stays ratio-locked — turn it off for free cropping.
- Text blocks with **40 Google Fonts** to choose from (Inter, Playfair Display, Bebas Neue, EB Garamond, Space Mono, Caveat, Permanent Marker and more — each previewed in its own face), plus size, weight, and alignment. Fonts load from Google's CDN and fall back to system faces offline, so field work never blocks.
- One-click **date/time stamps** (date, time, or both), plus a live clock in the header.
- A lively, colour-coded workspace — every panel section carries its own accent, with the canvas kept neutral so your photographs read true.

## Export & print

- **Download PDF** — uses the browser print dialog (choose *Save as PDF*, margins *None*, scale *100%*, background graphics *on*). Pages export at exact trim size with photos at their original resolution — the highest quality the source files allow.
- **Print** — same pipeline, straight to your printer.
- **Mini-zine imposition** — prints all 8 panels correctly arranged (top row rotated) on one landscape letter sheet, with step-by-step fold-and-cut instructions.

## Backup — local only, tested restore

- **Autosave** runs continuously to your browser's local storage (plus a 30-second heartbeat and a save on close).
- **Save backup (.bak)** downloads a complete project file — photos included — to your machine. Every backup is **verified by an automatic test restore** (the exact bytes are parsed and validated) *before* it downloads.
- **Restore from .bak** validates the file, shows you what's inside (name, pages, format, last-modified), and asks before replacing your work.
- **Daily backup reminder** prompts you if your last `.bak` is more than 24 hours old.
- Keyboard: `Ctrl/Cmd + S` saves a `.bak` any time.

Nothing is ever sent anywhere. The `.bak` lives wherever your downloads go — move it to a drive or second folder for extra safety.

## Support this work

[Ko-fi](https://ko-fi.com/kiberastories) · [Patreon](https://www.patreon.com/c/kiberastories) — or send bugs and ideas to **bryanjaybee@gmail.com**.

## Repository

```
index.html            the entire product — zero-build, works offline
docs/ROADMAP.md       what shipped in v4.0 and what is sequenced next
docs/TEMPLATE-GUIDE.md  the template library and how replace keeps your work
docs/ANDROID-BUILD.md   building the Android app — and why there is no APK in the repo
docs/APK-SIGNING.md     signing a release build with your own key
DEPLOYMENT.md         the file, the site, and the app
lightroom/            Lightroom Classic plug-in (Lua) + its tests
run-tests.sh          runs every suite in one command
PROMPT.md             the full build prompt, requirements, and version record
CHANGELOG.md          release history (v1.0 → v2.0)
TESTING.md            v2.0 test report — 43 automated tests, all passing
tests/                the jsdom test-suite (npm test)
docs/ARCHITECTURE.md  system design, database schema, API endpoints, scaling plan
server/               optional Phase-2 sync API scaffold (Express + PostgreSQL)
```

ZineIt is deliberately **local-first**: the editor never needs a server. `docs/ARCHITECTURE.md` documents how the same design scales to millions of users — static client on a CDN, with an optional stateless sync API (`server/`) for multi-device history when the time comes.

---

Built for the field: works offline, survives crashes, prints true to size.
© Storitellah · [storitellah.com](https://storitellah.com)
