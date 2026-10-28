import type { FileSystem } from "@contextcode/core/filesystem"
import { Bus } from "@contextcode/core/bus"
import { Image } from "@contextcode/core/image"
import { LocationServiceMap } from "@contextcode/core/location-service-map"
import type { LocationServices } from "@contextcode/core/location-services"
import { Plugin } from "@contextcode/core/plugin"
import { PluginHooks } from "@contextcode/core/plugin/hooks"
import { Skill } from "@contextcode/core/skill"
import type { Location } from "@contextcode/schema/location"
import { makeGlobalNode } from "@contextcode/util/effect/app-node"
import { LayerNode } from "@contextcode/util/effect/layer-node"
import { Effect, Layer, LayerMap } from "effect"

// Plain-prompt unit fixtures use virtual directories.
export const promptLocationNode = makeGlobalNode({
  service: LocationServiceMap.Service,
  layer: Layer.effect(
    LocationServiceMap.Service,
    Effect.gen(function* () {
      const bus = yield* Bus.Service
      return yield* LayerMap.make(
        (_ref: Location.Ref) =>
          LayerNode.compile(LayerNode.group([PluginHooks.node, Image.node, Skill.node, Plugin.node]), {
            replacements: [
              Bus.node.replace(Layer.succeed(Bus.Service, bus)),
              Plugin.node.replace(Layer.mock(Plugin.Service, { awaitActivation: Effect.void })),
            ],
          }) as unknown as Layer.Layer<LocationServices, FileSystem.DirectoryNotFoundError>,
      )
    }),
  ),
  deps: [Bus.node],
})
