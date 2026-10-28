import type { SessionMessageAssistantTool, SessionMessageInfo } from "@contextcode/client/promise"
import { getFilename } from "@contextcode/util/path"

export type AgentActivityKind =
  | "thinking"
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
  /** What the action is on: a file name, a command, a query. */
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
  const since = messages[start]?.time.created ?? turn[0]?.time.created
  const last = parts.at(-1)

  if (!last) return { kind: "thinking", since, actions }

  if (last.type === "reasoning") return { kind: "thinking", since, actions }

  if (last.type === "text") return { kind: "responding", since, actions }

  // A finished call means the model is deciding what to do next.
  if (last.state.status !== "streaming" && last.state.status !== "running") return { kind: "thinking", since, actions }

  return { ...describe(last), since, actions }
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
