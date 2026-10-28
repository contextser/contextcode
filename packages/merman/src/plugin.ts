import { Plugin } from "@contextcode/plugin/tui"
import { createMermaidCodeBlockRenderer } from "./markdown.js"
import { resolveContextCodeDiagramPalette } from "./palette.js"

export default Plugin.define({
  id: "contextcode.merman",
  setup(context) {
    context.markdown.registerCodeBlockRenderer(
      "mermaid",
      createMermaidCodeBlockRenderer(context.renderer, () => ({
        colors: resolveContextCodeDiagramPalette(context.theme, context.themeMode),
      })),
    )
  },
})
