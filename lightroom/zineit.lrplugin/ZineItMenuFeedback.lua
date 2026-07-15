-- Library ▸ Plug-in Extras ▸ Report a ZineIt bug or idea…
local LrHttp        = import 'LrHttp'
local LrTasks       = import 'LrTasks'
local LrApplication = import 'LrApplication'
local Info          = require 'ZineItInfoProvider'

LrTasks.startAsyncTask(function()
  local context = ''
  local ok, version = pcall(function() return LrApplication.versionString() end)
  if ok and version then context = 'Lightroom ' .. version end
  LrHttp.openUrlInBrowser(Info.feedbackUrl(context))
end)
