import { createMemo, For, Show } from "solid-js"
import { Icon } from "@contextcode/ui/icon"
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

/** The sidebar's own column: the app name, starting a chat, projects, and every recent session. */
export function SidebarPanel(props: { onNewChat: () => void }) {
  const command = useCommand()
  const language = useLanguage()
  const inbox = createSessionInbox()

  const recents = createMemo(() =>
    inbox.entries().toSorted((a, b) => (b.session.time.updated ?? 0) - (a.session.time.updated ?? 0)),
  )
  const attention = createMemo(() =>
    inbox.entries().find((entry) => entry.status === "approval" || entry.status === "input"),
  )

  return (
    <div data-component="sidebar-panel">
      <div data-slot="sidebar-brand">
        <button type="button" data-slot="sidebar-brand-name" onClick={() => command.trigger("home.toggle")}>
          <span>Context Code</span>
          <Icon name="chevron-down" size="small" />
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

      <div data-slot="sidebar-section">{language.t("sidebar.recents")}</div>
      <div data-slot="sidebar-recents">
        <Show
          when={recents().length > 0 || inbox.loading()}
          fallback={<div data-slot="sidebar-empty">{language.t("sidebar.recents.empty")}</div>}
        >
          <For each={recents()}>
            {(entry) => <RecentRow entry={entry} selected={inbox.selected(entry)} onOpen={() => inbox.open(entry)} />}
          </For>
        </Show>
      </div>
    </div>
  )
}

function RecentRow(props: { entry: InboxEntry; selected: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      data-slot="sidebar-recent"
      data-state={props.selected ? "active" : undefined}
      aria-current={props.selected ? "page" : undefined}
      onClick={() => props.onOpen()}
    >
      <span data-slot="sidebar-recent-title">{props.entry.session.title}</span>
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
    </button>
  )
}
