/**
 * Animated glyphs for background work, drawn in Context Code's own marks: a shell is a terminal whose prompt caret
 * blinks while output lines fill in, and a subagent is the Contextser C with a companion circling it.
 */
export function ActivityGlyph(props: { kind: "shell" | "subagent"; class?: string }) {
  if (props.kind === "shell")
    return (
      <svg
        data-component="activity-glyph"
        data-kind="shell"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        classList={{ [props.class ?? ""]: !!props.class }}
      >
        <rect data-slot="activity-glyph-frame" x="1.5" y="2.5" width="13" height="11" rx="2.5" />
        <path data-slot="activity-glyph-prompt" d="M4.25 6 5.75 7.25 4.25 8.5" />
        <rect data-slot="activity-glyph-caret" x="7" y="8" width="2.5" height="1" rx="0.5" />
        <rect data-slot="activity-glyph-output" x="4.25" y="10.5" width="7.5" height="1" rx="0.5" />
      </svg>
    )

  return (
    <svg
      data-component="activity-glyph"
      data-kind="subagent"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <path data-slot="activity-glyph-mark" d="M24.98 9.84A10 10 0 1 0 24.98 22.16" />
      <circle data-slot="activity-glyph-dot" cx="23.4" cy="16" r="2.55" />
      <g data-slot="activity-glyph-orbit">
        <circle cx="16" cy="2.5" r="2.4" />
      </g>
    </svg>
  )
}
