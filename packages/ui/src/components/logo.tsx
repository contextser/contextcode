import { type ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path data-slot="logo-logo-mark-shadow" d="M16 16H4V8H16V16Z" fill="var(--icon-weak-base)" />
      <path data-slot="logo-logo-mark-c" d="M16 4H4V16H16V20H0V0H16V4Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M80 80H20V40H80V80Z" fill="var(--icon-base)" />
      <path d="M80 20H20V80H80V100H0V0H80V20Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 336 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g>
        <path d="M6 18h6v6h-6ZM12 18h6v6h-6ZM18 18h6v6h-6ZM6 24h6v6h-6ZM12 24h6v6h-6ZM18 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M0 6h6v6h-6ZM6 6h6v6h-6ZM12 6h6v6h-6ZM18 6h6v6h-6ZM0 12h6v6h-6ZM0 18h6v6h-6ZM0 24h6v6h-6ZM0 30h6v6h-6ZM6 30h6v6h-6ZM12 30h6v6h-6ZM18 30h6v6h-6Z" fill="var(--icon-base)" />
        <path d="M36 18h6v6h-6ZM42 18h6v6h-6ZM36 24h6v6h-6ZM42 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M30 6h6v6h-6ZM36 6h6v6h-6ZM42 6h6v6h-6ZM48 6h6v6h-6ZM30 12h6v6h-6ZM48 12h6v6h-6ZM30 18h6v6h-6ZM48 18h6v6h-6ZM30 24h6v6h-6ZM48 24h6v6h-6ZM30 30h6v6h-6ZM36 30h6v6h-6ZM42 30h6v6h-6ZM48 30h6v6h-6Z" fill="var(--icon-base)" />
        <path d="M66 18h6v6h-6ZM72 18h6v6h-6ZM66 24h6v6h-6ZM72 24h6v6h-6ZM66 30h6v6h-6ZM72 30h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M60 6h6v6h-6ZM66 6h6v6h-6ZM72 6h6v6h-6ZM60 12h6v6h-6ZM78 12h6v6h-6ZM60 18h6v6h-6ZM78 18h6v6h-6ZM60 24h6v6h-6ZM78 24h6v6h-6ZM60 30h6v6h-6ZM78 30h6v6h-6Z" fill="var(--icon-base)" />
        <path d="M102 18h6v6h-6ZM108 18h6v6h-6ZM102 24h6v6h-6ZM108 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M96 0h6v6h-6ZM90 6h6v6h-6ZM96 6h6v6h-6ZM102 6h6v6h-6ZM108 6h6v6h-6ZM96 12h6v6h-6ZM96 18h6v6h-6ZM96 24h6v6h-6ZM96 30h6v6h-6ZM102 30h6v6h-6ZM108 30h6v6h-6Z" fill="var(--icon-base)" />
        <path d="M126 24h6v6h-6ZM132 24h6v6h-6ZM138 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M120 6h6v6h-6ZM126 6h6v6h-6ZM132 6h6v6h-6ZM138 6h6v6h-6ZM120 12h6v6h-6ZM138 12h6v6h-6ZM120 18h6v6h-6ZM126 18h6v6h-6ZM132 18h6v6h-6ZM138 18h6v6h-6ZM120 24h6v6h-6ZM120 30h6v6h-6ZM126 30h6v6h-6ZM132 30h6v6h-6ZM138 30h6v6h-6Z" fill="var(--icon-base)" />
        <path d="M150 6h6v6h-6ZM168 6h6v6h-6ZM150 12h6v6h-6ZM168 12h6v6h-6ZM156 18h6v6h-6ZM162 18h6v6h-6ZM150 24h6v6h-6ZM168 24h6v6h-6ZM150 30h6v6h-6ZM168 30h6v6h-6Z" fill="var(--icon-base)" />
        <path d="M192 18h6v6h-6ZM198 18h6v6h-6ZM192 24h6v6h-6ZM198 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M186 0h6v6h-6ZM180 6h6v6h-6ZM186 6h6v6h-6ZM192 6h6v6h-6ZM198 6h6v6h-6ZM186 12h6v6h-6ZM186 18h6v6h-6ZM186 24h6v6h-6ZM186 30h6v6h-6ZM192 30h6v6h-6ZM198 30h6v6h-6Z" fill="var(--icon-base)" />
        <path d="M228 18h6v6h-6ZM234 18h6v6h-6ZM240 18h6v6h-6ZM228 24h6v6h-6ZM234 24h6v6h-6ZM240 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M222 6h6v6h-6ZM228 6h6v6h-6ZM234 6h6v6h-6ZM240 6h6v6h-6ZM222 12h6v6h-6ZM222 18h6v6h-6ZM222 24h6v6h-6ZM222 30h6v6h-6ZM228 30h6v6h-6ZM234 30h6v6h-6ZM240 30h6v6h-6Z" fill="var(--icon-strong-base)" />
        <path d="M258 18h6v6h-6ZM264 18h6v6h-6ZM258 24h6v6h-6ZM264 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M252 6h6v6h-6ZM258 6h6v6h-6ZM264 6h6v6h-6ZM270 6h6v6h-6ZM252 12h6v6h-6ZM270 12h6v6h-6ZM252 18h6v6h-6ZM270 18h6v6h-6ZM252 24h6v6h-6ZM270 24h6v6h-6ZM252 30h6v6h-6ZM258 30h6v6h-6ZM264 30h6v6h-6ZM270 30h6v6h-6Z" fill="var(--icon-strong-base)" />
        <path d="M288 18h6v6h-6ZM294 18h6v6h-6ZM288 24h6v6h-6ZM294 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M300 0h6v6h-6ZM282 6h6v6h-6ZM288 6h6v6h-6ZM294 6h6v6h-6ZM300 6h6v6h-6ZM282 12h6v6h-6ZM300 12h6v6h-6ZM282 18h6v6h-6ZM300 18h6v6h-6ZM282 24h6v6h-6ZM300 24h6v6h-6ZM282 30h6v6h-6ZM288 30h6v6h-6ZM294 30h6v6h-6ZM300 30h6v6h-6Z" fill="var(--icon-strong-base)" />
        <path d="M318 24h6v6h-6ZM324 24h6v6h-6ZM330 24h6v6h-6Z" fill="var(--icon-weak-base)" />
        <path d="M312 6h6v6h-6ZM318 6h6v6h-6ZM324 6h6v6h-6ZM330 6h6v6h-6ZM312 12h6v6h-6ZM330 12h6v6h-6ZM312 18h6v6h-6ZM318 18h6v6h-6ZM324 18h6v6h-6ZM330 18h6v6h-6ZM312 24h6v6h-6ZM312 30h6v6h-6ZM318 30h6v6h-6ZM324 30h6v6h-6ZM330 30h6v6h-6Z" fill="var(--icon-strong-base)" />
      </g>
    </svg>
  )
}
