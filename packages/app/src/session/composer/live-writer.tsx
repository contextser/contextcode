import { createEffect, createMemo, createSignal, onCleanup, Show, untrack } from "solid-js"
import type { SessionMessageAssistantTool, SessionMessageInfo } from "@contextcode/client/promise"
import { LiveCodeWriter } from "@contextcode/session-ui/live-code-writer"

const fileTools = new Set(["write", "edit", "patch"])

/**
 * Floats the file the agent is writing above the composer and types it out, one call after another in a single card.
 * Calls already in the session when it opens have been seen, so only work that happens while the session is open plays.
 * The preview runs beside the agent, never in its way: the agent keeps working while files queue here.
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
  const queue = createMemo(() => calls().filter((call) => !played().has(call.id)))

  // The card stays up from the first queued file until a short exit after the last, so files swap inside it.
  const [shown, setShown] = createSignal<SessionMessageAssistantTool>()
  const [leaving, setLeaving] = createSignal(false)

  createEffect(() => {
    const next = queue()[0]

    if (next) {
      setLeaving(false)
      setShown(next)
      return
    }

    if (!untrack(shown)) return
    setLeaving(true)
    const timer = setTimeout(() => {
      setShown(undefined)
      setLeaving(false)
    }, 240)
    onCleanup(() => clearTimeout(timer))
  })

  return (
    <Show when={shown()}>
      <div
        data-slot="live-code-float"
        data-leaving={leaving() ? "" : undefined}
        class="pointer-events-auto absolute inset-x-0 bottom-full z-[80] mb-3"
      >
        <Show when={shown()} keyed>
          {(call) => (
            <LiveCodeWriter
              tool={call}
              floating
              backlog={Math.max(0, queue().length - 1)}
              onDone={() => setPlayed((previous) => new Set([...previous, call.id]))}
            />
          )}
        </Show>
      </div>
    </Show>
  )
}
