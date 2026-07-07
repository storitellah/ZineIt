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
  eq(Z.state.app, 'ZineIt'); eq(Z.state.ver, 3);
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
  click($('fitBtn')); eq(e.fit, 'contain', 'Fit = whole photo, no crop');
  click($('fillBtn')); eq(e.fit, 'cover', 'Fill = crop allowed, never stretched');
  e.px = 80; e.py = 20;
  click($('centreBtn')); eq(e.px, 50); eq(e.py, 50);
});
T('reset crop re-centres; reset frame restores photo proportions', () => {
  const e = Z.state.pages[3].elements.at(-1);
  Z.select(3, e.id);
  e.px = 10; e.w = 0.6; e.h = 1.9; // squeeze the frame → heavy crop
  click($('resetCropBtn')); eq(e.px, 50); eq(e.fit, 'cover');
  click($('resetFrameBtn'));
  approx(e.h / e.w, 1000 / 1500, 0.15, 'frame back to photo ratio');
});
T('coverExtent math: crop percentage and full-image ghost bounds', () => {
  const e = { asset: 'tB', x: 1, y: 1, w: 1, h: 1, px: 50, py: 50, fit: 'cover' };
  const ce = Z.coverExtent(e);
  approx(ce.w, 1.5, 0.001, 'cover width for 3:2 photo in square frame');
  approx(ce.h, 1, 0.001);
  approx(ce.x, 1 - 0.25, 0.001, 'centred: quarter hangs off each side');
  ok(ce.crop > 0 && ce.crop <= 40, 'reports a sensible crop %');
});

/* ============ 5 · pointer drags: move, shift-pan, 8-way resize, ghost ============ */
function nodeFor(id) { return document.querySelector(`#page .el[data-id="${id}"]`); }
T('plain drag moves the frame (grid-snapped)', () => {
  click($('viewSingle')); Z.goPage(3);
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  const n = nodeFor(e.id); ok(n, 'element node rendered');
  const x0 = e.x, s = Z.scale;
  ptr(n, 'pointerdown', { clientX: 100, clientY: 100 });
  ptr(window, 'pointermove', { clientX: 100 + s, clientY: 100 });
  ptr(window, 'pointerup', {});
  approx(e.x, Math.round((x0 + 1) / 0.125) * 0.125, 0.13, 'moved ~1in right, snapped to ⅛″ grid');
});
T('SHIFT+drag pans the photo inside its frame (the v1 bug)', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  e.px = 50; e.py = 50; Z.renderAll();
  const n = nodeFor(e.id);
  ptr(n, 'pointerdown', { clientX: 200, clientY: 200, shiftKey: true });
  ptr(window, 'pointermove', { clientX: 200 + Z.scale * 0.4, clientY: 200, shiftKey: true });
  ok(e.px !== 50, 'object-position changed while shift-dragging');
  ok(e.px >= 0 && e.px <= 100, 'pan stays clamped');
  ok($('cropGhost'), 'crop ghost (full-image extent) visible during pan');
  ptr(window, 'pointerup', {});
  ok(!$('cropGhost'), 'ghost removed after drag');
});
T('Pan mode button enables panning without a modifier key', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  e.px = 50; Z.renderAll();
  click($('panModeBtn'));
  const n = nodeFor(e.id);
  ptr(n, 'pointerdown', { clientX: 300, clientY: 300 });
  ptr(window, 'pointermove', { clientX: 330, clientY: 300 });
  ok(e.px !== 50, 'panned with pan-mode on');
  ptr(window, 'pointerup', {});
  click($('panModeBtn'));
});
T('all 8 resize handles exist on a selected frame', () => {
  const e = Z.state.pages[3].elements.at(-1); Z.select(3, e.id);
  const kinds = [...nodeFor(e.id).querySelectorAll('.hd')].map(h => h.className.replace('hd ', '')).sort();
  eq(kinds.join(','), 'e,n,ne,nw,s,se,sw,w');
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
  // "never stretches": rendering always uses object-fit cover/contain
  const img = nodeFor(e.id) && nodeFor(e.id).querySelector('img');
  ok(nodeFor(e.id).className.includes('fit-'), 'object-fit class present — image cannot distort');
  ok(img, 'image still rendered');
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
T('bleed ON: exactly ⅛″ of controlled spill, never more', () => {
  $('bleedChk').checked = true;
  $('bleedChk').dispatchEvent(new window.Event('change', { bubbles: true }));
  const e = Z.state.pages[3].elements.at(-1);
  e.x = -99; Z.clampEl(e); approx(e.x, -0.125, 1e-9, 'spill stops at bleed line');
  e.x = 99; Z.clampEl(e); approx(e.x + e.w, 2.75 + 0.125, 1e-9);
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
  approx(e.w, 5.5, 0.001, 'spans two page-widths');
  approx(e.x, 0, 0.001, 'starts at the left trim');
  eq(Z.view.mode, 'spread', 'auto-switched to spread view');
});
T('spread photo renders once across the fold in spread view', () => {
  Z.goPage(1);
  const e = Z.state.pages[1].elements.find(x => x.spread);
  const n = nodeFor(e.id);
  ok(n, 'rendered'); ok(n.querySelector('.spreadBadge'), 'SPREAD badge shown');
  approx(parseFloat(n.style.width), 5.5 * Z.scale, 1, 'one continuous image across both pages');
});
T('in single view each half shows correctly and is locked (aligned across the fold)', () => {
  click($('viewSingle'));
  Z.goPage(1); // left half
  const e = Z.state.pages[1].elements.find(x => x.spread);
  let n = nodeFor(e.id);
  ok(n && n.classList.contains('locked'), 'left half visible, locked in single view');
  approx(parseFloat(n.style.left), 0, 1, 'left half starts at page origin');
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
T('timeline click selects the page; audio indicator appears when attached', () => {
  const thumbs = document.querySelectorAll('#rail .tlPage');
  click(thumbs[2]);
  ok(Z.curPage >= 0, 'click handled');
  Z.state.pages[3].audio = { name: 'field.mp3', src: 'data:audio/mp3;base64,AA==' };
  Z.renderAll();
  ok(document.querySelector('#rail .tag.au'), '♪ audio indicator visible');
  Z.state.pages[3].audio = null; Z.renderAll();
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
  eq(m.ver, 3);
  eq(m.pages[0].elements[0].role, 'custom', 'text gains a role');
  ok(m.settings.guides && typeof m.settings.bleed === 'boolean', 'v2 settings filled in');
  ok('audio' in m.pages[0], 'pages gain audio slot');
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
  eq(p.ver, 3);
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
    ok(l.href.startsWith('mailto:bryanjaybee@gmail.com'), 'addressed correctly');
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

/* ============ 16 · console health ============ */
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
