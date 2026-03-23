import type { WebhookRequestBody } from "@line/bot-sdk";
import { validateSignature } from "@line/bot-sdk";

export function parseLineWebhookBody(rawBody: string): WebhookRequestBody | null {
  try {
    return JSON.parse(rawBody) as WebhookRequestBody;
  } catch {
    return null;
  }
}

export function validateLineSignature(
  rawBody: string,
  signature: string,
  channelSecret: string,
): boolean {
  return validateSignature(rawBody, channelSecret, signature);
}
