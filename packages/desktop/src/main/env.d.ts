interface ImportMetaEnv {
  readonly CONTEXTCODE_CHANNEL: string
  readonly CONTEXTCODE_VERSION?: string
  // Contextser account clients, from the untracked packages/desktop/.env.local; never committed.
  readonly MAIN_VITE_CONTEXTSER_ENV?: string
  readonly MAIN_VITE_CONTEXTSER_LIVE_CLIENT_ID?: string
  readonly MAIN_VITE_CONTEXTSER_LIVE_CLIENT_SECRET?: string
  readonly MAIN_VITE_CONTEXTSER_SANDBOX_CLIENT_ID?: string
  readonly MAIN_VITE_CONTEXTSER_SANDBOX_CLIENT_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
