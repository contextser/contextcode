import { createUniqueId, For, type ComponentProps } from "solid-js"

// "context code" drawn in the Contextser mark's monoline stroke: radius-10 bowls, 4.4 stroke, round caps.
// Outline mode draws the same centerlines at a hairline width so each letter can animate along its path.
const letters = [
  "M20.08 13.84A10 10 0 1 0 20.08 26.16",
  "M29.08 20A10 10 0 1 0 49.08 20A10 10 0 1 0 29.08 20Z",
  "M58.08 30V10M58.08 19A9 9 0 0 1 76.08 19V30",
  "M89.08 2V24A6 6 0 0 0 95.08 30H97.08M85.08 10H97.08",
  "M106.08 20H126.08A10 10 0 1 0 123.96 26.16",
  "M135.08 10L153.08 30M153.08 10L135.08 30",
  "M166.08 2V24A6 6 0 0 0 172.08 30H174.08M162.08 10H174.08",
  "M211.96 13.84A10 10 0 1 0 211.96 26.16",
  "M220.96 20A10 10 0 1 0 240.96 20A10 10 0 1 0 220.96 20Z",
  "M249.96 20A10 10 0 1 0 269.96 20A10 10 0 1 0 249.96 20ZM269.96 0V30",
  "M278.96 20H298.96A10 10 0 1 0 296.84 26.16",
]

export function Wordmark(
  props: Pick<ComponentProps<"svg">, "class"> & { fade?: boolean; muted?: boolean; outline?: boolean },
) {
  const mask = createUniqueId()
  const maskGradient = createUniqueId()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -2.2 301.16 34.4"
      fill="none"
      classList={{
        [props.class ?? ""]: !!props.class,
        "overflow-visible [&_path]:[vector-effect:non-scaling-stroke]": props.outline,
      }}
    >
      <g opacity={props.muted === false ? 1 : 0.6} class="[[data-color-scheme=dark]_&]:opacity-100">
        <g mask={props.fade === false ? undefined : `url(#${mask})`}>
          <g
            opacity={props.muted === false ? 1 : 0.16 * 0.7}
            stroke="currentColor"
            stroke-width={props.outline ? 1 : 4.4}
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <For each={letters}>{(d) => <path pathLength={props.outline ? 1 : undefined} d={d} />}</For>
          </g>
        </g>
      </g>
      <defs>
        <mask id={mask} style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="-2.2" width="301.16" height="34.4">
          <rect y="-2.2" width="301.16" height="34.4" fill={`url(#${maskGradient})`} />
        </mask>
        <linearGradient id={maskGradient} x1="150.58" y1="16" x2="150.58" y2="32.2" gradientUnits="userSpaceOnUse">
          <stop stop-color="white" stop-opacity="0.7" />
          <stop offset="1" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
