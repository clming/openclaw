import { beforeEach, describe, expect, it, vi } from "vitest";

const listChannelPairingRequests = vi.fn();
const listPairingChannels = vi.fn(() => ["telegram", "discord", "imessage"]);
const normalizeChannelId = vi.fn((raw: string) => {
  if (["telegram", "discord", "imessage"].includes(raw)) {
    return raw;
  }
  if (raw === "imsg") {
    return "imessage";
  }
  return null;
});
const logMock = vi.fn();

vi.mock("../channels/plugins/pairing.js", () => ({
  listPairingChannels,
  notifyPairingApproved: vi.fn(),
  getPairingAdapter: vi.fn((ch: string) => ({ idLabel: `${ch}UserId` })),
}));

vi.mock("../pairing/pairing-store.js", () => ({
  listChannelPairingRequests,
}));

vi.mock("../channels/plugins/index.js", () => ({
  normalizeChannelId,
}));

vi.mock("../pairing/pairing-labels.js", () => ({
  resolvePairingIdLabel: vi.fn(() => "userId"),
}));

vi.mock("../runtime.js", () => ({
  defaultRuntime: { log: logMock, error: vi.fn() },
}));

vi.mock("../terminal/table.js", () => ({
  getTerminalTableWidth: vi.fn(() => 80),
  renderTable: vi.fn(() => "table-output"),
}));

vi.mock("../terminal/theme.js", () => ({
  theme: {
    muted: (s: string) => s,
    heading: (s: string) => s,
  },
}));

// Mock pairing-cli's parseChannel export (re-exported through the module mock above
// for normalizeChannelId). We import the real module so the shared parseChannel is exercised.
vi.mock("../config/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({}),
}));

describe("runPairingList", () => {
  let runPairingList: typeof import("./pairing-list.js").runPairingList;

  beforeEach(async () => {
    vi.resetModules();
    ({ runPairingList } = await import("./pairing-list.js"));
    listChannelPairingRequests.mockClear();
    listChannelPairingRequests.mockResolvedValue([]);
    listPairingChannels.mockReturnValue(["telegram", "discord", "imessage"]);
    logMock.mockClear();
  });

  describe("channel validation", () => {
    it("rejects invalid channel names", async () => {
      await expect(
        runPairingList({
          channel: "INVALID!!!",
          channelArg: undefined,
          account: undefined,
          json: false,
        }),
      ).rejects.toThrow("Invalid channel");
    });

    it("rejects channels not in the pairing list", async () => {
      // "slack" normalizes but is not in the pairing channel list
      normalizeChannelId.mockReturnValueOnce("slack");
      await expect(
        runPairingList({
          channel: "slack",
          channelArg: undefined,
          account: undefined,
          json: false,
        }),
      ).rejects.toThrow("does not support pairing");
    });

    it("accepts a valid core channel", async () => {
      await runPairingList({
        channel: "telegram",
        channelArg: undefined,
        account: undefined,
        json: false,
      });
      expect(listChannelPairingRequests).toHaveBeenCalledWith("telegram");
    });
  });

  describe("single-channel auto-select", () => {
    it("auto-selects when only one channel is available", async () => {
      listPairingChannels.mockReturnValue(["telegram"]);
      // Re-import to pick up the new mock return value
      vi.resetModules();
      ({ runPairingList } = await import("./pairing-list.js"));

      await runPairingList({
        channel: undefined,
        channelArg: undefined,
        account: undefined,
        json: false,
      });
      expect(listChannelPairingRequests).toHaveBeenCalledWith("telegram");
    });

    it("requires explicit channel when multiple are available", async () => {
      await expect(
        runPairingList({
          channel: undefined,
          channelArg: undefined,
          account: undefined,
          json: false,
        }),
      ).rejects.toThrow("Channel required");
    });
  });

  describe("--json output", () => {
    it("outputs JSON with channel and requests", async () => {
      const requests = [{ code: "ABCD1234", id: "user1", meta: null, createdAt: "2026-01-01" }];
      listChannelPairingRequests.mockResolvedValue(requests);

      await runPairingList({
        channel: "telegram",
        channelArg: undefined,
        account: undefined,
        json: true,
      });

      expect(logMock).toHaveBeenCalledTimes(1);
      const output = JSON.parse(logMock.mock.calls[0][0]);
      expect(output).toEqual({ channel: "telegram", requests });
    });
  });

  describe("--account filtering", () => {
    it("passes account to listChannelPairingRequests when provided", async () => {
      await runPairingList({
        channel: "telegram",
        channelArg: undefined,
        account: "acct-42",
        json: false,
      });
      expect(listChannelPairingRequests).toHaveBeenCalledWith("telegram", process.env, "acct-42");
    });

    it("omits account arg when not provided", async () => {
      await runPairingList({
        channel: "telegram",
        channelArg: undefined,
        account: undefined,
        json: false,
      });
      expect(listChannelPairingRequests).toHaveBeenCalledWith("telegram");
    });
  });

  describe("empty requests", () => {
    it("shows muted message when no requests exist", async () => {
      listChannelPairingRequests.mockResolvedValue([]);

      await runPairingList({
        channel: "telegram",
        channelArg: undefined,
        account: undefined,
        json: false,
      });

      expect(logMock).toHaveBeenCalledWith(
        expect.stringContaining("No pending telegram pairing requests"),
      );
    });
  });
});
