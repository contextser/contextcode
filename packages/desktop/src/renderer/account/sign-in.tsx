import { useLanguage } from "@contextcode/app/desktop"
import { MarkGlyph } from "@contextcode/ui/logo"
import { Show } from "solid-js"
import { createStore } from "solid-js/store"
import type { AccountProfile, ElectronAPI } from "../api-types"

const signUpUrl = "https://accounts.contextser.com/sign-up"

/**
 * The gate in front of the app while nobody is signed in: one action that sends the person to accounts.contextser.com
 * in their default browser, another that copies the link for any browser they prefer, and a way to create an account.
 */
export function DesktopSignIn(props: { api: ElectronAPI; onSignedIn: (profile: AccountProfile) => void }) {
  const language = useLanguage()
  const [state, setState] = createStore({
    waiting: undefined as "browser" | "link" | undefined,
    error: undefined as string | undefined,
  })

  const start = async (copyLink: boolean) => {
    setState({ waiting: copyLink ? "link" : "browser", error: undefined })
    const result = await props.api.accountSignIn(copyLink).catch((error: unknown) => ({
      profile: null,
      error: error instanceof Error ? error.message : String(error),
    }))
    setState("waiting", undefined)

    if (result.profile) return props.onSignedIn(result.profile)

    // Cancelling is the person's own choice, not a failure worth reporting.
    if (result.error && result.error !== "cancelled") setState("error", result.error)
  }

  return (
    <div
      data-component="desktop-sign-in"
      class="fixed inset-0 z-[90] flex flex-col bg-v2-background-bg-base text-v2-text-text-base"
    >
      {/* The window has no titlebar here, so the top band moves it. */}
      <div class="h-12 shrink-0" data-tauri-drag-region />
      <div class="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <MarkGlyph class="size-11 text-v2-text-text-base" />
        <h1 class="mt-7 text-center text-[30px] font-[400] leading-9 tracking-[-0.5px]">
          {language.t("account.signIn.title")}
        </h1>

        <div class="mt-9 flex w-full max-w-[360px] flex-col gap-3">
          <button
            type="button"
            disabled={!!state.waiting}
            onClick={() => void start(false)}
            class="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-full bg-v2-background-bg-contrast text-[15px] font-[500] text-v2-text-text-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <MarkGlyph class="size-[18px]" />
            {language.t("account.signIn.button")}
          </button>
          <button
            type="button"
            disabled={!!state.waiting}
            onClick={() => void start(true)}
            class="flex h-[50px] w-full items-center justify-center rounded-full border border-v2-border-border-base bg-v2-background-bg-base text-[15px] font-[500] text-v2-text-text-base transition-colors hover:bg-v2-background-bg-layer-01 disabled:opacity-60"
          >
            {language.t("account.signIn.another")}
          </button>
        </div>

        <button
          type="button"
          class="mt-7 text-[14px] text-v2-text-text-faint underline underline-offset-4 hover:text-v2-text-text-muted"
          onClick={() => props.api.openExternal(signUpUrl)}
        >
          {language.t("account.signIn.signUp")}
        </button>

        {/* A fixed-height line, so the status and errors appear without moving the buttons. */}
        <div class="mt-6 flex h-5 items-center justify-center text-[13px]">
          <Show when={state.waiting}>
            {(waiting) => (
              <div class="flex items-center gap-2 text-v2-text-text-muted">
                <span class="size-3 animate-spin rounded-full border-[1.5px] border-v2-border-border-strong border-t-v2-text-text-base" />
                <span>{language.t(waiting() === "link" ? "account.signIn.copied" : "account.signIn.waiting")}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  class="text-v2-text-text-base underline-offset-2 hover:underline"
                  onClick={() => void props.api.accountCancelSignIn()}
                >
                  {language.t("account.signIn.cancel")}
                </button>
              </div>
            )}
          </Show>
          <Show when={!state.waiting && state.error}>
            {(reason) => (
              <p role="alert" class="text-v2-state-fg-danger">
                {language.t("account.signIn.failed", { reason: reason() })}
              </p>
            )}
          </Show>
        </div>
      </div>
    </div>
  )
}
