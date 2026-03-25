import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./tools/gateway.js", () => ({
  callGatewayTool: vi.fn(async () => ({ ok: true })),
}));

let callGatewayTool: typeof import("./tools/gateway.js").callGatewayTool;
let sendExecApprovalFollowup: typeof import("./bash-tools.exec-approval-followup.js").sendExecApprovalFollowup;

describe("sendExecApprovalFollowup", () => {
  beforeAll(async () => {
    ({ callGatewayTool } = await import("./tools/gateway.js"));
    ({ sendExecApprovalFollowup } = await import("./bash-tools.exec-approval-followup.js"));
  });

  beforeEach(() => {
    vi.mocked(callGatewayTool).mockClear();
  });

  it("keeps follow-up delivery internal when no outbound route is available", async () => {
    await expect(
      sendExecApprovalFollowup({
        approvalId: "approval-1",
        sessionKey: "main",
        resultText: "Exec finished",
      }),
    ).resolves.toBe(true);

    expect(callGatewayTool).toHaveBeenCalledWith(
      "agent",
      { timeoutMs: 60_000 },
      expect.objectContaining({
        sessionKey: "main",
        deliver: false,
        bestEffortDeliver: false,
        channel: undefined,
        to: undefined,
        accountId: undefined,
        threadId: undefined,
        idempotencyKey: "exec-approval-followup:approval-1",
      }),
      { expectFinal: true },
    );
  });

  it("preserves outbound delivery when the originating route is known", async () => {
    await expect(
      sendExecApprovalFollowup({
        approvalId: "approval-2",
        sessionKey: "main",
        turnSourceChannel: "telegram",
        turnSourceTo: "12345",
        turnSourceAccountId: "ops",
        turnSourceThreadId: 77,
        resultText: "Exec finished",
      }),
    ).resolves.toBe(true);

    expect(callGatewayTool).toHaveBeenCalledWith(
      "agent",
      { timeoutMs: 60_000 },
      expect.objectContaining({
        sessionKey: "main",
        deliver: true,
        bestEffortDeliver: true,
        channel: "telegram",
        to: "12345",
        accountId: "ops",
        threadId: "77",
        idempotencyKey: "exec-approval-followup:approval-2",
      }),
      { expectFinal: true },
    );
  });
});
