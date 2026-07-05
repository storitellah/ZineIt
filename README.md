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

- Ko-fi: <https://ko-fi.com/kiberastories>
- Patreon: <https://www.patreon.com/c/kiberastories>
- M-Pesa: **0711 254 986**

## Repository

```
index.html            the entire product — zero-build, works offline
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
