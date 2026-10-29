import { createSignal } from "solid-js"

/** The chrome row's height, Codex's: the traffic lights, history buttons and session title share its center line. */
export const chromeRowHeight = 44

/**
 * The chrome row's slot above the joined main card. While the shell shows it, the active session renders its title
 * row here instead of at the top of its card, as Codex does.
 */
export const [chromeTitleMount, setChromeTitleMount] = createSignal<HTMLElement>()

/** A slot at the start of the chrome row's header actions, where the running-work menu renders. */
export const [chromeActivityMount, setChromeActivityMount] = createSignal<HTMLElement>()

/** The chrome row's end, after the title row: the session's review toggle sits here in the row's flow. */
export const [chromeEndMount, setChromeEndMount] = createSignal<HTMLElement>()
