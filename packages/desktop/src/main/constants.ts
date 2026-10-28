import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.CONTEXTCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.CONTEXTCODE_VERSION ?? app.getVersion())

const appNames: Record<string, string> = {
  dev: "Context Code Dev",
  beta: "Context Code Beta",
  prod: "Context Code",
}

const appIDs: Record<string, string> = {
  dev: "ai.contextcode.desktop.dev",
  beta: "ai.contextcode.desktop.beta",
  prod: "ai.contextcode.desktop",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "Context Code Dev"

export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "ai.contextcode.desktop.dev"
