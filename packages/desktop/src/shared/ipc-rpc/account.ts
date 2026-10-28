import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"

const AccountProfile = Schema.Struct({
  sub: Schema.String,
  name: Schema.optionalKey(Schema.String),
  email: Schema.optionalKey(Schema.String),
  picture: Schema.optionalKey(Schema.String),
})

/** Whether sign-in is required here, and who is signed in now, if anyone. */
export const AccountSession = Rpc.make("AccountSession", {
  success: Schema.Struct({ required: Schema.Boolean, profile: Schema.NullOr(AccountProfile) }),
})

/** Runs the browser sign-in; `error` names why it ended without a profile. */
export const AccountSignIn = Rpc.make("AccountSignIn", {
  success: Schema.Struct({ profile: Schema.NullOr(AccountProfile), error: Schema.optionalKey(Schema.String) }),
})

export const AccountCancelSignIn = Rpc.make("AccountCancelSignIn")

export const AccountSignOut = Rpc.make("AccountSignOut")

export const AccountRpcs = RpcGroup.make(AccountSession, AccountSignIn, AccountCancelSignIn, AccountSignOut)
