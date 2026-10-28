import { Effect, Schema } from "effect"
import { createLocalProviderPlugin } from "./local.js"

// Context Code's default endpoint: the Contextser model router, an OpenAI-compatible server that lists every model it
// can route to. Its API key comes from `providers.contextser.settings.apiKey` in the user's config.
const RemoteModel = Schema.Struct({
  id: Schema.String,
  owned_by: Schema.String.pipe(Schema.optional),
  capabilities: Schema.Struct({
    vision: Schema.Boolean.pipe(Schema.optional),
    tools: Schema.Boolean.pipe(Schema.optional),
    contextWindow: Schema.NullOr(Schema.Int).pipe(Schema.optional),
    maxOutput: Schema.NullOr(Schema.Int).pipe(Schema.optional),
  }).pipe(Schema.optional),
  context_length: Schema.NullOr(Schema.Int).pipe(Schema.optional),
  max_completion_tokens: Schema.NullOr(Schema.Int).pipe(Schema.optional),
})

const Response = Schema.Struct({ data: Schema.Array(RemoteModel) })

export const make = createLocalProviderPlugin({
  id: "contextcode.provider.contextser",
  providerID: "contextser",
  name: "Context Code",
  origin: "http://localhost:20128",
  discover: (client) =>
    client
      .getJson("/v1/models", Response)
      .pipe(
        Effect.map((response) =>
          response.data.filter((model) => model.id.length > 0).toSorted((a, b) => a.id.localeCompare(b.id)),
        ),
      ),
  model: (item) => ({
    id: item.id,
    // Routed ids carry the upstream route first ("river1/…"); the rest names the model.
    name: item.owned_by && item.id.startsWith(`${item.owned_by}/`) ? item.id.slice(item.owned_by.length + 1) : item.id,
    tools: item.capabilities?.tools ?? true,
    vision: item.capabilities?.vision,
    context: item.capabilities?.contextWindow ?? item.context_length,
    output: item.capabilities?.maxOutput ?? item.max_completion_tokens,
  }),
})

export const ContextserPlugin = make()
