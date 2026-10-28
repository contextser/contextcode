// TODO: Keep additional network capabilities inside Schema and Protocol as the client grows; /effect must never import
// Core or Server. Preserve these datatype exports so internal model reorganizations do not require caller migrations.
import type { Effect } from "effect"
import type { ContextCode } from "./client.js"

export * from "./generated/index"
export { ContextCode } from "./client.js"
export type {
  AgentApi,
  AppApi,
  CommandApi,
  ConfigApi,
  EventApi,
  IntegrationApi,
  ModelApi,
  PluginApi,
  ProviderApi,
  ReferenceApi,
  RpcApi,
  RpcClient,
  WebSearchApi,
  SessionApi,
  SkillApi,
} from "./api.js"
export { Agent } from "@contextcode/schema/agent"
export { Command } from "@contextcode/schema/command"
export { Config } from "@contextcode/schema/config"
export { Credential } from "@contextcode/schema/credential"
export { Event } from "@contextcode/schema/event"
export { EventLog } from "@contextcode/schema/event-log"
export { FileSystem } from "@contextcode/schema/filesystem"
export { Form } from "@contextcode/schema/form"
export { Integration } from "@contextcode/schema/integration"
export { Location } from "@contextcode/schema/location"
export { Model } from "@contextcode/schema/model"
export { Permission } from "@contextcode/schema/permission"
export { PermissionSaved } from "@contextcode/schema/permission-saved"
export { Project } from "@contextcode/schema/project"
export { Worktree } from "@contextcode/schema/worktree"
export { Vcs } from "@contextcode/schema/vcs"
export { Provider } from "@contextcode/schema/provider"
export { Pty } from "@contextcode/schema/pty"
export { Question } from "@contextcode/schema/question"
export { Reference } from "@contextcode/schema/reference"
export { WebSearch } from "@contextcode/schema/websearch"
export { AbsolutePath, RelativePath } from "@contextcode/schema/schema"
export { Session } from "@contextcode/schema/session"
export { SessionInbox } from "@contextcode/schema/session-inbox"
export { SessionMessage } from "@contextcode/schema/session-message"
export { Skill } from "@contextcode/schema/skill"
export { Prompt } from "@contextcode/schema/prompt"
export { PromptInput } from "@contextcode/schema/prompt-input"
export type { ContextCodeEvent } from "@contextcode/protocol/groups/event"
export type ContextCodeClient = Effect.Success<ReturnType<typeof ContextCode.make>>
