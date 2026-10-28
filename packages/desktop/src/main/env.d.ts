interface ImportMetaEnv {
  readonly CONTEXTCODE_CHANNEL: string
  readonly CONTEXTCODE_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
