import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_GATEWAY_PORT } from "./config/paths.js";
import { resolveGatewayProgramArguments } from "./daemon/program-args.js";
import { isBunRuntime } from "./daemon/runtime-binary.js";
import { resolveGatewayService } from "./daemon/service.js";
import type { RuntimeEnv } from "./runtime.js";
import { VERSION } from "./version.js";

export const DEFAULT_GATEWAY_LAUNCH_AGENT_PLIST = "ai.openclaw.gateway.plist";
const DISABLE_LAUNCHAGENT_MARKER = path.join(".openclaw", "disable-launchagent");

function resolveLaunchAgentsDir(env: Record<string, string | undefined>): string {
  const home = env.HOME?.trim() || os.homedir();
  return path.join(home, "Library", "LaunchAgents");
}

export function shouldRunPostinstallGatewayServiceRepair(params: {
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
  launchAgentFiles?: readonly string[];
}): boolean {
  const env = params.env ?? (process.env as Record<string, string | undefined>);
  if ((params.platform ?? process.platform) !== "darwin") {
    return false;
  }
  if (env.OPENCLAW_SKIP_POSTINSTALL_GATEWAY_REPAIR === "1") {
    return false;
  }
  if (env.npm_config_global !== "true") {
    return false;
  }
  return Boolean(params.launchAgentFiles?.includes(DEFAULT_GATEWAY_LAUNCH_AGENT_PLIST));
}

function createPostinstallRuntime(): RuntimeEnv {
  return {
    log: (...args: unknown[]) => console.log(...args),
    error: (...args: unknown[]) => console.warn("[openclaw postinstall]", ...args),
    exit: (_code: number) => {
      throw new Error("postinstall repair must not call runtime.exit()");
    },
  };
}

function buildDefaultLaunchAgentEnv(params: {
  env: Record<string, string | undefined>;
  currentEnvironment?: Record<string, string | undefined>;
}): Record<string, string | undefined> {
  const currentEnvironment = params.currentEnvironment ?? {};
  const targetEnv: Record<string, string | undefined> = {
    ...currentEnvironment,
    HOME: currentEnvironment.HOME?.trim() || params.env.HOME?.trim() || os.homedir(),
  };
  delete targetEnv.OPENCLAW_PROFILE;
  delete targetEnv.OPENCLAW_LAUNCHD_LABEL;
  return targetEnv;
}

async function hasDisabledLaunchAgentMarker(
  env: Record<string, string | undefined>,
): Promise<boolean> {
  const home = env.HOME?.trim() || os.homedir();
  try {
    await fs.access(path.join(home, DISABLE_LAUNCHAGENT_MARKER));
    return true;
  } catch {
    return false;
  }
}

function detectGatewayRuntime(programArguments: string[] | undefined): "node" | "bun" {
  const runtimePath = programArguments?.[0];
  if (runtimePath && isBunRuntime(runtimePath)) {
    return "bun";
  }
  return "node";
}

function resolveGatewayPortFromCommand(params: {
  programArguments?: readonly string[];
  environment?: Record<string, string | undefined>;
}): number {
  const args = params.programArguments ?? [];
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index]?.trim();
    if (!current) {
      continue;
    }
    if (current === "--port") {
      const parsed = Number.parseInt(args[index + 1] ?? "", 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
      continue;
    }
    if (current.startsWith("--port=")) {
      const parsed = Number.parseInt(current.slice("--port=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  const envPort = Number.parseInt(params.environment?.OPENCLAW_GATEWAY_PORT ?? "", 10);
  return Number.isFinite(envPort) && envPort > 0 ? envPort : DEFAULT_GATEWAY_PORT;
}

function mergeServiceEnv(params: {
  env: Record<string, string | undefined>;
  currentEnvironment?: Record<string, string>;
  port: number;
}): Record<string, string | undefined> {
  const currentEnvironment = params.currentEnvironment ?? {};
  const nextEnv: Record<string, string | undefined> = {
    ...currentEnvironment,
    HOME: currentEnvironment.HOME?.trim() || params.env.HOME,
    OPENCLAW_GATEWAY_PORT: String(params.port),
    OPENCLAW_SERVICE_VERSION: VERSION,
  };
  delete nextEnv.OPENCLAW_LAUNCHD_LABEL;
  return nextEnv;
}

export async function runPostinstallGatewayServiceRepair(params?: {
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
  runtime?: RuntimeEnv;
}): Promise<boolean> {
  const env = params?.env ?? (process.env as Record<string, string | undefined>);
  const launchAgentsDir = resolveLaunchAgentsDir(env);
  let launchAgentFiles: string[] = [];
  try {
    launchAgentFiles = await fs.readdir(launchAgentsDir);
  } catch {
    return false;
  }

  if (
    !shouldRunPostinstallGatewayServiceRepair({
      platform: params?.platform,
      env,
      launchAgentFiles,
    })
  ) {
    return false;
  }

  const runtime = params?.runtime ?? createPostinstallRuntime();
  const service = resolveGatewayService();
  const lookupEnv = buildDefaultLaunchAgentEnv({ env });
  const command = await service.readCommand(lookupEnv).catch(() => null);
  if (!command?.programArguments?.length) {
    return false;
  }
  const repairEnv = buildDefaultLaunchAgentEnv({
    env,
    currentEnvironment: command.environment,
  });
  if (await hasDisabledLaunchAgentMarker(repairEnv)) {
    return false;
  }

  const port = resolveGatewayPortFromCommand({
    programArguments: command.programArguments,
    environment: command.environment,
  });
  const runtimeChoice = detectGatewayRuntime(command.programArguments);
  const currentExecPath = command.programArguments[0];
  const nextProgram = await resolveGatewayProgramArguments({
    port,
    runtime: runtimeChoice,
    bunPath: currentExecPath && isBunRuntime(currentExecPath) ? currentExecPath : undefined,
  });
  const nextEnvironment = mergeServiceEnv({
    env: repairEnv,
    currentEnvironment: command.environment,
    port,
  });
  const currentVersion = command.environment?.OPENCLAW_SERVICE_VERSION?.trim();
  const needsRepair =
    currentVersion !== VERSION ||
    command.workingDirectory !== nextProgram.workingDirectory ||
    command.programArguments.join("\0") !== nextProgram.programArguments.join("\0");
  if (!needsRepair) {
    return false;
  }

  try {
    await service.install({
      env: repairEnv,
      stdout: process.stdout,
      programArguments: nextProgram.programArguments,
      workingDirectory: nextProgram.workingDirectory,
      environment: nextEnvironment,
    });
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    runtime.error(`LaunchAgent repair skipped: ${detail}`);
    return false;
  }
}
