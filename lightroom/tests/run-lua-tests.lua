--[[----------------------------------------------------------------------------
Unit tests for the ZineIt Lightroom plug-in's pure logic.

Runs outside Lightroom: ZineItJson and ZineItProject deliberately import no Lr
modules, so the layout maths, JSON encoding, and .bak writer can be tested on
any Lua 5.4. The Lightroom-facing files are syntax-checked separately, and the
generated .bak is validated against the real ZineIt in run-tests.js.

  lua5.4 lightroom/tests/run-lua-tests.lua
------------------------------------------------------------------------------]]

package.path = 'lightroom/zineit.lrplugin/?.lua;' .. package.path

local Json    = require 'ZineItJson'
local Project = require 'ZineItProject'

local pass, fail, results = 0, 0, {}
local function T(name, fn)
  local ok, err = pcall(fn)
  if ok then pass = pass + 1; results[#results + 1] = { 'PASS', name }
  else fail = fail + 1; results[#results + 1] = { 'FAIL', name .. ' — ' .. tostring(err) } end
end
local function eq(a, b, msg)
  if a ~= b then error(string.format('%s (got %s, want %s)', msg or '', tostring(a), tostring(b)), 2) end
end
local function ok(v, msg) if not v then error(msg or 'expected truthy', 2) end end
local function approx(a, b, tol, msg)
  if math.abs(a - b) > (tol or 1e-9) then
    error(string.format('%s (got %s, want ~%s)', msg or '', tostring(a), tostring(b)), 2)
  end
end

--============ JSON encoder ============
T('encodes objects with sorted keys and correct types', function()
  eq(Json.encode({ b = 1, a = 'x', c = true }), '{"a":"x","b":1,"c":true}')
end)
T('distinguishes empty arrays from empty objects', function()
  eq(Json.encode(Json.array{}), '[]', 'empty array must not become {}')
  eq(Json.encode({}), '{}')
  eq(Json.encode({ list = Json.array{ 1, 2, 3 } }), '{"list":[1,2,3]}')
end)
T('encodes inch geometry without scientific notation or float drift', function()
  eq(Json.encode({ x = 0.25 }), '{"x":0.25}')
  eq(Json.encode({ x = 2.75 }), '{"x":2.75}')
  eq(Json.encode({ x = 1 }), '{"x":1}')
  eq(Json.encode({ x = 0.0001 }), '{"x":0.0001}')
end)
T('escapes quotes, backslashes, newlines and control characters', function()
  eq(Json.encode('he said "hi"'), '"he said \\"hi\\""')
  eq(Json.encode('a\\b'), '"a\\\\b"')
  eq(Json.encode('line1\nline2'), '"line1\\nline2"')
  eq(Json.encode('tab\there'), '"tab\\there"')
  eq(Json.encode('bell\a'), '"bell\\u0007"')
end)
T('encodes null and refuses values it cannot represent', function()
  eq(Json.encode(Json.null), 'null')
  eq(Json.encode({ audio = Json.null }), '{"audio":null}')
  ok(not pcall(Json.encode, 0 / 0), 'NaN rejected')
  ok(not pcall(Json.encode, math.huge), 'infinity rejected')
  ok(not pcall(Json.encode, print), 'functions rejected')
end)

--============ formats ============
T('formats mirror ZineIt exactly', function()
  eq(Project.FORMATS['mini-zine'].w, 2.75); eq(Project.FORMATS['mini-zine'].h, 4.25)
  eq(Project.FORMATS['mini-zine'].fixed, 8)
  eq(Project.FORMATS['book-8x10'].w, 8);    eq(Project.FORMATS['book-8x10'].h, 10)
  eq(#Project.FORMAT_ORDER, 8, 'every format offered in the dialog')
  for _, k in ipairs(Project.FORMAT_ORDER) do ok(Project.FORMATS[k], k .. ' exists') end
end)

--============ layout maths ============
T('frame keeps the photo aspect ratio and fits inside the margins', function()
  local fmt = Project.FORMATS['book-8x10']
  local box = Project.frameFor(fmt, 0.25, 6000, 4000, false)     -- 3:2 landscape
  approx(box.w / box.h, 1.5, 0.001, 'aspect preserved')
  approx(box.w, 7.5, 0.001, 'fills the printable width')
  ok(box.x >= 0.25 - 1e-9 and box.x + box.w <= 8 - 0.25 + 1e-9, 'inside horizontal margins')
  ok(box.y >= 0.25 - 1e-9 and box.y + box.h <= 10 - 0.25 + 1e-9, 'inside vertical margins')
end)
T('tall photos are limited by height, not width', function()
  local fmt = Project.FORMATS['book-8x8']
  local box = Project.frameFor(fmt, 0.25, 2000, 6000, false)     -- 1:3 portrait
  approx(box.h, 7.5, 0.001, 'height-bound')
  approx(box.w / box.h, 2000 / 6000, 0.001, 'aspect preserved')
  ok(box.x > 0.25, 'centred horizontally with air either side')
end)
T('captioned pages reserve space and never overlap the caption', function()
  local fmt = Project.FORMATS['half-letter']
  local plain = Project.frameFor(fmt, 0.25, 4000, 4000, false)
  local capd  = Project.frameFor(fmt, 0.25, 4000, 4000, true)
  ok(capd.h <= plain.h, 'captioned frame is not taller')
  ok(capd.y + capd.h <= fmt.h - 0.25 - 0.42 + 1e-6, 'photo stops above the caption band')
  approx(capd.w / capd.h, 1, 0.001, 'square stays square')
end)
T('missing or nonsense photo dimensions degrade to a square, never a crash', function()
  local fmt = Project.FORMATS['a5']
  local box = Project.frameFor(fmt, 0.25, nil, nil, false)
  approx(box.w / box.h, 1, 0.001)
  local box2 = Project.frameFor(fmt, 0.25, 0, 0, false)
  ok(box2.w > 0 and box2.h > 0, 'zero dimensions handled')
end)
T('an over-large margin is rejected rather than producing negative frames', function()
  ok(not pcall(Project.frameFor, Project.FORMATS['mini-zine'], 2.0, 100, 100, false))
end)

--============ capacity ============
T('capacity reflects fixed page counts and cover use', function()
  eq(Project.capacity('mini-zine', false), 6, '8 pages − 2 covers')
  eq(Project.capacity('mini-zine', true), 7, 'cover photo adds one')
  eq(Project.capacity('book-8x10', false), math.huge, 'books grow to fit')
end)

--============ project assembly ============
local function photos(n)
  local t = {}
  for i = 1, n do
    t[i] = { assetId = 'a' .. i, name = 'DSC_' .. i .. '.jpg', w = 6000, h = 4000,
             caption = (i % 2 == 1) and ('Caption ' .. i) or nil }
  end
  return t
end

T('mini zine: 8 pages, cover photo, title block, interiors filled in order', function()
  Project.resetIds()
  local p, info = Project.build { name = 'Kibera Stories', format = 'mini-zine',
    coverPhoto = true, titleOnCover = true, photos = photos(7) }
  eq(p.app, 'ZineIt'); eq(p.ver, 3); eq(p.format, 'mini-zine')
  eq(#p.pages, 8, 'fixed page count honoured')
  eq(info.placed, 7); eq(info.skipped, 0); eq(info.pages, 8)
  eq(p.pages[1].label, 'Front cover'); eq(p.pages[8].label, 'Back cover')
  local coverImgs, coverTitles = 0, 0
  for _, e in ipairs(p.pages[1].elements) do
    if e.type == 'image' then coverImgs = coverImgs + 1 end
    if e.role == 'title' then coverTitles = coverTitles + 1; eq(e.text, 'Kibera Stories'); eq(e.font, 'Bebas Neue') end
  end
  eq(coverImgs, 1, 'first photo on the cover'); eq(coverTitles, 1, 'title on the cover')
  eq(p.pages[2].elements[1].asset, 'a2', 'interiors continue in order')
end)
T('extra photos are reported, not silently dropped or overflowed', function()
  Project.resetIds()
  local p, info = Project.build { name = 'Too many', format = 'mini-zine',
    coverPhoto = true, photos = photos(20) }
  eq(info.placed, 7, 'placed up to capacity')
  eq(info.skipped, 13, 'the rest reported back to the user')
  eq(#p.pages, 8, 'page count never exceeds a fixed format')
  local n = 0
  for _ in pairs(p.assets) do n = n + 1 end
  eq(n, 7, 'only placed photos become assets — no orphans in the .bak')
end)
T('photobook grows to fit the selection', function()
  Project.resetIds()
  local p, info = Project.build { name = 'Book', format = 'book-8x10',
    coverPhoto = false, photos = photos(12) }
  eq(info.placed, 12); eq(info.skipped, 0)
  eq(#p.pages, 14, '12 interiors + 2 covers')
  eq(#p.pages[1].elements, 0, 'cover left blank when coverPhoto is off')
end)
T('captions become caption-role text blocks under their photo', function()
  Project.resetIds()
  local p = Project.build { name = 'C', format = 'book-8x8', coverPhoto = false, photos = photos(2) }
  local page = p.pages[2]              -- photo 1, odd → captioned
  eq(#page.elements, 2, 'image + caption')
  local img, cap = page.elements[1], page.elements[2]
  eq(cap.type, 'text'); eq(cap.role, 'caption'); eq(cap.text, 'Caption 1')
  eq(cap.font, 'Source Sans 3')
  ok(cap.y > img.y + img.h - 1e-6, 'caption sits below the photo')
  eq(#p.pages[3].elements, 1, 'photo 2 has no caption → no empty text block')
end)
T('every element carries finite geometry and a unique id', function()
  Project.resetIds()
  local p = Project.build { name = 'G', format = 'book-a4', coverPhoto = true,
    titleOnCover = true, photos = photos(6) }
  local seen = {}
  for _, page in ipairs(p.pages) do
    ok(not seen[page.id], 'page id unique'); seen[page.id] = true
    for _, e in ipairs(page.elements) do
      ok(not seen[e.id], 'element id unique'); seen[e.id] = true
      for _, k in ipairs { 'x', 'y', 'w', 'h' } do
        local v = e[k]
        ok(type(v) == 'number' and v == v and v ~= math.huge, k .. ' is finite')
      end
      if e.type == 'image' then ok(p.assets[e.asset], 'image references a real asset') end
    end
  end
end)
T('settings match ZineIt defaults so the project opens configured, not surprising', function()
  local p = Project.build { name = 'S', format = 'quarter', margin = 0.375, photos = photos(1) }
  eq(p.settings.margin, 0.375, 'chosen margin carried through')
  eq(p.settings.keepAspect, true); eq(p.settings.bleed, false)
  eq(p.settings.guides.margins, true); eq(p.settings.imp.paper, 'letter')
end)
T('unknown format is refused loudly', function()
  ok(not pcall(Project.build, { format = 'not-a-format', photos = photos(1) }))
end)

--============ .bak writer ============
local function fakeJpeg(tag) return '\255\216\255fake-jpeg-bytes-' .. tag .. '\255\217' end
local b64 = dofile('lightroom/tests/b64.lua')

T('the fixture base64 encoder is correct for every input length', function()
  -- the tail is where naive Lua base64 implementations break
  eq(b64(''), '')
  eq(b64('f'), 'Zg==')
  eq(b64('fo'), 'Zm8=')
  eq(b64('foo'), 'Zm9v')
  eq(b64('foob'), 'Zm9vYg==')
  eq(b64('fooba'), 'Zm9vYmE=')
  eq(b64('foobar'), 'Zm9vYmFy')
  for len = 1, 40 do
    local s = string.rep('\200\001A', len):sub(1, len)
    local e = b64(s)
    eq(#e % 4, 0, 'length ' .. len .. ' encodes to a multiple of 4')
    ok(not e:find('[^A-Za-z0-9+/=]'), 'length ' .. len .. ' emits only base64 characters')
  end
end)

T('writeBak streams photos into a valid, self-contained file', function()
  Project.resetIds()
  local p = Project.build { name = 'Stream', format = 'book-8x8', coverPhoto = false, photos = photos(3) }
  local files, tmp = {}, os.tmpname()
  for i = 1, 3 do
    local fp = os.tmpname()
    local fh = io.open(fp, 'wb'); fh:write(fakeJpeg(i)); fh:close()
    files[i] = { assetId = 'a' .. i, path = fp, mime = 'image/jpeg' }
  end
  local okw, err = Project.writeBak(tmp, p, files, function(path)
    local fh = io.open(path, 'rb'); local d = fh:read('a'); fh:close(); return d
  end, b64)
  ok(okw, 'written: ' .. tostring(err))
  local fh = io.open(tmp, 'rb'); local out = fh:read('a'); fh:close()
  ok(out:sub(1, 1) == '{' and out:sub(-1) == '}', 'balanced JSON braces')
  ok(out:find('"assetData"', 1, true), 'assetData appended')
  for i = 1, 3 do ok(out:find('"a' .. i .. '":{"full":"data:image/jpeg;base64,', 1, true), 'photo ' .. i .. ' embedded') end
  ok(not out:find('}{', 1, true), 'no concatenation seam')
  for payload in out:gmatch('base64,([^"]*)"') do
    eq(#payload % 4, 0, 'embedded payload is validly padded base64')
    ok(not payload:find('[^A-Za-z0-9+/=]'), 'embedded payload has no raw bytes')
  end
  for _, f in ipairs(files) do os.remove(f.path) end
  os.remove(tmp)
end)
T('writeBak fails safely when a rendered photo cannot be read', function()
  Project.resetIds()
  local p = Project.build { name = 'Bad', format = 'book-8x8', coverPhoto = false, photos = photos(1) }
  local tmp = os.tmpname()
  local okw, err = Project.writeBak(tmp, p, { { assetId = 'a1', path = '/nonexistent', mime = 'image/jpeg' } },
    function() return nil end, b64)
  ok(not okw, 'reports failure')
  ok(tostring(err):find('could not read'), 'names the cause')
  local fh = io.open(tmp, 'rb')
  ok(fh == nil, 'no half-written .bak left behind')
  if fh then fh:close(); os.remove(tmp) end
end)

--============ report ============
for _, r in ipairs(results) do
  print(string.format('  %s %s  %s', r[1] == 'PASS' and '✓' or '✗', r[1], r[2]))
end
print(string.format('\n%d passed · %d failed · %d total', pass, fail, pass + fail))
os.exit(fail == 0 and 0 or 1)
