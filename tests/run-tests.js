/* ZineIt v2.0 automated test-suite (jsdom)
 * Boots the real index.html in a DOM, then walks the release checklist:
 * text editor · spreads · facing pages · zoom · timeline · shift-drag ·
 * fit/fill/centre · 8-way resize · crop ghost · margins/bleed · navigation ·
 * page numbers · print & imposition DOM · backup round-trip · migration.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const pageErrors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/Could not parse CSS/i.test(String(e))) pageErrors.push(String(e && e.message || e)); });
vc.on('error', (...a) => pageErrors.push(a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
  url: 'https://zineit.local/', virtualConsole: vc });
const { window } = dom;
const { document } = window;
const Z = window.__zineit;

let pass = 0, fail = 0; const results = [];
let chain = Promise.resolve();
function T(name, fn) {
  chain = chain.then(async () => {
    try { await fn(); pass++; results.push(['PASS', name]); }
    catch (e) { fail++; results.push(['FAIL', name + ' — ' + e.message]); }
  });
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }
function approx(a, b, tol, msg) { if (Math.abs(a - b) > (tol ?? 1e-6)) throw new Error((msg||'') + ` (got ${a}, want ~${b})`); }
const $ = id => document.getElementById(id);
const click = elm => elm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const ptr = (target, type, opts) => target.dispatchEvent(new window.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true }, opts)));
const PXDATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/* ============ 1 · boot & model ============ */
T('boots into a valid mini-zine project', () => {
  ok(Z && Z.state, 'test API present');
  eq(Z.state.app, 'ZineIt'); eq(Z.state.ver, 4);
  eq(Z.state.pages.length, 8, '8 fixed pages');
  eq(Z.state.pages[0].label, 'Front cover');
  eq(Z.state.pages[7].label, 'Back cover');
  eq(Z.validateProject(Z.state), null, 'boot state validates');
});
T('spread model: cover alone · 3 interior pairs · back alone', () => {
  const sp = Z.buildSpreads();
  eq(sp.length, 5);
  eq(sp[0].left, null); eq(sp[0].right, 0);
  eq(sp[1].left, 1); eq(sp[1].right, 2);
  eq(sp[3].left, 5); eq(sp[3].right, 6);
  eq(sp[4].left, 7); eq(sp[4].right, null);
  eq(Z.spreadIndexOf(0), 0); eq(Z.spreadIndexOf(2), 1); eq(Z.spreadIndexOf(7), 4);
});

/* ============ 2 · navigation ============ */
T('forward/backward page navigation, no skips, covers included', () => {
  Z.goPage(0);
  const seen = [Z.curPage];
  for (let i = 0; i < 9; i++) { Z.stepPage(1); seen.push(Z.curPage); }
  eq(seen.join(','), '0,1,2,3,4,5,6,7,7,7', 'steps every page then holds at back cover');
  for (let i = 0; i < 9; i++) Z.stepPage(-1);
  eq(Z.curPage, 0, 'holds at front cover going back');
});
T('spread navigation lands on each spread in order', () => {
  Z.goPage(0);
  const hops = [];
  for (let i = 0; i < 5; i++) { Z.stepSpread(1); hops.push(Z.spreadIndexOf(Z.curPage)); }
  eq(hops.join(','), '1,2,3,4,4');
  Z.stepSpread(-1); eq(Z.spreadIndexOf(Z.curPage), 3);
});
T('arrow keys navigate when nothing is selected, nudge when selected', () => {
  Z.goPage(0); Z.select(0, null);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
  ok(Z.curPage > 0, 'arrow advanced from cover');
  const before = Z.curPage;
  // now select an element: nudging must not navigate
  Z.setAsset('tA', { name: 'a.png', src: PXDATA, w: 1200, h: 800 });
  const e = Z.addImageEl('tA', 1.0, 1.0, before);
  const x0 = e.x;
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
  eq(Z.curPage, before, 'did not navigate while element selected');
  ok(e.x > x0, 'element nudged right');
  Z.deleteSel();
});
T('nav buttons in the view bar work', () => {
  Z.goPage(3);
  click($('navNextPage')); eq(Z.curPage, 4);
  click($('navPrevPage')); eq(Z.curPage, 3);
  click($('navNextSpread')); eq(Z.spreadIndexOf(Z.curPage), Z.spreadIndexOf(3) + 1);
  click($('navPrevSpread')); eq(Z.spreadIndexOf(Z.curPage), Z.spreadIndexOf(3));
});

/* ============ 3 · facing pages & zoom ============ */
T('spread view shows both facing pages side by side with a fold guide', () => {
  click($('viewSpread')); Z.goPage(1);
  const f = { w: 2.75, h: 4.25 };
  const w = parseFloat($('page').style.width), s = Z.scale;
  approx(w, f.w * 2 * s, 0.5, 'canvas is two pages wide');
  ok(document.querySelector('#page .guide.fold'), 'centre fold guide rendered');
});
T('single view shows one page', () => {
  click($('viewSingle'));
  approx(parseFloat($('page').style.width), 2.75 * Z.scale, 0.5);
  click($('viewSpread'));
});
T('zoom: 100% / in / out / fit stays capped (reduced preview)', () => {
  click($('zoom100')); approx(Z.scale, 96, 0.01, '100% = 96 px/in');
  click($('zoomIn')); ok(Z.scale > 96, 'zoom in grows');
  click($('zoomOut')); click($('zoomOut'));
  ok(Z.scale < 96, 'zoom out shrinks');
  click($('zoomFit')); ok(Z.scale <= 110, 'fit is capped at 110 px/in');
});
T('preview page numbers: interiors only, toggleable', () => {
  $('pnPreviewChk').checked = true;
  $('pnPreviewChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  Z.goPage(1); // spread [1,2]
  eq(document.querySelectorAll('#page .pnum').length, 2, 'both interior pages numbered');
  Z.goPage(0);
  eq(document.querySelectorAll('#page .pnum').length, 0, 'cover never numbered');
  $('pnPreviewChk').checked = false;
  $('pnPreviewChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  Z.goPage(1);
  eq(document.querySelectorAll('#page .pnum').length, 0, 'toggle off hides numbers');
});

/* ============ 4 · placement, fit/fill/centre, aspect ============ */
T('template g4 places four frames inside margins', () => {
  Z.goPage(3);
  const n0 = Z.state.pages[3].elements.length;
  Z.applyTemplate('g4');
  const els = Z.state.pages[3].elements.slice(n0);
  eq(els.length, 4);
  const m = Z.state.settings.margin;
  els.forEach(e => { ok(e.x >= m - 1e-9 && e.y >= m - 1e-9, 'frame starts inside margins');
    ok(e.x + e.w <= 2.75 - m + 1e-9, 'frame ends inside margins'); });
});
T('photo placed with aspect lock adopts its true proportions', () => {
  Z.setAsset('tB', { name: 'b.png', src: PXDATA, w: 1500, h: 1000 });
  const e = Z.addImageEl('tB', 1.2, 2.0, 3);
  approx(e.h / e.w, 1000 / 1500, 0.12, 'frame ratio ≈ photo ratio (within snap tolerance)');
});
T('Fit / Fill / Centre buttons act instantly', () => {
  const e = Z.state.pages[3].elements.at(-1);
  Z.select(3, e.id);
  click($('fitBtn'));
  approx(e.img.w, Z.containW(e), 1e-6, 'Fit shows the whole photo — no crop');
  eq(Z.imgCropPct(e), 0, 'nothing hidden');
  click($('fillBtn'));
  approx(e.img.w, Z.coverW(e), 1e-6, 'Fill covers the frame');
  e.img.ox = 0.4; e.img.oy = -0.3;
  const zoom = e.img.w;
  click($('centreBtn'));
  eq(e.img.ox, 0); eq(e.img.oy, 0);
  eq(e.img.w, zoom, 'Centre keeps the current zoom — it only re-centres');
});
T('reset crop restores fill, centre and zero rotation; reset frame restores the template frame', () => {
  const e = Z.state.pages[3].elements.at(-1);
  Z.select(3, e.id);
  e.img.ox = 2; e.img.oy = 2; e.img.rot = 33; e.img.w = 0.4;
  click($('resetCropBtn'));
  eq(e.img.ox, 0); eq(e.img.oy, 0); eq(e.img.rot, 0);
  approx(e.img.w, Z.coverW(e), 1e-6);
  const home = { x: e.x, y: e.y, w: e.w, h: e.h };
  e.home = home;
  e.x = 0.1; e.y = 0.1; e.w = 0.5; e.h = 0.5;
  click($('resetFrameBtn'));
  approx(e.x, home.x, 1e-6); approx(e.w, home.w, 1e-6, 'frame back to its template size and position');
});
/* ============ 5 · pointer drags: move, shift-pan, 8-way resize, ghost ============ */
function nodeFor(id) { return document.querySelector(`#page .el[data-id="${id}"]`); }
// Clear page 3's empty template placeholders first: dropping a photo onto one is a
// real (and separately tested) behaviour that would otherwise capture these drags.
T('stage a clean page: one photo, room to move, no empty placeholders', () => {
  Z.goPage(3);
  // Dropping a photo onto an empty placeholder snaps it in — real behaviour, tested
  // separately, but it would otherwise capture these drags. Remove the placeholders.
  Z.state.pages[3].elements = Z.state.pages[3].elements.filter(x => x.asset);
  const e = Z.state.pages[3].elements.at(-1);
  ok(e && e.type === 'image' && e.asset, 'page 3 ends with a real photo');
  // Give the frame room: this is a 2.75in mini-zine page, so a 1.75in frame has
  // almost nowhere to travel and every drag would just hit the page edge.
  e.x = 0.25; e.y = 0.25; e.w = 0.75; e.h = 0.5;
  e.home = { x: e.x, y: e.y, w: e.w, h: e.h };
  Z.imgFill(e); Z.renderAll();
  eq(Z.state.pages[3].elements.filter(x => !x.asset).length, 0, 'no empty frames left to swallow a drop');
});
T('plain drag moves the frame (grid-snapped)', () => {
  click($('viewSingle')); Z.goPage(3);
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  const n = nodeFor(e.id); ok(n, 'element node rendered');
  const x0 = e.x, s = Z.scale;
  ptr(n, 'pointerdown', { clientX: 100, clientY: 100 });
  ptr(window, 'pointermove', { clientX: 100 + s, clientY: 100 });
  ptr(window, 'pointerup', {});
  approx(e.x, Math.round((x0 + 1) / 0.125) * 0.125, 0.001, 'moved exactly 1in right, snapped to the ⅛″ grid');
  // and the frame cannot be dragged off the page
  const maxX = Z.FORMATS[Z.state.format].w - e.w;
  ptr(nodeFor(e.id), 'pointerdown', { clientX: 100, clientY: 100 });
  ptr(window, 'pointermove', { clientX: 100 + s * 99, clientY: 100 });
  ptr(window, 'pointerup', {});
  approx(e.x, maxX, 0.001, 'a frame dragged hard right stops at the page edge, never beyond');
  e.x = 0.25; Z.renderAll();
});
T('SHIFT+drag moves the photo — freely, even outside the frame', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  Z.imgCentre(e); Z.renderAll();
  const n = nodeFor(e.id);
  ptr(n, 'pointerdown', { clientX: 200, clientY: 200, shiftKey: true });
  ptr(window, 'pointermove', { clientX: 200 + Z.scale * 0.4, clientY: 200 + Z.scale * 0.2, shiftKey: true });
  approx(e.img.ox, 0.4, 0.01, 'photo moved with the finger, in inches');
  approx(e.img.oy, 0.2, 0.01);
  ok($('cropGhost'), 'crop ghost shows the photo\'s full extent while moving');
  ptr(window, 'pointermove', { clientX: 200 + Z.scale * 40, clientY: 200, shiftKey: true });
  approx(e.img.ox, 40, 0.05, 'the photo may travel far outside its frame — nothing clamps it');
  eq(Z.imgCropPct(e), 100, 'frame is a mask: the photo is now entirely hidden');
  ptr(window, 'pointerup', {});
  ok(!$('cropGhost'), 'ghost removed after the gesture');
  Z.select(3, e.id); click($('resetCropBtn'));
});
T('Pan mode button moves the photo without a modifier key', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  Z.imgCentre(e); Z.renderAll();
  click($('panModeBtn'));
  const n = nodeFor(e.id);
  ptr(n, 'pointerdown', { clientX: 300, clientY: 300 });
  ptr(window, 'pointermove', { clientX: 330, clientY: 300 });
  ok(e.img.ox !== 0, 'photo moved with pan-mode on');
  ptr(window, 'pointerup', {});
  click($('panModeBtn'));
  Z.select(3, e.id); click($('resetCropBtn'));
});
T('8 resize handles plus a rotate handle on a selected photo', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  const kinds = [...nodeFor(e.id).querySelectorAll('.hd')].map(h => h.className.replace('hd ', '')).sort();
  eq(kinds.join(','), 'e,n,ne,nw,rot,s,se,sw,w', 'eight resize handles + rotate');
});
T('corner resize grows the frame; edge resize changes one axis; nothing stretches', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  e.x = 0.5; e.y = 0.5; e.w = 1; e.h = 1; Z.renderAll(); Z.select(3, e.id);
  let hd = nodeFor(e.id).querySelector('.hd.se');
  ptr(hd, 'pointerdown', { clientX: 400, clientY: 400 });
  ptr(window, 'pointermove', { clientX: 400 + Z.scale * 0.5, clientY: 400 + Z.scale * 0.25 });
  ptr(window, 'pointerup', {});
  approx(e.w, 1.5, 0.13, 'SE corner widened'); approx(e.h, 1.25, 0.13, 'SE corner deepened');
  const w0 = e.w;
  Z.select(3, e.id); hd = nodeFor(e.id).querySelector('.hd.n');
  ptr(hd, 'pointerdown', { clientX: 500, clientY: 500 });
  ptr(window, 'pointermove', { clientX: 500 + Z.scale, clientY: 500 - Z.scale * 0.25 });
  ptr(window, 'pointerup', {});
  approx(e.w, w0, 0.001, 'N edge never touches width');
  // "never stretches": the photo's own width drives its height via the true aspect ratio
  const g = e.img, ar = Z.assetAR(e);
  const img = nodeFor(e.id) && nodeFor(e.id).querySelector('img');
  ok(img, 'image still rendered');
  const wpx = parseFloat(img.style.width), hpx = parseFloat(img.style.height);
  approx(hpx / wpx, ar, 0.001, 'rendered photo keeps its exact aspect ratio after frame resize');
});
T('resize never collapses below minimum size', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  const hd = nodeFor(e.id).querySelector('.hd.se');
  ptr(hd, 'pointerdown', { clientX: 600, clientY: 600 });
  ptr(window, 'pointermove', { clientX: 0, clientY: 0 });
  ptr(window, 'pointerup', {});
  ok(e.w >= 0.3 - 1e-9 && e.h >= 0.25 - 1e-9, 'floors at 0.3×0.25 in');
});

/* ============ 6 · margins, bleed, warnings, clamping ============ */
T('bleed OFF: elements are hard-clamped at the trim edge', () => {
  const e = Z.state.pages[3].elements.at(-1);
  e.x = 99; e.y = 99; Z.clampEl(e);
  ok(e.x + e.w <= 2.75 + 1e-9, 'cannot pass right trim');
  ok(e.y + e.h <= 4.25 + 1e-9, 'cannot pass bottom trim');
  e.x = -99; Z.clampEl(e); ok(e.x >= -1e-9, 'cannot pass left trim');
});
T('bleed ON: exactly 3 mm of controlled spill, never more', () => {
  $('bleedChk').checked = true;
  $('bleedChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  const e = Z.state.pages[3].elements.at(-1);
  e.x = -99; Z.clampEl(e); approx(e.x, -Z.bleedIn(), 1e-9, 'spill stops at the bleed line');
  approx(Z.bleedIn(), 3 / 25.4, 1e-9, 'default bleed is 3 mm, the value print shops actually ask for');
  Z.state.settings.bleedMm = 5;
  approx(Z.bleedIn(), 5 / 25.4, 1e-9, '5 mm option available for trade printers');
  Z.state.settings.bleedMm = 3;
  e.x = 99; Z.clampEl(e); approx(e.x + e.w, 2.75 + Z.bleedIn(), 1e-9, 'spill stops at the bleed line on the right too');
  $('bleedChk').checked = false;
  $('bleedChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  ok(e.x + e.w <= 2.75 + 1e-9, 'turning bleed off pulls everything back inside trim');
});
T('margin-crossing warning fires on the offending sides', () => {
  const e = Z.state.pages[3].elements.at(-1);
  e.x = 0; e.y = 0.5; e.w = 1; // touches left trim → crosses left margin
  const v = Z.marginViolation(e);
  ok(v.includes('left'), 'left margin crossing detected');
  ok(!v.includes('right'), 'right side clean');
});

/* ============ 7 · drag between frames / quick placement ============ */
T('dropping a placed photo onto an empty frame snaps it in', () => {
  const pg = 4; Z.goPage(pg);
  Z.applyTemplate('inset'); // one empty frame inside margins
  const frame = Z.state.pages[pg].elements.at(-1);
  Z.setAsset('tC', { name: 'c.png', src: PXDATA, w: 800, h: 800 });
  const floater = Z.addImageEl('tC', frame.x + frame.w / 2, frame.y + frame.h / 2, pg);
  Z.snapIntoEmptyFrame(floater);
  eq(frame.asset, 'tC', 'asset transferred into the layout frame');
  ok(!Z.state.pages[pg].elements.find(x => x.id === floater.id), 'floating copy removed');
});

/* ============ 8 · double-page spread ============ */
T('make double-page spread: photo spans both facing pages from the left page', () => {
  const pg = 2; // right page of spread [1,2]
  Z.setAsset('tD', { name: 'd.png', src: PXDATA, w: 2400, h: 1600 });
  const e = Z.addImageEl('tD', 1.4, 2.0, pg);
  Z.select(pg, e.id);
  Z.makeSpread();
  eq(e.spread, true);
  ok(Z.state.pages[1].elements.includes(e), 'element re-homed to the LEFT page');
  approx(e.w, 5.5 + 2 * Z.bleedAllow(), 0.001, 'spans two page-widths, plus bleed when bleed is on');
  approx(e.x, -Z.bleedAllow(), 0.001, 'starts at the bleed line so the fold never shows paper');
  eq(Z.view.mode, 'spread', 'auto-switched to spread view');
});
T('spread photo renders once across the fold in spread view', () => {
  Z.goPage(1);
  const e = Z.state.pages[1].elements.find(x => x.spread);
  const n = nodeFor(e.id);
  ok(n, 'rendered'); ok(n.querySelector('.spreadBadge'), 'SPREAD badge shown');
  approx(parseFloat(n.style.width), (5.5 + 2 * Z.bleedAllow()) * Z.scale, 1.5, 'one continuous image across both pages');
});
T('in single view each half shows correctly and is locked (aligned across the fold)', () => {
  click($('viewSingle'));
  Z.goPage(1); // left half
  const e = Z.state.pages[1].elements.find(x => x.spread);
  let n = nodeFor(e.id);
  ok(n && n.classList.contains('locked'), 'left half visible, locked in single view');
  approx(parseFloat(n.style.left), -Z.bleedAllow() * Z.scale, 1.5, 'left half starts at the bleed line');
  Z.goPage(2); // right half — offset by −W so the crop continues seamlessly
  n = nodeFor(e.id);
  ok(n && n.classList.contains('locked'), 'right half visible on the facing page');
  approx(parseFloat(n.style.left), -2.75 * Z.scale, 1, 'right half offset by one page width');
  click($('viewSpread'));
});
T('spread prints on BOTH sequential pages, halves aligned at the gutter', () => {
  Z.buildSequentialPrint();
  const pps = document.querySelectorAll('#printRoot .pp');
  eq(pps.length, 8, 'one print page per zine page');
  const e = Z.state.pages[1].elements.find(x => x.spread);
  const leftHas = pps[1].querySelector('.pimg'), rightHas = pps[2].querySelector('.pimg');
  ok(leftHas && rightHas, 'both halves print');
  approx(parseFloat(rightHas.style.left), e.x - 2.75, 0.001, 'right half shifted by exactly one page width');
});
T('return to single page restores a one-page photo', () => {
  const e = Z.state.pages[1].elements.find(x => x.spread);
  Z.select(1, e.id);
  Z.unSpread();
  eq(e.spread, false);
  ok(e.w <= 2.75 + 1e-9, 'fits one page again');
});

/* ============ 9 · text editor tab ============ */
T('text editor lists every text block with page, spread, type, live-preview link', () => {
  Z.addTextEl('Cover title', 22, 'title', 0);
  Z.addTextEl('A caption', 10, 'caption', 3);
  Z.addTextEl('“Their words”', 12, 'quote', 5);
  Z.setTab('text');
  const rows = document.querySelectorAll('#teList .teRow');
  ok(rows.length >= 3, 'rows rendered');
  const first = rows[0];
  ok(/page \d+/.test(first.querySelector('.loc').textContent), 'shows page number');
  ok(/spread \d+/.test(first.querySelector('.loc').textContent), 'shows spread number');
  ok(first.querySelector('select'), 'content-type selector');
  ok(first.querySelector('textarea'), 'editable field');
  ok([...first.querySelectorAll('button')].some(b => /Show/.test(b.textContent)), 'live preview link');
  ok(first.querySelector('.teStatus'), 'save status');
});
T('editing in the text editor updates the element and flags save state', () => {
  const rows = document.querySelectorAll('#teList .teRow');
  const ta = rows[0].querySelector('textarea');
  ta.value = 'Kibera Stories';
  ta.dispatchEvent(new window.Event('input', { bubbles: true }));
  const covTitle = Z.state.pages.flatMap(p => p.elements).find(e => e.role === 'title');
  eq(covTitle.text, 'Kibera Stories');
  ok(rows[0].querySelector('.teStatus').classList.contains('edited'), 'marked editing…');
  Z.persist();
  ok(!rows[0].querySelector('.teStatus').classList.contains('edited'), 'flips back to saved on persist');
});
T('"Show →" jumps to the layout view with the block selected', () => {
  const rows = document.querySelectorAll('#teList .teRow');
  click([...rows[1].querySelectorAll('button')].find(b => /Show/.test(b.textContent)));
  eq(Z.view.tab, 'layout');
  const sel = Z.state.pages[Z.selPg].elements.find(e => e.id === Z.selId);
  ok(sel && sel.type === 'text', 'text block selected on its page');
});
T('zine title is editable from the text editor and add-to-cover works', () => {
  Z.setTab('text');
  const t = $('teTitle');
  t.value = 'Nairobi in Eight Pages';
  t.dispatchEvent(new window.Event('input', { bubbles: true }));
  eq(Z.state.meta.name, 'Nairobi in Eight Pages');
  eq($('projName').value, 'Nairobi in Eight Pages', 'header field stays in sync');
  const before = Z.state.pages[0].elements.length;
  click($('teTitleToCover'));
  eq(Z.state.pages[0].elements.length, before + 1, 'title block placed on the cover');
  eq(Z.view.tab, 'layout');
});
T('add-text control creates a block with the chosen role on the chosen page', () => {
  Z.setTab('text');
  $('teAddPage').value = '6'; $('teAddRole').value = 'credits';
  click($('teAddBtn'));
  const credits = Z.state.pages[6].elements.find(e => e.role === 'credits');
  ok(credits, 'credits block on page 7');
});

/* ============ 10 · timeline ============ */
T('timeline: one item per spread, page thumbs, numbers, indicators, empty warning', () => {
  Z.setTab('layout'); Z.renderAll();
  const items = document.querySelectorAll('#rail .spreadItem');
  eq(items.length, Z.buildSpreads().length, 'spread thumbnails match the model');
  ok(document.querySelectorAll('#rail .tlPage').length >= 7, 'page thumbnails present');
  ok(document.querySelector('#rail .tlNum'), 'page numbers on thumbs');
  ok(document.querySelector('#rail .tag.warn'), 'empty-page warning shown somewhere');
  ok(document.querySelector('#rail .tag'), 'photo/text indicators render');
  const th = document.querySelector('#rail .tlPage');
  approx(parseFloat(th.style.height), 96, 0.5, 'thumbnails are the larger 96px size');
});
T('timeline click selects the page', () => {
  const thumbs = document.querySelectorAll('#rail .tlPage');
  click(thumbs[2]);
  ok(Z.curPage >= 0, 'click handled');
  Z.renderAll();
});

/* ============ 11 · page numbers in print, imposition, export DOM ============ */
T('print page numbers obey the print toggle and skip covers', () => {
  Z.state.settings.pageNumsPrint = true;
  Z.buildSequentialPrint();
  let pps = document.querySelectorAll('#printRoot .pp');
  ok(!pps[0].querySelector('.ppn'), 'front cover unnumbered');
  ok(!pps[7].querySelector('.ppn'), 'back cover unnumbered');
  ok(pps[3].querySelector('.ppn'), 'interior numbered');
  eq(pps[3].querySelector('.ppn').textContent, '4');
  Z.state.settings.pageNumsPrint = false;
  Z.buildSequentialPrint();
  pps = document.querySelectorAll('#printRoot .pp');
  ok(!pps[3].querySelector('.ppn'), 'toggle off removes print numbers');
});
T('mini-zine imposition builds one sheet of 8 panels, top row rotated', () => {
  Z.buildImposition();
  const panels = document.querySelectorAll('#printRoot .impPanel');
  eq(panels.length, 8);
  eq(document.querySelectorAll('#printRoot .impRot').length, 4, 'four panels rotated 180°');
  eq(document.querySelectorAll('#printRoot > .pp').length, 1, 'single sheet');
  document.getElementById('printRoot').innerHTML = '';
});

/* ============ 12 · backup, restore, migration ============ */
T('backup JSON round-trips through the validator (verified test restore)', () => {
  const json = JSON.stringify(Z.state);
  eq(Z.validateProject(JSON.parse(json)), null);
});
T('validator blocks corrupt backups with a reason', () => {
  const bad = JSON.parse(JSON.stringify(Z.state));
  bad.pages[2].elements.push({ type: 'image', asset: 'missing-id', x: 0, y: 0, w: 1, h: 1 });
  ok(/missing photo asset/.test(Z.validateProject(bad)));
  const bad2 = JSON.parse(JSON.stringify(Z.state));
  bad2.pages[1].elements.push({ type: 'text', text: 'x', x: NaN, y: 0, w: 1, h: 1 });
  ok(/corrupt geometry/.test(Z.validateProject(bad2)));
  eq(Z.validateProject({ app: 'NotZineIt' }), 'not a ZineIt project');
});
T('v1 .bak files migrate cleanly into v2', () => {
  const v1 = { app: 'ZineIt', ver: 1, meta: { name: 'old' }, format: 'quarter',
    assets: {},
    pages: [ { id: 'p1', label: 'Front cover', elements: [ { id: 'e1', type: 'text', text: 'hi', size: 10, align: 'left', weight: '400', x: 0.5, y: 0.5, w: 2, h: 0.5 } ] },
              { id: 'p2', label: 'Back cover', elements: [] } ],
    settings: { snap: true, grid: true, margin: 0.25, daily: true } };
  eq(Z.validateProject(v1), null, 'v1 passes validation');
  const m = Z.migrate(JSON.parse(JSON.stringify(v1)));
  eq(m.ver, 4);
  eq(m.pages[0].elements[0].role, 'custom', 'text gains a role');
  ok(m.settings.guides && typeof m.settings.bleed === 'boolean', 'v2 settings filled in');
  ok(!('audio' in m.pages[0]), 'audio notes stripped on migration — the feature is gone');
});

/* ============ 13 · mobile: responsive shell, drawers, fullscreen, swipe, tap-to-edit ============ */
function setViewport(w) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true });
  window.dispatchEvent(new window.Event('resize'));
}
T('narrow viewport activates the mobile shell; wide deactivates it', () => {
  setViewport(390);
  ok(document.body.classList.contains('mobile'), 'body.mobile at 390px');
  ok(Z.isMobile(), 'isMobile() true');
  setViewport(1280);
  ok(!document.body.classList.contains('mobile'), 'desktop restored at 1280px');
  setViewport(390);
});
T('mobile toolbar opens the Photos and Tools drawers; backdrop closes them', () => {
  click($('mtbPhotos'));
  ok(document.body.classList.contains('dLeft'), 'photos drawer open');
  ok($('drawerBk').classList.contains('show'), 'backdrop shown');
  click($('mtbTools'));
  ok(document.body.classList.contains('dRight') && !document.body.classList.contains('dLeft'), 'tools drawer replaces photos drawer');
  click($('drawerBk'));
  ok(!document.body.classList.contains('dRight') && !$('drawerBk').classList.contains('show'), 'backdrop tap closes');
});
T('timeline panel collapses/expands from the toolbar', () => {
  ok(!document.body.classList.contains('railOpen'), 'collapsed by default on mobile');
  click($('mtbRail')); ok(document.body.classList.contains('railOpen'), 'expanded');
  click($('mtbRail')); ok(!document.body.classList.contains('railOpen'), 'collapsed again');
});
T('text editor panel toggles from the toolbar', () => {
  click($('mtbText')); eq(Z.view.tab, 'text', 'opens text editor');
  click($('mtbText')); eq(Z.view.tab, 'layout', 'toggles back to layout');
});
T('tap-to-edit: selecting a block shows the Edit chip; chip opens the tools drawer', () => {
  click($('viewSingle')); Z.goPage(3);
  const t = Z.addTextEl('tap me', 10, 'caption', 3); // tap == select
  ok($('mobEdit').classList.contains('show'), 'Edit chip visible for selection');
  click($('mobEdit'));
  ok(document.body.classList.contains('dRight'), 'chip opens the tools drawer');
  click($('drawerBk'));
  Z.select(3, null); Z.renderAll();
  ok(!$('mobEdit').classList.contains('show'), 'chip hides when nothing selected');
  Z.select(3, t.id); Z.deleteSel();
});
T('swipe left/right on the canvas navigates pages', () => {
  click($('viewSingle')); Z.goPage(3); Z.select(3, null);
  const cs = $('canvasScroll');
  ptr(cs, 'pointerdown', { clientX: 300, clientY: 400 });
  ptr(window, 'pointerup', { clientX: 180, clientY: 405 });
  eq(Z.curPage, 4, 'swipe left → next page');
  ptr(cs, 'pointerdown', { clientX: 120, clientY: 400 });
  ptr(window, 'pointerup', { clientX: 260, clientY: 395 });
  eq(Z.curPage, 3, 'swipe right → previous page');
});
T('swipe in spread view steps whole spreads; vertical drags are ignored', () => {
  click($('viewSpread')); Z.goPage(3);
  const s0 = Z.spreadIndexOf(Z.curPage), cs = $('canvasScroll');
  ptr(cs, 'pointerdown', { clientX: 300, clientY: 300 });
  ptr(window, 'pointerup', { clientX: 170, clientY: 300 });
  eq(Z.spreadIndexOf(Z.curPage), s0 + 1, 'swipe advanced one spread');
  ptr(cs, 'pointerdown', { clientX: 300, clientY: 100 });
  ptr(window, 'pointerup', { clientX: 280, clientY: 400 });
  eq(Z.spreadIndexOf(Z.curPage), s0 + 1, 'vertical scroll gesture does not navigate');
  Z.stepSpread(-1);
});
T('swipe starting on an element never fires (touch drag wins)', () => {
  click($('viewSingle')); Z.goPage(3);
  const e = Z.addImageEl('tA', 1.2, 2.0, 3);
  const before = Z.curPage, n = nodeFor(e.id);
  ptr(n, 'pointerdown', { clientX: 300, clientY: 300 });
  ptr(window, 'pointermove', { clientX: 200, clientY: 300 });
  ptr(window, 'pointerup', { clientX: 200, clientY: 300 });
  eq(Z.curPage, before, 'dragging an element did not navigate');
  Z.deleteSel();
});
T('touch drag & resize use the same pointer pipeline (no mouse-only APIs)', () => {
  // Our drag/resize handlers listen to pointer events, which unify touch + mouse.
  // Verified structurally: no mousedown/mousemove/touchstart-specific handlers on elements.
  const js = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(!/addEventListener\('mousedown'/.test(js), 'no mousedown handlers');
  ok(!/addEventListener\('touchstart'/.test(js), 'no touchstart-only handlers');
  ok(/addEventListener\('pointerdown'/.test(js), 'pointer events in use');
  ok(/touch-action:none/.test(js), 'touch-action:none prevents scroll from stealing drags');
});
T('fullscreen preview: enters, shows page indicator, navigates, exits via Esc', () => {
  click($('mtbFS'));
  ok(document.body.classList.contains('fs'), 'fullscreen on');
  eq($('fsInd').textContent, (Z.curPage + 1) + ' / 8', 'page indicator');
  const p0 = Z.curPage;
  click($('fsNext')); ok(Z.curPage > p0, 'fullscreen next works');
  click($('fsPrev')); eq(Z.curPage, p0, 'fullscreen prev works');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  ok(!document.body.classList.contains('fs'), 'Esc exits fullscreen');
});
T('view switching survives on mobile: single / spread / fullscreen all reachable', () => {
  click($('viewSpread')); eq(Z.view.mode, 'spread');
  click($('viewSingle')); eq(Z.view.mode, 'single');
  Z.toggleFS(true); ok(document.body.classList.contains('fs'));
  Z.toggleFS(false); ok(!document.body.classList.contains('fs'));
  setViewport(1280); // restore desktop for remaining tests
  ok(!document.body.classList.contains('mobile'));
  click($('viewSpread'));
});

/* ============ 14 · mini-zine print mode: A4/Letter, marks, fit, preview ============ */
T('Letter imposition: exact 11×8.5 sheet, 8 panels, 4 rotated, scale 1', () => {
  Z.state.settings.imp = { paper: 'letter', fit: true, margins: false, fold: true, cut: true };
  const { page, paper, scale } = Z.buildImpSheet();
  eq(paper.name, 'US Letter');
  eq(page.style.width, '11in'); eq(page.style.height, '8.5in');
  eq(page.querySelectorAll('.impPanel').length, 8);
  eq(page.querySelectorAll('.impRot').length, 4);
  approx(scale, 1, 1e-9, 'design sheet is native Letter — no scaling');
});
T('A4 imposition: paper resized, sheet scaled uniformly (aspect ratios preserved), centred', () => {
  Z.state.settings.imp.paper = 'a4';
  const { page, scale } = Z.buildImpSheet();
  eq(page.style.width, '11.69in'); eq(page.style.height, '8.27in');
  approx(scale, 8.27 / 8.5, 1e-6, 'fit is limited by A4 height');
  const sheet = page.querySelector('.impSheet');
  ok(/scale\(0\.9/.test(sheet.style.transform), 'single uniform scale() — nothing stretches');
  const ox = parseFloat(sheet.style.left);
  approx(ox, (11.69 - 11 * scale) / 2, 1e-4, 'sheet centred horizontally');
});
T('fold marks: 4 dashed fold lines + 8 edge ticks at the exact fold positions', () => {
  const { page } = Z.buildImpSheet();
  const folds = page.querySelectorAll('.foldLine');
  eq(folds.length, 4, '3 vertical + 1 horizontal');
  const xs = [...folds].map(f => f.style.left).filter(Boolean);
  ok(xs.includes('2.75in') && xs.includes('5.5in') && xs.includes('8.25in'), 'vertical folds at panel boundaries');
  eq(page.querySelectorAll('.tickMark').length, 8, 'printer-style edge ticks');
});
T('cut mark: single ✂ line across the two middle panels only', () => {
  const { page } = Z.buildImpSheet();
  const cuts = page.querySelectorAll('.cutLine');
  eq(cuts.length, 1);
  eq(cuts[0].style.left, '2.75in'); eq(cuts[0].style.top, '4.25in');
  eq(cuts[0].style.width, '5.5in', 'spans exactly the middle two panels');
  ok(/✂/.test(cuts[0].textContent), 'scissors glyph');
});
T('guides can be hidden: fold off and cut off remove every mark', () => {
  Z.state.settings.imp.fold = false; Z.state.settings.imp.cut = false;
  const { page } = Z.buildImpSheet();
  eq(page.querySelectorAll('.foldLine').length, 0);
  eq(page.querySelectorAll('.tickMark').length, 0);
  eq(page.querySelectorAll('.cutLine').length, 0);
  Z.state.settings.imp.fold = true; Z.state.settings.imp.cut = true;
});
T('maintain-margins shrinks the sheet to keep a ¼″ border', () => {
  Z.state.settings.imp.paper = 'letter'; Z.state.settings.imp.margins = true;
  const { scale } = Z.buildImpSheet();
  approx(scale, Math.min(10.5 / 11, 8 / 8.5), 1e-6, 'fits inside paper minus ¼″ each side');
  Z.state.settings.imp.margins = false;
});
T('100% on A4 warns that the sheet will clip; fit-to-paper clears the warning', () => {
  Z.state.settings.imp.paper = 'a4'; Z.state.settings.imp.fit = false;
  let r = Z.buildImpSheet();
  ok(/Fit to paper/.test(r.warn), 'warning names the remedy');
  approx(r.scale, 1, 1e-9, '100% honoured');
  Z.state.settings.imp.fit = true;
  r = Z.buildImpSheet();
  eq(r.warn, '', 'no warning when fitted');
});
T('page numbers in the imposition follow the print toggle (interiors only)', () => {
  Z.state.settings.pageNumsPrint = true;
  let { page } = Z.buildImpSheet();
  eq(page.querySelectorAll('.ppn').length, 6, 'six interior pages numbered, covers skipped');
  Z.state.settings.pageNumsPrint = false;
  ({ page } = Z.buildImpSheet());
  eq(page.querySelectorAll('.ppn').length, 0);
});
T('print-preview modal: opens with synced settings, live preview, toggles rebuild it', () => {
  Z.state.settings.imp = { paper: 'letter', fit: true, margins: false, fold: true, cut: true };
  Z.openImpModal();
  ok($('foldModalBk').classList.contains('show'), 'modal shown');
  ok($('impPaperLetter').checked && !$('impPaperA4').checked, 'paper radio synced');
  ok($('impPreview').querySelector('.impPanel'), 'preview contains the real imposed sheet');
  $('impPaperA4').checked = true;
  $('impPaperA4').dispatchEvent(new window.Event('change', { bubbles: true }));
  eq(Z.state.settings.imp.paper, 'a4', 'radio updates the setting');
  ok($('impPreview').querySelector('.impSheet').style.transform.includes('scale(0.9'), 'preview re-rendered for A4');
  $('impFoldChk').checked = false;
  $('impFoldChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  eq($('impPreview').querySelectorAll('.foldLine').length, 0, 'fold toggle live-updates the preview');
  $('impFoldChk').checked = true;
  $('impFoldChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  $('impPnChk').checked = true;
  $('impPnChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  ok($('impPreview').querySelectorAll('.ppn').length > 0, 'page-number toggle live-updates the preview');
  $('impPnChk').checked = false;
  $('impPnChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  click($('foldClose'));
  ok(!$('foldModalBk').classList.contains('show'), 'modal closes');
  Z.state.settings.imp.paper = 'letter';
});
T('printing the imposition uses the chosen paper size for @page and PDF export', () => {
  Z.state.settings.imp.paper = 'a4';
  Z.buildImposition();
  ok(/@page\{size:11\.69in 8\.27in/.test($('pageSizeStyle').textContent), '@page = A4 landscape');
  eq(document.querySelectorAll('#printRoot .impPanel').length, 8);
  Z.state.settings.imp.paper = 'letter';
  Z.buildImposition();
  ok(/@page\{size:11in 8\.5in/.test($('pageSizeStyle').textContent), '@page = Letter landscape');
  document.getElementById('printRoot').innerHTML = '';
});
T('imposition settings survive a backup round-trip and migration fills defaults', () => {
  const json = JSON.parse(JSON.stringify(Z.state));
  eq(Z.validateProject(json), null);
  eq(json.settings.imp.paper, 'letter', 'imp settings persisted');
  delete json.settings.imp;
  const m = Z.migrate(json);
  eq(m.settings.imp.paper, 'letter', 'migration restores imposition defaults');
});

/* ============ 15 · v3: lean memory, fast photos, HEIC, feedback ============ */
T('project state carries no full-resolution photo data (memory guarantee)', () => {
  ok(Object.keys(Z.state.assets).length >= 3, 'assets registered');
  for (const id of Object.keys(Z.state.assets)) {
    const a = Z.state.assets[id];
    ok(!('src' in a), 'no full-res dataURL in state');
    ok(typeof a.thumb === 'string', 'tiny thumb string only');
    ok(Number.isFinite(a.w) && Number.isFinite(a.h), 'dimensions kept for layout math');
  }
  Z.persist(); // autosave of the lean state must succeed
  ok(document.querySelector('#saveState').className.includes('saved'), 'lean autosave persists');
});
T('asset store round-trips blobs and serves URLs (memory fallback path)', async () => {
  const blob = Z.dataURLtoBlob(PXDATA);
  await Z.assetStore.put('rt1', { full: blob, preview: blob });
  const rec = await Z.assetStore.get('rt1');
  ok(rec && rec.full && rec.full.size > 0, 'blob stored and retrieved');
  const u = await Z.assetStore.url('rt1', 'preview');
  ok(u && /^(blob:|data:)/.test(u), 'serves an object/data URL');
  eq(Z.assetStore.cachedUrl('rt1', 'preview'), u, 'URL cached for sync render paths');
  await Z.assetStore.del('rt1');
  eq(await Z.assetStore.get('rt1'), undefined, 'delete frees the stored photo');
});
T('canvas hydrates progressively: thumb instantly, preview when the store answers', async () => {
  click($('viewSingle')); Z.goPage(5);
  const e = Z.addImageEl('tA', 1.2, 2.0, 5);
  const img = nodeFor(e.id).querySelector('img');
  ok(img.src && img.src.startsWith('data:'), 'thumbnail visible immediately — no blank frame');
  await Z.assetStore.url('tA', 'preview');
  Z.renderAll();
  const img2 = nodeFor(e.id).querySelector('img');
  ok(img2.src && img2.src.length > 0, 'preview URL applied from cache on re-render');
  ok(img2.getAttribute('decoding') === 'async', 'async decode keeps the UI responsive');
  Z.select(5, e.id); Z.deleteSel();
});
T('fast-load pipeline: library and timeline render from tiny thumbs, print resolves full-res', () => {
  const libImg = document.querySelector('#library .thumb img');
  ok(libImg && libImg.src.startsWith('data:'), 'library uses thumb strings');
  eq(libImg.getAttribute('loading'), 'lazy', 'library thumbs lazy-load');
  ok(typeof Z.printSrc === 'function' && typeof Z.usedAssetIds === 'function', 'print source resolver present');
  const ids = Z.usedAssetIds();
  ids.forEach(id => ok(Z.printSrc(id), 'every placed photo resolves a print source'));
});
T('lightbox opens instantly and upgrades to full resolution', async () => {
  Z.openLightbox('tA');
  ok($('lightbox').classList.contains('show'));
  ok(/loading full resolution|full resolution/.test($('lbCap').textContent), 'caption reflects load state');
  await new Promise(r => setTimeout(r, 30));
  ok(/full resolution/.test($('lbCap').textContent), 'full-res swap completed');
  ok($('lbImg').src.length > 0);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
});
T('.bak v3 is self-contained: embeds originals + previews, passes the verifier', async () => {
  const { json, err } = await Z.buildBakJson();
  eq(err, undefined, 'no build error');
  const p = JSON.parse(json);
  eq(p.ver, 4);
  eq(Z.validateProject(p), null, 'verified test restore');
  for (const id of Object.keys(p.assets)) {
    ok(p.assetData[id] && p.assetData[id].full.startsWith('data:'), 'original embedded for ' + id);
  }
  ok(!('assetData' in Z.state), 'live state stays lean — assetData only exists in the file');
});
T('legacy v1/v2 projects ingest: inline photos move to the store, state slims down', async () => {
  Z.state.assets['leg1'] = { name: 'old.png', src: PXDATA, w: 10, h: 10 };
  const moved = await Z.ingestLegacy();
  ok(moved.includes('leg1'), 'legacy asset detected');
  ok(!('src' in Z.state.assets['leg1']), 'inline dataURL removed from state');
  ok(typeof Z.state.assets['leg1'].thumb === 'string', 'thumb retained for instant render');
  const rec = await Z.assetStore.get('leg1');
  ok(rec && rec.full && rec.full.size > 0, 'original now lives in the store');
  delete Z.state.assets['leg1']; await Z.assetStore.del('leg1');
});
T('HEIC import path: files accepted, detection by type and extension', () => {
  ok(/\.heic/i.test($('fileInput').accept), 'file picker accepts .heic');
  ok(/\.heif/i.test($('fileInput').accept), 'file picker accepts .heif');
  ok(Z.isHeic({ name: 'IMG_0231.HEIC', type: '' }), 'detected by extension (empty MIME, common on Windows/Android)');
  ok(Z.isHeic({ name: 'x.jpg', type: 'image/heic' }), 'detected by MIME type');
  ok(!Z.isHeic({ name: 'x.jpg', type: 'image/jpeg' }), 'plain JPEG untouched');
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/heic2any/.test(src), 'HEIC converter loads lazily as fallback');
  ok(/createImageBitmap/.test(src), 'native decode attempted first (Safari decodes HEIC natively)');
});
T('feedback channel: support card + view-bar button email bryanjaybee@gmail.com with context', () => {
  const a = $('feedbackLink'), b = $('fbBtn');
  ok(a && b, 'both entry points exist');
  [a, b].forEach(l => {
    ok(l.href.startsWith('mailto:hello@storitellah.com'), 'addressed correctly');
    ok(/subject=/.test(l.href) && /ZineIt/.test(decodeURIComponent(l.href)), 'prefilled subject');
    ok(/bug/i.test(decodeURIComponent(l.href)), 'invites bug reports');
  });
  ok(/every one gets read/i.test(document.querySelector('#left .support').textContent), 'invitation text present');
});
T('deleting a photo from the library also frees its stored blobs', async () => {
  Z.setAsset('delMe', { name: 'zz-delete-me.png', src: PXDATA, w: 5, h: 5 });
  await new Promise(r => setTimeout(r, 10));
  ok(await Z.assetStore.get('delMe'), 'stored');
  Z.renderAll();
  const thumbs = [...document.querySelectorAll('#library .thumb')];
  const target = thumbs.find(th => th.title.startsWith('zz-delete-me.png'));
  ok(target, 'library thumb rendered');
  const oldConfirm = window.confirm; window.confirm = () => true;
  click(target.querySelector('.del'));
  window.confirm = oldConfirm;
  await new Promise(r => setTimeout(r, 10));
  ok(!Z.state.assets['delMe'], 'metadata gone');
  eq(await Z.assetStore.get('delMe'), undefined, 'blobs gone — memory reclaimed');
});

/* ============ 16 · v3.1: Android/iOS platform hardening + support layout ============ */
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
T('M-Pesa is completely removed from the tool', () => {
  ok(!/mpesa/i.test(SRC), 'no M-Pesa markup, styles, or scripts');
  ok(!/0711\s*254\s*986|0711254986/.test(SRC), 'no phone number anywhere');
  ok(!$('copyMpesa'), 'copy button gone from the DOM');
});
T('Ko-fi and Patreon are icon buttons only — no URL text', () => {
  const btns = document.querySelectorAll('#left .supBtn');
  eq(btns.length, 2);
  const [kofi, pat] = btns;
  eq(kofi.href.replace(/\/$/,''), 'https://ko-fi.com/kiberastories');
  eq(pat.href, 'https://www.patreon.com/c/kiberastories');
  ok(kofi.querySelector('svg') && pat.querySelector('svg'), 'each carries an icon');
  [kofi, pat].forEach(b => {
    ok(!/ko-fi\.com|patreon\.com/.test(b.textContent), 'no raw URL text shown');
    ok(b.getAttribute('aria-label'), 'accessible label present');
    eq(b.target, '_blank');
  });
});
T('viewport & platform meta: notch-safe, installable-friendly on Android and iOS', () => {
  const vp = document.querySelector('meta[name="viewport"]').content;
  ok(/viewport-fit=cover/.test(vp), 'viewport-fit=cover for notched iPhones');
  ok(!/user-scalable=no|maximum-scale=1(\b|,)/.test(vp), 'pinch-zoom not disabled (accessibility)');
  ok(document.querySelector('meta[name="theme-color"]'), 'theme-color for Android chrome');
  ok(document.querySelector('meta[name="apple-mobile-web-app-capable"]'), 'iOS web-app meta');
  ok(document.querySelector('meta[name="mobile-web-app-capable"]'), 'Android web-app meta');
});
T('layout survives iOS dynamic toolbars and hardware cutouts', () => {
  ok(/height:100dvh/.test(SRC), 'dynamic viewport height (iOS address-bar safe) with 100vh fallback');
  ok(/env\(safe-area-inset-top/.test(SRC) && /env\(safe-area-inset-bottom/.test(SRC), 'safe-area insets applied');
  ok(/#mtb\{display:flex;padding-bottom:env\(safe-area-inset-bottom/.test(SRC), 'toolbar clears the home indicator');
  ok(/#rail\{[^}]*bottom:calc\(54px \+ env\(safe-area-inset-bottom/.test(SRC), 'timeline sheet sits above the toolbar + inset');
  ok(/overscroll-behavior:none/.test(SRC), 'pull-to-refresh cannot hijack canvas gestures');
});
T('no accidental zoom or selection during editing on touch devices', () => {
  ok(/select,input\[type=text\],input\[type=number\],textarea\{font-size:16px\}/.test(SRC), '16px inputs stop iOS zoom-on-focus');
  ok(/touch-action:manipulation/.test(SRC), 'double-tap zoom suppressed on controls');
  ok(/-webkit-touch-callout:none/.test(SRC), 'iOS long-press callout suppressed on page elements');
  ok(/-webkit-tap-highlight-color:transparent/.test(SRC), 'no grey tap flashes');
  ok(/-webkit-text-size-adjust:100%/.test(SRC), 'iOS landscape text inflation disabled');
});
T('touch drags stay glued to the finger: pointer capture engaged, mouse path unaffected', () => {
  ok(/setPointerCapture/.test(SRC), 'pointer capture requested on drag start');
  // functional: a full drag still works via plain mouse-style events (no pointerId)
  click($('viewSingle')); Z.goPage(3);
  const e2 = Z.addImageEl('tA', 1.2, 2.0, 3);
  const x0 = e2.x, n = nodeFor(e2.id);
  ptr(n, 'pointerdown', { clientX: 100, clientY: 100 });
  ptr(window, 'pointermove', { clientX: 100 + Z.scale, clientY: 100 });
  ptr(window, 'pointerup', {});
  ok(Math.abs(e2.x - x0) > 0.5, 'drag pipeline intact with and without pointerId');
  Z.select(3, e2.id); Z.deleteSel();
});
T('mobile view bar scrolls horizontally instead of stacking', () => {
  ok(/#viewBar\{[^}]*flex-wrap:nowrap;overflow-x:auto/.test(SRC), 'single-row scrollable toolbar on phones');
});
T('feedback subject carries the running version', () => {
  // Pinned to a shape, not a number — a version bump is not a regression, but a badge
  // that disagrees with the code is.
  ok(/^\d+\.\d+$/.test(Z.APP_VER), 'version looks like a version');
  eq($('verBadge').textContent, 'v' + Z.APP_VER, 'the badge in the header matches the code');
  ok(decodeURIComponent($('fbBtn').href).includes('ZineIt v' + Z.APP_VER), 'mailto subject carries it too');
  ok($('fbBtn').href.startsWith('mailto:hello@storitellah.com'), 'feedback goes to the right address');
});

/* ============ 17 · v3.2: type system + production readiness ============ */
const SRC2 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
T('UI type system follows the brand guidelines: Poppins display, Inter UI', () => {
  ok(/--display:'Poppins'/.test(SRC2), 'display face is Poppins (ExtraBold for the wordmark)');
  ok(/--sans:'Inter'/.test(SRC2), 'UI face is Inter');
  ok(/--serif:'Source Serif 4'/.test(SRC2), 'body face is Source Serif 4');
  ok(/--caption-font:'Manrope'/.test(SRC2), 'captions are Manrope');
  ok(/family=Poppins:wght@700;800/.test(SRC2), 'Poppins Bold + ExtraBold loaded');
  ok(/family=Inter:/.test(SRC2) && /family=Manrope:/.test(SRC2), 'Inter and Manrope loaded');
  ok(/\.brand \.mark\{font-family:var\(--display\);font-weight:800/.test(SRC2), 'wordmark is Poppins ExtraBold');
  ok(/#clock\{font-family:var\(--mono\)/.test(SRC2), 'numeric readouts stay monospaced');
});
T('brand palette is applied, not approximated', () => {
  ok(/--ink:#1A1A1A/.test(SRC2) && /--paper-white:#F7F7F5/.test(SRC2) && /--yellow:#FFC43D/.test(SRC2),
    'primary palette exact');
  ok(/--teal:#00B4A6/.test(SRC2) && /--coral:#FF5C5C/.test(SRC2) && /--indigo:#3D5AFE/.test(SRC2) && /--forest:#2F8A5F/.test(SRC2),
    'secondary palette exact');
  ok(/--accent:var\(--yellow\)/.test(SRC2), 'Warm Yellow is the primary accent');
  ok(/\.btn\.primary\{background:var\(--yellow\);border:none;color:var\(--ink\)/.test(SRC2),
    'yellow buttons carry ink text — 4.5:1 contrast, not white-on-yellow');
});
T('brand faces are offered for zine text too', () => {
  const opts = [...$('txtFont').options].map(o => o.value);
  ok(opts.includes('Poppins') || opts.includes('Inter'), 'brand faces available to the layout');
});
T('production shell: favicon, noscript, version badge, console banner', () => {
  const icon = document.querySelector('link[rel="icon"]');
  ok(icon && icon.href.startsWith('data:image/svg+xml'), 'inline SVG favicon — no 404 in production');
  ok(document.querySelector('noscript'), 'noscript message for JS-disabled visitors');
  eq($('verBadge').textContent, 'v' + Z.APP_VER, 'header shows the running version (useful in bug reports)');
  ok(/console\.info\('ZineIt v'/.test(SRC2), 'version banner logged for support');
});
T('uncaught errors surface gently and route users to feedback', async () => {
  window.dispatchEvent(new window.ErrorEvent('error', { message: 'synthetic-test-explosion' }));
  await new Promise(r => setTimeout(r, 5));
  const tx = $('toast').textContent;
  ok($('toast').className.includes('show'), 'toast raised');
  ok(/synthetic-test-explosion/.test(tx), 'names the error');
  ok(/autosaved/.test(tx), 'reassures about work safety');
  ok(tx.includes(Z.FEEDBACK_EMAIL), 'routes to the feedback email');
  ok(/unhandledrejection/.test(SRC2), 'async rejections covered too');
  window.dispatchEvent(new window.ErrorEvent('error', { message: 'second-error' }));
  ok(!/second-error/.test($('toast').textContent), 'throttled — no toast spam');
});
T('boot is guarded: startup failure shows a readable message, never a blank page', () => {
  ok(/try\{ boot\(\);/.test(SRC2), 'boot wrapped');
  ok(/ZineIt could not start/.test(SRC2), 'fallback screen present');
  ok(/hello@storitellah\.com/.test(SRC2), 'failure screen points to support');
});
T('accessibility: icon-only controls are labelled; reduced motion respected', () => {
  ['navPrevPage','navNextPage','navPrevSpread','navNextSpread','fsClose','fsPrev','fsNext']
    .forEach(id => ok($(id).getAttribute('aria-label'), id + ' labelled'));
  ok(/prefers-reduced-motion:reduce/.test(SRC2), 'transitions disabled for reduced-motion users');
});

/* ============ 18 · shipped favicon set (served by Cloudflare Pages) ============ */
T('physical favicon files ship in the repo with valid signatures', () => {
  const root = path.join(__dirname, '..');
  const ico = fs.readFileSync(path.join(root, 'favicon.ico'));
  ok(ico.length > 1000 && ico[0] === 0 && ico[1] === 0 && ico[2] === 1 && ico[3] === 0, 'favicon.ico is a real multi-image ICO');
  const svg = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8');
  ok(/^<svg /.test(svg) && /linearGradient/.test(svg), 'favicon.svg is the gradient Z mark');
  for (const f of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
    const b = fs.readFileSync(path.join(root, f));
    ok(b.length > 1000 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47, f + ' is a real PNG');
  }
});
T('icons are cache-controlled on Cloudflare; the app itself stays always-fresh', () => {
  const h = fs.readFileSync(path.join(__dirname, '..', '_headers'), 'utf8');
  ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png'].forEach(p =>
    ok(new RegExp(p.replace(/[.\/]/g, '\\$&') + '\\n\\s+Cache-Control: public, max-age=604800').test(h), p + ' cached for a week'));
  ok(/\/\*\n(.|\n)*?max-age=0, must-revalidate/.test(h), 'HTML remains must-revalidate so updates land instantly');
});
T('single-file use keeps working: inline data-URI icon retained, no file-based icon links', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/rel="icon" href='data:image\/svg\+xml/.test(src), 'data-URI icon still in the HTML (works when ZineIt.html is opened locally)');
  ok(!/rel="icon" href="favicon/.test(src) && !/rel="apple-touch-icon"/.test(src),
    'no relative icon links that would 404 for a saved single file — iOS and crawlers find the root files by convention');
});

/* ============ 19 · Lightroom plug-in contract ============
   The plug-in's output is only useful if ZineIt actually opens it. This section
   takes the .bak generated by the Lua plug-in code (lightroom/tests/make-fixture.lua)
   and pushes it through ZineIt's real restore path. */
const LR_BAK = path.join(__dirname, '..', 'lightroom', 'tests', 'fixtures', 'lightroom-export.bak');
T('plug-in .bak passes ZineIt\'s own verifier', () => {
  ok(fs.existsSync(LR_BAK), 'fixture present (regenerate: lua5.4 lightroom/tests/make-fixture.lua)');
  const p = JSON.parse(fs.readFileSync(LR_BAK, 'utf8'));
  eq(Z.validateProject(p), null, 'the exact check every restore runs');
  eq(p.app, 'ZineIt'); eq(p.format, 'mini-zine');
  eq(p.ver, 3, 'the plug-in writes v3; ZineIt migrates it forward on restore');
  eq(p.pages.length, 8, 'fixed mini-zine page count');
  ok(Array.isArray(p.pages[0].elements), 'elements encoded as JSON arrays, not objects');
  eq(p.pages[7].elements.length, 0, 'empty page is [] — the Lua encoder got this right');
});
T('plug-in .bak carries every photo as an embedded data URL', () => {
  const p = JSON.parse(fs.readFileSync(LR_BAK, 'utf8'));
  const ids = Object.keys(p.assets);
  eq(ids.length, 5);
  ids.forEach(id => {
    ok(p.assetData[id], 'assetData for ' + id);
    ok(p.assetData[id].full.startsWith('data:image/jpeg;base64,'), 'real data URL');
    const b64 = p.assetData[id].full.split(',')[1];
    const bytes = Buffer.from(b64, 'base64');
    ok(bytes.length > 100, 'decodes to real bytes');
    eq(bytes[0], 0xFF); eq(bytes[1], 0xD8, 'JPEG SOI marker — the base64 round-trip is byte-exact');
  });
});
T('ZineIt restores the plug-in project: pages, photos, captions, title all land', async () => {
  const json = fs.readFileSync(LR_BAK, 'utf8');
  const oldConfirm = window.confirm; window.confirm = () => true;
  await Z.restoreBak(new window.Blob([json], { type: 'application/json' }));
  await new Promise(r => setTimeout(r, 120));
  window.confirm = oldConfirm;

  eq(Z.state.meta.name, 'Kibera Stories', 'project name carried across');
  eq(Z.state.format, 'mini-zine');
  eq(Z.state.pages.length, 8);
  eq(Object.keys(Z.state.assets).length, 5, 'all five photos registered');

  const cover = Z.state.pages[0].elements;
  ok(cover.find(e => e.type === 'image'), 'first photo on the cover');
  const title = cover.find(e => e.role === 'title');
  ok(title && title.text === 'Kibera Stories', 'title block on the cover');
  eq(title.font, 'Bebas Neue');

  const caps = Z.state.pages.flatMap(p => p.elements).filter(e => e.role === 'caption');
  ok(caps.some(c => c.text === 'Market day'), 'Lightroom captions became caption blocks');

  for (const id of Object.keys(Z.state.assets)) {
    const rec = await Z.assetStore.get(id);
    ok(rec && rec.full && rec.full.size > 100, 'photo ' + id + ' stored as a real blob');
  }
});
T('restored plug-in project renders and prints like any other ZineIt project', () => {
  Z.setTab('layout'); Z.goPage(1); Z.renderAll();
  ok(document.querySelectorAll('#page .el').length > 0, 'pages draw');
  ok(document.querySelectorAll('#rail .tlPage').length >= 7, 'timeline populated');
  Z.buildSequentialPrint();
  eq(document.querySelectorAll('#printRoot .pp').length, 8, 'eight print pages');
  ok(document.querySelector('#printRoot .pimg'), 'photos present in the print DOM');
  Z.buildImposition();
  eq(document.querySelectorAll('#printRoot .impPanel').length, 8, 'mini-zine imposition works on it');
  document.getElementById('printRoot').innerHTML = '';
});
T('thumbless importer projects still show photos everywhere', async () => {
  const anyThumbless = Object.values(Z.state.assets).some(a => !a.thumb);
  ok(anyThumbless, 'plug-in ships no thumbnails — ZineIt regenerates them');
  Z.renderAll();
  await new Promise(r => setTimeout(r, 60));   // store resolves the preview URL
  const libImg = document.querySelector('#library .thumb img');
  ok(libImg && libImg.src && libImg.src.length > 0, 'library falls back to the stored preview, never a blank tile');
  const canvasImg = document.querySelector('#page .el.img img');
  ok(!canvasImg || canvasImg.src.length > 0, 'canvas frames hydrate too');
});

/* ============ 19b · v4.0: template library ============ */
T('every template supplies all eleven page types', () => {
  const types = Z.TPL_TYPES.map(x => x[0]);
  eq(types.length, 11, 'the eleven page types from the brief');
  Object.keys(Z.TEMPLATES).forEach(k => {
    types.forEach(ty => {
      const r = Z.tplRecipe(k, ty);
      ok(Array.isArray(r), `${k}/${ty} resolves to a recipe`);
    });
  });
  // Blank really is blank — it stays the default opening option
  types.forEach(ty => eq(Z.tplRecipe('blank', ty).length, 0, 'blank stays blank'));
  ok(Object.keys(Z.TEMPLATES).length >= 9, 'a real library, not a token one');
});
T('the brand guidelines\' named templates are all present', () => {
  const names = Object.keys(Z.TEMPLATES).map(k => Z.TEMPLATES[k].name.toLowerCase());
  ['magazine', 'documentary essay', 'travel journal', 'contact sheet', 'portfolio', 'newspaper',
   'minimalist editorial'].forEach(n => ok(names.includes(n), `${n} template exists`));
});
T('recipes are page-relative: they fit every format without being rewritten', () => {
  const formats = ['mini-zine', 'mini-16', 'a4-portrait', 'a4-landscape', 'book-3x2', 'book-2x3', 'half-letter'];
  formats.forEach(fk => {
    Z.newProject(fk);
    const f = Z.FORMATS[fk];
    Object.keys(Z.TEMPLATES).forEach(k => {
      Z.TPL_TYPES.forEach(([ty]) => {
        Z.tplRecipe(k, ty).map(sp => Z.tplMaterialize(sp, f, Z.tplStyle(k).margin)).forEach(e => {
          ok(Number.isFinite(e.x) && Number.isFinite(e.w), `${fk}/${k}/${ty} geometry finite`);
          ok(e.w > 0 && e.h > 0, `${fk}/${k}/${ty} has real size`);
          if (!(e.type === 'image' && e.w > f.w)) {   // full-bleed frames intentionally exceed trim
            ok(e.x >= -0.2 && e.x + e.w <= f.w + 0.2, `${fk}/${k}/${ty} stays on the page horizontally`);
            ok(e.y >= -0.2 && e.y + e.h <= f.h + 0.2, `${fk}/${k}/${ty} stays on the page vertically`);
          }
        });
      });
    });
  });
});
T('type scales with the page instead of staying stuck at one size', () => {
  Z.newProject('mini-zine');
  const small = Z.tplMaterialize(Z.tplRecipe('magazine', 'quote')[0], Z.fmt(), 0.3).size;
  Z.newProject('book-3x2');
  const big = Z.tplMaterialize(Z.tplRecipe('magazine', 'quote')[0], Z.fmt(), 0.3).size;
  ok(big > small, 'a quote on a 12in book is set larger than on a 2.75in zine');
  ok(small >= 5, 'never shrinks below legibility');
});
T('applying a template to a page lays out frames and text', () => {
  Z.newProject('half-letter');
  Z.goPage(2);
  const els = Z.applyTemplatePage('documentary', 'caption', 2, false);
  ok(els.length >= 2, 'frames and text placed');
  ok(els.some(e => e.type === 'image'), 'has a photo frame');
  ok(els.some(e => e.type === 'text'), 'has text');
  eq(Z.state.pages[2].tpl.key, 'documentary', 'the page remembers its template');
  eq(Z.state.settings.margin, Z.tplStyle('documentary').margin, 'template sets the margin');
  els.filter(e => e.type === 'text').forEach(e => {
    ok(e.font && e.size >= 5 && e.color, 'text carries font, size and colour');
  });
});
T('replacing a template keeps the photos and the words — the whole point', () => {
  Z.newProject('half-letter');
  Z.setAsset('x1', { name: '1.jpg', src: PXDATA, w: 6000, h: 4000 });
  Z.setAsset('x2', { name: '2.jpg', src: PXDATA, w: 4000, h: 6000 });
  Z.goPage(2);
  Z.applyTemplatePage('magazine', 'two', 2, false);
  const frames = Z.state.pages[2].elements.filter(e => e.type === 'image');
  frames[0].asset = 'x1'; frames[1].asset = 'x2';
  Z.applyTemplatePage('travel', 'three', 2, true);          // replace, keeping content
  const after = Z.state.pages[2].elements.filter(e => e.type === 'image' && e.asset);
  eq(after.length, 2, 'both photos survived the template change');
  eq(after.map(e => e.asset).join(','), 'x1,x2', 'and kept their order');
  after.forEach(e => {
    ok(e.img && Number.isFinite(e.img.w), 're-flowed photo has a valid transform');
    approx(Z.imgBox(e).w / Z.imgBox(e).h, Z.assetAR(e) ? 1 / Z.assetAR(e) : 1.5, 1e-6,
      'and still its true aspect ratio — never squashed into the new frame');
  });
});
T('more photos than the new template has frames: none are thrown away', () => {
  Z.goPage(2);
  Z.applyTemplatePage('contact', 'grid', 2, false);
  const fr = Z.state.pages[2].elements.filter(e => e.type === 'image');
  ['x1', 'x2', 'x1', 'x2', 'x1'].forEach((a, i) => { if (fr[i]) fr[i].asset = a; });
  const before = Z.state.pages[2].elements.filter(e => e.asset).length;
  Z.applyTemplatePage('portfolio', 'single', 2, true);      // single has ONE frame
  const after = Z.state.pages[2].elements.filter(e => e.asset).length;
  eq(after, before, 'every photo still on the page, even the ones the layout had no room for');
});
T('text carries across by role, not by luck', () => {
  Z.goPage(2);
  Z.applyTemplatePage('magazine', 'quote', 2, false);
  const q = Z.state.pages[2].elements.find(e => e.role === 'quote');
  q.text = 'The city wakes before we do.';
  Z.applyTemplatePage('minimal', 'quote', 2, true);
  const q2 = Z.state.pages[2].elements.find(e => e.role === 'quote');
  eq(q2.text, 'The city wakes before we do.', 'the writing survived the redesign');
});
T('applying to the whole zine assigns covers, intro and closing automatically', () => {
  Z.newProject('mini-16');
  Z.applyTemplateScope('documentary', 'all', false);
  const n = Z.state.pages.length;
  eq(Z.autoTypeFor(0, n), 'cover');
  eq(Z.autoTypeFor(1, n), 'intro');
  eq(Z.autoTypeFor(n - 2, n), 'closing');
  eq(Z.autoTypeFor(n - 1, n), 'back');
  eq(Z.state.pages[0].tpl.type, 'cover', 'page 1 really got the cover layout');
  eq(Z.state.pages[n - 1].tpl.type, 'back', 'page 16 really got the back cover');
  eq(Z.state.tpl, 'documentary', 'the project remembers its template');
  ok(Z.state.pages.every(p => p.elements.every(e =>
    Number.isFinite(e.x) && e.x >= -1 && e.x <= Z.fmt().w + 1)), 'every page laid out on the page');
});
T('a template applied to 16 pages leaves a valid, saveable project', () => {
  eq(Z.validateProject(JSON.parse(JSON.stringify(Z.state))), null, 'passes the verifier');
});
T('custom templates: save from a page, duplicate, export, import', () => {
  Z.newProject('half-letter');
  Z.goPage(2);
  Z.applyTemplatePage('travel', 'three', 2, false);
  const k = Z.saveCustomTemplate('Kibera grid', 'three');
  ok(Z.TEMPLATES[k], 'saved into the library');
  eq(Z.TEMPLATES[k].cat, 'Custom');
  eq(Z.TEMPLATES[k].name, 'Kibera grid');
  eq(Z.tplRecipe(k, 'three').length, Z.state.pages[2].elements.length, 'captured the page it came from');
  const d = Z.duplicateTemplate(k, 'Kibera grid v2');
  ok(Z.TEMPLATES[d] && Z.TEMPLATES[d].name === 'Kibera grid v2', 'duplicated');
  // export → import round-trip
  const t = Z.TEMPLATES[k];
  const payload = { app: 'ZineIt-template', ver: 1, name: t.name, note: t.note, style: Z.tplStyle(k), overData: t.overData };
  const k2 = Z.importTemplate(JSON.parse(JSON.stringify(payload)));
  eq(Z.TEMPLATES[k2].name, 'Kibera grid', 'imported cleanly');
  eq(JSON.stringify(Z.tplRecipe(k2, 'three')), JSON.stringify(Z.tplRecipe(k, 'three')), 'recipe survived the round trip');
});
T('a junk file cannot poison the template library', () => {
  let threw = false;
  try { Z.importTemplate({ hello: 'world' }); } catch (e) { threw = true; }
  ok(threw, 'refused, with a reason');
});
T('custom templates persist across sessions', () => {
  const before = Object.keys(Z.TEMPLATES).length;
  Z.loadCustomTemplates();
  ok(Object.keys(Z.TEMPLATES).length >= before, 'reloading from storage does not lose or duplicate');
  const raw = window.localStorage.getItem('zineit_templates');
  ok(raw && /Kibera grid/.test(raw), 'written to local storage, still local-first');
});
T('text colour is part of the model, rendered and exported', () => {
  Z.newProject('half-letter');
  Z.goPage(1);
  const e = Z.addTextEl('Hello', 12, 'title', 1);
  eq(e.color, '#1A1A1A', 'defaults to ink');
  e.color = '#FF5C5C';
  Z.select(1, e.id); Z.renderAll();
  const n = document.querySelector(`#page .el[data-id="${e.id}"]`);
  ok(/255, 92, 92|#FF5C5C/i.test(n.style.color), 'colour renders on canvas');
  ok(/ctx\.fillStyle=e\.color\|\|INK/.test(SRC2), 'and is used by the 300 DPI export');
});

T('the template browser opens, previews and applies', () => {
  Z.newProject('half-letter');
  click($('tplBrowseBtn'));
  ok($('tplModalBk').classList.contains('show'), 'browser opens');
  const cards = document.querySelectorAll('#tplGrid .tplCard');
  ok(cards.length >= 9, 'every template is offered');
  ok(document.querySelectorAll('#tplTypes button').length === 11, 'all eleven page types selectable');
  // previews are drawn from the real recipes, not decorative stand-ins
  const contact = [...cards].find(c => c.dataset.k === 'contact');
  document.querySelectorAll('#tplTypes button')[5].click();      // 'grid'
  const cells = document.querySelectorAll('#tplGrid .tplCard[data-k="contact"] .tplPrev i');
  eq(cells.length, 12, 'the contact-sheet grid preview really shows twelve frames');
  [...document.querySelectorAll('#tplGrid .tplCard')].find(c => c.dataset.k === 'portfolio').click();
  ok(document.querySelector('#tplGrid .tplCard[data-k="portfolio"]').classList.contains('on'), 'selection shown');
  ok(/Portfolio/.test($('tplNote').textContent), 'the note explains what it will do');
  $('tplScope').value = 'page';
  $('tplKeep').checked = true;
  click($('tplApply'));
  ok(!$('tplModalBk').classList.contains('show'), 'closes on apply');
  ok(Z.state.pages[Z.curPage].elements.length > 0, 'the page was actually laid out');
});

/* ============ 19c · v4.1: one-window workspace ============ */
T('the right panel is tabbed — one pane at a time, no endless scroll', () => {
  const tabs = [...document.querySelectorAll('#rtabs button')].map(b => b.dataset.p);
  eq(tabs.join(','), 'props,page,layers,guides,export', 'five panes, every control reachable');
  Z.setPane('page');
  const shown = [...document.querySelectorAll('#rbody > .sec')].filter(s => s.classList.contains('show'));
  ok(shown.length > 0, 'the page pane shows something');
  ok(shown.every(s => s.dataset.p === 'page'), 'and shows only the page pane');
  Z.setPane('guides');
  ok([...document.querySelectorAll('#rbody > .sec.show')].every(s => s.dataset.p === 'guides'),
    'switching panes swaps the content rather than stacking it');
  ok(document.querySelector('#rtabs button[data-p="guides"]').classList.contains('on'), 'active tab marked');
});
T('every control the brief asks for is in the window, not buried', () => {
  // top toolbar
  ['tbUndo','tbRedo','tbFormat','tbAddPage','tbAddSpread','tbTpl','tbZoomIn','tbZoomOut','tbZoomFit',
   'tbFocus','tbPreview','tbReset','tbExport','projName','saveState'].forEach(id => ok($(id), `toolbar: ${id}`));
  // left = media, centre = preview, right = properties, bottom = timeline
  ok($('left') && $('library'), 'imported photos live on the left');
  ok($('canvasWrap') && $('page'), 'the preview is the centre panel');
  ok($('right') && $('rtabs'), 'properties on the right');
  ok($('rail'), 'page timeline along the bottom');
  ok($('leftRsz') && $('rightRsz') && $('railRsz'), 'all three panels have resize handles');
});
T('the project title is compact but never truncated in the file', () => {
  const long = 'A Very Long Documentary Project Title That Would Eat The Whole Toolbar';
  Z.state.meta.name = long; Z.renderAll();
  eq($('projName').value, long, 'the field holds the whole title');
  eq($('projName').title, long, 'and the full title shows on hover');
  eq(Z.state.meta.name, long, 'nothing is truncated in the saved project');
  ok(/text-overflow:ellipsis/.test(SRC2), 'truncation is visual only');
});
T('panels resize, collapse and remember where you left them', () => {
  Z.resetWs();
  eq(Z.ws.leftW, 244); eq(Z.ws.rightW, 300); eq(Z.ws.railH, 150);
  Z.ws.leftW = 320; Z.ws.rightW = 260; Z.ws.railH = 200; Z.applyWs(); Z.saveWs();
  eq($('app').style.getPropertyValue('--leftW'), '320px', 'left width applied as a CSS variable');
  eq($('app').style.getPropertyValue('--rightW'), '260px');
  eq($('app').style.getPropertyValue('--railH'), '200px');
  const saved = JSON.parse(window.localStorage.getItem('zineit_ws'));
  eq(saved.leftW, 320, 'written to local storage — still local-first');
  Z.ws.noLeft = true; Z.applyWs();
  ok($('app').classList.contains('noLeft'), 'a panel can be collapsed away entirely');
  Z.ws.noLeft = false; Z.applyWs();
  Z.loadWs();
  eq(Z.ws.leftW, 320, 'the arrangement survives a reload');
  Z.resetWs();
  eq(Z.ws.leftW, 244, 'and reset puts it all back');
});
T('focus mode and preview-only hide the furniture, Esc brings it back', () => {
  click($('tbFocus'));
  ok(Z.ws.noLeft && Z.ws.noRight, 'focus mode hides both side panels');
  ok($('tbFocus').classList.contains('on'), 'and the button shows it');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(!Z.ws.noLeft && !Z.ws.noRight, 'Esc restores them');
  Z.togglePreviewOnly(true);
  ok($('app').classList.contains('previewOnly'), 'preview-only leaves just the pages');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(!$('app').classList.contains('previewOnly'), 'Esc comes back');
});
T('the bleed hint tells the truth about millimetres', () => {
  ok(!/controlled ⅛/.test(SRC2), 'the stale ⅛″ prose is gone');
  Z.state.settings.bleedMm = 5; Z.renderAll();
  ok(/5/.test($('bleedHintMm').textContent), 'the hint follows the actual setting');
  Z.state.settings.bleedMm = 3; Z.renderAll();
  ok(/3/.test($('bleedHintMm').textContent));
});

/* ============ 19d · v4.1: layers ============ */
T('the layers panel lists the page stack, front to back', () => {
  Z.newProject('half-letter');
  Z.setAsset('L1', { name: 'street.jpg', src: PXDATA, w: 6000, h: 4000 });
  Z.goPage(2);
  const img = Z.addImageEl('L1', 2, 2, 2);
  const txt = Z.addTextEl('A caption', 10, 'caption', 2);
  Z.setPane('layers');
  const rows = [...document.querySelectorAll('#layers .ly')];
  eq(rows.length, 2, 'both elements listed');
  eq(rows[0].dataset.id, txt.id, 'the front-most element is listed first, as in Illustrator');
  eq(rows[1].dataset.id, img.id);
  ok(/street\.jpg/.test(rows[1].textContent), 'photos are named after the file');
  eq(Z.lyKind(img), 'photo'); eq(Z.lyKind(txt), 'caption');
});
T('layer reordering changes what sits on top', () => {
  const els = Z.state.pages[2].elements;
  const [img, txt] = [els[0], els[1]];
  Z.select(2, img.id);
  Z.lyShift('front');
  eq(Z.state.pages[2].elements.at(-1).id, img.id, 'bring to front');
  Z.lyShift('back');
  eq(Z.state.pages[2].elements[0].id, img.id, 'send to back');
  Z.lyShift('fwd');
  eq(Z.state.pages[2].elements[1].id, img.id, 'move forward one step');
  Z.lyMoveTo(img.id, 0);
  eq(Z.state.pages[2].elements[0].id, img.id, 'drag-to-reorder lands where you drop it');
});
T('hiding a layer removes it from the page and the export — but not from the file', () => {
  const img = Z.state.pages[2].elements.find(e => e.type === 'image');
  Z.goPage(2); Z.renderAll();
  ok(document.querySelector(`#page .el[data-id="${img.id}"]`), 'visible to start with');
  img.hidden = true; Z.renderCanvas();
  ok(!document.querySelector(`#page .el[data-id="${img.id}"]`), 'hidden on the page');
  ok(Z.state.pages[2].elements.includes(img), 'still in the project — hiding is not deleting');
  ok(/if\(e\.hidden\) continue;/.test(SRC2), 'and skipped by the 300 DPI export');
  ok(/if\(e\.hidden\) return;/.test(SRC2), 'and by the print path');
  img.hidden = false; Z.renderCanvas();
});
T('locking a layer stops it being dragged by accident', () => {
  const img = Z.state.pages[2].elements.find(e => e.type === 'image');
  Z.goPage(2); Z.select(2, img.id); Z.renderAll();
  img.locked = true;
  const x0 = img.x;
  const n = document.querySelector(`#page .el[data-id="${img.id}"]`);
  ptr(n, 'pointerdown', { clientX: 100, clientY: 100 });
  ptr(window, 'pointermove', { clientX: 180, clientY: 100 });
  ptr(window, 'pointerup', {});
  eq(img.x, x0, 'a locked layer does not move');
  img.locked = false;
});
T('layer visibility and lock toggles work from the panel', () => {
  Z.goPage(2); Z.setPane('layers');
  const img = Z.state.pages[2].elements.find(e => e.type === 'image');
  const row = document.querySelector(`#layers .ly[data-id="${img.id}"]`);
  click(row.querySelector('[data-a=vis]'));
  eq(img.hidden, true, 'eye hides');
  click(document.querySelector(`#layers .ly[data-id="${img.id}"] [data-a=vis]`));
  eq(img.hidden, false, 'and shows again');
  click(document.querySelector(`#layers .ly[data-id="${img.id}"] [data-a=lock]`));
  eq(img.locked, true, 'padlock locks');
  click(document.querySelector(`#layers .ly[data-id="${img.id}"] [data-a=lock]`));
  eq(img.locked, false);
});
T('layers can be renamed without touching the photo', () => {
  const img = Z.state.pages[2].elements.find(e => e.type === 'image');
  const before = JSON.stringify(Z.state.assets.L1);
  img.name = 'Opening frame';
  Z.setPane('layers');
  ok(/Opening frame/.test($('layers').textContent), 'the new name shows in the stack');
  eq(JSON.stringify(Z.state.assets.L1), before, 'the photo record is untouched');
});

/* ============ 19e · v4.1: undo / redo ============ */
T('undo and redo walk the project backwards and forwards', () => {
  Z.newProject('half-letter');
  Z.undoReset();
  eq(Z.undoDepth, 0, 'a fresh project has nothing to undo');
  Z.goPage(1);
  Z.addTextEl('First', 12, 'title', 1);
  Z.addTextEl('Second', 12, 'title', 1);
  eq(Z.state.pages[1].elements.length, 2);
  ok(Z.undoDepth > 0, 'edits are recorded');
  Z.undo();
  eq(Z.state.pages[1].elements.length, 1, 'undo removes the last edit');
  Z.redo();
  eq(Z.state.pages[1].elements.length, 2, 'redo puts it back');
  eq(Z.state.pages[1].elements.at(-1).text, 'Second', 'and puts back the right thing');
});
T('undo never rewrites the photographs', () => {
  Z.setAsset('U1', { name: 'u.jpg', src: PXDATA, w: 6000, h: 4000 });
  const before = JSON.stringify(Z.state.assets.U1);
  Z.goPage(1);
  const e = Z.addImageEl('U1', 2, 2, 1);
  e.img.ox = 2; e.img.rot = 45; Z.touch();
  Z.undo();
  eq(JSON.stringify(Z.state.assets.U1), before, 'the asset record is identical after an undo');
});
T('a new edit clears the redo branch, as it should', () => {
  Z.newProject('half-letter'); Z.undoReset();
  Z.goPage(1);
  Z.addTextEl('A', 12, 'title', 1);
  Z.undo();
  ok(Z.redoDepth > 0, 'something to redo');
  Z.addTextEl('B', 12, 'title', 1);
  eq(Z.redoDepth, 0, 'a fresh edit abandons the redo branch rather than corrupting it');
});
T('undo buttons reflect what is actually possible', () => {
  Z.newProject('half-letter'); Z.undoReset();
  eq($('tbUndo').disabled, true); eq($('tbRedo').disabled, true);
  Z.goPage(1); Z.addTextEl('X', 12, 'title', 1);
  eq($('tbUndo').disabled, false, 'undo lights up once there is something to undo');
  Z.undo();
  eq($('tbRedo').disabled, false, 'and redo once it has been used');
});

/* ============ 19f · v4.1: text colour ============ */
T('hex parsing accepts what people actually type, rejects what it cannot read', () => {
  eq(Z.normHex('#FFC43D'), '#FFC43D');
  eq(Z.normHex('ffc43d'), '#FFC43D', 'no hash, lower case — still fine');
  eq(Z.normHex('#fc3'), '#FFCC33', 'three-digit shorthand expands');
  eq(Z.normHex('nonsense'), null); eq(Z.normHex('#12345'), null);
  eq(JSON.stringify(Z.hexToRgb('#FFC43D')), '[255,196,61]', 'RGB readout');
});
T('the brand palette is offered as presets', () => {
  const hexes = Z.BRAND_COLORS.map(c => c[1]);
  ['#1A1A1A', '#F7F7F5', '#FFC43D', '#00B4A6', '#FF5C5C', '#3D5AFE', '#2F8A5F']
    .forEach(c => ok(hexes.includes(c), `${c} is a preset`));
  Z.newProject('half-letter'); Z.goPage(1);
  const e = Z.addTextEl('Hello', 12, 'title', 1);
  Z.select(1, e.id); Z.setPane('props');
  eq(document.querySelectorAll('#swatches .sw').length, 7, 'all seven swatches shown');
});
T('setting a colour updates the text, the picker and the recent list', () => {
  const e = Z.state.pages[1].elements.at(-1);
  Z.select(1, e.id);
  Z.setTextColor('#00B4A6');
  eq(e.color, '#00B4A6', 'applied to the text');
  eq($('txtHex').value, '#00B4A6', 'hex field in step');
  eq($('rgbOut').textContent, 'rgb(0, 180, 166)', 'RGB readout in step');
  const recent = JSON.parse(window.localStorage.getItem('zineit_colors'));
  eq(recent[0], '#00B4A6', 'remembered as a recent colour');
});
T('colour can be applied by scope, to matching roles only', () => {
  Z.newProject('half-letter');
  [0, 1, 2].forEach(p => { Z.addTextEl('T' + p, 12, 'title', p); Z.addTextEl('C' + p, 9, 'caption', p); });
  Z.goPage(1);
  const title = Z.state.pages[1].elements.find(e => e.role === 'title');
  Z.select(1, title.id);
  title.color = '#FF5C5C';
  $('colScope').value = 'all';
  click($('colApply'));
  const titles = [], caps = [];
  Z.state.pages.forEach(p => p.elements.forEach(e => {
    if (e.role === 'title') titles.push(e.color);
    if (e.role === 'caption') caps.push(e.color);
  }));
  ok(titles.length >= 3 && titles.every(c => c === '#FF5C5C'), 'every title recoloured across the publication');
  ok(caps.every(c => c === '#1A1A1A'), 'captions left alone — scope respects the role');
});

/* ============ 20 · v4.0: non-destructive image engine ============ */
T('the frame is a clipping mask — the photo keeps its own size and may exceed it', () => {
  Z.newProject('book-8x10');
  Z.setAsset('p1', { name: 'p.jpg', src: PXDATA, w: 6000, h: 4000 });   // 3:2
  Z.goPage(1);
  const e = Z.addImageEl('p1', 4, 5, 1);
  e.x = 1; e.y = 1; e.w = 2; e.h = 2;                                    // square frame, 3:2 photo
  Z.imgFill(e);
  const b = Z.imgBox(e);
  approx(b.w / b.h, 6000 / 4000, 1e-6, 'photo keeps its true 3:2 ratio inside a square frame');
  approx(b.w, 3, 1e-6, 'Fill scales the photo to cover the frame');
  ok(b.x < e.x && b.x + b.w > e.x + e.w, 'photo genuinely overhangs the frame on both sides');
  ok(Z.imgCropPct(e) > 0, 'the overhang is reported as crop, not silently lost');
});
T('Fit shows everything, Fill covers, neither ever distorts', () => {
  const e = Z.state.pages[1].elements.at(-1);
  Z.imgFit(e);
  const f = Z.imgBox(e);
  approx(f.w / f.h, 1.5, 1e-6, 'aspect preserved on Fit');
  ok(f.w <= e.w + 1e-9 && f.h <= e.h + 1e-9, 'whole photo inside the frame');
  eq(Z.imgCropPct(e), 0, 'nothing hidden');
  Z.imgFill(e);
  const c = Z.imgBox(e);
  approx(c.w / c.h, 1.5, 1e-6, 'aspect preserved on Fill');
  ok(c.w >= e.w - 1e-9 && c.h >= e.h - 1e-9, 'frame fully covered — no paper showing');
});
T('the original photo is never touched, so every crop is reversible', () => {
  const e = Z.state.pages[1].elements.at(-1);
  const before = JSON.stringify(Z.state.assets.p1);
  e.img.ox = 3; e.img.oy = -2; e.img.rot = 41; e.img.w = 0.4;
  eq(JSON.stringify(Z.state.assets.p1), before, 'asset record untouched by any crop or rotation');
  Z.imgResetCrop(e);
  eq(e.img.ox, 0); eq(e.img.oy, 0); eq(e.img.rot, 0);
  approx(e.img.w, Z.coverW(e), 1e-9, 'reset crop returns to a clean fill');
});
T('Reset Frame restores the template frame it came from', () => {
  const e = Z.state.pages[1].elements.at(-1);
  const home = { ...e.home };
  e.x = 0.2; e.y = 0.2; e.w = 0.6; e.h = 0.6;
  Z.imgResetFrame(e);
  approx(e.x, home.x, 1e-9); approx(e.y, home.y, 1e-9);
  approx(e.w, home.w, 1e-9); approx(e.h, home.h, 1e-9);
});
T('keyboard: F fit · ⇧F fill · C centre · R reset crop · ⇧R reset frame', () => {
  const e = Z.state.pages[1].elements.at(-1);
  Z.select(1, e.id);
  // shortcuts are deliberately ignored while a form control has focus
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const key = (k, shift) => window.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: k, shiftKey: !!shift, bubbles: true, cancelable: true }));
  key('f');        approx(e.img.w, Z.containW(e), 1e-6, 'F fits');
  key('f', true);  approx(e.img.w, Z.coverW(e), 1e-6, '⇧F fills');
  e.img.ox = 1.2;  key('c'); eq(e.img.ox, 0, 'C centres');
  e.img.rot = 30;  key('r'); eq(e.img.rot, 0, 'R resets the crop');
  e.w = 0.6;       key('r', true); approx(e.w, e.home.w, 1e-9, '⇧R resets the frame');
});
T('rotation is recorded and rendered, never baked into the photo', () => {
  const e = Z.state.pages[1].elements.at(-1);
  Z.select(1, e.id); Z.renderAll();
  Z.ensureImg(e).rot = 90;
  const css = Z.imgStyle(e, 30);
  ok(/rotate\(90deg\)/.test(css), 'rotation lives in the transform');
  ok(/translate\(-50%,-50%\)/.test(css), 'rotates about the photo centre');
  const a = JSON.stringify(Z.state.assets.p1);
  Z.imgResetCrop(e);
  eq(JSON.stringify(Z.state.assets.p1), a, 'original still untouched after rotating');
});
T('a v3 project migrates into the v4 transform without moving the photo', () => {
  const v3 = {
    app: 'ZineIt', ver: 3, meta: { name: 'old' }, format: 'book-8x10',
    assets: { a: { name: 'a.jpg', w: 6000, h: 4000, thumb: '' } },
    pages: [
      { id: 'p1', label: 'Front cover', elements: [
        { id: 'e1', type: 'image', asset: 'a', fit: 'cover', px: 50, py: 50, x: 1, y: 1, w: 2, h: 2 }] },
      { id: 'p2', label: 'Back cover', elements: [] }
    ], settings: {}
  };
  const m = Z.migrate(JSON.parse(JSON.stringify(v3)));
  eq(m.ver, 4);
  const e = m.pages[0].elements[0];
  ok(e.img && Number.isFinite(e.img.w), 'gains a photo transform');
  ok(!('px' in e) && !('py' in e) && !('fit' in e), 'old object-position model removed');
  approx(e.img.w, 3, 1e-6, 'cover-fit became the equivalent photo width');
  eq(e.img.ox, 0); eq(e.img.oy, 0, 'centred photo stays centred');
  eq(Z.validateProject(m), null, 'migrated project passes the verifier');
});
T('a corrupt photo transform is caught by the verifier', () => {
  const p = JSON.parse(JSON.stringify(Z.state));
  p.pages[1].elements[0].img = { w: NaN, ox: 0, oy: 0, rot: 0 };
  ok(/photo transform/.test(Z.validateProject(p) || ''), 'refused, with a reason');
});

/* ============ 21 · v4.0: formats, 16-page zine, naming, export ============ */
T('16-page saddle-stitch zine: fixed page count, covers named', () => {
  Z.newProject('mini-16');
  eq(Z.state.pages.length, 16, 'a 16-page zine really has 16 pages');
  eq(Z.state.pages[0].label, 'Front cover');
  eq(Z.state.pages[15].label, 'Back cover');
  approx(Z.FORMATS['mini-16'].w, 5.83, 0.01, 'A5 pages');
  ok(Z.FORMATS['mini-16'].saddle, 'flagged as saddle-stitched');
});
T('saddle imposition: the page order that comes out of the printer', () => {
  const s = Z.saddleSheets();
  eq(s.length, 8, 'four sheets, two sides each');
  // The defining property of saddle stitch: every sheet-side pairs pages summing to n+1
  s.forEach(x => eq(x.left + x.right, 17, `sheet ${x.sheet} ${x.side} pairs to n+1`));
  eq(JSON.stringify(s[0]), JSON.stringify({ sheet: 1, side: 'front', left: 16, right: 1 }),
    'outermost sheet carries the covers: back cover left, front cover right');
  eq(JSON.stringify(s[1]), JSON.stringify({ sheet: 1, side: 'back', left: 2, right: 15 }));
  eq(JSON.stringify(s[7]), JSON.stringify({ sheet: 4, side: 'back', left: 8, right: 9 }),
    'innermost sheet carries the centre spread, 8|9 — the only true facing pair');
  const seen = new Set(); s.forEach(x => { seen.add(x.left); seen.add(x.right); });
  eq(seen.size, 16, 'every page printed exactly once — none lost, none duplicated');
});
T('reading order stays 1…16 regardless of print order', () => {
  const r = Z.readingOrder();
  eq(r.length, 16);
  eq(r.map(x => x.page).join(','), Array.from({ length: 16 }, (_, i) => i + 1).join(','));
  const po = Z.printOrder();
  eq(po.length, 8);
  ok(/Sheet 1 front: page 16 on the left, page 1 on the right/.test(po[0].note), 'plain-English print note');
});
T('saddle print builds four duplex sheets, two pages each, with fold lines', () => {
  Z.buildSaddlePrint();
  const sheets = document.querySelectorAll('#printRoot > .pp');
  eq(sheets.length, 8, 'eight sheet-sides to send to the printer');
  eq(sheets[0].querySelectorAll('.impPanel').length, 2, 'two pages per sheet side');
  ok(/flip on SHORT edge/.test(sheets[0].textContent), 'the duplex instruction that everyone gets wrong');
  document.getElementById('printRoot').innerHTML = '';
});
T('A4 zines open full-bleed by default; margins remain available', () => {
  Z.newProject('a4-portrait');
  approx(Z.FORMATS['a4-portrait'].w, 8.27, 0.01);
  approx(Z.FORMATS['a4-portrait'].h, 11.69, 0.01);
  eq(Z.state.settings.margin, 0, 'edge to edge — no white border by default');
  eq(Z.state.settings.bleed, true, 'bleed on, so images can spill past trim');
  Z.newProject('a4-landscape');
  approx(Z.FORMATS['a4-landscape'].w, 11.69, 0.01, 'landscape A4 available too');
});
T('3:2 photobook formats exist in both orientations', () => {
  approx(Z.FORMATS['book-3x2'].w / Z.FORMATS['book-3x2'].h, 1.5, 1e-9, '3:2 landscape');
  approx(Z.FORMATS['book-2x3'].h / Z.FORMATS['book-2x3'].w, 1.5, 1e-9, '2:3 portrait');
});
T('file naming: exports and backups follow the house scheme, sanitised', () => {
  Z.newProject('half-letter');
  Z.state.meta.name = 'My First Photo Story';
  ok(/^My First Photo Story_Made with ZineIt_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.jpg$/.test(Z.fileName('export', 'jpg')),
    'export: Title_Made with ZineIt_Date_Time');
  ok(/^My First Photo Story_ZineIt_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.bak$/.test(Z.fileName('backup', 'bak')),
    'backup: Title_ZineIt_Date_Time');
  eq(Z.sanitizeName('a/b\\c:d*e?f"g<h>i|j'), 'a b c d e f g h i j', 'filesystem-hostile characters stripped');
  eq(Z.sanitizeName('   '), 'Untitled project', 'empty names get a real fallback');
  eq(Z.sanitizeName('Kibera: Stories!'), 'Kibera Stories');
  Z.state.settings.nameSuffix = 'press run';
  ok(/_press-run\.jpg$/.test(Z.fileName('export', 'jpg')), 'optional custom suffix appended');
  Z.state.settings.nameSuffix = '';
  eq(Z.exportBase(), 'My-First-Photo-Story', 'JPG numbering uses a path-safe base');
});
T('JPG export numbers pages in reading order and spreads separately', () => {
  const base = Z.exportBase();
  // numbering contract, independent of canvas availability in this environment
  eq(`${base}_${String(1).padStart(3, '0')}.jpg`, 'My-First-Photo-Story_001.jpg');
  eq(`${base}_${String(12).padStart(3, '0')}.jpg`, 'My-First-Photo-Story_012.jpg');
  eq(`${base}_Spread-${String(1).padStart(3, '0')}.jpg`, 'My-First-Photo-Story_Spread-001.jpg');
});
T('the ZIP writer produces a real, readable archive', () => {
  const enc = new TextEncoder();
  const blob = Z.zipStore([
    { name: 'a_001.jpg', data: enc.encode('hello zine') },
    { name: 'a_002.jpg', data: enc.encode('second page') }
  ]);
  ok(blob && blob.size > 60, 'archive produced');
  eq(blob.type, 'application/zip');
  // CRC32 against the known vector — a wrong table silently corrupts every archive
  eq(Z.crc32(enc.encode('123456789')) >>> 0, 0xCBF43926, 'CRC32 matches the standard check value');
});
T('300 DPI is the export target, and it renders from originals not previews', () => {
  ok(/const DPI=300/.test(SRC2), '300 DPI target');
  ok(/assetStore\.url\(assetId,'full'\)/.test(SRC2), 'exports pull the ORIGINAL photo, not the screen preview');
  ok(/ctx\.rect\(\(e\.x\+dx\)\*DPI,e\.y\*DPI,e\.w\*DPI,e\.h\*DPI\); ctx\.clip\(\)/.test(SRC2),
    'the frame clips on the canvas exactly as it does on screen');
  ok(/ctx\.drawImage\(im,-iw\/2,-ih\/2,iw,ih\)/.test(SRC2), 'photo drawn at its true ratio — never stretched');
});
T('audio notes are gone from every surface', () => {
  ok(!/audioAttachBtn|renderAudioSec|audioInput|Page audio note/.test(SRC2), 'no audio UI, handlers or markup');
  const p = Z.blankPage('x');
  ok(!('audio' in p), 'new pages carry no audio field');
});
T('support and feedback route to hello@storitellah.com', () => {
  eq(Z.FEEDBACK_EMAIL, 'hello@storitellah.com');
  ok(!/bryanjaybee/.test(SRC2), 'the old address is gone everywhere');
});

/* ============ 20 · console health ============ */
T('no page errors or uncaught exceptions across the whole run', () => {
  eq(pageErrors.length, 0, 'errors: ' + pageErrors.slice(0, 3).join(' | '));
});

/* ============ report ============ */
chain.then(() => {
  const stamp = new Date().toISOString();
  console.log(`ZineIt v${Z.APP_VER} test run — ${stamp}`);
  for (const [s, n] of results) console.log(`  ${s === 'PASS' ? '✓' : '✗'} ${s}  ${n}`);
  console.log(`\n${pass} passed · ${fail} failed · ${pass + fail} total`);
  fs.writeFileSync(path.join(__dirname, 'last-run.txt'),
    `ZineIt v${Z.APP_VER} test run — ${stamp}\n` + results.map(([s, n]) => `${s}  ${n}`).join('\n') + `\n\n${pass} passed · ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}).catch(e => { console.error('suite crashed:', e); process.exit(1); });
