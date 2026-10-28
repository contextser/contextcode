import { createEffect, createMemo, For, on, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import type { SessionMessageAssistantTool } from "@contextcode/client/promise"
import { useI18n } from "@contextcode/ui/context/i18n"
import { FileIcon } from "@contextcode/ui/file-icon"
import { AnimatedNumber } from "@contextcode/ui/animated-number"
import { TextShimmer } from "@contextcode/ui/text-shimmer"
import { prefersReducedMotion } from "@contextcode/ui/motion"
import { getDirectory, getFilename } from "@contextcode/util/path"
import { highlightLine, liveCode } from "./live-code"
import "./live-code-writer.css"

/**
 * A live editor for a file the agent writes: its code types itself out, and the agent's cursor and name tag follow the
 * caret the way a collaborator's cursor does in a shared document. Many providers deliver a call's arguments in one
 * burst, so the typing is paced here rather than by the stream; `onDone` fires once the whole file has been shown.
 */
export function LiveCodeWriter(props: {
  tool: SessionMessageAssistantTool
  floating?: boolean
  onSizeChange?: () => void
  onDone?: () => void
}) {
  const i18n = useI18n()
  const live = createMemo(() => liveCode(props.tool))
  const target = () => live()?.code ?? ""
  const streaming = () => props.tool.state.status === "streaming"
  const [view, setView] = createStore({ shown: 0, cursor: { x: 0, y: 0 }, follow: true, done: false })
  let body: HTMLDivElement | undefined
  let caret: HTMLSpanElement | undefined
  let frame: number | undefined

  const step = () => {
    frame = undefined
    const length = target().length

    if (view.shown >= length) return

    if (prefersReducedMotion()) return setView("shown", length)
    // Type a file in one to four seconds, whatever its size, and catch up quickly if the stream runs ahead.
    const pace = Math.ceil(length / (60 * Math.min(4, Math.max(1, length / 450))))
    setView("shown", (shown) => Math.min(length, shown + Math.max(2, pace, Math.ceil((length - shown) / 40))))
    frame = requestAnimationFrame(step)
  }

  createEffect(
    on(target, (text) => {
      // A rewrite (a new patch file, a retried call) can shrink the input; restart from what still matches.
      if (view.shown > text.length) setView("shown", text.length)
      frame ??= requestAnimationFrame(step)
    }),
  )
  onCleanup(() => frame !== undefined && cancelAnimationFrame(frame))

  // Linger on the finished file for a moment, then hand back to the regular diff.
  createEffect(() => {
    if (streaming() || view.shown < target().length || !live()) return
    const timer = setTimeout(() => {
      setView("done", true)
      props.onDone?.()
    }, 1200)
    onCleanup(() => clearTimeout(timer))
  })

  const text = () => target().slice(0, view.shown)
  const lines = createMemo(() => text().split("\n"))
  const path = () => live()?.path ?? ""
  const added = () => lines().length - (text() === "" ? 1 : 0)

  // Place the agent's cursor on the caret and keep it in view unless the reader scrolled away.
  createEffect(
    on(text, () => {
      requestAnimationFrame(() => {
        if (!caret || !body) return
        setView("cursor", { x: caret.offsetLeft, y: caret.offsetTop })

        if (view.follow) body.scrollTop = Math.max(0, caret.offsetTop - body.clientHeight + 64)
        props.onSizeChange?.()
      })
    }),
  )

  const verb = () => {
    const mode = live()?.mode

    if (!streaming() && view.shown >= target().length) return i18n.t("ui.liveCode.done")

    if (mode === "edit") return i18n.t("ui.liveCode.editing")

    if (mode === "patch") return i18n.t("ui.liveCode.patching")

    return i18n.t("ui.liveCode.writing")
  }

  return (
    <Show when={live()}>
      {(current) => (
        <section
          data-component="live-code-writer"
          data-mode={current().mode}
          data-floating={props.floating ? "" : undefined}
          data-finished={!streaming() && view.shown >= target().length ? "" : undefined}
          aria-label={i18n.t("ui.liveCode.label", { file: getFilename(path()) || path() })}
          aria-busy="true"
        >
          <header data-slot="live-code-header">
            <span data-slot="live-code-traffic" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span data-slot="live-code-file">
              <Show when={path()}>
                <FileIcon node={{ path: path(), type: "file" }} class="size-4 shrink-0" />
              </Show>
              <span data-slot="live-code-name">{getFilename(path()) || "…"}</span>
              <Show when={getDirectory(path())}>
                {(directory) => <span data-slot="live-code-directory">{directory()}</span>}
              </Show>
            </span>
            <span data-slot="live-code-presence">
              <span data-slot="live-code-verb">
                <TextShimmer text={verb()} active={streaming() || view.shown < target().length} />
              </span>
              <span data-slot="live-code-count">
                +<AnimatedNumber value={added()} />
              </span>
              <span data-slot="live-code-avatar" title={i18n.t("ui.liveCode.agent")}>
                <AgentMark />
              </span>
            </span>
          </header>
          <div
            ref={body}
            data-slot="live-code-body"
            onScroll={(event) => {
              const element = event.currentTarget
              setView("follow", element.scrollHeight - element.scrollTop - element.clientHeight < 80)
            }}
          >
            <div data-slot="live-code-sheet">
              <For each={lines()}>
                {(line, index) => {
                  const last = () => index() === lines().length - 1

                  return (
                    <div
                      data-slot="live-code-line"
                      data-active={last() ? "" : undefined}
                      data-diff={
                        current().mode === "patch"
                          ? line.startsWith("+")
                            ? "add"
                            : line.startsWith("-")
                              ? "delete"
                              : line.startsWith("***") || line.startsWith("@@")
                                ? "meta"
                                : undefined
                          : undefined
                      }
                    >
                      <span data-slot="live-code-number">{index() + 1}</span>
                      <span data-slot="live-code-text">
                        <For each={highlightLine(line, path())}>
                          {(token) => <span data-token={token.kind}>{token.text}</span>}
                        </For>
                        <Show when={last()}>
                          <span ref={caret} data-slot="live-code-caret" aria-hidden="true" />
                        </Show>
                      </span>
                    </div>
                  )
                }}
              </For>
              <div
                data-slot="live-code-cursor"
                aria-hidden="true"
                style={{ transform: `translate3d(${view.cursor.x}px, ${view.cursor.y}px, 0)` }}
              >
                <svg viewBox="0 0 16 20" data-slot="live-code-pointer">
                  <path d="M1.5 1.5v15.2l4.1-3.9 2.7 6 2.6-1.1-2.7-6h5.7L1.5 1.5Z" />
                </svg>
                <span data-slot="live-code-tag">
                  <AgentMark />
                  {i18n.t("ui.liveCode.agent")}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </Show>
  )
}

// The Contextser C mark, small enough for an avatar.
function AgentMark() {
  return (
    <svg viewBox="4 4 24 24" fill="none" data-slot="live-code-mark" aria-hidden="true">
      <path d="M24.98 9.84A10 10 0 1 0 24.98 22.16" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" />
      <circle cx="23.4" cy="16" r="2.55" fill="currentColor" />
    </svg>
  )
}
