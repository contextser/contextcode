import { createMemo, createSignal, Show, untrack } from "solid-js"
import type { SessionMessageAssistantTool, SessionMessageInfo } from "@contextcode/client/promise"
import { LiveCodeWriter } from "@contextcode/session-ui/live-code-writer"

const fileTools = new Set(["write", "edit", "patch"])

/**
 * Floats the file the agent is writing above the composer and types it out, one call after another. Calls already in
 * the session when it opens have been seen, so only work that happens while the session is open plays.
 */
export function SessionLiveWriter(props: { messages: readonly SessionMessageInfo[] }) {
  // Only the latest turns can hold calls that have not played yet.
  const calls = () =>
    props.messages
      .slice(-4)
      .flatMap((message) => (message.type === "assistant" ? message.content : []))
      .filter(
        (part): part is SessionMessageAssistantTool =>
          part.type === "tool" && fileTools.has(part.name) && part.state.status !== "error",
      )
  const [played, setPlayed] = createSignal<ReadonlySet<string>>(new Set(untrack(calls).map((call) => call.id)))
  const current = createMemo(() => calls().find((call) => !played().has(call.id)))

  return (
    <Show when={current()} keyed>
      {(call) => (
        <div class="pointer-events-auto absolute inset-x-0 bottom-full z-[80] mb-3">
          <LiveCodeWriter
            tool={call}
            floating
            onDone={() => setPlayed((previous) => new Set([...previous, call.id]))}
          />
        </div>
      )}
    </Show>
  )
}
