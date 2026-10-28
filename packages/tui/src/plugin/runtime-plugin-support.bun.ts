import { ensurePluginRuntime, provides } from "@contextcode/plugin/runtime"
import { Plugin, PluginContextProvider, usePlugin } from "@contextcode/plugin/tui"
import { ensureRuntimePluginSupport } from "@opentui/solid/runtime-plugin-support/configure"

ensurePluginRuntime()
ensureRuntimePluginSupport({
  additional: {
    "@contextcode/plugin/tui": { Plugin, PluginContextProvider, usePlugin },
  },
  preserve: provides,
})
