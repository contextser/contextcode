import { Schema } from "effect"
import { createMemo, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@contextcode/ui/button"
import { useDialog } from "@contextcode/ui/context/dialog"
import { Dialog, DialogFooter, DialogHeader, DialogTitleGroup } from "@contextcode/ui/dialog"
import { Icon } from "@contextcode/ui/icon"
import { Logo } from "@contextcode/ui/logo"
import { Menu } from "@contextcode/ui/menu"
import { Tooltip } from "@contextcode/ui/tooltip"
import { getFilename } from "@contextcode/util/path"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useLayout } from "@/shell/state/layout"
import { usePlatform } from "@/runtime/platform/platform"
import { useGlobal } from "@/runtime/server/runtime"
import { useServers } from "@/runtime/server/registry"
import { inferHomeDirectory } from "@/runtime/server/global-sync/bootstrap"
import { useSettingsSurface } from "@/settings/surface"
import { Persistence } from "@/runtime/persistence/schema"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { sessionTitle } from "@/session/title"
import { createSessionInbox, type InboxEntry } from "./inbox-model"
import "./sidebar-nav.css"

/**
 * The narrow column of app destinations at the window's start edge. It stays when the sidebar closes, so every
 * destination is one click away.
 */
export function SidebarRail() {
  const command = useCommand()
  const language = useLanguage()
  const layout = useLayout()
  // Home is a fresh chat, as in the start screen; the projects index has its own destination.
  const route = () => layout.route().type

  const item = (props: { icon: string; label: string; command: string; active?: boolean }) => (
    <Tooltip placement="right" value={props.label}>
      <button
        type="button"
        data-slot="sidebar-rail-item"
        data-active={props.active ? "" : undefined}
        aria-label={props.label}
        aria-pressed={props.active}
        onClick={() => command.trigger(props.command)}
      >
        <Icon name={props.icon} />
      </button>
    </Tooltip>
  )

  return (
    <nav data-component="sidebar-rail" aria-label={language.t("sidebar.projects")}>
      {item({ icon: "home", label: language.t("home.title"), command: "tab.new", active: route() === "draft" })}
      {item({
        icon: "stack",
        label: language.t("sidebar.rail.projects"),
        command: "home.toggle",
        active: route() === "home",
      })}
      {item({ icon: "clock", label: language.t("sidebar.rail.history"), command: "sessions.search" })}
      {item({ icon: "window-analytics", label: language.t("sidebar.rail.usage"), command: "usage.view" })}
      {item({ icon: "outline-dots", label: language.t("sidebar.rail.more"), command: "command.palette" })}
      <div data-slot="sidebar-rail-divider" aria-hidden="true" />
      {item({ icon: "pull-request", label: language.t("sidebar.rail.review"), command: "review.toggle" })}
      <div class="flex-1" />
      <AccountMenu />
    </nav>
  )
}

/** The person behind the app, with the places that belong to them rather than to a project. */
function AccountMenu() {
  const command = useCommand()
  const language = useLanguage()
  const platform = usePlatform()
  const servers = useServers()
  const global = useGlobal()
  const surface = useSettingsSurface()

  // There is no account, so the name is the local user's, read from the current server's home folder. The path query
  // may not have loaded yet, so a known project's folder stands in for it.
  const name = createMemo(() => {
    const conn = servers.visible.find((item) => servers.current(item)) ?? servers.visible[0]
    const ctx = conn ? global.ensureServerCtx(conn) : undefined
    const home = ctx?.sync.data.path.home || inferHomeDirectory(ctx?.projects.list()[0]?.worktree ?? "")
    const user = getFilename(home.replace(/[\\/]+$/, ""))

    return user ? user[0]!.toUpperCase() + user.slice(1) : language.t("sidebar.settings")
  })

  const avatar = () => <span data-slot="account-avatar">{name()[0]}</span>

  return (
    <Menu placement="right-end" gutter={10}>
      <Menu.Trigger as="button" type="button" data-slot="sidebar-rail-item" aria-label={name()}>
        {avatar()}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content class="account-menu">
          <div data-slot="account-menu-header">
            {avatar()}
            <span>{name()}</span>
          </div>
          <Menu.Separator />
          <Menu.Item onSelect={() => command.trigger("usage.view")}>
            <Icon name="window-analytics" />
            {language.t("sidebar.rail.usage")}
          </Menu.Item>
          <Menu.Item onSelect={() => surface.open("appearance")}>
            <Icon name="appearance" />
            {language.t("settings.general.section.appearance")}
          </Menu.Item>
          <Menu.Item onSelect={() => command.trigger("settings.open")} shortcut={command.keybind("settings.open")}>
            <Icon name="settings-gear" />
            {language.t("sidebar.settings")}
          </Menu.Item>
          <Menu.Separator />
          <Menu.Sub>
            <Menu.SubTrigger>
              <Icon name="help" />
              {language.t("sidebar.help")}
            </Menu.SubTrigger>
            <Menu.Portal>
              <Menu.SubContent class="account-menu">
                <Menu.Item onSelect={() => surface.open("shortcuts")}>{language.t("settings.tab.shortcuts")}</Menu.Item>
                <Menu.Item onSelect={() => surface.open("about")}>{language.t("settings.tab.about")}</Menu.Item>
                <Menu.Item onSelect={() => platform.openExternal("https://opencode.ai/desktop-feedback")}>
                  {language.t("sidebar.feedback")}
                </Menu.Item>
              </Menu.SubContent>
            </Menu.Portal>
          </Menu.Sub>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  )
}

const SidebarPins = Persistence.struct({ keys: Schema.Array(Schema.String) })

/** The sidebar's own column: the app name, starting a chat, projects, then pinned and recent sessions. */
export function SidebarPanel(props: { onNewChat: () => void }) {
  const command = useCommand()
  const language = useLanguage()
  const dialog = useDialog()
  const inbox = createSessionInbox()
  // Pins are this client's own arrangement, so they live with its other sidebar state rather than on the server.
  const [pins, setPins] = persisted(Persist.global("sidebar.pins"), SidebarPins, { keys: [] })
  const [state, setState] = createStore({ renaming: undefined as string | undefined })

  const sorted = createMemo(() =>
    inbox.entries().toSorted((a, b) => (b.session.time.updated ?? 0) - (a.session.time.updated ?? 0)),
  )
  const pinned = createMemo(() => sorted().filter((entry) => pins.keys.includes(entry.key)))
  const recents = createMemo(() => sorted().filter((entry) => !pins.keys.includes(entry.key)))
  const attention = createMemo(() =>
    inbox.entries().find((entry) => entry.status === "approval" || entry.status === "input"),
  )

  const togglePin = (entry: InboxEntry) =>
    setPins("keys", (keys) =>
      keys.includes(entry.key) ? keys.filter((key) => key !== entry.key) : [entry.key, ...keys],
    )

  const actions = {
    open: (entry: InboxEntry) => inbox.open(entry),
    pin: togglePin,
    archive: (entry: InboxEntry) => void inbox.archive(entry),
    markRead: (entry: InboxEntry) => inbox.markViewed(entry),
    rename: (entry: InboxEntry) => setState("renaming", entry.key),
    remove: (entry: InboxEntry) => dialog.show(() => <DeleteSessionDialog entry={entry} onDelete={inbox.remove} />),
  }

  const rename = async (entry: InboxEntry, title: string) => {
    setState("renaming", undefined)
    const next = title.trim()

    if (!next || next === entry.session.title) return
    await entry.ctx.sdk.api.session.update({ sessionID: entry.session.id, title: next })
    // A remembered session wins over the cached index, so the row shows the new title at once.
    entry.ctx.data.session.remember({ ...entry.session, title: next })
  }

  const rows = (list: InboxEntry[]) => (
    <For each={list}>
      {(entry) => (
        <RecentRow
          entry={entry}
          selected={inbox.selected(entry)}
          pinned={pins.keys.includes(entry.key)}
          renaming={state.renaming === entry.key}
          actions={actions}
          onRename={(title) => void rename(entry, title)}
        />
      )}
    </For>
  )

  return (
    <div data-component="sidebar-panel">
      <div data-slot="sidebar-brand">
        <button
          type="button"
          data-slot="sidebar-brand-name"
          aria-label="Context Code"
          onClick={() => command.trigger("home.toggle")}
        >
          <Logo mark={false} class="h-[15px] w-auto shrink-0" />
        </button>
        <div class="flex-1" />
        <Tooltip placement="bottom" value={language.t("sidebar.attention")}>
          <button
            type="button"
            data-slot="sidebar-brand-action"
            aria-label={language.t("sidebar.attention")}
            disabled={!attention()}
            onClick={() => {
              const entry = attention()
              if (entry) inbox.open(entry)
            }}
          >
            <Icon name="bell" />
            <Show when={attention()}>
              <i data-slot="sidebar-dot" />
            </Show>
          </button>
        </Tooltip>
        <Tooltip placement="bottom" value={language.t("command.session.search")}>
          <button
            type="button"
            data-slot="sidebar-brand-action"
            aria-label={language.t("command.session.search")}
            onClick={() => command.trigger("sessions.search")}
          >
            <Icon name="magnifying-glass" />
          </button>
        </Tooltip>
      </div>

      <button type="button" data-slot="sidebar-link" onClick={() => props.onNewChat()}>
        <Icon name="new-session" />
        <span>{language.t("sidebar.newChat")}</span>
      </button>

      <button type="button" data-slot="sidebar-link" data-muted="" onClick={() => command.trigger("home.toggle")}>
        <span>{language.t("sidebar.projects")}</span>
        <Icon name="chevron-right" size="small" />
      </button>

      <div data-slot="sidebar-recents" data-scrollable>
        <Show when={pinned().length > 0}>
          <div data-slot="sidebar-section">{language.t("sidebar.pinned")}</div>
          {rows(pinned())}
        </Show>
        <div data-slot="sidebar-section">{language.t("sidebar.recents")}</div>
        <Show
          when={recents().length > 0 || inbox.loading()}
          fallback={<div data-slot="sidebar-empty">{language.t("sidebar.recents.empty")}</div>}
        >
          {rows(recents())}
        </Show>
      </div>
    </div>
  )
}

type RowActions = Record<"open" | "pin" | "archive" | "markRead" | "rename" | "remove", (entry: InboxEntry) => void>

function RecentRow(props: {
  entry: InboxEntry
  selected: boolean
  pinned: boolean
  renaming: boolean
  actions: RowActions
  onRename: (title: string) => void
}) {
  const language = useLanguage()
  const platform = usePlatform()
  const copy = (text: string) => void (platform.writeClipboardText?.(text) ?? navigator.clipboard.writeText(text))
  const directory = () => props.entry.session.location.directory
  const act = (action: keyof RowActions) => () => props.actions[action](props.entry)

  return (
    <Menu.Context>
      <Menu.Context.Trigger
        as="div"
        role="button"
        tabIndex={0}
        data-slot="sidebar-recent"
        data-state={props.selected ? "active" : undefined}
        aria-current={props.selected ? "page" : undefined}
        onClick={() => !props.renaming && props.actions.open(props.entry)}
        onKeyDown={(event: KeyboardEvent) => {
          if (props.renaming || (event.key !== "Enter" && event.key !== " ")) return
          event.preventDefault()
          props.actions.open(props.entry)
        }}
      >
        <Show
          when={props.renaming}
          fallback={<span data-slot="sidebar-recent-title">{props.entry.session.title}</span>}
        >
          <input
            data-slot="sidebar-recent-input"
            value={props.entry.session.title}
            ref={(element) => queueMicrotask(() => element.select())}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => props.onRename(event.currentTarget.value)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === "Enter") event.currentTarget.blur()
              if (event.key === "Escape") props.onRename(props.entry.session.title ?? "")
            }}
          />
        </Show>
        <Show when={!props.renaming}>
          <span data-slot="sidebar-recent-actions">
            <Tooltip placement="top" value={language.t(props.pinned ? "sidebar.session.unpin" : "sidebar.session.pin")}>
              <button
                type="button"
                data-slot="sidebar-recent-action"
                data-on={props.pinned ? "" : undefined}
                aria-label={language.t(props.pinned ? "sidebar.session.unpin" : "sidebar.session.pin")}
                onClick={(event) => {
                  event.stopPropagation()
                  props.actions.pin(props.entry)
                }}
              >
                <Icon name="pin" size="small" />
              </button>
            </Tooltip>
            <Tooltip placement="top" value={language.t("sidebar.session.archive")}>
              <button
                type="button"
                data-slot="sidebar-recent-action"
                aria-label={language.t("sidebar.session.archive")}
                onClick={(event) => {
                  event.stopPropagation()
                  props.actions.archive(props.entry)
                }}
              >
                <Icon name="archive" size="small" />
              </button>
            </Tooltip>
          </span>
          <span data-slot="sidebar-recent-status">
            <Show
              when={props.entry.status === "working"}
              fallback={
                <Show when={props.entry.status !== "ready"}>
                  <i data-slot="sidebar-dot" data-status={props.entry.status} />
                </Show>
              }
            >
              <i data-slot="sidebar-spinner" />
            </Show>
          </span>
        </Show>
      </Menu.Context.Trigger>
      <Menu.Context.Portal>
        <Menu.Context.Content class="session-menu">
          <Menu.Item onSelect={act("rename")}>
            <Icon name="pencil-line" />
            {language.t("sidebar.session.rename")}
          </Menu.Item>
          <Menu.Item onSelect={act("pin")}>
            <Icon name="pin" />
            {language.t(props.pinned ? "sidebar.session.unpin" : "sidebar.session.pin")}
          </Menu.Item>
          <Show when={props.entry.status === "done" || props.entry.status === "failed"}>
            <Menu.Item onSelect={act("markRead")}>
              <Icon name="eye" />
              {language.t("sidebar.session.markRead")}
            </Menu.Item>
          </Show>
          <Menu.Separator />
          <Menu.Sub>
            <Menu.SubTrigger>
              <Icon name="copy" />
              {language.t("sidebar.session.copy")}
            </Menu.SubTrigger>
            <Menu.Portal>
              <Menu.SubContent class="session-menu">
                <Menu.Item onSelect={() => copy(props.entry.session.title ?? "")}>
                  {language.t("sidebar.session.copyTitle")}
                </Menu.Item>
                <Menu.Item onSelect={() => copy(props.entry.session.id)}>
                  {language.t("sidebar.session.copyID")}
                </Menu.Item>
                <Menu.Item onSelect={() => copy(directory())}>{language.t("sidebar.session.copyPath")}</Menu.Item>
              </Menu.SubContent>
            </Menu.Portal>
          </Menu.Sub>
          <Show when={platform.revealPath || platform.openPath}>
            <Menu.Sub>
              <Menu.SubTrigger>
                <Icon name="square-arrow-top-right" />
                {language.t("sidebar.session.openIn")}
              </Menu.SubTrigger>
              <Menu.Portal>
                <Menu.SubContent class="session-menu">
                  <Show when={platform.revealPath}>
                    {(reveal) => (
                      <Menu.Item onSelect={() => void reveal()(directory())}>
                        {language.t("sidebar.session.reveal")}
                      </Menu.Item>
                    )}
                  </Show>
                  <Show when={platform.openPath}>
                    {(open) => (
                      <Menu.Item onSelect={() => void open()(directory())}>
                        {language.t("sidebar.session.openFolder")}
                      </Menu.Item>
                    )}
                  </Show>
                </Menu.SubContent>
              </Menu.Portal>
            </Menu.Sub>
          </Show>
          <Menu.Separator />
          <Menu.Item onSelect={act("archive")}>
            <Icon name="archive" />
            {language.t("sidebar.session.archive")}
          </Menu.Item>
          <Menu.Item onSelect={act("remove")} data-danger="">
            <Icon name="trash" />
            {language.t("sidebar.session.delete")}
          </Menu.Item>
        </Menu.Context.Content>
      </Menu.Context.Portal>
    </Menu.Context>
  )
}

function DeleteSessionDialog(props: { entry: InboxEntry; onDelete: (entry: InboxEntry) => Promise<unknown> }) {
  const language = useLanguage()
  const dialog = useDialog()

  return (
    <Dialog fit>
      <DialogHeader hideClose>
        <DialogTitleGroup
          title={language.t("session.delete.title")}
          description={language.t("session.delete.confirm", {
            name: sessionTitle(props.entry.session.title) ?? language.t("command.session.new"),
          })}
        />
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" autofocus onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            await props.onDelete(props.entry)
            dialog.close()
          }}
        >
          {language.t("session.delete.button")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
