import { onCleanup, onMount, Show } from "solid-js"
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

/** The whole file arrives at once, as most providers send it; the card paces the typing itself and offers a skip. */
export const Burst = {
  render: () => {
    const [tool, setTool] = createStore<SessionMessageAssistantTool>({
      type: "tool",
      id: "live_burst",
      name: "write",
      time: { created: 0 },
      state: { status: "running", input: { path: "src/components/counter.tsx", content: source }, metadata: {} },
    })

    return (
      <section style={{ width: "100%", "max-width": "760px", padding: "24px" }}>
        <CurrentSessionProviders document={storyDocument([])}>
          <Show when={tool.id} keyed>
            <LiveCodeWriter tool={tool} onDone={() => setTool("id", `live_burst_${Date.now()}`)} />
          </Show>
        </CurrentSessionProviders>
      </section>
    )
  },
}

const before = Array.from({ length: 40 }, (_, index) => `  const step${index} = compute(${index})`).join("\n")

/** An edit typed in place, between the unchanged lines around it, after the line it replaces. */
export const EditInPlace = {
  render: () => {
    const newString = `  const total = steps\n    .filter((step) => step.enabled)\n    .reduce((sum, step) => sum + step.weight, 0)\n  return total / steps.length`
    const patch = [
      "--- src/score.ts",
      "+++ src/score.ts",
      "@@ -38,9 +38,12 @@",
      ...before
        .split("\n")
        .slice(34, 38)
        .map((line) => ` ${line}`),
      "-  return steps.length",
      ...newString.split("\n").map((line) => `+${line}`),
      " }",
      " ",
      " export default score",
      "",
    ].join("\n")
    const [tool, setTool] = createStore<SessionMessageAssistantTool>({
      type: "tool",
      id: "live_edit",
      name: "edit",
      time: { created: 0 },
      state: {
        status: "completed",
        input: { path: "src/score.ts", oldString: "  return steps.length", newString },
        metadata: { files: [{ file: "src/score.ts", patch, additions: 4, deletions: 1 }] },
        content: [],
      },
    })

    return (
      <section style={{ width: "100%", "max-width": "760px", padding: "24px" }}>
        <CurrentSessionProviders document={storyDocument([])}>
          <Show when={tool.id} keyed>
            <LiveCodeWriter tool={tool} onDone={() => setTool("id", `live_edit_${Date.now()}`)} />
          </Show>
        </CurrentSessionProviders>
      </section>
    )
  },
}
