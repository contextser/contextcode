import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import type { SessionMessageInfo } from "@contextcode/client/promise"
import { Icon } from "@contextcode/ui/icon"
import { TextShimmer } from "@contextcode/ui/text-shimmer"
import { useLanguage } from "@/runtime/i18n/language"
import { agentActivity, type AgentActivityKind } from "./agent-activity"
import "./agent-status.css"

const presentation = {
  thinking: { icon: "outline-brain", label: "session.agent.thinking" },
  responding: { icon: "outline-text", label: "session.agent.responding" },
  reading: { icon: "file-document", label: "session.agent.reading" },
  searching: { icon: "magnifying-glass", label: "session.agent.searching" },
  writing: { icon: "code-slash", label: "session.agent.writing" },
  editing: { icon: "edit", label: "session.agent.editing" },
  running: { icon: "outline-console", label: "session.agent.running" },
  fetching: { icon: "globe", label: "session.agent.fetching" },
  delegating: { icon: "workspace", label: "session.agent.delegating" },
  using: { icon: "settings-gear", label: "session.agent.using" },
  working: { icon: "status-active", label: "session.agent.working" },
} as const satisfies Record<AgentActivityKind, { icon: string; label: string }>

/**
 * Stands in for "Working" while the agent runs: the Contextser mark animates, and the line narrates what the agent is
 * doing right now, the file or command it is on, how long the turn has run and how many actions it has taken.
 */
export function AgentStatus(props: { messages: readonly SessionMessageInfo[] }) {
  const language = useLanguage()
  const activity = createMemo(() => agentActivity(props.messages))
  const [now, setNow] = createSignal(Date.now())
  const timer = setInterval(() => setNow(Date.now()), 1000)
  onCleanup(() => clearInterval(timer))

  const elapsed = () => {
    const since = activity().since

    if (since === undefined) return
    const seconds = Math.max(0, Math.floor((now() - since) / 1000))

    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`
  }

  // Keyed on the activity, so each new step slides in rather than rewriting the line in place.
  const step = () => `${activity().kind}\u0000${activity().target ?? ""}`

  return (
    <div data-component="agent-status" data-kind={activity().kind} role="status" aria-live="polite">
      <span data-slot="agent-status-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <circle data-slot="agent-status-orbit" cx="16" cy="16" r="14.5" />
          <path data-slot="agent-status-arc" d="M24.98 9.84A10 10 0 1 0 24.98 22.16" />
          <circle data-slot="agent-status-dot" cx="23.4" cy="16" r="2.55" />
        </svg>
      </span>
      <span data-slot="agent-status-name">{language.t("session.agent.name")}</span>
      <span data-slot="agent-status-divider" aria-hidden="true" />
      <span data-slot="agent-status-track">
        <Show when={step()} keyed>
          {(_) => (
            <span data-slot="agent-status-activity">
              <Icon name={presentation[activity().kind].icon} size="small" data-slot="agent-status-icon" />
              <TextShimmer text={language.t(presentation[activity().kind].label)} active />
              <Show when={activity().target}>
                {(target) => <span data-slot="agent-status-target">{target()}</span>}
              </Show>
            </span>
          )}
        </Show>
      </span>
      <span data-slot="agent-status-meta">
        <Show when={elapsed()}>{(value) => <span>{value()}</span>}</Show>
        <Show when={activity().actions > 0}>
          <span>{language.plural("session.agent.actions", activity().actions)}</span>
        </Show>
      </span>
    </div>
  )
}
