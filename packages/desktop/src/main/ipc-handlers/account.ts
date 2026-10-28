import { Effect } from "effect"
import { AccountRpcs } from "../../shared/ipc-rpc"
import { accountSession, cancelSignIn, signIn, signOut } from "../account/contextser"
import { getLastFocusedWindow } from "../windows"

export const accountHandlers = AccountRpcs.toLayer(
  Effect.succeed(
    AccountRpcs.of({
      AccountSession: () => Effect.promise(accountSession),
      // The browser took focus for the sign-in, so the app comes back to the front once it ends.
      AccountSignIn: ({ copyLink }) =>
        Effect.promise(() => signIn({ copyLink })).pipe(
          Effect.tap(() => Effect.sync(() => getLastFocusedWindow()?.focus())),
        ),
      AccountCancelSignIn: () => Effect.sync(cancelSignIn),
      AccountSignOut: () => Effect.promise(signOut),
    }),
  ),
)
