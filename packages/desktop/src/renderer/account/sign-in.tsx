import { useLanguage } from "@contextcode/app/desktop"
import { Logo, MarkGlyph } from "@contextcode/ui/logo"
import { Show } from "solid-js"
import { createStore } from "solid-js/store"
import type { AccountProfile, ElectronAPI } from "../api-types"

/**
 * The gate in front of the app while nobody is signed in: one action that sends the person to accounts.contextser.com
 * in their browser and waits for them to come back signed in.
 */
export function DesktopSignIn(props: { api: ElectronAPI; onSignedIn: (profile: AccountProfile) => void }) {
  const language = useLanguage()
  const [state, setState] = createStore({ waiting: false, error: undefined as string | undefined })

  const start = async () => {
    setState({ waiting: true, error: undefined })
    const result = await props.api.accountSignIn().catch((error: unknown) => ({
      profile: null,
      error: error instanceof Error ? error.message : String(error),
    }))
    setState("waiting", false)

    if (result.profile) return props.onSignedIn(result.profile)

    // Cancelling is the person's own choice, not a failure worth reporting.
    if (result.error && result.error !== "cancelled") setState("error", result.error)
  }

  return (
    <div
      data-component="desktop-sign-in"
      class="fixed inset-0 z-[90] flex flex-col bg-v2-background-bg-deep text-v2-text-text-base"
    >
      {/* The window has no titlebar here, so the top band moves it. */}
      <div class="h-12 shrink-0" data-tauri-drag-region />
      <div class="flex flex-1 items-center justify-center px-6 pb-12">
        <div class="flex w-full max-w-[380px] flex-col items-center rounded-[16px] bg-v2-background-bg-base px-8 py-10 text-center shadow-[var(--v2-elevation-raised)]">
          <Logo mark={false} class="h-[18px] w-auto" />
          <h1 class="mt-8 text-[22px] font-[600] leading-7 tracking-[-0.3px]">{language.t("account.signIn.title")}</h1>
          <p class="mt-2 text-[14px] leading-5 text-v2-text-text-muted">{language.t("account.signIn.subtitle")}</p>

          <button
            type="button"
            disabled={state.waiting}
            onClick={() => void start()}
            class="mt-8 flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] bg-v2-background-bg-contrast text-[15px] font-[500] text-v2-text-text-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <MarkGlyph class="size-[18px]" />
            {language.t("account.signIn.button")}
          </button>

          <Show when={state.waiting}>
            <div class="mt-5 flex items-center gap-2 text-[13px] text-v2-text-text-muted">
              <span class="size-3 animate-spin rounded-full border-[1.5px] border-v2-border-border-strong border-t-v2-text-text-base" />
              <span>{language.t("account.signIn.waiting")}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                class="text-v2-text-text-base underline-offset-2 hover:underline"
                onClick={() => void props.api.accountCancelSignIn()}
              >
                {language.t("account.signIn.cancel")}
              </button>
            </div>
          </Show>

          <Show when={state.error}>
            {(reason) => (
              <p role="alert" class="mt-5 text-[13px] leading-5 text-v2-state-fg-danger">
                {language.t("account.signIn.failed", { reason: reason() })}
              </p>
            )}
          </Show>
        </div>
      </div>
    </div>
  )
}
