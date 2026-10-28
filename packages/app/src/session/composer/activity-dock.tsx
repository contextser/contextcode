import { createResizeObserver } from "@solid-primitives/resize-observer"
import { Icon } from "@contextcode/ui/icon"
import { IconButton } from "@contextcode/ui/icon-button"
import { createEffect, For, onCleanup, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { useSettings } from "@/settings/model"
import { ActivityGlyph } from "./activity-glyph"
import { formatElapsed, type SessionActivityItem } from "./activity-chips"

const width = 248
const margin = 16

/**
 * Running shells and subagents as a floating bar on the composer's end side. It sits in the gutter beside the composer
 * when the gutter can hold it, and otherwise just above the composer's end edge. It starts as a small pill and opens
 * into the list on click; `onFit` reports that it is showing, so the capsule above the composer stays out of its way.
 */
export function SessionActivityDock(props: {
  subagents: readonly SessionActivityItem[]
  shells: readonly SessionActivityItem[]
  onOpen: (item: SessionActivityItem) => void
  onStop: (item: SessionActivityItem) => void
  onFit: (fits: boolean) => void
}) {
  const language = useLanguage()
  const settings = useSettings()
  const [state, setState] = createStore({ fits: false, edge: 0, collapsed: true, now: Date.now() })
  let anchor!: HTMLDivElement

  const active = () =>
    settings.general.backgroundActivity() !== "off" && (props.subagents.length > 0 || props.shells.length > 0)

  // The anchor fills the composer dock; its first child is the centered composer column.
  const measure = () => {
    const dock = anchor.parentElement
    const column = dock?.firstElementChild

    if (!dock || !(column instanceof HTMLElement)) return
    const edge = (dock.clientWidth - column.clientWidth) / 2
    setState({ fits: edge >= width + margin * 2, edge })
  }

  createEffect(() => props.onFit(active()))

  createEffect(() => {
    if (!active()) return
    const timer = setInterval(() => setState("now", Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  onMount(() => {
    const dock = anchor.parentElement
    const column = dock?.firstElementChild

    if (!dock || !(column instanceof HTMLElement)) return
    createResizeObserver([dock, column], measure)
    measure()
  })

  const stoppable = (item: SessionActivityItem) => item.type === "shell" || !!item.sessionID

  return (
    <div ref={anchor} data-component="session-activity-dock" class="pointer-events-none absolute inset-0">
      <Show when={active()}>
        {/* Beside the composer it rests on the dock's floor; without room, it floats above the composer's end edge,
            whose column has 12px of padding. */}
        <section
          data-slot="session-activity-dock-panel"
          data-collapsed={state.collapsed ? "" : undefined}
          aria-label={language.activitySummary({ subagents: props.subagents.length, shells: props.shells.length })}
          class="pointer-events-auto absolute"
          style={{
            width: state.collapsed ? undefined : `${width}px`,
            "inset-inline-end": `${state.fits ? margin : state.edge + 12}px`,
            bottom: state.fits ? "12px" : "calc(100% + 8px)",
          }}
        >
          <header
            data-slot="session-activity-dock-header"
            onClick={() => setState("collapsed", (collapsed) => !collapsed)}
          >
            <span class="flex shrink-0 items-center gap-1">
              <Show when={props.shells.length > 0}>
                <ActivityGlyph kind="shell" class="size-4" />
              </Show>
              <Show when={props.subagents.length > 0}>
                <ActivityGlyph kind="subagent" class="size-4" />
              </Show>
            </span>
            <span data-slot="session-activity-dock-title">{language.t("session.activity.running")}</span>
            <span data-slot="session-activity-dock-count">
              {language.activitySummary({ subagents: props.subagents.length, shells: props.shells.length })}
            </span>
            <IconButton
              type="button"
              size="small"
              variant="ghost-muted"
              data-slot="session-activity-dock-toggle"
              icon={<Icon name="chevron-down" size="small" />}
              aria-expanded={!state.collapsed}
              aria-label={language.t(state.collapsed ? "session.activity.expand" : "session.activity.collapse")}
              onClick={(event) => {
                event.stopPropagation()
                setState("collapsed", (collapsed) => !collapsed)
              }}
            />
          </header>
          <Show when={!state.collapsed}>
            <div data-slot="session-activity-dock-list">
              <For each={[...props.shells, ...props.subagents]}>
                {(item) => (
                  <div
                    role="button"
                    tabIndex={0}
                    data-slot="session-activity-dock-row"
                    onClick={() => props.onOpen(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        props.onOpen(item)
                      }
                    }}
                  >
                    <ActivityGlyph kind={item.type} class="size-4 shrink-0" />
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span
                        data-slot="session-activity-dock-label"
                        dir={item.type === "shell" ? "ltr" : "auto"}
                        classList={{ "font-mono text-[12px]": item.type === "shell" }}
                      >
                        {item.type === "subagent" && item.agent
                          ? `${item.agent[0].toUpperCase()}${item.agent.slice(1)} · ${item.label ?? ""}`
                          : item.label}
                      </span>
                      <span data-slot="session-activity-dock-elapsed">
                        {formatElapsed(state.now - item.started, language.t)}
                      </span>
                    </span>
                    <Show when={stoppable(item)}>
                      <IconButton
                        type="button"
                        size="small"
                        variant="ghost-muted"
                        data-slot="session-activity-dock-stop"
                        icon={<Icon name="outline-xmark" size="small" />}
                        aria-label={language.t(
                          item.type === "shell" ? "session.running.stop.shell" : "session.running.stop.subagent",
                        )}
                        onClick={(event) => {
                          event.stopPropagation()
                          props.onStop(item)
                        }}
                      />
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </section>
      </Show>
    </div>
  )
}
