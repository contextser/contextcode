import { type ComponentProps } from "solid-js"

// The Contextser C mark, from contextser.com.
export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="4 4 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        data-slot="logo-logo-mark-c"
        d="M24.98 9.84A10 10 0 1 0 24.98 22.16"
        stroke="var(--icon-strong-base)"
        stroke-width="4.4"
        stroke-linecap="round"
      />
      <circle data-slot="logo-logo-mark-dot" cx="23.4" cy="16" r="2.55" fill="var(--icon-strong-base)" />
    </svg>
  )
}

/** The mark in currentColor. `outline` draws hairline centerlines that can animate along their path. */
export const MarkGlyph = (props: { class?: string; outline?: boolean }) => {
  return (
    <svg
      data-component="logo-mark-glyph"
      classList={{
        [props.class ?? ""]: !!props.class,
        "overflow-visible [&_path]:[vector-effect:non-scaling-stroke]": props.outline,
      }}
      viewBox="4 4 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        pathLength={props.outline ? 1 : undefined}
        d="M24.98 9.84A10 10 0 1 0 24.98 22.16"
        stroke="currentColor"
        stroke-width={props.outline ? 1 : 4.4}
        stroke-linecap="round"
      />
      <path
        pathLength={props.outline ? 1 : undefined}
        d="M25.95 16A2.55 2.55 0 1 1 20.85 16A2.55 2.55 0 1 1 25.95 16Z"
        fill={props.outline ? "none" : "currentColor"}
        stroke={props.outline ? "currentColor" : undefined}
        stroke-width={props.outline ? 1 : undefined}
      />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="4 4 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        data-slot="logo-splash-c"
        d="M24.98 9.84A10 10 0 1 0 24.98 22.16"
        stroke="var(--icon-strong-base)"
        stroke-width="4.4"
        stroke-linecap="round"
      />
      <circle data-slot="logo-splash-dot" cx="23.4" cy="16" r="2.55" fill="var(--icon-strong-base)" />
    </svg>
  )
}

/** The mark and "context code"; `mark={false}` keeps only the words, trimmed to their own bounds. */
export const Logo = (props: { class?: string; mark?: boolean }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={props.mark === false ? "42.27 -2.2 303.28 34.4" : "0 -2.2 345.55 34.4"}
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g transform="translate(-2.74 -2.8) scale(1.3)" display={props.mark === false ? "none" : undefined}>
        <path
          data-slot="logo-logo-mark-c"
          d="M24.98 9.84A10 10 0 1 0 24.98 22.16"
          stroke="var(--icon-strong-base)"
          stroke-width="4.4"
          stroke-linecap="round"
        />
        <circle data-slot="logo-logo-mark-dot" cx="23.4" cy="16" r="2.55" fill="var(--icon-strong-base)" />
      </g>
      <g stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64.47 13.84A10 10 0 1 0 64.47 26.16" stroke="var(--icon-base)" />
        <path d="M73.47 20A10 10 0 1 0 93.47 20A10 10 0 1 0 73.47 20Z" stroke="var(--icon-base)" />
        <path d="M102.47 30V10M102.47 19A9 9 0 0 1 120.47 19V30" stroke="var(--icon-base)" />
        <path d="M133.47 2V24A6 6 0 0 0 139.47 30H141.47M129.47 10H141.47" stroke="var(--icon-base)" />
        <path d="M150.47 20H170.47A10 10 0 1 0 168.35 26.16" stroke="var(--icon-base)" />
        <path d="M179.47 10L197.47 30M197.47 10L179.47 30" stroke="var(--icon-base)" />
        <path d="M210.47 2V24A6 6 0 0 0 216.47 30H218.47M206.47 10H218.47" stroke="var(--icon-base)" />
        <path d="M256.35 13.84A10 10 0 1 0 256.35 26.16" stroke="var(--icon-strong-base)" />
        <path d="M265.35 20A10 10 0 1 0 285.35 20A10 10 0 1 0 265.35 20Z" stroke="var(--icon-strong-base)" />
        <path
          d="M294.35 20A10 10 0 1 0 314.35 20A10 10 0 1 0 294.35 20ZM314.35 0V30"
          stroke="var(--icon-strong-base)"
        />
        <path d="M323.35 20H343.35A10 10 0 1 0 341.23 26.16" stroke="var(--icon-strong-base)" />
      </g>
    </svg>
  )
}
