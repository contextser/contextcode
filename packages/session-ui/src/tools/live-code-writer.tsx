import { createEffect, createMemo, For, on, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import type { SessionMessageAssistantTool } from "@contextcode/client/promise"
import { useI18n } from "@contextcode/ui/context/i18n"
import { FileIcon } from "@contextcode/ui/file-icon"
import { AnimatedNumber } from "@contextcode/ui/animated-number"
import { TextShimmer } from "@contextcode/ui/text-shimmer"
import { prefersReducedMotion } from "@contextcode/ui/motion"
import { getFilename } from "@contextcode/util/path"
import { editContext, highlightLine, liveCode } from "./live-code"
import "./live-code-writer.css"

/**
 * A live editor for a file the agent writes: its code types itself out, and the agent's cursor and name tag follow the
 * caret the way a collaborator's cursor does in a shared document. Many providers deliver a call's arguments in one
 * burst, so the typing is paced here rather than by the stream; `onDone` fires once the whole file has been shown.
 */
export function LiveCodeWriter(props: {
  tool: SessionMessageAssistantTool
  floating?: boolean
  /** Files still waiting after this one; the typing speeds up so the preview keeps pace with the agent. */
  backlog?: number
  onSizeChange?: () => void
  onDone?: () => void
}) {
  const i18n = useI18n()
  const live = createMemo(() => liveCode(props.tool))
  const target = () => live()?.code ?? ""
  const streaming = () => props.tool.state.status === "streaming"
  const [view, setView] = createStore({ shown: 0, cursor: { x: 0, y: 0 }, follow: true, done: false, held: false })
  let body: HTMLDivElement | undefined
  let caret: HTMLSpanElement | undefined
  let frame: ReturnType<typeof setTimeout> | undefined
  // Paced by elapsed time on a timer rather than animation frames, which embedded or occluded windows can throttle to
  // a stop; typing reads smoothly at this rate.
  let last: number | undefined
  let progress = 0

  const step = () => {
    frame = undefined
    const now = performance.now()
    const length = target().length

    if (view.shown >= length) {
      last = undefined
      return
    }

    if (prefersReducedMotion()) return setView("shown", length)
    // Read like typing: about eight lines a second, two and a half to ten seconds a file. Files queued behind this one
    // divide the time, so the preview never trails the agent by more than a file or two.
    const lineCount = target().split("\n").length
    const seconds = Math.min(10, Math.max(2.5, lineCount * 0.12)) / (1 + (props.backlog ?? 0))
    progress = Math.max(progress, view.shown) + (length / (seconds * 1000)) * Math.min(100, now - (last ?? now))
    last = now
    setView("shown", Math.min(length, Math.floor(progress)))
    frame = setTimeout(step, 33)
  }

  createEffect(
    on(target, (text) => {
      // A rewrite (a new patch file, a retried call) can shrink the input; restart from what still matches.
      if (view.shown > text.length) setView("shown", text.length)
      frame ??= setTimeout(step, 0)
    }),
  )
  onCleanup(() => clearTimeout(frame))

  // Frames stop while the window is hidden; finish the file then, so a return does not replay a backlog of old files.
  const finishHidden = () => document.hidden && setView("shown", target().length)
  finishHidden()
  document.addEventListener("visibilitychange", finishHidden)
  onCleanup(() => document.removeEventListener("visibilitychange", finishHidden))

  // Linger on the finished file so it can be read, longer when nothing waits behind it, and not at all while the
  // pointer rests on the card.
  createEffect(() => {
    if (streaming() || view.shown < target().length || !live() || view.held) return
    const timer = setTimeout(
      () => {
        setView("done", true)
        props.onDone?.()
      },
      props.backlog ? 900 : 2400,
    )
    onCleanup(() => clearTimeout(timer))
  })

  const typing = () => streaming() || view.shown < target().length

  // An edit is typed in place: between the unchanged lines around it, after the lines it replaces.
  const context = createMemo(() => editContext(props.tool))
  const firstLine = () => {
    const edit = context()

    return edit ? edit.start + edit.before.length : 1
  }
  const text = () => target().slice(0, view.shown)
  const lines = createMemo(() => text().split("\n"))
  const path = () => live()?.path ?? ""
  const added = () => lines().length - (text() === "" ? 1 : 0)

  // Place the agent's cursor on the caret, and glide the view so the line being written sits about a third of the way
  // down, the way a person keeps their place while typing. Reading elsewhere (wheel or touch) stops the following.
  createEffect(
    on(text, () => {
      queueMicrotask(() => {
        if (!caret || !body) return
        setView("cursor", { x: caret.offsetLeft, y: caret.offsetTop })

        if (view.follow) {
          const goal = Math.max(0, caret.offsetTop - body.clientHeight * 0.35)
          const distance = goal - body.scrollTop
          body.scrollTop += Math.abs(distance) < 2 || prefersReducedMotion() ? distance : distance * 0.3
        }
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
          aria-busy={typing()}
          onPointerEnter={() => setView("held", true)}
          onPointerLeave={() => setView("held", false)}
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
              <span data-slot="live-code-name" title={path() || undefined}>
                {getFilename(path()) || "…"}
              </span>
            </span>
            <span data-slot="live-code-presence">
              <span data-slot="live-code-verb">
                <TextShimmer text={verb()} active={typing()} />
              </span>
              <span data-slot="live-code-count">
                +<AnimatedNumber value={added()} />
              </span>
              <Show when={typing() && !streaming()}>
                <button
                  type="button"
                  data-slot="live-code-skip"
                  aria-label={i18n.t("ui.liveCode.skip")}
                  title={i18n.t("ui.liveCode.skip")}
                  onClick={() => setView("shown", target().length)}
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 4l5 4-5 4V4zM8.5 4l5 4-5 4V4z" fill="currentColor" />
                  </svg>
                </button>
              </Show>
              <span data-slot="live-code-avatar" title={i18n.t("ui.liveCode.agent")}>
                <AgentMark />
              </span>
            </span>
          </header>
          <div
            ref={body}
            data-slot="live-code-body"
            onWheel={() => setView("follow", false)}
            onTouchMove={() => setView("follow", false)}
          >
            <div data-slot="live-code-sheet">
              <Show when={context()}>
                {(edit) => (
                  <>
                    <For each={edit().before}>
                      {(line, index) => (
                        <CodeLine number={edit().start + index()} line={line} path={path()} kind="context" />
                      )}
                    </For>
                    <For each={edit().removed}>
                      {(line) => <CodeLine number="−" line={line} path={path()} kind="removed" />}
                    </For>
                  </>
                )}
              </Show>
              <For each={lines()}>
                {(line, index) => {
                  const last = () => index() === lines().length - 1

                  return (
                    <div
                      data-slot="live-code-line"
                      data-active={last() ? "" : undefined}
                      data-diff={
                        context()
                          ? "add"
                          : current().mode === "patch"
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
                      <span data-slot="live-code-number">{firstLine() + index()}</span>
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
              <Show when={context()}>
                {(edit) => (
                  <For each={edit().after}>
                    {(line, index) => (
                      <CodeLine
                        number={firstLine() + lines().length + index()}
                        line={line}
                        path={path()}
                        kind="context"
                      />
                    )}
                  </For>
                )}
              </Show>
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

// A line the agent is not typing: unchanged code around an edit, or a line the edit replaces.
function CodeLine(props: { number: number | string; line: string; path: string; kind: "context" | "removed" }) {
  return (
    <div
      data-slot="live-code-line"
      data-context={props.kind === "context" ? "" : undefined}
      data-diff={props.kind === "removed" ? "delete" : undefined}
    >
      <span data-slot="live-code-number">{props.number}</span>
      <span data-slot="live-code-text">
        <For each={highlightLine(props.line, props.path)}>
          {(token) => <span data-token={token.kind}>{token.text}</span>}
        </For>
      </span>
    </div>
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
