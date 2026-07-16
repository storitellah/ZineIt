--[[----------------------------------------------------------------------------
Plug-in Manager section: what this plug-in is, and how to report a problem.
------------------------------------------------------------------------------]]

local LrView  = import 'LrView'
local LrHttp  = import 'LrHttp'
local LrColor = import 'LrColor'

local Info = {}

Info.VERSION_STRING   = '1.0.0'
Info.FEEDBACK_EMAIL   = 'hello@storitellah.com'
Info.ZINEIT_URL       = 'https://zineit.pages.dev/'
Info.REPO_URL         = 'https://github.com/storitellah/zineit'

function Info.feedbackUrl(context)
  local subject = 'ZineIt Lightroom plug-in v' .. Info.VERSION_STRING .. ' — bug report / idea'
  local body = 'Hi Brian,\n\nWhat happened (or what I wish the plug-in did):\n\n\n'
    .. 'Steps to reproduce (for a bug):\n1.\n2.\n\n—\nZineIt Lightroom plug-in v'
    .. Info.VERSION_STRING .. (context and ('\n' .. context) or '')
  local function enc(s)
    return (string.gsub(s, '[^%w%-%._~ ]', function(c) return string.format('%%%02X', string.byte(c)) end):gsub(' ', '%%20'))
  end
  return 'mailto:' .. Info.FEEDBACK_EMAIL .. '?subject=' .. enc(subject) .. '&body=' .. enc(body)
end

function Info.sectionsForTopOfDialog(f, propertyTable)
  return {
    {
      title = 'ZineIt by Storitellah',
      f:static_text {
        title = 'Turn a Lightroom selection into a print-ready zine or photobook.\n\n'
             .. 'File ▸ Export ▸ Export To: “ZineIt zine / photobook”. Your photos are\n'
             .. 'rendered with their develop settings, your captions come across from the\n'
             .. 'catalogue, and a ZineIt project is built ready to lay out.\n\n'
             .. 'The layout editor runs in ZineIt itself — everything stays on your machine.',
        height_in_lines = 8,
      },
      f:row {
        f:push_button { title = 'Open ZineIt',
          action = function() LrHttp.openUrlInBrowser(Info.ZINEIT_URL) end },
        f:push_button { title = 'Report a bug or idea',
          action = function() LrHttp.openUrlInBrowser(Info.feedbackUrl()) end },
        f:push_button { title = 'Source code',
          action = function() LrHttp.openUrlInBrowser(Info.REPO_URL) end },
      },
      f:static_text {
        title = 'Plug-in v' .. Info.VERSION_STRING .. '  ·  feedback: ' .. Info.FEEDBACK_EMAIL,
        text_color = LrColor(0.5, 0.5, 0.5),
      },
    },
  }
end

return Info
