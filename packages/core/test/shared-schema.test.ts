import { expect, test } from "bun:test"
import { Schema } from "effect"
import { Agent } from "@contextcode/core/agent"
import { Session } from "@contextcode/core/session"
import { SessionStore } from "@contextcode/core/session/store"
import { Location } from "@contextcode/schema/location"
import { Model } from "@contextcode/schema/model"
import { Provider } from "@contextcode/schema/provider"
import { Project } from "@contextcode/schema/project"
import { Worktree } from "@contextcode/schema/worktree"
import { Prompt } from "@contextcode/schema/prompt"
import { SessionInbox } from "@contextcode/schema/session-inbox"
import { SessionMessage } from "@contextcode/schema/session-message"
import { Workspace } from "@contextcode/schema/workspace"
import { Command } from "@contextcode/schema/command"
import { Connection } from "@contextcode/schema/connection"
import { Credential } from "@contextcode/schema/credential"
import { FileSystem } from "@contextcode/schema/filesystem"
import { Integration } from "@contextcode/schema/integration"
import { LLM } from "@contextcode/schema/llm"
import { Permission } from "@contextcode/schema/permission"
import { Pty } from "@contextcode/schema/pty"
import { Reference } from "@contextcode/schema/reference"
import { Skill } from "@contextcode/schema/skill"
import { AbsolutePath, optional, statics } from "@contextcode/schema/schema"

test("Core reuses the canonical shared schemas", async () => {
  const schemaAgent = await import("@contextcode/schema/agent")
  const schemaSession = await import("@contextcode/schema/session")
  const [
    coreCommand,
    coreConnection,
    coreCredential,
    coreFileSystem,
    coreIntegration,
    coreLocation,
    coreAI,
    coreModel,
    corePermission,
    coreWorktree,
    corePty,
    coreProject,
    coreProvider,
    coreReference,
    coreSessionInbox,
    coreSessionMessage,
    coreSkill,
    coreSchema,
    coreWorkspace,
  ] = await Promise.all([
    import("@contextcode/core/command"),
    import("@contextcode/core/integration/connection"),
    import("@contextcode/core/credential"),
    import("@contextcode/core/filesystem"),
    import("@contextcode/core/integration"),
    import("@contextcode/core/location"),
    import("@contextcode/ai/effect"),
    import("@contextcode/core/model"),
    import("@contextcode/core/permission"),
    import("@contextcode/core/worktree"),
    import("@contextcode/core/pty"),
    import("@contextcode/core/project/schema"),
    import("@contextcode/core/provider"),
    import("@contextcode/core/reference"),
    import("@contextcode/core/session/inbox"),
    import("@contextcode/core/session/message"),
    import("@contextcode/core/skill"),
    import("@contextcode/core/schema"),
    import("@contextcode/core/workspace"),
  ])

  const schemas = [
    [Agent.ID, schemaAgent.Agent.ID],
    [Agent.Name, schemaAgent.Agent.Name],
    [Agent.Color, schemaAgent.Agent.Color],
    [Agent.Info, schemaAgent.Agent.Info],
    [coreCommand.Info, Command.Info],
    [coreConnection.CredentialInfo, Connection.CredentialInfo],
    [coreConnection.EnvInfo, Connection.EnvInfo],
    [coreConnection.Info, Connection.Info],
    [coreCredential.ID, Credential.ID],
    [coreCredential.OAuth, Credential.OAuth],
    [coreCredential.Key, Credential.Key],
    [coreCredential.Value, Credential.Value],
    [coreFileSystem.Entry, FileSystem.Entry],
    [coreFileSystem.Submatch, FileSystem.Submatch],
    [coreFileSystem.Match, FileSystem.Match],
    [coreIntegration.ID, Integration.ID],
    [coreIntegration.MethodID, Integration.MethodID],
    [coreIntegration.OAuthMethod, Integration.OAuthMethod],
    [coreIntegration.KeyMethod, Integration.KeyMethod],
    [coreIntegration.EnvMethod, Integration.EnvMethod],
    [coreIntegration.Method, Integration.Method],
    [coreIntegration.Ref, Integration.Ref],
    [coreLocation.Ref, Location.Ref],
    [coreAI.FinishReason, LLM.FinishReason],
    [coreModel.ID, Model.ID],
    [coreModel.VariantID, Model.VariantID],
    [coreModel.Ref, Model.Ref],
    [coreModel.Family, Model.Family],
    [coreModel.Capabilities, Model.Capabilities],
    [coreModel.Cost, Model.Cost],
    [coreModel.Info, Model.Info],
    [coreProvider.ID, Provider.ID],
    [coreProvider.Request, Provider.Request],
    [coreProvider.Compaction, Provider.Compaction],
    [coreProvider.Transport, Provider.Transport],
    [coreProvider.Settings, Provider.Settings],
    [coreProvider.Info, Provider.Info],
    [corePermission.Effect, Permission.Effect],
    [corePermission.Rule, Permission.Rule],
    [corePermission.Ruleset, Permission.Ruleset],
    [coreWorktree.CreateInput, Worktree.CreateInput],
    [coreWorktree.RemoveInput, Worktree.RemoveInput],
    [coreWorktree.Info, Worktree.Info],
    [coreWorktree.List, Worktree.List],
    [coreWorktree.Event, Worktree.Event],
    [corePty.Info, Pty.Info],
    [corePty.Event, Pty.Event],
    [coreProject.ID, Project.ID],
    [coreProject.Current, Project.Current],
    [coreReference.LocalSource, Reference.LocalSource],
    [coreReference.GitSource, Reference.GitSource],
    [coreReference.Source, Reference.Source],
    [Session.ID, schemaSession.Session.ID],
    [Session.Info, schemaSession.Session.Info],
    [Session.ListAnchor, schemaSession.Session.ListAnchor],
    [Session.ListInput, SessionStore.ListInput],
    [coreSessionInbox.Delivery, SessionInbox.Delivery],
    [coreSessionInbox.Item, SessionInbox.Item],
    [coreSessionInbox.User, SessionInbox.User],
    [coreSessionInbox.Synthetic, SessionInbox.Synthetic],
    [coreSessionMessage.ID, SessionMessage.ID],
    [coreSessionMessage.AssistantRetry, SessionMessage.AssistantRetry],
    [coreSessionMessage.AgentSelected, SessionMessage.AgentSelected],
    [coreSessionMessage.ModelSelected, SessionMessage.ModelSelected],
    [coreSessionMessage.LocationSwitched, SessionMessage.LocationSwitched],
    [coreSessionMessage.User, SessionMessage.User],
    [coreSessionMessage.Synthetic, SessionMessage.Synthetic],
    [coreSessionMessage.System, SessionMessage.System],
    [coreSessionMessage.Shell, SessionMessage.Shell],
    [coreSessionMessage.ToolStateStreaming, SessionMessage.ToolStateStreaming],
    [coreSessionMessage.ToolStateRunning, SessionMessage.ToolStateRunning],
    [coreSessionMessage.ToolStateCompleted, SessionMessage.ToolStateCompleted],
    [coreSessionMessage.ToolStateError, SessionMessage.ToolStateError],
    [coreSessionMessage.ToolState, SessionMessage.ToolState],
    [coreSessionMessage.AssistantTool, SessionMessage.AssistantTool],
    [coreSessionMessage.AssistantText, SessionMessage.AssistantText],
    [coreSessionMessage.AssistantReasoning, SessionMessage.AssistantReasoning],
    [coreSessionMessage.AssistantContent, SessionMessage.AssistantContent],
    [coreSessionMessage.Assistant, SessionMessage.Assistant],
    [coreSessionMessage.Compaction, SessionMessage.Compaction],
    [coreSessionMessage.Info, SessionMessage.Info],
    [coreSkill.DirectorySource, Skill.DirectorySource],
    [coreSkill.UrlSource, Skill.UrlSource],
    [coreSkill.EmbeddedSource, Skill.EmbeddedSource],
    [coreSkill.Source, Skill.Source],
    [coreSkill.Info, Skill.Info],
    [coreSchema.optional, optional],
    [coreSchema.statics, statics],
    [coreWorkspace.ID, Workspace.ID],
  ]
  for (const [core, shared] of schemas) expect(core).toBe(shared)

  expect(coreModel.Info.default(coreProvider.ID.make("test"), coreModel.ID.make("model"))).toEqual(
    Model.Info.default(Provider.ID.make("test"), Model.ID.make("model")),
  )
  expect(coreProvider.Info.empty(coreProvider.ID.make("test"))).toEqual(Provider.Info.empty(Provider.ID.make("test")))
  expect(Skill.Source.key(Skill.DirectorySource.make({ type: "directory", path: AbsolutePath.make("/tmp") }))).toBe(
    "directory:/tmp",
  )
})

test("shared record schemas construct and decode plain objects", () => {
  const made = Prompt.make({ text: "hello" })
  const decoded = Schema.decodeUnknownSync(Prompt)({ text: "hello" })
  const content = Schema.decodeUnknownSync(SessionMessage.AssistantText)({ type: "text", text: "hi" })

  expect(Object.getPrototypeOf(made)).toBe(Object.prototype)
  expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype)
  expect(Object.getPrototypeOf(content)).toBe(Object.prototype)
  expect(Prompt.ast.annotations?.identifier).toBe("Prompt")
  expect(SessionMessage.AssistantText.ast.annotations?.identifier).toBe("Session.Message.Assistant.Text")
  expect(Prompt.equivalence(Prompt.make({ text: "hello" }), decoded)).toBe(true)
  expect(Prompt.fromUserMessage({ text: "hello" })).toEqual(made)
  expect(Workspace.ID.ascending("")).toStartWith("wrk_")
})
