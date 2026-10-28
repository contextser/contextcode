import { Config } from "@contextcode/core/config"
import { ConfigIntegration } from "@contextcode/core/config/integration"
import { ConfigPolicyPlugin } from "@contextcode/core/config/plugin/policy"
import { Integration } from "@contextcode/core/integration"
import { Mcp } from "@contextcode/core/mcp/index"
import { Skill } from "@contextcode/core/skill"
import { Info } from "@contextcode/schema/config"
import { ConfigPolicy } from "@contextcode/schema/config/policy"
import { ID } from "@contextcode/schema/event"
import { Effect, Schema, Stream } from "effect"
import { host } from "../plugin/host"

/** A connected organization's policy as the Context Code Console delivers it: an integration config document. */
export function organizationPolicy(policies: ConfigPolicy.Info[], organization?: string) {
  return new ConfigIntegration.Document({
    type: "document",
    integrationID: Integration.ID.make("opencode"),
    connection: { type: "env", name: "CONTEXTCODE_API_KEY" },
    organization,
    info: Schema.decodeUnknownSync(Info)({ policies }),
  })
}

/** Replaces the connected organization's policy, or removes it; publish `Event.Updated` to make plugins reload. */
export const setOrganizationPolicy = Effect.fn(function* (policies: ConfigPolicy.Info[] | undefined) {
  const config = yield* Config.Service
  yield* config.integration?.(Integration.ID.make("opencode"), policies && organizationPolicy(policies)) ?? Effect.void
})

// Exercise the real policy plugin against supplied catalogs without unrelated provider/permission setup.
export const registerIntegrationPolicy = Effect.fn(function* (input: {
  mcp?: Mcp.Interface
  skill?: Skill.Interface
  events?: Stream.Stream<{ readonly type: string }, unknown>
}) {
  yield* ConfigPolicyPlugin.Plugin.effect(
    host({
      event: {
        subscribe: () =>
          (input.events ?? Stream.never).pipe(
            Stream.filter((event) => event.type === "config.updated"),
            Stream.map(() => ({ id: ID.create(), created: Date.now(), type: "config.updated" as const, data: {} })),
          ),
      },
      provider: {
        list: () => Effect.die("unused provider.list"),
        get: () => Effect.die("unused provider.get"),
        transform: () => Effect.succeed({ dispose: Effect.void }),
        reload: () => Effect.void,
      },
      mcp: {
        list: () => Effect.die("unused mcp.list"),
        transform: (callback) => input.mcp?.transform(callback) ?? Effect.succeed({ dispose: Effect.void }),
        reload: () => input.mcp?.reload() ?? Effect.void,
      },
      skill: {
        list: () => Effect.die("unused skill.list"),
        transform: (callback) => input.skill?.transform(callback) ?? Effect.succeed({ dispose: Effect.void }),
        reload: () => input.skill?.reload() ?? Effect.void,
      },
      permission: {
        hook: () => Effect.succeed({ dispose: Effect.void }),
        list: () => Effect.die("unused permission.list"),
        get: () => Effect.die("unused permission.get"),
        reply: () => Effect.die("unused permission.reply"),
        assert: () => Effect.die("unused permission.assert"),
      },
    }),
  )
})
