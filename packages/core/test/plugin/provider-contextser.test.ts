import { Config } from "@contextcode/core/config"
import { Model } from "@contextcode/core/model"
import { Plugin } from "@contextcode/core/plugin"
import { PluginHost } from "@contextcode/core/plugin/host"
import { ProviderPlugins } from "@contextcode/core/plugin/provider"
import { make } from "@contextcode/core/plugin/provider/contextser"
import { Provider } from "@contextcode/core/provider"
import { Document, Info } from "@contextcode/schema/config"
import { describe, expect } from "bun:test"
import { Effect, Layer, Schema } from "effect"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

const decode = Schema.decodeUnknownSync(Info)

function eventually<A>(effect: Effect.Effect<A>, predicate: (value: A) => boolean, deadline = Date.now() + 10_000) {
  return Effect.gen(function* (): Generator<Effect.Effect<unknown>, A> {
    const value = yield* effect
    if (predicate(value)) return value
    if (Date.now() > deadline) return yield* Effect.die(new Error("Timed out waiting for value"))
    yield* Effect.promise(() => Bun.sleep(1))
    return yield* eventually(effect, predicate, deadline)
  })
}

// The router's /v1/models shape: OpenAI's list plus its own capabilities block.
const routed = (id: string, owned_by: string, capabilities: Record<string, unknown>) => ({
  id,
  object: "model",
  owned_by,
  capabilities,
  context_length: capabilities.contextWindow,
  max_completion_tokens: capabilities.maxOutput,
})

describe("ContextserPlugin", () => {
  const server = { authorization: [] as (string | null)[] }
  const router = Bun.serve({
    port: 0,
    fetch: (request) => {
      server.authorization.push(request.headers.get("authorization"))
      return Response.json({
        object: "list",
        data: [
          routed("river1/deepseek-ai/DeepSeek-V4.1-Flash", "river1", {
            vision: true,
            tools: true,
            contextWindow: 1_000_000,
            maxOutput: 128_000,
          }),
          routed("contextser", "combo", { vision: false, tools: true, contextWindow: 262_144, maxOutput: 64_000 }),
        ],
      })
    },
  })
  const it = testEffect(
    Layer.merge(
      PluginTestLayer,
      Config.testLayer([
        new Document({
          type: "document",
          info: decode({
            providers: { contextser: { settings: { baseURL: `${router.url.origin}/v1`, apiKey: "router-key" } } },
          }),
        }),
      ]),
    ),
  )

  it.live("lists every routed model with its limits and authenticates with the configured key", () =>
    Effect.gen(function* () {
      const providers = yield* Provider.Service
      const models = yield* Model.Service
      const providerID = Provider.ID.make("contextser")
      expect(ProviderPlugins.map((item) => item.id)).toContain("contextcode.provider.contextser")

      const plugin = yield* Plugin.Service
      yield* make(undefined, "1 hour").effect(yield* PluginHost.make(plugin))

      const flash = yield* eventually(
        models.get(providerID, Model.ID.make("river1/deepseek-ai/DeepSeek-V4.1-Flash")),
        (item) => item !== undefined,
      )
      expect(flash).toMatchObject({
        name: "deepseek-ai/DeepSeek-V4.1-Flash",
        capabilities: { tools: true, input: ["text", "image"], output: ["text"] },
        limit: { context: 1_000_000, output: 128_000 },
      })
      expect(yield* models.get(providerID, Model.ID.make("contextser"))).toMatchObject({
        name: "contextser",
        capabilities: { input: ["text"] },
        limit: { context: 262_144, output: 64_000 },
      })
      expect(yield* providers.get(providerID)).toMatchObject({
        name: "Context Code",
        activation: "enabled",
        settings: { baseURL: `${router.url.origin}/v1`, apiKey: "router-key" },
      })
      expect(server.authorization).toContain("Bearer router-key")
    }).pipe(Effect.ensuring(Effect.promise(() => router.stop(true)))),
  )
})
