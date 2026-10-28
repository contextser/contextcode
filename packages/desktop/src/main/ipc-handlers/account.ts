import { app } from "electron"
import { Effect } from "effect"
import { AccountRpcs } from "../../shared/ipc-rpc"
import { accountSession, cancelSignIn, signIn, signOut } from "../account/contextser"
import { getLastFocusedWindow } from "../windows"

export const accountHandlers = AccountRpcs.toLayer(
  Effect.succeed(
    AccountRpcs.of({
      AccountSession: () => Effect.promise(accountSession),
      // The browser took focus for the sign-in, so the app comes back to the front once it ends. On macOS a window's
      // focus() leaves another app in front, so the app takes focus first.
      AccountSignIn: () =>
        Effect.promise(signIn).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              app.focus({ steal: true })
              const win = getLastFocusedWindow()

              if (win?.isMinimized()) win.restore()
              win?.focus()
            }),
          ),
        ),
      AccountCancelSignIn: () => Effect.sync(cancelSignIn),
      AccountSignOut: () => Effect.promise(signOut),
    }),
  ),
)
