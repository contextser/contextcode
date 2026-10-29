import { Popover } from "@kobalte/core/popover"
import { createMemo, For, Show, type JSXElement } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@contextcode/ui/icon"
import { useLanguage } from "@/runtime/i18n/language"
import { matchesModelSearch } from "./search"
import type { ModelSelection } from "./selection"
import "./picker-popover.css"

type ModelItem = ReturnType<ModelSelection["list"]>[number]

// Past this many models the menu gets a search field.
const searchThreshold = 8

/**
 * The composer's model picker, as Codex's: a menu over the model chip that lists the models under "Select model", with
 * a check on the one in use. A model with reasoning variants adds its effort slider below the list. `children` is the
 * chip it anchors to; the chip opens it.
 */
export function ModelPickerPopover(props: {
  model: ModelSelection
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Takes focus back on close instead of the chip, as a pointer open returns it to the composer's caret. */
  onCloseFocus?: () => void
  children: JSXElement
}) {
  const language = useLanguage()
  const [state, setState] = createStore({ search: "" })
  let anchor: HTMLDivElement | undefined
  let track: HTMLDivElement | undefined
  let list: HTMLDivElement | undefined
  let search: HTMLInputElement | undefined

  const current = () => props.model.current()
  // Default first, then the model's own variants, in the order the variant shortcut cycles them.
  const options = createMemo(() => [undefined, ...props.model.variant.list()])
  const index = () => Math.max(0, options().indexOf(props.model.variant.current()))
  const position = (at: number) => `calc(13px + (100% - 26px) * ${at / Math.max(1, options().length - 1)})`
  // Rows name a model without its publisher (`deepseek-ai/`), as Codex's names read; the full name is the row's title.
  const short = (name: string) => name.split("/").at(-1) ?? name

  const visible = createMemo(() =>
    props.model
      .list()
      .filter((item) => props.model.visible({ modelID: item.id, providerID: item.provider.id }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  )
  const models = createMemo(() => {
    const query = state.search.trim()

    return query
      ? visible().filter((item) => matchesModelSearch(query, [item.name, item.id, item.provider.name]))
      : visible()
  })
  const providers = createMemo(() => new Set(visible().map((item) => item.provider.id)).size)

  const change = (open: boolean) => {
    if (!open) setState("search", "")
    props.onOpenChange(open)
  }

  const choose = (item: ModelItem) => {
    props.model.set({ modelID: item.id, providerID: item.provider.id }, { recent: true })
    change(false)
  }

  const step = (at: number) => props.model.variant.set(options()[Math.min(options().length - 1, Math.max(0, at))])

  const pick = (event: PointerEvent) => {
    if (!track) return
    const box = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left - 13) / (box.width - 26)))

    step(Math.round((language.direction() === "rtl" ? 1 - ratio : ratio) * (options().length - 1)))
  }

  // Up and down move through the models as in a menu; Home and End jump to its ends.
  const browse = (event: KeyboardEvent) => {
    const rows = [...(list?.querySelectorAll<HTMLElement>('[data-slot="model-picker-option"]') ?? [])]
    const at = rows.indexOf(document.activeElement as HTMLElement)
    const next = { ArrowDown: at + 1, ArrowUp: at === -1 ? rows.length - 1 : at - 1, Home: 0, End: rows.length - 1 }[
      event.key
    ]

    if (next === undefined || rows.length === 0) return
    event.preventDefault()
    rows[(next + rows.length) % rows.length]?.focus()
  }

  const keys = (event: KeyboardEvent) => {
    const forward = language.direction() === "rtl" ? "ArrowLeft" : "ArrowRight"
    const backward = language.direction() === "rtl" ? "ArrowRight" : "ArrowLeft"
    const next = {
      [forward]: index() + 1,
      [backward]: index() - 1,
      Home: 0,
      End: options().length - 1,
    }[event.key]

    if (next === undefined) return
    event.preventDefault()
    step(next)
  }

  return (
    <Popover open={props.open} onOpenChange={change} placement="top-end" gutter={9} modal={false}>
      <Popover.Anchor ref={anchor} class="flex min-w-0">
        {props.children}
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          data-component="model-picker"
          aria-label={language.t("dialog.model.select.title")}
          dir={language.direction()}
          class="data-[expanded]:animate-in data-[expanded]:fade-in data-[expanded]:zoom-in-95 duration-150 ease-out motion-reduce:animate-none"
          // The chip toggles the picker itself, so pressing it is not a press outside.
          onPointerDownOutside={(event: CustomEvent<{ originalEvent: PointerEvent }>) => {
            if (anchor?.contains(event.detail.originalEvent.target as Node)) event.preventDefault()
          }}
          // Opens on the search field when there is one, else on the model in use, so Enter keeps it and the arrows
          // start from it.
          onOpenAutoFocus={(event: Event) => {
            event.preventDefault()
            const rows = list?.querySelectorAll<HTMLElement>('[data-slot="model-picker-option"]')
            const selected = list?.querySelector<HTMLElement>('[data-slot="model-picker-option"][aria-selected="true"]')

            ;(search ?? selected ?? rows?.[0])?.focus()
          }}
          onCloseAutoFocus={(event: Event) => {
            if (!props.onCloseFocus) return
            event.preventDefault()
            props.onCloseFocus()
          }}
        >
          <div data-slot="model-picker-label">{language.t("dialog.model.select.title")}</div>
          <Show when={visible().length > searchThreshold}>
            <label data-slot="model-picker-search">
              <Icon name="magnifying-glass" size="small" />
              <input
                ref={search}
                value={state.search}
                placeholder={language.t("dialog.model.search.placeholder")}
                onInput={(event) => setState("search", event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown") return
                  event.preventDefault()
                  list?.querySelector<HTMLElement>('[data-slot="model-picker-option"]')?.focus()
                }}
              />
            </label>
          </Show>
          <div ref={list} data-slot="model-picker-options" role="listbox" data-scrollable onKeyDown={browse}>
            <For
              each={models()}
              fallback={<div data-slot="model-picker-empty">{language.t("dialog.model.empty")}</div>}
            >
              {(item) => {
                const selected = () => current()?.id === item.id && current()?.provider.id === item.provider.id

                return (
                  <button
                    type="button"
                    role="option"
                    title={item.name}
                    aria-label={item.name}
                    aria-selected={selected()}
                    data-slot="model-picker-option"
                    onClick={() => choose(item)}
                  >
                    <span data-slot="model-picker-option-name">{short(item.name)}</span>
                    <Show when={providers() > 1}>
                      <span data-slot="model-picker-option-provider">{item.provider.name}</span>
                    </Show>
                    <Show when={selected()}>
                      <Icon name="check" size="small" />
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>

          <Show when={options().length > 1}>
            <div data-slot="model-picker-effort">
              <div data-slot="model-picker-effort-head">
                <span>{language.t("dialog.model.effort")}</span>
                <span data-slot="model-picker-effort-value">
                  {props.model.variant.current() ?? language.t("common.default")}
                </span>
              </div>
              <div
                ref={track}
                data-slot="model-picker-track"
                role="slider"
                tabIndex={0}
                aria-label={language.t("dialog.model.effort")}
                aria-valuemin={0}
                aria-valuemax={options().length - 1}
                aria-valuenow={index()}
                aria-valuetext={props.model.variant.current() ?? language.t("common.default")}
                onKeyDown={keys}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  pick(event)
                }}
                onPointerMove={(event) => {
                  if (event.buttons === 1) pick(event)
                }}
              >
                <div data-slot="model-picker-fill" style={{ width: `calc(${position(index())} + 11px)` }} />
                <For each={options()}>
                  {(_, at) => (
                    <span
                      data-slot="model-picker-stop"
                      data-filled={at() <= index() ? "" : undefined}
                      style={{ "inset-inline-start": position(at()) }}
                    />
                  )}
                </For>
                <div data-slot="model-picker-thumb" style={{ "inset-inline-start": position(index()) }} />
              </div>
            </div>
          </Show>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
