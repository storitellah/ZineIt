--[[----------------------------------------------------------------------------
ZineIt by Storitellah — Lightroom Classic plug-in
Bridges the Lightroom catalogue into ZineIt: select photos, pick a zine or
photobook format, and this plug-in renders them with your develop settings,
carries your captions across, and builds a ready-to-lay-out ZineIt project.

The layout editor itself lives in ZineIt (a browser tool) — the Lightroom SDK
has no canvas or drag-and-drop surface to host it.
------------------------------------------------------------------------------]]

return {

  LrSdkVersion = 10.0,
  LrSdkMinimumVersion = 6.0,          -- Lightroom Classic 6 / CC 2015 and newer

  LrToolkitIdentifier = 'com.storitellah.zineit',
  LrPluginName = 'ZineIt by Storitellah',
  LrPluginInfoUrl = 'https://github.com/storitellah/zineit',

  LrPluginInfoProvider = 'ZineItInfoProvider.lua',

  LrExportServiceProvider = {
    title = 'ZineIt zine / photobook',
    file  = 'ZineItExportServiceProvider.lua',
  },

  LrLibraryMenuItems = {
    { title = 'Open ZineIt…',                file = 'ZineItMenuOpen.lua' },
    { title = 'Report a ZineIt bug or idea…', file = 'ZineItMenuFeedback.lua' },
  },

  VERSION = { major = 1, minor = 0, revision = 0, build = 1 },

}
