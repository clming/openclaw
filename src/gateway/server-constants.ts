import type { GatewayConfig } from "../config/types.gateway.js";

// Keep server maxPayload aligned with gateway client maxPayload so high-res canvas snapshots
// don't get disconnected mid-invoke with "Max payload size exceeded".
export const MAX_PAYLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_BUFFERED_BYTES = 50 * 1024 * 1024; // per-connection send buffer limit (2x max payload)
export const MAX_PREAUTH_PAYLOAD_BYTES = 64 * 1024;

const DEFAULT_MAX_CHAT_HISTORY_MESSAGES_BYTES = 6 * 1024 * 1024; // keep history responses comfortably under client WS limits
let maxChatHistoryMessagesBytes = DEFAULT_MAX_CHAT_HISTORY_MESSAGES_BYTES;

export const getMaxChatHistoryMessagesBytes = () => maxChatHistoryMessagesBytes;

export const __setMaxChatHistoryMessagesBytesForTest = (value?: number) => {
  if (!process.env.VITEST && process.env.NODE_ENV !== "test") {
    return;
  }
  if (value === undefined) {
    maxChatHistoryMessagesBytes = DEFAULT_MAX_CHAT_HISTORY_MESSAGES_BYTES;
    return;
  }
  if (Number.isFinite(value) && value > 0) {
    maxChatHistoryMessagesBytes = value;
  }
};

export const DEFAULT_HANDSHAKE_TIMEOUT_MS = 15_000;

const MIN_HANDSHAKE_TIMEOUT_MS = 1_000;
const MAX_HANDSHAKE_TIMEOUT_MS = 120_000;

/**
 * Parse a raw env string into a validated timeout, or undefined to fall through.
 * `enforceMin` controls whether the lower bound (1000ms) is applied:
 * - true (default): full range validation for production env var
 * - false: skip the minimum so tests can use sub-second timeouts (e.g. 20ms)
 * The upper bound (120000ms) is always enforced to prevent timer overflow.
 */
const parseTimeoutOverride = (raw?: string, enforceMin = true): number | undefined => {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  if (enforceMin && parsed < MIN_HANDSHAKE_TIMEOUT_MS) {
    return undefined;
  }
  if (parsed > MAX_HANDSHAKE_TIMEOUT_MS) {
    return undefined;
  }
  return parsed;
};

/** Validate a config-supplied timeout: must be finite, positive, and within bounds. */
const validateConfigTimeout = (value?: number): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  if (value < MIN_HANDSHAKE_TIMEOUT_MS || value > MAX_HANDSHAKE_TIMEOUT_MS) {
    return undefined;
  }
  return value;
};

export const getHandshakeTimeoutMs = (gatewayConfig?: GatewayConfig): number =>
  parseTimeoutOverride(process.env.OPENCLAW_HANDSHAKE_TIMEOUT_MS) ??
  parseTimeoutOverride(
    process.env.VITEST ? process.env.OPENCLAW_TEST_HANDSHAKE_TIMEOUT_MS : undefined,
    false, // test env var: skip minimum so tests can use fast sub-second timeouts
  ) ??
  validateConfigTimeout(gatewayConfig?.handshakeTimeoutMs) ??
  DEFAULT_HANDSHAKE_TIMEOUT_MS;
export const TICK_INTERVAL_MS = 30_000;
export const HEALTH_REFRESH_INTERVAL_MS = 60_000;
export const DEDUPE_TTL_MS = 5 * 60_000;
export const DEDUPE_MAX = 1000;
