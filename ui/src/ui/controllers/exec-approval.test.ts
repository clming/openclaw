import { describe, expect, it, vi } from "vitest";
import {
  addExecApproval,
  pruneExecApprovalQueue,
  type ExecApprovalRequest,
} from "./exec-approval.ts";

function createApproval(params: {
  id: string;
  createdAtMs: number;
  expiresAtMs: number;
}): ExecApprovalRequest {
  return {
    id: params.id,
    createdAtMs: params.createdAtMs,
    expiresAtMs: params.expiresAtMs,
    request: { command: `echo ${params.id}` },
  };
}

describe("exec approval queue", () => {
  it("keeps the newest approval at the front of the queue", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T00:00:00.000Z"));

    const first = createApproval({
      id: "approval-1",
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
    });
    const second = createApproval({
      id: "approval-2",
      createdAtMs: Date.now() + 1_000,
      expiresAtMs: Date.now() + 61_000,
    });

    expect(addExecApproval([first], second)).toEqual([second, first]);
  });

  it("prunes expired approvals before showing a new one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T00:00:10.000Z"));

    const expired = createApproval({
      id: "expired",
      createdAtMs: Date.now() - 20_000,
      expiresAtMs: Date.now() - 1,
    });
    const active = createApproval({
      id: "active",
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
    });

    expect(pruneExecApprovalQueue([expired, active])).toEqual([active]);
    expect(addExecApproval([expired], active)).toEqual([active]);
  });
});
