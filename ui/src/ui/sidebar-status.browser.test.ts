import { describe, expect, it } from "vitest";
import { i18n } from "../i18n/index.ts";
import { mountApp, registerAppMountHooks } from "./test-helpers/app-mount.ts";

registerAppMountHooks();

describe("sidebar connection status", () => {
  it("shows a single online status dot next to the version", async () => {
    const app = mountApp("/chat");
    await app.updateComplete;

    app.hello = {
      ok: true,
      server: { version: "1.2.3" },
    } as never;
    app.requestUpdate();
    await app.updateComplete;

    const version = app.querySelector<HTMLElement>(".sidebar-version");
    const statusDot = app.querySelector<HTMLElement>(".sidebar-version__status");
    expect(version).not.toBeNull();
    expect(statusDot).not.toBeNull();
    expect(statusDot?.getAttribute("aria-label")).toContain("Online");
  });

  it("localizes the status dot label in zh-CN", async () => {
    await i18n.setLocale("zh-CN");
    const app = mountApp("/chat");
    await app.updateComplete;

    app.hello = {
      ok: true,
      server: { version: "1.2.3" },
    } as never;
    app.requestUpdate();
    await app.updateComplete;

    const statusDot = app.querySelector<HTMLElement>(".sidebar-version__status");
    expect(statusDot?.getAttribute("aria-label")).toBe("网关状态：在线");
    expect(statusDot?.getAttribute("title")).toBe("网关状态：在线");
  });
});
