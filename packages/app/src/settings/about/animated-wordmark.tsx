import { createEffect, For, on, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { prefersReducedMotion } from "@contextcode/ui/motion"

const target = ["c", "o", "n", "t", "e", "x", "t", "c", "o", "d", "e"] as const

const choices = ["c", "o", "n", "t", "e", "x", "d"] as const

// Where each settled letter sits in the wordmark, so scrambled letters keep their slot.
const slots = [
  { x: 0, w: 22.28 },
  { x: 26.88, w: 24.4 },
  { x: 55.88, w: 22.4 },
  { x: 82.88, w: 16.4 },
  { x: 103.88, w: 24.4 },
  { x: 132.88, w: 22.4 },
  { x: 159.88, w: 16.4 },
  { x: 191.88, w: 22.28 },
  { x: 218.76, w: 24.4 },
  { x: 247.76, w: 24.4 },
  { x: 276.76, w: 24.4 },
]

export function AnimatedWordmark(props: { active: boolean }) {
  const [state, setState] = createStore({ letters: [...target] })
  const timers = new Set<ReturnType<typeof setTimeout>>()

  createEffect(
    on(
      () => props.active,
      (active) => {
        timers.forEach(clearTimeout)
        timers.clear()

        if (!active || prefersReducedMotion()) {
          setState("letters", [...target])

          return
        }

        const starts = target.map(() => choices[Math.floor(Math.random() * choices.length)])
        const settles = target.map(() => 6 + Math.floor(Math.random() * 8))
        const last = Math.max(...settles)
        setState("letters", starts)

        Array.from({ length: last }, (_, index) => index + 1).forEach((tick) => {
          const timer = setTimeout(() => {
            setState(
              "letters",
              target.map((letter, index) =>
                tick >= settles[index] ? letter : choices[Math.floor(Math.random() * choices.length)],
              ),
            )
            timers.delete(timer)
          }, tick * 75)

          timers.add(timer)
        })
      },
    ),
  )

  onCleanup(() => timers.forEach(clearTimeout))

  return (
    <svg class="settings-about-wordmark" viewBox="0 -2.2 301.16 34.4" aria-hidden="true">
      <defs>
        <symbol id="settings-about-letter-c" viewBox="-2.2 -2.2 22.28 34.4" overflow="visible">
          <path d="M17.88 13.84A10 10 0 1 0 17.88 26.16" />
        </symbol>
        <symbol id="settings-about-letter-o" viewBox="-2.2 -2.2 24.4 34.4" overflow="visible">
          <path d="M0 20A10 10 0 1 0 20 20A10 10 0 1 0 0 20Z" />
        </symbol>
        <symbol id="settings-about-letter-n" viewBox="-2.2 -2.2 22.4 34.4" overflow="visible">
          <path d="M0 30V10M0 19A9 9 0 0 1 18 19V30" />
        </symbol>
        <symbol id="settings-about-letter-t" viewBox="-2.2 -2.2 16.4 34.4" overflow="visible">
          <path d="M4 2V24A6 6 0 0 0 10 30H12M0 10H12" />
        </symbol>
        <symbol id="settings-about-letter-e" viewBox="-2.2 -2.2 24.4 34.4" overflow="visible">
          <path d="M0 20H20A10 10 0 1 0 17.88 26.16" />
        </symbol>
        <symbol id="settings-about-letter-x" viewBox="-2.2 -2.2 22.4 34.4" overflow="visible">
          <path d="M0 10L18 30M18 10L0 30" />
        </symbol>
        <symbol id="settings-about-letter-d" viewBox="-2.2 -2.2 24.4 34.4" overflow="visible">
          <path d="M0 20A10 10 0 1 0 20 20A10 10 0 1 0 0 20ZM20 0V30" />
        </symbol>
      </defs>
      <For each={state.letters}>
        {(letter, index) => (
          <use
            href={`#settings-about-letter-${letter}`}
            x={slots[index()].x}
            y="-2.2"
            width={slots[index()].w}
            height="34.4"
          />
        )}
      </For>
    </svg>
  )
}
