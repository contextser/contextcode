import { onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import type { SessionMessageAssistantTool } from "@contextcode/client/promise"
import { CurrentSessionProviders } from "../storybook/current-session-story"
import { storyDocument } from "../storybook/current-session-scenarios"
import { LiveCodeWriter } from "./live-code-writer"

export default {
  title: "Context Code/Work/Live code writer",
  id: "live-code-writer",
  component: LiveCodeWriter,
}

const source = `import { createSignal } from "solid-js"

// A counter that remembers its last value between visits.
export function Counter(props: { start?: number }) {
  const saved = Number(localStorage.getItem("count") ?? props.start ?? 0)
  const [count, setCount] = createSignal(saved)

  const increment = () => {
    setCount((value) => value + 1)
    localStorage.setItem("count", String(count()))
  }

  return (
    <button type="button" onClick={increment}>
      Clicked {count()} times
    </button>
  )
}
`

/** Streams a write call's JSON input in uneven bursts, the way a model delivers it, and starts over when done. */
export const Writing = {
  render: () => {
    const prefix = `{"path":"src/components/counter.tsx","content":"`
    const body = JSON.stringify(source).slice(1, -1)
    const [tool, setTool] = createStore<SessionMessageAssistantTool>({
      type: "tool",
      id: "live_write",
      name: "write",
      time: { created: 0 },
      state: { status: "streaming", input: prefix },
    })
    let sent = 0

    onMount(() => {
      const timer = setInterval(() => {
        sent = sent >= body.length ? 0 : Math.min(body.length, sent + 4 + Math.floor(Math.random() * 28))
        setTool("state", { status: "streaming", input: prefix + body.slice(0, sent) })
      }, 90)
      onCleanup(() => clearInterval(timer))
    })

    return (
      <section style={{ width: "100%", "max-width": "760px", padding: "24px" }}>
        <CurrentSessionProviders document={storyDocument([])}>
          <LiveCodeWriter tool={tool} />
        </CurrentSessionProviders>
      </section>
    )
  },
}
