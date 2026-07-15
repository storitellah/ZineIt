--[[----------------------------------------------------------------------------
ZineItProject — builds a ZineIt v3 project from Lightroom photos.

This module is deliberately free of Lightroom API calls so it can be unit
tested outside Lightroom (see lightroom/tests/). It knows two things: ZineIt's
page formats, and how to place a photo on a page without ever distorting it.
------------------------------------------------------------------------------]]

local Json = require 'ZineItJson'

local Project = {}

-- Must match ZineIt's FORMATS table exactly (keys and trim sizes).
Project.FORMATS = {
  ['mini-zine']   = { w = 2.75, h = 4.25, fixed = 8, label = 'Mini zine — 8-page, one sheet' },
  ['quarter']     = { w = 4.25, h = 5.5,               label = 'Quarter zine — 4.25 × 5.5 in' },
  ['half-letter'] = { w = 5.5,  h = 8.5,               label = 'Half-letter zine — 5.5 × 8.5 in' },
  ['a5']          = { w = 5.83, h = 8.27,              label = 'A5 zine — 148 × 210 mm' },
  ['book-8x8']    = { w = 8,    h = 8,                 label = 'Photobook — 8 × 8 in square' },
  ['book-8x10']   = { w = 8,    h = 10,                label = 'Photobook — 8 × 10 in portrait' },
  ['book-10x8']   = { w = 10,   h = 8,                 label = 'Photobook — 10 × 8 in landscape' },
  ['book-a4']     = { w = 8.27, h = 11.69,             label = 'Photobook — A4 portrait' },
}

-- Order shown in the export dialog.
Project.FORMAT_ORDER = {
  'mini-zine', 'quarter', 'half-letter', 'a5',
  'book-8x8', 'book-8x10', 'book-10x8', 'book-a4',
}

local CAPTION_H = 0.42   -- inches reserved under a photo when a caption is placed

local idCounter = 0
local function nextId(prefix)
  idCounter = idCounter + 1
  return string.format('lr%s%d', prefix or 'x', idCounter)
end

function Project.resetIds() idCounter = 0 end

local function round(v)
  return math.floor(v * 10000 + 0.5) / 10000
end

--- Frame geometry for one photo on one page, preserving the photo's aspect ratio.
-- Never stretches: the frame takes the photo's proportions, scaled to fit the
-- printable area (page minus margins, minus caption space when captioned).
function Project.frameFor(fmt, margin, photoW, photoH, withCaption)
  local availW = fmt.w - 2 * margin
  local availH = fmt.h - 2 * margin - (withCaption and CAPTION_H or 0)
  if availW <= 0 or availH <= 0 then error('margin too large for this format') end

  local ar = (photoH or 1) / (photoW or 1)
  if ar <= 0 or ar ~= ar then ar = 1 end   -- guard against missing/NaN dimensions

  local w = availW
  local h = w * ar
  if h > availH then
    h = availH
    w = h / ar
  end
  return {
    x = round((fmt.w - w) / 2),
    y = round(margin + (availH - h) / 2),
    w = round(w),
    h = round(h),
  }
end

local function imageElement(assetId, box)
  return {
    id = nextId('i'), type = 'image', asset = assetId,
    fit = 'cover', px = 50, py = 50, spread = false,
    x = box.x, y = box.y, w = box.w, h = box.h,
  }
end

local function textElement(text, opts)
  return {
    id = nextId('t'), type = 'text', text = text,
    size = opts.size or 9, align = opts.align or 'left', weight = opts.weight or '400',
    font = opts.font or 'Source Sans 3', role = opts.role or 'caption',
    x = round(opts.x), y = round(opts.y), w = round(opts.w), h = round(opts.h),
  }
end

local function blankPage(label)
  return { id = nextId('p'), label = label, elements = Json.array{}, audio = Json.null }
end

function Project.defaultSettings(margin)
  return {
    snap = true, grid = true, margin = margin or 0.25, daily = true, keepAspect = true,
    bleed = false, warnMargins = true, pageNumsPreview = false, pageNumsPrint = false,
    guides = { margins = true, safe = false, bleedG = false, fold = true },
    imp = { paper = 'letter', fit = true, margins = false, fold = true, cut = true },
  }
end

--- How many photos a format can hold, one per page (covers excluded unless used).
function Project.capacity(formatKey, useCoverPhoto)
  local fmt = Project.FORMATS[formatKey]
  if fmt and fmt.fixed then
    -- fixed formats: interior pages, plus the cover if a photo goes there
    return (fmt.fixed - 2) + (useCoverPhoto and 1 or 0)
  end
  return math.huge
end

--[[--
Build a ZineIt v3 project table.

opts = {
  name            = 'Kibera Stories',
  format          = 'mini-zine',
  margin          = 0.25,
  coverPhoto      = true,          -- place the first photo on the front cover
  titleOnCover    = true,          -- add a Bebas Neue title block to the cover
  photos          = {              -- in the order they should appear
    { assetId='a1', name='DSC_001.jpg', w=6000, h=4000, caption='Nairobi, 2026' },
    ...
  },
}

Returns project, info  where info = { placed=, skipped=, pages= }
--]]
function Project.build(opts)
  local formatKey = opts.format or 'mini-zine'
  local fmt = Project.FORMATS[formatKey]
  if not fmt then error('unknown ZineIt format: ' .. tostring(formatKey)) end

  local margin = opts.margin or 0.25
  local photos = opts.photos or {}
  local useCover = opts.coverPhoto and #photos > 0

  local capacity = Project.capacity(formatKey, useCover)
  local placeable = math.min(#photos, capacity)

  -- page count: fixed formats are locked; books grow to fit
  local interiorNeeded = placeable - (useCover and 1 or 0)
  local pageCount
  if fmt.fixed then
    pageCount = fmt.fixed
  else
    pageCount = math.max(2, interiorNeeded + 2)          -- + front and back covers
  end

  local pages = Json.array{}
  pages[1] = blankPage('Front cover')
  for i = 2, pageCount - 1 do
    pages[i] = blankPage('Page ' .. i)
  end
  pages[pageCount] = blankPage('Back cover')

  local assets = {}
  local placedCount = 0

  local function place(photo, pageIdx)
    local caption = photo.caption
    if caption == '' then caption = nil end
    local box = Project.frameFor(fmt, margin, photo.w, photo.h, caption ~= nil)
    local page = pages[pageIdx]

    assets[photo.assetId] = {
      name = photo.name or 'photo',
      w = photo.w or 1000,
      h = photo.h or 1000,
      thumb = photo.thumb or '',    -- ZineIt regenerates thumbnails on restore
    }
    page.elements[#page.elements + 1] = imageElement(photo.assetId, box)

    if caption then
      page.elements[#page.elements + 1] = textElement(caption, {
        role = 'caption', size = 8.5,
        x = margin, y = fmt.h - margin - CAPTION_H + 0.04,
        w = fmt.w - 2 * margin, h = CAPTION_H - 0.04,
      })
    end
    placedCount = placedCount + 1
  end

  local nextPhoto = 1
  if useCover then
    place(photos[1], 1)
    nextPhoto = 2
  end
  if opts.titleOnCover and opts.name and opts.name ~= '' then
    local cover = pages[1]
    cover.elements[#cover.elements + 1] = textElement(opts.name, {
      role = 'title', font = 'Bebas Neue', size = 22, align = 'center', weight = '400',
      x = margin, y = fmt.h * 0.34, w = fmt.w - 2 * margin, h = 1.0,
    })
  end

  local pageIdx = 2
  while nextPhoto <= placeable and pageIdx <= pageCount - 1 do
    place(photos[nextPhoto], pageIdx)
    nextPhoto = nextPhoto + 1
    pageIdx = pageIdx + 1
  end

  local now = opts.timestamp or '1970-01-01T00:00:00.000Z'
  local project = {
    app = 'ZineIt',
    ver = 3,
    meta = { name = opts.name or 'Untitled project', created = now, modified = now },
    format = formatKey,
    pages = pages,
    assets = assets,
    settings = Project.defaultSettings(margin),
  }

  return project, {
    placed  = placedCount,
    skipped = #photos - placedCount,
    pages   = pageCount,
  }
end

--[[--
Write a .bak, streaming photo data so peak memory stays at one photo.

A .bak is the project JSON plus an `assetData` map of base64 data URLs. Building
that as one Lua string would mean holding every photo in memory at once; instead
the project is encoded without assetData, the closing brace is trimmed, and each
photo is appended and released.

  writeBak(path, project, assetFiles, readFileFn, base64Fn)
    assetFiles = { { assetId=, path=, mime= }, ... }

Returns true, or nil plus an error message.
--]]
function Project.writeBak(path, project, assetFiles, readFileFn, base64Fn)
  local head = Json.encode(project)
  if string.sub(head, -1) ~= '}' then return nil, 'internal: malformed project JSON' end

  local f, err = io.open(path, 'wb')
  if not f then return nil, err or ('cannot write to ' .. tostring(path)) end

  local ok, writeErr = pcall(function()
    f:write(string.sub(head, 1, -2))          -- drop the closing brace
    f:write(',"assetData":{')
    for i = 1, #assetFiles do
      local a = assetFiles[i]
      local bytes = readFileFn(a.path)
      if not bytes or bytes == '' then error('could not read rendered photo: ' .. tostring(a.path)) end
      local b64 = base64Fn(bytes)
      bytes = nil                              -- release before the next photo
      if i > 1 then f:write(',') end
      f:write('"', Json.escape(a.assetId), '":{"full":"data:', a.mime or 'image/jpeg',
              ';base64,', b64, '","preview":null}')
      b64 = nil
    end
    f:write('}}')
  end)

  f:close()
  if not ok then
    os.remove(path)
    return nil, tostring(writeErr)
  end
  return true
end

return Project
