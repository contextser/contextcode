import { expect, test } from "bun:test"
import { selectTheme, selectThemeMode, supportsThemeMode, themeModes } from "@contextcode/theme/tui"
import { getContextCodeTheme } from "../../../src/theme"

test("selects complete light and dark themes independently", () => {
  const light = selectTheme(getContextCodeTheme(), "light")
  const dark = selectTheme(getContextCodeTheme(), "dark")
  expect(selectTheme(getContextCodeTheme())).toEqual(light)
  expect(light.hue).toEqual(getContextCodeTheme().light.hue)
  expect(dark.text).toEqual(getContextCodeTheme().base.text)
  expect(dark.hue).toEqual(getContextCodeTheme().dark.hue)
  expect(selectThemeMode(getContextCodeTheme(), "dark")).toEqual({ theme: dark, mode: "dark" })
})

test("selects the available mode when the requested mode is missing", () => {
  const lightOnly = { base: getContextCodeTheme().base, light: getContextCodeTheme().light } as const
  const darkOnly = { base: getContextCodeTheme().base, dark: getContextCodeTheme().dark } as const

  expect(themeModes(lightOnly)).toEqual(["light"])
  expect(themeModes(darkOnly)).toEqual(["dark"])
  expect(supportsThemeMode(lightOnly, "light")).toBeTrue()
  expect(supportsThemeMode(lightOnly, "dark")).toBeFalse()
  expect(selectThemeMode(lightOnly, "dark")).toEqual({ theme: selectTheme(getContextCodeTheme(), "light"), mode: "light" })
  expect(selectThemeMode(darkOnly, "light")).toEqual({ theme: selectTheme(getContextCodeTheme(), "dark"), mode: "dark" })
})
