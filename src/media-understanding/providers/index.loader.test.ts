import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyPluginRegistry } from "../../plugins/registry.js";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { buildMediaUnderstandingRegistry } from "./index.js";

const loadOpenClawPluginsMock = vi.fn((_params?: unknown) => ({ mediaUnderstandingProviders: [] }));

vi.mock("../../plugins/loader.js", () => ({
  loadOpenClawPlugins: (params: unknown) => loadOpenClawPluginsMock(params),
}));

describe("media-understanding provider loader", () => {
  beforeEach(() => {
    loadOpenClawPluginsMock.mockClear();
    setActivePluginRegistry(createEmptyPluginRegistry());
  });

  it("reuses the active plugin registry when one is already loaded", () => {
    setActivePluginRegistry(createEmptyPluginRegistry(), "active-registry");

    buildMediaUnderstandingRegistry(undefined, { plugins: { enabled: true } } as never);

    expect(loadOpenClawPluginsMock).not.toHaveBeenCalled();
  });
});
