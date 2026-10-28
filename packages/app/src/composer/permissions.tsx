import { Icon } from "@contextcode/ui/icon"
import { Tooltip } from "@contextcode/ui/tooltip"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerSDK } from "@/runtime/server/client"
import { projectSettingsKey, useSettings } from "@/settings/model"

/** Shows whether this project's permission requests are approved automatically, and toggles it. */
export function ComposerPermissions(props: { projectID?: string }) {
  const language = useLanguage()
  const settings = useSettings()
  const sdk = useServerSDK()
  const key = () => projectSettingsKey(sdk.scope, props.projectID)
  const full = () => settings.permissions.autoApproves(key())

  // Like the session command: set this project's choice, falling back to the default when they match.
  const toggle = () => {
    const project = key()
    const active = !full()

    if (!project) return settings.permissions.setAutoApproveDefault(active)
    settings.permissions.setAutoApproveOverride(
      project,
      active === settings.permissions.autoApproveDefault() ? undefined : active,
    )
  }

  return (
    <Tooltip
      placement="top"
      openDelay={800}
      value={
        full()
          ? language.t("command.permissions.autoaccept.disable")
          : key()
            ? language.t("command.permissions.autoaccept.project")
            : language.t("command.permissions.autoaccept.enable")
      }
    >
      <button
        type="button"
        data-action="composer-permissions"
        aria-pressed={full()}
        class="flex h-8 shrink-0 items-center gap-1.5 rounded-full ps-2 pe-2.5 text-[14px] font-[440] leading-5 tracking-[-0.1px] transition-colors hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none"
        classList={{ "text-v2-state-fg-warning": full(), "text-v2-text-text-muted": !full() }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
      >
        <Icon name={full() ? "shield-alert" : "lock"} size="small" class="shrink-0" />
        <span class="whitespace-nowrap">
          {full() ? language.t("session.new.permissions.full") : language.t("session.new.permissions.ask")}
        </span>
      </button>
    </Tooltip>
  )
}
