import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@contextcode/client/promise"
import { agentActivity } from "./agent-activity"

const user = (created: number) => ({ type: "user", id: `user_${created}`, time: { created } }) as SessionMessageInfo
const assistant = (content: unknown[]) =>
  ({ type: "assistant", id: "assistant", time: { created: 2 }, content }) as SessionMessageInfo
const tool = (name: string, status: string, input: unknown) => ({
  type: "tool",
  id: name,
  name,
  time: { created: 0 },
  state: { status, input },
})

describe("agentActivity", () => {
  test("names the running call and what it works on", () => {
    expect(
      agentActivity([
        user(1),
        assistant([
          tool("read", "completed", { path: "a.ts" }),
          tool("edit", "running", { path: "src/ui/button.tsx" }),
        ]),
      ]),
    ).toEqual({ kind: "editing", target: "button.tsx", since: 1, actions: 2 })
  })

  test("shortens a long shell command to its first line", () => {
    const command = `pnpm run build --filter ${"x".repeat(60)}\necho done`

    expect(agentActivity([user(1), assistant([tool("shell", "running", { command })])]).target).toBe(
      `pnpm run build --filter ${"x".repeat(23)}…`,
    )
  })

  test("reads as thinking between calls and while reasoning, and counts only this turn", () => {
    expect(agentActivity([user(1), assistant([tool("read", "completed", {})]), user(5), assistant([])])).toEqual({
      kind: "thinking",
      since: 5,
      actions: 0,
    })
    expect(agentActivity([user(1), assistant([{ type: "reasoning", text: "…" }])]).kind).toBe("thinking")
    expect(agentActivity([user(1), assistant([{ type: "text", text: "Done." }])]).kind).toBe("responding")
  })
})
