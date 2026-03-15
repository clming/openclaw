import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AuthStorage, ModelRegistry } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupTempPaths,
  createDefaultEmbeddedSession,
  createSubscriptionMock,
  getHoisted,
  loadRunEmbeddedAttempt,
  resetEmbeddedAttemptHarness,
  testModel,
} from "./attempt.spawn-workspace.test-support.js";

const hoisted = getHoisted();

describe("runEmbeddedAttempt cleanup", () => {
  const tempPaths: string[] = [];

  beforeEach(() => {
    resetEmbeddedAttemptHarness({
      subscribeImpl: createSubscriptionMock,
    });
  });

  afterEach(async () => {
    await cleanupTempPaths(tempPaths);
  });

  it("clears the active run and releases session resources when idle flush fails", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cleanup-workspace-"));
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cleanup-agent-"));
    const sessionFile = path.join(workspaceDir, "session.jsonl");
    tempPaths.push(workspaceDir, agentDir);
    await fs.writeFile(sessionFile, "", "utf8");

    const disposeMock = vi.fn();
    const flushError = new Error("flush failed");
    hoisted.flushPendingToolResultsAfterIdleMock.mockRejectedValueOnce(flushError);
    hoisted.createAgentSessionMock.mockImplementation(async () => ({
      session: {
        ...createDefaultEmbeddedSession(),
        dispose: disposeMock,
      },
    }));

    const runEmbeddedAttempt = await loadRunEmbeddedAttempt();
    await expect(
      runEmbeddedAttempt({
        sessionId: "embedded-session",
        sessionKey: "agent:main:test-cleanup",
        sessionFile,
        workspaceDir,
        agentDir,
        config: {},
        prompt: "hello",
        timeoutMs: 10_000,
        runId: "run-cleanup-flush-failure",
        provider: "openai",
        modelId: "gpt-test",
        model: testModel,
        authStorage: {} as AuthStorage,
        modelRegistry: {} as ModelRegistry,
        thinkLevel: "off",
        senderIsOwner: true,
        disableMessageTool: true,
      }),
    ).rejects.toThrow(flushError);

    expect(hoisted.flushPendingToolResultsAfterIdleMock).toHaveBeenCalledTimes(1);
    expect(hoisted.setActiveEmbeddedRunMock).toHaveBeenCalledTimes(1);
    expect(hoisted.clearActiveEmbeddedRunMock).toHaveBeenCalledWith(
      "embedded-session",
      expect.any(Object),
      "agent:main:test-cleanup",
    );
    expect(disposeMock).toHaveBeenCalledTimes(1);
    expect(hoisted.releaseWsSessionMock).toHaveBeenCalledWith("embedded-session");
    expect(hoisted.sessionLockReleaseMock).toHaveBeenCalledTimes(1);
  });
});
