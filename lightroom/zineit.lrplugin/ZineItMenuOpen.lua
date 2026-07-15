-- Library ▸ Plug-in Extras ▸ Open ZineIt…
local LrHttp  = import 'LrHttp'
local LrTasks = import 'LrTasks'
local Info    = require 'ZineItInfoProvider'

LrTasks.startAsyncTask(function()
  LrHttp.openUrlInBrowser(Info.ZINEIT_URL)
end)
