import type { SessionMessageAssistantTool } from "@contextcode/client/promise"

export type LiveCode = {
  mode: "write" | "edit" | "patch"
  path: string
  code: string
}

/** The file a streaming write, edit or patch call is producing, read from its partial JSON input. */
export function liveCode(tool: SessionMessageAssistantTool): LiveCode | undefined {
  if (tool.state.status !== "streaming") return
  const input = partialStrings(tool.state.input)

  if (tool.name === "write") return { mode: "write", path: input.path ?? "", code: input.content ?? "" }

  if (tool.name === "edit") return { mode: "edit", path: input.path ?? "", code: input.newString ?? "" }

  if (tool.name !== "patch") return
  const patch = input.patchText ?? ""
  const files = [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)]

  return { mode: "patch", path: files.at(-1)?.[1]?.trim() ?? "", code: patch }
}

/**
 * The top-level string properties of a JSON object that may still be streaming. A property whose value is cut off
 * mid-string reports what has arrived so far, so a growing `content` can be shown as it is written.
 */
export function partialStrings(json: string) {
  const result: Record<string, string> = {}
  const start = json.indexOf("{")

  if (start === -1) return result
  let index = start + 1

  while (index < json.length) {
    index = skipSpace(json, index)

    if (json[index] === ",") {
      index++
      continue
    }

    if (json[index] !== '"') return result
    const key = readString(json, index + 1)

    if (!key.done) return result
    index = skipSpace(json, key.end)

    if (json[index] !== ":") return result
    index = skipSpace(json, index + 1)

    if (json[index] !== '"') {
      index = skipValue(json, index)
      continue
    }
    const value = readString(json, index + 1)
    result[key.value] = value.value

    if (!value.done) return result
    index = value.end
  }

  return result
}

function skipSpace(json: string, index: number) {
  while (index < json.length && /\s/.test(json[index]!)) index++

  return index
}

const escapes: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" }

// Reads a JSON string body starting after its opening quote; `done` is false when the input ends first.
function readString(json: string, from: number) {
  let value = ""
  let index = from

  while (index < json.length) {
    const char = json[index]!

    if (char === '"') return { value, end: index + 1, done: true }

    if (char !== "\\") {
      value += char
      index++
      continue
    }
    const next = json[index + 1]

    // A trailing backslash or a cut-off \u escape completes in a later delta.
    if (next === undefined) break

    if (next === "u") {
      const hex = json.slice(index + 2, index + 6)

      if (hex.length < 4) break
      value += String.fromCharCode(parseInt(hex, 16))
      index += 6
      continue
    }
    value += escapes[next] ?? next
    index += 2
  }

  return { value, end: index, done: false }
}

// Skips a non-string value (number, literal, object or array) up to the next top-level separator.
function skipValue(json: string, from: number) {
  let depth = 0
  let index = from

  while (index < json.length) {
    const char = json[index]!

    if (char === '"') {
      index = readString(json, index + 1).end
      continue
    }

    if (char === "{" || char === "[") depth++

    if (char === "}" || char === "]") {
      if (depth === 0) return index
      depth--
    }

    if (char === "," && depth === 0) return index
    index++
  }

  return index
}

export type CodeToken = { text: string; kind?: "comment" | "string" | "number" | "keyword" | "type" | "call" | "punct" }

const keywords = new Set(
  (
    "const let var function return if else for while do import export from class extends implements new async await " +
    "type interface enum public private protected static readonly def fn func package struct impl use mod pub match " +
    "try catch finally throw throws in of as default switch case break continue yield null undefined true false " +
    "None True False self this nil void lambda with pass raise elif except del global not and or is select where"
  ).split(" "),
)

const hashCommentFiles =
  /\.(py|sh|bash|zsh|rb|ya?ml|toml|r|pl|ex|exs|nix|conf|ini|env|dockerfile)$|(^|\/)(Dockerfile|Makefile)$/i

/** Splits one line into lightly classified tokens; good enough to color code while it is being typed. */
export function highlightLine(line: string, path: string): CodeToken[] {
  const hash = hashCommentFiles.test(path)
  const pattern =
    /(\/\/.*$|\/\*.*?(?:\*\/|$)|#.*$|"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?|\b\d[\w.]*\b|[A-Za-z_$][\w$]*|[{}()[\];,.:=<>+\-*/%!&|^?~@]+)/g
  const tokens: CodeToken[] = []
  let last = 0

  for (const match of line.matchAll(pattern)) {
    const text = match[0]
    const index = match.index

    if (index > last) tokens.push({ text: line.slice(last, index) })
    last = index + text.length

    if (text.startsWith("#") && !hash) {
      tokens.push({ text: "#", kind: "punct" })
      last = index + 1
      pattern.lastIndex = last
      continue
    }
    tokens.push({ text, kind: classify(text, line[last]) })
  }

  if (last < line.length) tokens.push({ text: line.slice(last) })

  return tokens
}

function classify(text: string, next: string | undefined): CodeToken["kind"] {
  if (text.startsWith("//") || text.startsWith("/*") || text.startsWith("#")) return "comment"

  if (/^["'`]/.test(text)) return "string"

  if (/^\d/.test(text)) return "number"

  if (keywords.has(text)) return "keyword"

  if (/^[A-Z][\w$]*$/.test(text)) return "type"

  if (/^[A-Za-z_$]/.test(text)) return next === "(" ? "call" : undefined

  return "punct"
}
