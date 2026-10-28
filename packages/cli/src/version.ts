import { Option, Schema } from "effect"

declare const CONTEXTCODE_VERSION: string
declare const CONTEXTCODE_CHANNEL: string
declare const CONTEXTCODE_ARTIFACT: string
declare const CONTEXTCODE_RELEASE_HIGHLIGHTS: string

const version = typeof CONTEXTCODE_VERSION === "string" ? CONTEXTCODE_VERSION : "local"
const channel = typeof CONTEXTCODE_CHANNEL === "string" ? CONTEXTCODE_CHANNEL : "local"
const artifact = typeof CONTEXTCODE_ARTIFACT === "string" ? CONTEXTCODE_ARTIFACT : "cli"
// Stable release builds embed the release notes' Highlights; every other build has none.
const highlights =
  typeof CONTEXTCODE_RELEASE_HIGHLIGHTS === "string"
    ? Option.getOrElse(
        Schema.decodeUnknownOption(
          Schema.fromJsonString(Schema.Array(Schema.Struct({ title: Schema.String, body: Schema.String }))),
        )(CONTEXTCODE_RELEASE_HIGHLIGHTS),
        () => [],
      )
    : []

export {
  version as CONTEXTCODE_VERSION,
  channel as CONTEXTCODE_CHANNEL,
  artifact as CONTEXTCODE_ARTIFACT,
  highlights as CONTEXTCODE_HIGHLIGHTS,
}
export const CONTEXTCODE_LOCAL = channel === "local"
