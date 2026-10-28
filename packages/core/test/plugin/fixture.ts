import { Agent } from "@contextcode/core/agent"
import { AISDK } from "@contextcode/core/aisdk"
import { Command } from "@contextcode/core/command"
import { Config } from "@contextcode/core/config"
import { Credential } from "@contextcode/core/credential"
import { Database } from "@contextcode/core/database/database"
import { FileAccess } from "@contextcode/core/file-access"
import { LayerNodePlatform } from "@contextcode/util/effect/app-node-platform"
import { AppProcess } from "@contextcode/util/process"
import { LayerNode } from "@contextcode/util/effect/layer-node"
import { Bus } from "@contextcode/core/bus"
import { FileSystem } from "@contextcode/core/filesystem"
import { FSUtil } from "@contextcode/util/fs-util"
import { Form } from "@contextcode/core/form"
import { Generate } from "@contextcode/core/generate"
import { Integration } from "@contextcode/core/integration"
import { KV } from "@contextcode/core/kv"
import { Location } from "@contextcode/core/location"
import { Mcp } from "@contextcode/core/mcp/index"
import { Model } from "@contextcode/core/model"
import { Npm } from "@contextcode/util/npm"
import { Plugin } from "@contextcode/core/plugin"
import { PluginHooks } from "@contextcode/core/plugin/hooks"
import { Provider } from "@contextcode/core/provider"
import { Session } from "@contextcode/core/session"
import { InstructionEntry } from "@contextcode/core/session/instruction-entry"
import { PersistentPty } from "@contextcode/core/persistent-pty"
import { LocationServiceMap } from "@contextcode/core/location-service-map"
import { AppNodeBuilder } from "@contextcode/core/effect/app-node-builder"
import { Permission } from "@contextcode/core/permission"
import { Reference } from "@contextcode/core/reference"
import { Rpc } from "@contextcode/core/rpc"
import { Skill } from "@contextcode/core/skill"
import { SkillDiscovery } from "@contextcode/core/skill/discovery"
import { Watcher } from "@contextcode/core/filesystem/watcher"
import { Tool } from "@contextcode/core/tool"
import { Vcs } from "@contextcode/core/vcs"
import { WebSearch } from "@contextcode/core/websearch"
import { Worktree } from "@contextcode/core/worktree"
import { WorktreeStrategies } from "@contextcode/core/worktree/strategies"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"
import { emptyMcpLayer } from "../fixture/mcp"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: (name) => Effect.succeed({ directory: "", name }),
    resolve: (name) => Effect.succeed({ directory: "", name }),
    check: () => Effect.succeed(false),
    update: (name) => Effect.succeed({ directory: "", name }),
    which: () => Effect.undefined,
  }),
)

const generateLayer = Layer.succeed(
  Generate.Service,
  Generate.Service.of({
    text: () => Effect.succeed(""),
    image: () => Effect.die("unused"),
    decisions: () => Effect.die("unused"),
  }),
)

const configLayer = Config.testLayer()

const permissionLayer = Layer.succeed(
  Permission.Service,
  Permission.Service.of({
    close: Effect.void,
    ask: (input) => Effect.succeed({ id: input.id ?? Permission.ID.create(), effect: "ask" }),
    assert: () => Effect.void,
    assertNotDenied: () => Effect.void,
    reply: () => Effect.void,
    get: () => Effect.succeed(undefined),
    forSession: () => Effect.succeed([]),
    list: () => Effect.succeed([]),
  }),
)

export const makePluginTestLayer = (permission = permissionLayer) =>
  AppNodeBuilder.build(
    LayerNode.group([
      AppProcess.node,
      FileSystem.node,
      FSUtil.node,
      Location.node,
      Npm.node,
      Credential.node,
      Config.node,
      Database.node,
      FileAccess.node,
      Bus.node,
      Form.node,
      Generate.node,
      LayerNodePlatform.httpClient,
      Plugin.node,
      Agent.node,
      AISDK.node,
      Provider.node,
      Model.node,
      Command.node,
      Integration.node,
      KV.node,
      Mcp.node,
      Session.node,
      InstructionEntry.node,
      PersistentPty.node,
      LocationServiceMap.node,
      Permission.node,
      PluginHooks.node,
      Reference.node,
      Rpc.node,
      Skill.node,
      SkillDiscovery.node,
      Tool.node,
      Vcs.node,
      Watcher.node,
      WebSearch.node,
      Worktree.node,
      WorktreeStrategies.node,
    ]),
    [
      Location.node.replace(tempLocationLayer),
      Npm.node.replace(npmLayer),
      Config.node.replace(configLayer),
      Mcp.node.replace(emptyMcpLayer),
      Generate.node.replace(generateLayer),
      Permission.node.replace(permission),
    ],
  ).pipe(Layer.provideMerge(configLayer))

export const PluginTestLayer = makePluginTestLayer()
