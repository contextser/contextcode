export * as Provider from "./provider.js"

import { Context, Effect, Layer, Option, Schema, Stream, Struct } from "effect"
import { Provider } from "@contextcode/schema/provider"
import { Model } from "@contextcode/schema/model"
import { makeLocationNode } from "@contextcode/util/effect/app-node"
import { HttpTimeout, type ProviderPackageDefinition } from "@contextcode/ai/effect"
import { isRecord } from "@contextcode/util/record"
import { Npm } from "@contextcode/util/npm"
import type { DeepMutable } from "./schema.js"
import { importModule, resolveModule } from "@contextcode/util/runtime-import"
import { Bus } from "./bus.js"
import { Integration } from "./integration.js"
import { State } from "./state.js"
import { IntegrationConnection } from "./integration/connection.js"
import { Credential } from "@contextcode/schema/credential"
import { Location } from "./location.js"
import { freeze } from "immer"
import { AISDKNative } from "./aisdk-native.js"

export const ID = Provider.ID
export type ID = typeof ID.Type

export const AISDK_PREFIX = "aisdk:"
export const isAISDK = (value: string | undefined): value is string => value?.startsWith(AISDK_PREFIX) ?? false
export const aisdk = (value: string) => (isAISDK(value) ? value : `${AISDK_PREFIX}${value}`)
export function packageName(value: string): string
export function packageName(value: undefined): undefined
export function packageName(value: string | undefined): string | undefined
export function packageName(value: string | undefined) {
  // Native provider entrypoints can persist in user configuration across the npm scope migration.
  if (value?.startsWith("@opencode-ai/ai/")) return value.replace("@opencode-ai/", "@contextcode/")
  if (value === undefined || !isAISDK(value)) return value
  return value.slice(AISDK_PREFIX.length)
}

type Json = Schema.Schema.Type<typeof Schema.Json>
const JsonRecord = Schema.Record(Schema.String, Schema.Json)
const decodeJsonRecord = Schema.decodeUnknownSync(JsonRecord)

export class LoadError extends Schema.TaggedError<LoadError>()("Provider.LoadError", {
  package: Schema.String,
  cause: Schema.Defect(),
}) {}
export type ProviderPackage = ProviderPackageDefinition

const packages = new Map<string, Promise<unknown>>()
const builtins = new Map<string, () => Promise<unknown>>([
  ["@contextcode/ai/providers/alibaba", () => import("@contextcode/ai/providers/alibaba")],
  ["@contextcode/ai/providers/alibaba/chat", () => import("@contextcode/ai/providers/alibaba/chat")],
  ["@contextcode/ai/providers/alibaba/messages", () => import("@contextcode/ai/providers/alibaba/messages")],
  ["@contextcode/ai/providers/alibaba/responses", () => import("@contextcode/ai/providers/alibaba/responses")],
  ["@contextcode/ai/providers/alibaba/images", () => import("@contextcode/ai/providers/alibaba/images")],
  ["@contextcode/ai/providers/amazon-bedrock", () => import("@contextcode/ai/providers/amazon-bedrock")],
  ["@contextcode/ai/providers/amazon-bedrock/mantle", () => import("@contextcode/ai/providers/amazon-bedrock/mantle")],
  [
    "@contextcode/ai/providers/amazon-bedrock/mantle/chat",
    () => import("@contextcode/ai/providers/amazon-bedrock/mantle/chat"),
  ],
  [
    "@contextcode/ai/providers/amazon-bedrock/mantle/messages",
    () => import("@contextcode/ai/providers/amazon-bedrock/mantle/messages"),
  ],
  [
    "@contextcode/ai/providers/amazon-bedrock/mantle/responses",
    () => import("@contextcode/ai/providers/amazon-bedrock/mantle/responses"),
  ],
  ["@contextcode/ai/providers/anthropic", () => import("@contextcode/ai/providers/anthropic")],
  ["@contextcode/ai/providers/anthropic-compatible", () => import("@contextcode/ai/providers/anthropic-compatible")],
  ["@contextcode/ai/providers/azure", () => import("@contextcode/ai/providers/azure")],
  ["@contextcode/ai/providers/azure/chat", () => import("@contextcode/ai/providers/azure/chat")],
  ["@contextcode/ai/providers/azure/responses", () => import("@contextcode/ai/providers/azure/responses")],
  ["@contextcode/ai/providers/azure/images", () => import("@contextcode/ai/providers/azure/images")],
  ["@contextcode/ai/providers/baseten", () => import("@contextcode/ai/providers/baseten")],
  ["@contextcode/ai/providers/baseten/decisions", () => import("@contextcode/ai/providers/baseten/decisions")],
  ["@contextcode/ai/providers/cerebras", () => import("@contextcode/ai/providers/cerebras")],
  ["@contextcode/ai/providers/cloudflare-ai-gateway", () => import("@contextcode/ai/providers/cloudflare-ai-gateway")],
  [
    "@contextcode/ai/providers/cloudflare-ai-gateway/decisions",
    () => import("@contextcode/ai/providers/cloudflare-ai-gateway/decisions"),
  ],
  ["@contextcode/ai/providers/cloudflare-workers-ai", () => import("@contextcode/ai/providers/cloudflare-workers-ai")],
  [
    "@contextcode/ai/providers/cloudflare-workers-ai/decisions",
    () => import("@contextcode/ai/providers/cloudflare-workers-ai/decisions"),
  ],
  [
    "@contextcode/ai/providers/cloudflare-workers-ai/images",
    () => import("@contextcode/ai/providers/cloudflare-workers-ai/images"),
  ],
  ["@contextcode/ai/providers/cohere", () => import("@contextcode/ai/providers/cohere")],
  ["@contextcode/ai/providers/cohere/chat", () => import("@contextcode/ai/providers/cohere/chat")],
  ["@contextcode/ai/providers/deepinfra", () => import("@contextcode/ai/providers/deepinfra")],
  ["@contextcode/ai/providers/deepseek", () => import("@contextcode/ai/providers/deepseek")],
  ["@contextcode/ai/providers/digitalocean", () => import("@contextcode/ai/providers/digitalocean")],
  ["@contextcode/ai/providers/digitalocean/decisions", () => import("@contextcode/ai/providers/digitalocean/decisions")],
  ["@contextcode/ai/providers/digitalocean/images", () => import("@contextcode/ai/providers/digitalocean/images")],
  ["@contextcode/ai/providers/fireworks", () => import("@contextcode/ai/providers/fireworks")],
  ["@contextcode/ai/providers/google", () => import("@contextcode/ai/providers/google")],
  ["@contextcode/ai/providers/google/interactions", () => import("@contextcode/ai/providers/google/interactions")],
  ["@contextcode/ai/providers/google/images", () => import("@contextcode/ai/providers/google/images")],
  ["@contextcode/ai/providers/google-vertex", () => import("@contextcode/ai/providers/google-vertex")],
  ["@contextcode/ai/providers/google-vertex/chat", () => import("@contextcode/ai/providers/google-vertex/chat")],
  ["@contextcode/ai/providers/google-vertex/gemini", () => import("@contextcode/ai/providers/google-vertex/gemini")],
  [
    "@contextcode/ai/providers/google-vertex/interactions",
    () => import("@contextcode/ai/providers/google-vertex/interactions"),
  ],
  ["@contextcode/ai/providers/google-vertex/messages", () => import("@contextcode/ai/providers/google-vertex/messages")],
  ["@contextcode/ai/providers/google-vertex/mistral", () => import("@contextcode/ai/providers/google-vertex/mistral")],
  ["@contextcode/ai/providers/google-vertex/responses", () => import("@contextcode/ai/providers/google-vertex/responses")],
  ["@contextcode/ai/providers/google-vertex/images", () => import("@contextcode/ai/providers/google-vertex/images")],
  ["@contextcode/ai/providers/google-vertex-messages", () => import("@contextcode/ai/providers/google-vertex-messages")],
  ["@contextcode/ai/providers/groq", () => import("@contextcode/ai/providers/groq")],
  ["@contextcode/ai/providers/meta", () => import("@contextcode/ai/providers/meta")],
  ["@contextcode/ai/providers/meta/chat", () => import("@contextcode/ai/providers/meta/chat")],
  ["@contextcode/ai/providers/meta/messages", () => import("@contextcode/ai/providers/meta/messages")],
  ["@contextcode/ai/providers/meta/responses", () => import("@contextcode/ai/providers/meta/responses")],
  ["@contextcode/ai/providers/minimax", () => import("@contextcode/ai/providers/minimax")],
  ["@contextcode/ai/providers/minimax/chat", () => import("@contextcode/ai/providers/minimax/chat")],
  ["@contextcode/ai/providers/minimax/messages", () => import("@contextcode/ai/providers/minimax/messages")],
  ["@contextcode/ai/providers/minimax/responses", () => import("@contextcode/ai/providers/minimax/responses")],
  ["@contextcode/ai/providers/mistral", () => import("@contextcode/ai/providers/mistral")],
  ["@contextcode/ai/providers/moonshot", () => import("@contextcode/ai/providers/moonshot")],
  ["@contextcode/ai/providers/moonshot/chat", () => import("@contextcode/ai/providers/moonshot/chat")],
  ["@contextcode/ai/providers/moonshot/messages", () => import("@contextcode/ai/providers/moonshot/messages")],
  ["@contextcode/ai/providers/moonshot/responses", () => import("@contextcode/ai/providers/moonshot/responses")],
  ["@contextcode/ai/providers/openai", () => import("@contextcode/ai/providers/openai")],
  ["@contextcode/ai/providers/openai/chat", () => import("@contextcode/ai/providers/openai/chat")],
  ["@contextcode/ai/providers/openai/responses", () => import("@contextcode/ai/providers/openai/responses")],
  ["@contextcode/ai/providers/openai/images", () => import("@contextcode/ai/providers/openai/images")],
  ["@contextcode/ai/providers/openai-compatible", () => import("@contextcode/ai/providers/openai-compatible")],
  [
    "@contextcode/ai/providers/openai-compatible/responses",
    () => import("@contextcode/ai/providers/openai-compatible/responses"),
  ],
  ["@contextcode/ai/providers/openai-compatible/images", () => import("@contextcode/ai/providers/openai-compatible/images")],
  [
    "@contextcode/ai/providers/openai-compatible-responses",
    () => import("@contextcode/ai/providers/openai-compatible-responses"),
  ],
  ["@contextcode/ai/providers/opencode/decisions", () => import("@contextcode/ai/providers/opencode/decisions")],
  ["@contextcode/ai/providers/openrouter", () => import("@contextcode/ai/providers/openrouter")],
  ["@contextcode/ai/providers/openrouter/decisions", () => import("@contextcode/ai/providers/openrouter/decisions")],
  ["@contextcode/ai/providers/openrouter/images", () => import("@contextcode/ai/providers/openrouter/images")],
  ["@contextcode/ai/providers/togetherai", () => import("@contextcode/ai/providers/togetherai")],
  ["@contextcode/ai/providers/typesafe-ai/decisions", () => import("@contextcode/ai/providers/typesafe-ai/decisions")],
  ["@contextcode/ai/providers/venice", () => import("@contextcode/ai/providers/venice")],
  ["@contextcode/ai/providers/vercel-ai-gateway", () => import("@contextcode/ai/providers/vercel-ai-gateway")],
  ["@contextcode/ai/providers/vercel-ai-gateway/chat", () => import("@contextcode/ai/providers/vercel-ai-gateway/chat")],
  [
    "@contextcode/ai/providers/vercel-ai-gateway/messages",
    () => import("@contextcode/ai/providers/vercel-ai-gateway/messages"),
  ],
  [
    "@contextcode/ai/providers/vercel-ai-gateway/responses",
    () => import("@contextcode/ai/providers/vercel-ai-gateway/responses"),
  ],
  [
    "@contextcode/ai/providers/vercel-ai-gateway/decisions",
    () => import("@contextcode/ai/providers/vercel-ai-gateway/decisions"),
  ],
  ["@contextcode/ai/providers/vercel-ai-gateway/images", () => import("@contextcode/ai/providers/vercel-ai-gateway/images")],
  ["@contextcode/ai/providers/xai", () => import("@contextcode/ai/providers/xai")],
  ["@contextcode/ai/providers/xai/images", () => import("@contextcode/ai/providers/xai/images")],
  ["@contextcode/ai/providers/zai", () => import("@contextcode/ai/providers/zai")],
  ["@contextcode/ai/providers/zai/chat", () => import("@contextcode/ai/providers/zai/chat")],
  ["@contextcode/ai/providers/zai/images", () => import("@contextcode/ai/providers/zai/images")],
  ["@contextcode/ai/providers/zai-coding-plan", () => import("@contextcode/ai/providers/zai-coding-plan")],
  ["@contextcode/ai/providers/zai-coding-plan/chat", () => import("@contextcode/ai/providers/zai-coding-plan/chat")],
  ["@contextcode/ai/providers/zai-coding-plan/messages", () => import("@contextcode/ai/providers/zai-coding-plan/messages")],
  [
    "@contextcode/ai/providers/zai-coding-plan/responses",
    () => import("@contextcode/ai/providers/zai-coding-plan/responses"),
  ],
])

/** Native `@contextcode/ai/providers/*` entrypoints bundled with Core and loadable by name from config. */
export const builtinPackages: ReadonlySet<string> = new Set(builtins.keys())

export const loadPackage = Effect.fn("Provider.loadPackage")(function* (input: string, npm?: Npm.Interface) {
  const specifier = packageName(input)
  const builtin = builtins.get(specifier)
  if (builtin) return yield* importPackage(specifier, specifier, builtin)
  const resolved = yield* Effect.sync(() => {
    if (specifier.startsWith("file://") || specifier.startsWith("@contextcode/ai/")) return specifier
    try {
      return import.meta.resolve(specifier)
    } catch {
      return undefined
    }
  })
  if (resolved) return yield* importPackage(specifier, resolved)
  if (!npm) {
    return yield* new LoadError({
      package: specifier,
      cause: new Error(`Provider package ${specifier} is not installed`),
    })
  }
  const parts = specifier.split("/")
  const root = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier)
  const installed = yield* npm.add(root).pipe(Effect.mapError((cause) => new LoadError({ package: specifier, cause })))
  const entrypoint = yield* Effect.try({
    try: () => resolveModule(specifier, installed.directory),
    catch: (cause) => new LoadError({ package: specifier, cause }),
  })
  return yield* importPackage(specifier, entrypoint)
})

const settingsKeys = Struct.keys(Provider.Settings.schema.fields)
const providerOnlyKeys = settingsKeys.filter((key) => !(key in Model.Settings.schema.fields))

/** The provider options: every settings key Context Code doesn't read itself. */
export function nativeSettings(settings: Settings) {
  return Struct.omit(settings, settingsKeys)
}

/** Settings a model inherits from its provider. */
export function modelSettings(settings: Settings | undefined) {
  return settings && Struct.omit(settings, providerOnlyKeys)
}

const decodeTimeout = Schema.decodeUnknownOption(HttpTimeout)

/** Applied to `headerTimeout` when provider settings leave it unset or invalid. */
export const DEFAULT_TIMEOUT_MS = 300_000

/**
 * Applied to `chunkTimeout` when provider settings leave it unset or invalid. Some providers, such as DeepSeek, have
 * specifically asked clients to allow at least 15 minutes, because their models can stream nothing for minutes while
 * they reason.
 */
export const DEFAULT_CHUNK_TIMEOUT_MS = 900_000

/** One timeout setting without a default; invalid values are dropped. */
export function timeout(value: unknown) {
  return Option.getOrUndefined(decodeTimeout(value))
}

/** Request timeouts from provider settings, resolved for every route. `timeout` has no default. */
export function timeouts(settings: Readonly<Record<string, unknown>>) {
  return {
    timeout: timeout(settings.timeout),
    headerTimeout: timeout(settings.headerTimeout) ?? DEFAULT_TIMEOUT_MS,
    chunkTimeout: timeout(settings.chunkTimeout) ?? DEFAULT_CHUNK_TIMEOUT_MS,
  }
}

const decodeEncoding = Schema.decodeUnknownOption(Provider.Encoding)

/** Request body encoding from provider or model settings; invalid values are dropped. */
export function encoding(settings: Readonly<Record<string, unknown>>) {
  return Option.getOrUndefined(decodeEncoding(settings.encoding))
}

export function mergeOverlay(
  base: Readonly<Record<string, unknown>> | undefined,
  overlay: Readonly<Record<string, unknown>> | undefined,
): Record<string, Json> | undefined {
  if (base === undefined) return overlay && decodeJsonRecord({ ...overlay })
  if (overlay === undefined) return decodeJsonRecord({ ...base })
  return decodeJsonRecord(mergeRecord(base, overlay))
}

function mergeRecord(
  base: Readonly<Record<string, unknown>>,
  overlay: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    new Set([...Object.keys(base), ...Object.keys(overlay)]).values().map((key): [string, unknown] => {
      const left = base[key]
      const right = overlay[key]
      if (right === undefined) return [key, left]
      if (isRecord(left) && isRecord(right)) return [key, mergeRecord(left, right)]
      return [key, right]
    }),
  )
}

export function mergeHeaders(
  base: Readonly<Record<string, string>> | undefined,
  overlay: Readonly<Record<string, string>> | undefined,
) {
  if (base === undefined) return overlay && { ...overlay }
  if (overlay === undefined) return { ...base }
  return Object.fromEntries(
    [...Object.entries(base), ...Object.entries(overlay)]
      .reduce((result, entry) => {
        result.set(entry[0].toLowerCase(), entry)
        return result
      }, new Map<string, [string, string]>())
      .values(),
  )
}

export const Request = Provider.Request
export type Request = Provider.Request

export const Compaction = Provider.Compaction
export type Compaction = Provider.Compaction

export const Cache = Provider.Cache
export type Cache = Provider.Cache

export const Transport = Provider.Transport
export type Transport = Provider.Transport

export const Settings = Provider.Settings
export type Settings = Provider.Settings

export const Info = Provider.Info
export type Info = Provider.Info

export type MutableInfo = DeepMutable<Info>

export { Event } from "@contextcode/schema/provider"

/** Provider metadata owns its drafts; model definitions remain immutable inputs. */
export type Definition = {
  readonly provider: Info
  readonly models: ReadonlyMap<Model.ID, Model.Info>
  readonly sourceConnection?: IntegrationConnection.Info
}

export interface Editor {
  readonly list: () => readonly Definition[]
  readonly get: (providerID: ID) => Definition | undefined
  readonly add: (definition: {
    readonly info: Info
    readonly models: readonly Model.Info[]
    readonly sourceConnection?: IntegrationConnection.Info
  }) => void
  readonly update: (providerID: ID, update: (provider: MutableInfo) => void) => void
  readonly remove: (providerID: ID) => void
  readonly models: {
    readonly set: (providerID: ID, models: readonly Model.Info[]) => void
    readonly update: (providerID: ID, modelID: Model.ID, update: (model: DeepMutable<Model.Info>) => void) => void
    readonly remove: (providerID: ID, modelID: Model.ID) => void
  }
}

export interface Snapshot {
  readonly records: ReadonlyMap<ID, Definition>
  readonly available: readonly Definition[]
  readonly providers: readonly Info[]
}

export interface Interface extends State.Transformable<Editor> {
  readonly get: (providerID: ID) => Effect.Effect<Info | undefined>
  readonly all: () => Effect.Effect<readonly Info[]>
  readonly available: () => Effect.Effect<readonly Info[]>
  /** Internal definition/access snapshot; raw model inventories never cross the HTTP API. */
  readonly snapshot: () => Effect.Effect<Snapshot>
}

export class Service extends Context.Service<Service, Interface>()("@contextcode/Provider") {}

// Every location references the same index for a shared immutable definition array.
const definitions = new WeakMap<readonly Model.Info[], Map<ID, ReadonlyMap<Model.ID, Model.Info>>>()
function index(providerID: ID, models: readonly Model.Info[]) {
  const indexes = definitions.get(models) ?? new Map<ID, ReadonlyMap<Model.ID, Model.Info>>()
  const cached = indexes.get(providerID)
  if (cached) return cached
  // Model shares these definitions without copying, so a foreign definition takes this provider's identity here.
  const result = freeze(
    new Map(models.map((model) => [model.id, model.providerID === providerID ? model : { ...model, providerID }])),
    true,
  )
  indexes.set(providerID, result)
  definitions.set(models, indexes)
  return result
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const bus = yield* Bus.Service
    const integrations = yield* Integration.Service
    const location = yield* Location.Service
    const state = State.create<
      Map<
        ID,
        {
          provider: MutableInfo
          models: ReadonlyMap<Model.ID, Model.Info>
          sourceConnection?: IntegrationConnection.Info
        }
      >,
      Editor
    >({
      name: "provider",
      initial: () => new Map(),
      editor: (records) => {
        const maps = new WeakSet<ReadonlyMap<Model.ID, Model.Info>>()
        const models = new WeakSet<Model.Info>()
        const entry = (id: ID) => {
          const current = records.get(id)
          if (current) return current
          const added = { provider: Info.empty(id) as MutableInfo, models: new Map<Model.ID, Model.Info>() }
          records.set(id, added)
          maps.add(added.models)
          return added
        }
        const writable = (id: ID) => {
          const record = entry(id)
          if (maps.has(record.models)) return record.models as Map<Model.ID, Model.Info>
          const owned = new Map(record.models)
          record.models = owned
          maps.add(owned)
          return owned
        }
        return {
          list: () => Array.from(records.values()),
          get: (id) => records.get(id),
          add: (definition) => {
            records.set(definition.info.id, {
              provider: structuredClone(definition.info) as MutableInfo,
              models: index(definition.info.id, definition.models),
              sourceConnection: definition.sourceConnection,
            })
          },
          update: (id, update) => {
            const record = entry(id)
            update(record.provider)
            record.provider.id = id
            AISDKNative.rewrite(record.provider, {
              specifier: record.provider.package,
              providerID: id,
              canonical: record.provider.canonical,
            })
          },
          remove: (id) => {
            records.delete(id)
          },
          models: {
            set: (id, values) => {
              entry(id).models = index(id, values)
            },
            update: (providerID, modelID, update) => {
              const record = entry(providerID)
              const target = writable(providerID)
              const current = target.get(modelID)
              const model = // An earlier add/set can publish and freeze an owned model within this fold.
                (
                  current && models.has(current) && !Object.isFrozen(current)
                    ? current
                    : current
                      ? structuredClone(current)
                      : Model.Info.default(providerID, modelID)
                ) as DeepMutable<Model.Info>
              update(model)
              model.id = modelID
              model.providerID = providerID
              AISDKNative.rewrite(model, {
                specifier: model.package ?? record.provider.package,
                providerID,
                canonical: model.canonical ?? record.provider.canonical,
                modelID: model.modelID ?? modelID,
              })
              models.add(model)
              target.set(modelID, model)
            },
            remove: (providerID, modelID) => {
              if (!records.has(providerID)) return
              writable(providerID).delete(modelID)
            },
          },
        }
      },
      notify: () => notify,
    })
    // Registrations may outlive a borrowed service layer; their later disposal must
    // not query dependencies that have already closed.
    yield* Effect.addFinalizer(() => State.shutdown(state.reload()))
    let cached: { records: Snapshot["records"]; value: Snapshot } | undefined
    const snapshot = Effect.fn("Provider.snapshot")(function* () {
      while (true) {
        const revision = integrations.revision()
        const records = state.get()
        // Connection presence decides availability; resolving OAuth tokens belongs to execution.
        const connections = yield* integrations.list()
        // Either fold can disable a plugin that also contributed to the other domain.
        if (revision !== integrations.revision() || records !== state.get()) continue
        const byID = new Map(connections.map((integration) => [integration.id, integration]))
        const available = Array.from(records.values()).filter((record) => {
          if (record.provider.activation === "disabled") return false
          const integration = byID.get(record.provider.integrationID ?? Integration.ID.make(record.provider.id))
          // Never combine the previous account's discovered endpoints/models with a new connection.
          if (
            record.sourceConnection &&
            IntegrationConnection.key(record.sourceConnection) !==
              IntegrationConnection.key(integration?.connections[0])
          )
            return false
          if (record.provider.activation === "enabled") return true
          if (integration?.connections.length) return true
          return record.provider.integrationID === undefined && !integration
        })
        // A credential change that leaves the same definitions available is not a catalog change.
        if (
          cached?.records === records &&
          cached.value.available.length === available.length &&
          cached.value.available.every((record, index) => record === available[index])
        )
          return cached.value
        const value = freeze({ records, available, providers: available.map((record) => record.provider) }, true)
        cached = { records, value }
        return value
      }
    })
    let published: Snapshot | undefined
    const notify: Effect.Effect<void> = Effect.gen(function* () {
      const value = yield* snapshot()
      if (value === published) return
      published = value
      yield* bus.publish(
        Provider.Event.Updated,
        {},
        {
          location: { directory: location.directory, workspaceID: location.workspaceID },
        },
      )
    })
    yield* bus.subscribe([Integration.Event.Updated, Credential.Event.Updated, Credential.Event.Switched]).pipe(
      Stream.runForEach(() => notify),
      Effect.forkScoped({ startImmediately: true }),
    )
    return Service.of({
      transform: state.transform,
      reload: state.reload,
      get: Effect.fn("Provider.get")((id) => Effect.sync(() => freeze(state.get().get(id)?.provider, true))),
      all: Effect.fn("Provider.all")(() =>
        Effect.sync(() => Array.from(state.get().values(), (record) => freeze(record.provider, true))),
      ),
      available: Effect.fn("Provider.available")(() => snapshot().pipe(Effect.map((value) => value.providers))),
      snapshot,
    })
  }),
)

export const node = makeLocationNode({ service: Service, layer, deps: [Bus.node, Integration.node, Location.node] })

const importPackage = Effect.fn("Provider.importPackage")(function* (
  specifier: string,
  entrypoint: string,
  load = () => importModule(entrypoint),
) {
  const module = yield* Effect.tryPromise({
    try: () => {
      const existing = packages.get(entrypoint)
      if (existing) return existing
      const loaded = load()
      packages.set(entrypoint, loaded)
      return loaded
    },
    catch: (cause) => new LoadError({ package: specifier, cause }),
  })
  if (typeof module !== "object" || module === null || typeof (module as { model?: unknown }).model !== "function") {
    return yield* new LoadError({
      package: specifier,
      cause: new Error(`Provider package ${specifier} does not export model(modelID, settings)`),
    })
  }
  return module as ProviderPackageDefinition
})
