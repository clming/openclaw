import type { OpenClawConfig } from "../config/config.js";
import { loadOpenClawPlugins } from "./loader.js";
import { getActivePluginRegistry, hasLoadedPluginRegistry } from "./runtime.js";
import type { CreatePluginRuntimeOptions } from "./runtime/index.js";
import type { PluginRegistry } from "./registry.js";
import type { PluginLogger } from "./types.js";

export function resolveEffectivePluginRegistry(params: {
  config: OpenClawConfig;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
  logger?: PluginLogger;
  runtimeOptions?: CreatePluginRuntimeOptions;
}): PluginRegistry {
  const active = getActivePluginRegistry();
  if (active && hasLoadedPluginRegistry()) {
    return active;
  }
  return loadOpenClawPlugins({
    config: params.config,
    workspaceDir: params.workspaceDir,
    env: params.env,
    logger: params.logger,
    runtimeOptions: params.runtimeOptions,
  });
}
