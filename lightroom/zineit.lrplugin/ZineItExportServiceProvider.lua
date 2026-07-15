--[[----------------------------------------------------------------------------
ZineIt export service — File ▸ Export ▸ Export To: ZineIt zine / photobook

Renders the selected photos with their develop settings applied, carries the
catalogue's captions/titles across, assembles a ZineIt project (.bak), and
offers to open ZineIt with it.
------------------------------------------------------------------------------]]

local LrView       = import 'LrView'
local LrDialogs    = import 'LrDialogs'
local LrPathUtils  = import 'LrPathUtils'
local LrFileUtils  = import 'LrFileUtils'
local LrStringUtils = import 'LrStringUtils'
local LrHttp       = import 'LrHttp'
local LrShell      = import 'LrShell'
local LrDate       = import 'LrDate'
local LrTasks      = import 'LrTasks'

local Project = require 'ZineItProject'
local Info    = require 'ZineItInfoProvider'

local bind = LrView.bind

local exportServiceProvider = {}

exportServiceProvider.supportsIncrementalPublish = false
exportServiceProvider.exportPresetFields = {
  { key = 'zineFormat',   default = 'mini-zine' },
  { key = 'zineName',     default = '' },
  { key = 'zineMargin',   default = '0.25' },
  { key = 'coverPhoto',   default = true },
  { key = 'titleOnCover', default = true },
  { key = 'captionFrom',  default = 'caption' },
  { key = 'destFolder',   default = '' },
  { key = 'openAfter',    default = true },
  { key = 'zineUrl',      default = 'https://zineit.pages.dev/' },
}

-- Our own sizing/format decisions; the rest of the standard panels stay hidden
-- so nobody can accidentally export a 200 px PNG into a print zine.
exportServiceProvider.hideSections = { 'exportLocation', 'fileNaming', 'video', 'watermarking' }
exportServiceProvider.allowFileFormats = { 'JPEG' }
exportServiceProvider.allowColorSpaces = { 'sRGB' }
exportServiceProvider.hidePrintResolution = false
exportServiceProvider.canExportVideo = false

local CAPTION_SOURCES = {
  { title = 'No captions',            value = 'none' },
  { title = 'Caption (IPTC)',         value = 'caption' },
  { title = 'Title (IPTC)',           value = 'title' },
  { title = 'Headline (IPTC)',        value = 'headline' },
  { title = 'File name',              value = 'filename' },
}

function exportServiceProvider.sectionsForTopOfDialog(f, propertyTable)
  local formatItems = {}
  for i, key in ipairs(Project.FORMAT_ORDER) do
    formatItems[i] = { title = Project.FORMATS[key].label, value = key }
  end

  return {
    {
      title = 'ZineIt project',
      f:row {
        f:static_text { title = 'Format:', width = LrView.share 'zi_label' },
        f:popup_menu { value = bind 'zineFormat', items = formatItems, fill_horizontal = 1 },
      },
      f:row {
        f:static_text { title = 'Zine title:', width = LrView.share 'zi_label' },
        f:edit_field { value = bind 'zineName', fill_horizontal = 1,
                       placeholder_string = 'Untitled project', immediate = true },
      },
      f:row {
        f:static_text { title = 'Margin:', width = LrView.share 'zi_label' },
        f:popup_menu { value = bind 'zineMargin', items = {
          { title = '1/8 in', value = '0.125' }, { title = '1/4 in', value = '0.25' },
          { title = '3/8 in', value = '0.375' }, { title = '1/2 in', value = '0.5' },
        } },
      },
      f:row {
        f:static_text { title = 'Captions from:', width = LrView.share 'zi_label' },
        f:popup_menu { value = bind 'captionFrom', items = CAPTION_SOURCES, fill_horizontal = 1 },
      },
      f:row {
        f:static_text { title = '', width = LrView.share 'zi_label' },
        f:checkbox { value = bind 'coverPhoto', title = 'Put the first photo on the front cover' },
      },
      f:row {
        f:static_text { title = '', width = LrView.share 'zi_label' },
        f:checkbox { value = bind 'titleOnCover', title = 'Add the title to the front cover' },
      },
      f:static_text {
        title = 'Photos are placed one per page, in the order they are selected,\nat their true proportions — nothing is ever stretched.',
        text_color = import 'LrColor'(0.5, 0.5, 0.5), height_in_lines = 2,
      },
    },
    {
      title = 'Project file',
      f:row {
        f:static_text { title = 'Save .bak to:', width = LrView.share 'zi_label' },
        f:edit_field { value = bind 'destFolder', fill_horizontal = 1, immediate = true,
                       placeholder_string = 'Choose a folder…' },
        f:push_button { title = 'Choose…', action = function()
          local r = LrDialogs.runOpenPanel {
            title = 'Where should the ZineIt project be saved?',
            canChooseFiles = false, canChooseDirectories = true, allowsMultipleSelection = false,
          }
          if r and r[1] then propertyTable.destFolder = r[1] end
        end },
      },
      f:row {
        f:static_text { title = 'ZineIt:', width = LrView.share 'zi_label' },
        f:edit_field { value = bind 'zineUrl', fill_horizontal = 1, immediate = true },
      },
      f:row {
        f:static_text { title = '', width = LrView.share 'zi_label' },
        f:checkbox { value = bind 'openAfter', title = 'Open ZineIt when the project is ready' },
      },
      f:static_text {
        title = 'In ZineIt choose “Restore from .bak” and pick the file this creates.\nYour photos travel inside it — nothing is uploaded anywhere.',
        text_color = import 'LrColor'(0.5, 0.5, 0.5), height_in_lines = 2,
      },
    },
  }
end

--- Guard against a misconfigured export before any rendering happens.
function exportServiceProvider.updateExportSettings(exportSettings)
  exportSettings.LR_format = 'JPEG'
  exportSettings.LR_export_colorSpace = 'sRGB'
  if not exportSettings.LR_size_doConstrain then
    -- A sensible print default: 2400 px long edge ≈ 8 in at 300 ppi.
    exportSettings.LR_size_doConstrain = true
    exportSettings.LR_size_maxWidth = 2400
    exportSettings.LR_size_maxHeight = 2400
    exportSettings.LR_size_units = 'pixels'
  end
end

local function captionFor(photo, source)
  if source == 'none' then return nil end
  local ok, value
  if source == 'filename' then
    ok, value = pcall(function() return photo:getFormattedMetadata('fileName') end)
  else
    ok, value = pcall(function() return photo:getFormattedMetadata(source) end)
  end
  if ok and value and value ~= '' then return value end
  return nil
end

local function dimensionsFor(photo)
  local ok, dims = pcall(function() return photo:getRawMetadata('croppedDimensions') end)
  if ok and dims and dims.width and dims.height and dims.width > 0 and dims.height > 0 then
    return dims.width, dims.height
  end
  return 1000, 1000
end

function exportServiceProvider.processRenderedPhotos(functionContext, exportContext)
  local props = exportContext.propertyTable
  local exportSession = exportContext.exportSession
  local nPhotos = exportSession:countRenditions()

  if nPhotos == 0 then
    LrDialogs.message('ZineIt', 'Select some photos first.', 'info')
    return
  end

  local destFolder = props.destFolder
  if not destFolder or destFolder == '' or not LrFileUtils.exists(destFolder) then
    LrDialogs.message('ZineIt', 'Choose a folder to save the ZineIt project into, then export again.', 'critical')
    return
  end

  local formatKey = props.zineFormat or 'mini-zine'
  local useCover = props.coverPhoto and true or false
  local capacity = Project.capacity(formatKey, useCover)
  if capacity ~= math.huge and nPhotos > capacity then
    local proceed = LrDialogs.confirm(
      'More photos than pages',
      string.format('%s holds %d photos. You selected %d — the extra %d will be left out.\n\nCarry on?',
        Project.FORMATS[formatKey].label, capacity, nPhotos, nPhotos - capacity),
      'Carry on', 'Cancel')
    if proceed ~= 'ok' then return end
  end

  local progress = exportContext:configureProgress {
    title = nPhotos > 1 and string.format('Building your ZineIt project from %d photos', nPhotos)
                         or 'Building your ZineIt project',
  }

  Project.resetIds()
  local photos, assetFiles = {}, {}
  local failures = {}

  for i, rendition in exportContext:renditions { stopIfCanceled = true } do
    local success, pathOrMessage = rendition:waitForRender()
    if progress:isCanceled() then return end
    if success then
      local photo = rendition.photo
      local w, h = dimensionsFor(photo)
      local assetId = string.format('lra%d', i)
      photos[#photos + 1] = {
        assetId = assetId,
        name    = LrPathUtils.leafName(pathOrMessage),
        w = w, h = h,
        caption = captionFor(photo, props.captionFrom),
      }
      assetFiles[#assetFiles + 1] = { assetId = assetId, path = pathOrMessage, mime = 'image/jpeg' }
    else
      failures[#failures + 1] = tostring(pathOrMessage)
    end
  end

  if #photos == 0 then
    LrDialogs.message('ZineIt', 'None of the photos could be rendered.\n\n' ..
      table.concat(failures, '\n'), 'critical')
    return
  end

  local name = props.zineName
  if not name or name == '' then name = 'Untitled project' end

  local project, info = Project.build {
    name         = name,
    format       = formatKey,
    margin       = tonumber(props.zineMargin) or 0.25,
    coverPhoto   = useCover,
    titleOnCover = props.titleOnCover and true or false,
    photos       = photos,
    timestamp    = LrDate.timeToW3CDate(LrDate.currentTime()),
  }

  -- keep only the photos that actually landed on a page
  local placedIds = {}
  for id in pairs(project.assets) do placedIds[id] = true end
  local usedFiles = {}
  for _, a in ipairs(assetFiles) do
    if placedIds[a.assetId] then usedFiles[#usedFiles + 1] = a end
  end

  local safeName = string.gsub(name, '[^%w%- ]', '')
  safeName = string.gsub(safeName, '%s+', '-')
  if safeName == '' then safeName = 'zineit' end
  local bakPath = LrPathUtils.child(destFolder, safeName .. '_' .. os.date('%Y%m%d-%H%M') .. '.bak')

  local ok, err = Project.writeBak(bakPath, project, usedFiles,
    function(p) return LrFileUtils.readFile(p) end,
    function(bytes) return LrStringUtils.encodeBase64(bytes) end)

  if not ok then
    LrDialogs.message('ZineIt', 'The project file could not be written.\n\n' .. tostring(err), 'critical')
    return
  end

  -- rendered JPEGs live in Lightroom's temp area; the .bak now carries the photos
  for _, a in ipairs(assetFiles) do pcall(function() LrFileUtils.delete(a.path) end) end

  local summary = string.format('%d photo%s placed across %d pages.',
    info.placed, info.placed == 1 and '' or 's', info.pages)
  if info.skipped > 0 then
    summary = summary .. string.format('\n%d photo%s left out — the format ran out of pages.',
      info.skipped, info.skipped == 1 and ' was' or 's were')
  end
  if #failures > 0 then
    summary = summary .. string.format('\n%d photo%s could not be rendered.',
      #failures, #failures == 1 and '' or 's')
  end

  if props.openAfter then
    local action = LrDialogs.confirm('Your ZineIt project is ready',
      summary .. '\n\nZineIt will open in your browser. Choose “Restore from .bak” and pick:\n' ..
      LrPathUtils.leafName(bakPath),
      'Open ZineIt', 'Just show the file')
    if action == 'ok' then
      LrHttp.openUrlInBrowser(props.zineUrl or Info.ZINEIT_URL)
    end
    pcall(function() LrShell.revealInShell(bakPath) end)
  else
    LrDialogs.message('Your ZineIt project is ready', summary .. '\n\nSaved as:\n' .. bakPath, 'info')
  end
end

return exportServiceProvider
