import type { SessionMessageInfo } from "@contextcode/client/promise"
import { createSignal, onCleanup, onMount } from "solid-js"
import { LanguageProvider } from "@/runtime/i18n/language"
import { AgentStatus } from "./agent-status"

export default {
  title: "Context Code/Session/Agent status",
  id: "agent-status",
  component: AgentStatus,
}

const steps = [
  { type: "reasoning", text: "Planning" },
  { name: "read", input: { path: "src/components/ui/button.tsx" } },
  { name: "grep", input: { pattern: "rounded-lg" } },
  { name: "edit", input: { path: "src/components/ui/button.tsx" } },
  { name: "shell", input: { command: "pnpm run build && pnpm run lint" } },
  { name: "write", input: { path: "src/components/logo.tsx" } },
  { name: "webfetch", input: { url: "https://ui.shadcn.com/docs/components/button" } },
  { type: "text", text: "Done" },
]

/** Walks through a turn's steps every couple of seconds, the way a live session moves. */
export const Turn = {
  render: () => {
    const [index, setIndex] = createSignal(0)
    const since = Date.now()
    const messages = () => {
      const content = steps.slice(0, index() + 1).map((step, position) =>
        "name" in step
          ? {
              type: "tool",
              id: `call_${position}`,
              name: step.name,
              time: { created: since },
              state: { status: position === index() ? "running" : "completed", input: step.input },
            }
          : step,
      )

      return [
        { type: "user", id: "user", time: { created: since } },
        { type: "assistant", id: "assistant", time: { created: since }, content },
      ] as SessionMessageInfo[]
    }

    onMount(() => {
      const timer = setInterval(() => setIndex((value) => (value + 1) % steps.length), 2200)
      onCleanup(() => clearInterval(timer))
    })

    return (
      <LanguageProvider locale="en">
        <section style={{ padding: "32px", "max-width": "760px" }}>
          <AgentStatus messages={messages()} />
        </section>
      </LanguageProvider>
    )
  },
}
