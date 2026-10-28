export * as ContextCodeWorkerd from "./workerd"

import { Layer } from "effect"
import type { Config, Scope } from "effect"
import { WorkerdProfile } from "../internal/workerd"
import { ContextCode } from "./contextcode"

export type Configuration = WorkerdProfile.Configuration

export interface CreateOptions<R = never> extends WorkerdProfile.Options {
  readonly log?: ContextCode.CreateOptions["log"]
  readonly plugins?: ContextCode.CreateOptions["plugins"]
  readonly workspaceProviders?: ContextCode.CreateOptions["workspaceProviders"]
  readonly instances?: ContextCode.CreateOptions<R>["instances"]
}

export const create = <R = never>({ log, plugins, workspaceProviders, instances, ...options }: CreateOptions<R>) => {
  const profile = WorkerdProfile.make(options)
  return ContextCode.create(
    { ...profile.options, log, plugins, workspaceProviders, instances },
    { overrides: profile.replacements },
  )
}

export const layer = <R = never>(
  options: CreateOptions<R>,
): Layer.Layer<ContextCode.Service, Config.ConfigError | Error, Exclude<R, Scope.Scope>> =>
  Layer.effect(ContextCode.Service, create(options))

export type Interface = ContextCode.Interface
export type Requirements = Scope.Scope
