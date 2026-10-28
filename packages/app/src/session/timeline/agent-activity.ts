import type { SessionMessageAssistantTool, SessionMessageInfo } from "@contextcode/client/promise"
import { getFilename } from "@contextcode/util/path"

export type AgentActivityKind =
  | "understanding"
  | "thinking"
  | "reviewing"
  | "responding"
  | "reading"
  | "searching"
  | "writing"
  | "editing"
  | "running"
  | "fetching"
  | "delegating"
  | "using"
  | "working"

export type AgentActivity = {
  kind: AgentActivityKind
  /** What the action is on: a file name, a command, a query, the prompt, or the thought the model is on. */
  target?: string
  /** When the current turn began, for the elapsed timer. */
  since?: number
  /** Tool calls made so far in this turn. */
  actions: number
}

/** What the agent is doing right now, read from the latest turn of a session's messages. */
export function agentActivity(messages: readonly SessionMessageInfo[]): AgentActivity {
  const start = messages.findLastIndex((message) => message.type === "user")
  const turn = messages.slice(start + 1).flatMap((message) => (message.type === "assistant" ? [message] : []))
  const parts = turn.flatMap((message) => message.content)
  const actions = parts.filter((part) => part.type === "tool").length
  const prompt = messages[start]
  const since = prompt?.time.created ?? turn[0]?.time.created
  const last = parts.at(-1)

  // Nothing back yet: the model is still taking in the request.
  if (!last)
    return { kind: "understanding", target: clip(prompt?.type === "user" ? prompt.text : undefined), since, actions }

  if (last.type === "reasoning") return { kind: "thinking", target: thought(last.text), since, actions }

  if (last.type === "text") return { kind: "responding", since, actions }

  // A finished call means the model is looking at what it returned before deciding what to do next.
  if (last.state.status !== "streaming" && last.state.status !== "running")
    return { kind: "reviewing", target: describe(last).target, since, actions }

  return { ...describe(last), since, actions }
}

/**
 * The thought the model is on, from its streaming reasoning: the latest heading it wrote, or else its latest finished
 * sentence. A sentence still arriving is left out so the line changes once per thought, not once per token.
 */
function thought(text: string) {
  const headings = [...text.matchAll(/^\s*(?:#{1,4}\s+(.+)|\*\*(.+?)\*\*)\s*$/gm)]
  const heading = headings.at(-1)

  if (heading) return clip(heading[1] ?? heading[2])
  const sentences = text.split(/(?<=[.!?।])\s+|\n+/).filter((sentence) => sentence.trim())
  const finished = /[.!?।]\s*$|\n\s*$/.test(text) ? sentences : sentences.slice(0, -1)

  return clip(finished.at(-1))
}

function clip(text: string | undefined) {
  const line = text
    ?.replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!line) return

  return line.length > 64 ? `${line.slice(0, 63).trimEnd()}…` : line
}

function describe(tool: SessionMessageAssistantTool): Pick<AgentActivity, "kind" | "target"> {
  const input = tool.state.status === "streaming" ? {} : tool.state.input
  const text = (key: string) => (typeof input[key] === "string" ? input[key] : undefined)
  const file = () => {
    const path = text("path") ?? text("filePath")

    return path ? getFilename(path) : undefined
  }

  switch (tool.name) {
    case "read":
      return { kind: "reading", target: file() }
    case "glob":
    case "grep":
    case "list":
      return { kind: "searching", target: text("pattern") ?? text("query") ?? file() }
    case "write":
      return { kind: "writing", target: file() }
    case "edit":
      return { kind: "editing", target: file() }
    case "patch": {
      const files = [...(text("patchText") ?? "").matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)]
      const path = files.at(-1)?.[1]?.trim()

      return { kind: "editing", target: path ? getFilename(path) : undefined }
    }
    case "shell":
    case "execute":
      return { kind: "running", target: shorten(text("command") ?? text("code")) }
    case "webfetch":
      return { kind: "fetching", target: host(text("url")) }
    case "websearch":
      return { kind: "searching", target: text("query") }
    case "subagent":
      return { kind: "delegating", target: text("description") }
    default:
      return { kind: "using", target: tool.name }
  }
}

function shorten(command: string | undefined) {
  const line = command?.split("\n")[0]?.trim()

  if (!line) return

  return line.length > 48 ? `${line.slice(0, 47)}…` : line
}

function host(url: string | undefined) {
  if (!url || !URL.canParse(url)) return url

  return new URL(url).host
}
