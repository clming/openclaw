import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyPluginRegistry } from "../plugins/registry.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { listImageGenerationProviders } from "./provider-registry.js";

const loadOpenClawPluginsMock = vi.fn((_params?: unknown) => ({ imageGenerationProviders: [] }));

vi.mock("../plugins/loader.js", () => ({
  loadOpenClawPlugins: (params: unknown) => loadOpenClawPluginsMock(params),
}));

describe("image generation provider registry", () => {
  beforeEach(() => {
    loadOpenClawPluginsMock.mockClear();
    setActivePluginRegistry(createEmptyPluginRegistry());
  });

  it("reuses the active plugin registry when one is already loaded", () => {
    setActivePluginRegistry(createEmptyPluginRegistry(), "active-registry");

    listImageGenerationProviders({ plugins: { enabled: true } } as never);

    expect(loadOpenClawPluginsMock).not.toHaveBeenCalled();
  });
});
