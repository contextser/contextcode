import path from "node:path"
import { CONTEXTCODE_CHANNEL } from "./version"

export function databasePath(data: string) {
  const filename =
    process.env.CONTEXTCODE_DB ??
    (["latest", "dev", "beta", "next", "prod"].includes(CONTEXTCODE_CHANNEL) ||
    process.env.CONTEXTCODE_DISABLE_CHANNEL_DB === "1" ||
    process.env.CONTEXTCODE_DISABLE_CHANNEL_DB === "true"
      ? "contextcode.db"
      : `contextcode-${CONTEXTCODE_CHANNEL.replace(/[^a-zA-Z0-9._-]/g, "-")}.db`)
  return filename === ":memory:" ? filename : path.resolve(data, filename)
}
