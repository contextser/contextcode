import { NodeFileSystem } from "@effect/platform-node"
import { compile, emitEffectImported, emitEffectShape, emitPromise, write } from "@contextcode/httpapi-codegen"
import { ClientApi, effectOmitEndpoints, groupNames, promiseOmitEndpoints } from "@contextcode/protocol/client"
import { Agent } from "@contextcode/schema/agent"
import { Command } from "@contextcode/schema/command"
import { Config } from "@contextcode/schema/config"
import { Credential } from "@contextcode/schema/credential"
import { Event } from "@contextcode/schema/event"
import { EventLog } from "@contextcode/schema/event-log"
import { FileDiff } from "@contextcode/schema/file-diff"
import { FileSystem } from "@contextcode/schema/filesystem"
import { Form } from "@contextcode/schema/form"
import { Generate } from "@contextcode/schema/generate"
import { Instruction } from "@contextcode/schema/instruction"
import { InstructionEntry } from "@contextcode/schema/instruction-entry"
import { Integration } from "@contextcode/schema/integration"
import { Location } from "@contextcode/schema/location"
import { Mcp } from "@contextcode/schema/mcp"
import { Model } from "@contextcode/schema/model"
import { Money } from "@contextcode/schema/money"
import { Permission } from "@contextcode/schema/permission"
import { PermissionSaved } from "@contextcode/schema/permission-saved"
import { Plugin } from "@contextcode/schema/plugin"
import { Project } from "@contextcode/schema/project"
import { Worktree } from "@contextcode/schema/worktree"
import { AgentAttachment, FileAttachment, Prompt, PromptMention } from "@contextcode/schema/prompt"
import { PromptInput } from "@contextcode/schema/prompt-input"
import { Provider } from "@contextcode/schema/provider"
import { Pty } from "@contextcode/schema/pty"
import { PtyTicket } from "@contextcode/schema/pty-ticket"
import { Question } from "@contextcode/schema/question"
import { Reference } from "@contextcode/schema/reference"
import { AbsolutePath, RelativePath } from "@contextcode/schema/schema"
import { Session } from "@contextcode/schema/session"
import { SessionMessage } from "@contextcode/schema/session-message"
import { SessionInbox } from "@contextcode/schema/session-inbox"
import { Shell } from "@contextcode/schema/shell"
import { Skill } from "@contextcode/schema/skill"
import { Snapshot } from "@contextcode/schema/snapshot"
import { UsageLimits } from "@contextcode/schema/usage-limits"
import { Vcs } from "@contextcode/schema/vcs"
import { WebSearch } from "@contextcode/schema/websearch"
import { Workspace } from "@contextcode/schema/workspace"
import { Effect, Schema } from "effect"
import { fileURLToPath } from "url"

const promiseContract = compile(ClientApi, { groupNames, omitEndpoints: promiseOmitEndpoints })
const effectContract = compile(ClientApi, { groupNames, omitEndpoints: effectOmitEndpoints })
const effectTypeReferences = [
  ...namespaceTypes("Agent", "@contextcode/schema/agent", Agent),
  ...namespaceTypes("Command", "@contextcode/schema/command", Command),
  ...namespaceTypes("Config", "@contextcode/schema/config", Config),
  ...namespaceTypes("Credential", "@contextcode/schema/credential", Credential),
  ...namespaceTypes("Event", "@contextcode/schema/event", Event),
  ...namespaceTypes("EventLog", "@contextcode/schema/event-log", EventLog),
  ...namespaceTypes("FileDiff", "@contextcode/schema/file-diff", FileDiff),
  ...namespaceTypes("FileSystem", "@contextcode/schema/filesystem", FileSystem),
  ...namespaceTypes("Form", "@contextcode/schema/form", Form),
  ...namespaceTypes("Generate", "@contextcode/schema/generate", Generate),
  ...namespaceTypes("Instruction", "@contextcode/schema/instruction", Instruction),
  ...namespaceTypes("InstructionEntry", "@contextcode/schema/instruction-entry", InstructionEntry),
  ...namespaceTypes("Integration", "@contextcode/schema/integration", Integration),
  typeReference("Location.PublicRef", "@contextcode/schema/location", Location.PublicRef),
  typeReference("Location.PublicInfo", "@contextcode/schema/location", Location.PublicInfo),
  ...namespaceTypes("Mcp", "@contextcode/schema/mcp", Mcp),
  ...namespaceTypes("Model", "@contextcode/schema/model", Model),
  ...namespaceTypes("Money", "@contextcode/schema/money", Money),
  ...namespaceTypes("Permission", "@contextcode/schema/permission", Permission),
  ...namespaceTypes("PermissionSaved", "@contextcode/schema/permission-saved", PermissionSaved),
  ...namespaceTypes("Plugin", "@contextcode/schema/plugin", Plugin),
  ...namespaceTypes("Project", "@contextcode/schema/project", Project),
  ...namespaceTypes("Worktree", "@contextcode/schema/worktree", Worktree),
  ...namespaceTypes("PromptInput", "@contextcode/schema/prompt-input", PromptInput),
  ...namespaceTypes("Provider", "@contextcode/schema/provider", Provider),
  ...namespaceTypes("Pty", "@contextcode/schema/pty", Pty),
  ...namespaceTypes("PtyTicket", "@contextcode/schema/pty-ticket", PtyTicket),
  ...namespaceTypes("Question", "@contextcode/schema/question", Question),
  ...namespaceTypes("Reference", "@contextcode/schema/reference", Reference),
  ...namespaceTypes("Session", "@contextcode/schema/session", Session),
  ...namespaceTypes("SessionMessage", "@contextcode/schema/session-message", SessionMessage),
  ...namespaceTypes("SessionInbox", "@contextcode/schema/session-inbox", SessionInbox),
  ...namespaceTypes("Shell", "@contextcode/schema/shell", Shell),
  ...namespaceTypes("Skill", "@contextcode/schema/skill", Skill),
  ...namespaceTypes("Snapshot", "@contextcode/schema/snapshot", Snapshot),
  ...namespaceTypes("UsageLimits", "@contextcode/schema/usage-limits", UsageLimits),
  ...namespaceTypes("Vcs", "@contextcode/schema/vcs", Vcs),
  ...namespaceTypes("WebSearch", "@contextcode/schema/websearch", WebSearch),
  ...namespaceTypes("Workspace", "@contextcode/schema/workspace", Workspace),
  typeReference("Prompt", "@contextcode/schema/prompt", Prompt),
  typeReference("PromptMention", "@contextcode/schema/prompt", PromptMention),
  typeReference("FileAttachment", "@contextcode/schema/prompt", FileAttachment),
  typeReference("AgentAttachment", "@contextcode/schema/prompt", AgentAttachment),
  typeReference("AbsolutePath", "@contextcode/schema/schema", AbsolutePath),
  typeReference("RelativePath", "@contextcode/schema/schema", RelativePath),
]

await Effect.runPromise(
  Effect.all(
    [
      write(
        emitPromise(promiseContract, {
          mutableOutputs: true,
        }),
        fileURLToPath(new URL("../src/promise/generated", import.meta.url)),
      ),
      write(
        emitEffectImported(effectContract, {
          module: "../../contract",
          api: "ClientApi",
          shapeModule: "../api/api.js",
        }),
        fileURLToPath(new URL("../src/effect/generated", import.meta.url)),
      ),
      write(
        emitEffectShape(effectContract, {
          typeReferences: effectTypeReferences,
          outputTypes: {
            "event.subscribe": {
              name: "ContextCodeEvent",
              import: 'import type { ContextCodeEvent } from "@contextcode/protocol/groups/event"',
            },
          },
        }),
        fileURLToPath(new URL("../src/effect/api", import.meta.url)),
      ),
    ],
    { concurrency: 3, discard: true },
  ).pipe(Effect.provide(NodeFileSystem.layer)),
)

function namespaceTypes(namespace: string, module: string, values: object) {
  return Object.entries(values).flatMap(([name, schema]) =>
    Schema.isSchema(schema) ? [typeReference(`${namespace}.${name}`, module, schema)] : [],
  )
}

function typeReference(name: string, module: string, schema: Schema.Top) {
  return {
    schema,
    name,
    import: `import type { ${name.split(".")[0]} } from ${JSON.stringify(module)}`,
  }
}
