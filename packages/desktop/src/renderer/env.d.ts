import type { ElectronNative } from "../preload/types"

declare global {
  interface ImportMetaEnv {
    readonly CONTEXTCODE_TEST_ONBOARDING: boolean
  }

  interface Window {
    electron: ElectronNative
    __CONTEXTCODE__?: {
      deepLinks?: string[]
    }
  }
}
