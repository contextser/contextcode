import { createSignal } from "solid-js"

/**
 * The chrome row's slot above the joined main card. While the shell shows it, the active session renders its title
 * row here instead of at the top of its card, as Codex does.
 */
export const [chromeTitleMount, setChromeTitleMount] = createSignal<HTMLElement>()
