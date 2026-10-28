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

  test("reads the request back before anything arrives, and counts only this turn", () => {
    const prompt = { ...user(5), text: "Make the **header** sticky\nand add a progress bar" } as SessionMessageInfo

    expect(agentActivity([user(1), assistant([tool("read", "completed", {})]), prompt, assistant([])])).toEqual({
      kind: "understanding",
      target: "Make the header sticky and add a progress bar",
      since: 5,
      actions: 0,
    })
    expect(agentActivity([user(1), assistant([{ type: "text", text: "Done." }])]).kind).toBe("responding")
  })

  test("names the thought the model is on: its latest heading, else its latest finished sentence", () => {
    const thinking = (text: string) => agentActivity([user(1), assistant([{ type: "reasoning", text }])]).target

    expect(thinking("**Planning the layout**\nFirst I check the header. Then the gr")).toBe("Planning the layout")
    expect(thinking("I need the header file. Then I check the grid")).toBe("I need the header file.")
    expect(thinking("I need the header file. Then I check the grid.")).toBe("Then I check the grid.")
    expect(thinking("Thinking about")).toBeUndefined()
  })

  test("reviews what a finished call returned before the next step", () => {
    expect(
      agentActivity([user(1), assistant([tool("read", "completed", { path: "src/site-header.tsx" })])]),
    ).toMatchObject({ kind: "reviewing", target: "site-header.tsx", actions: 1 })
  })
})
