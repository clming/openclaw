// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it } from "vitest";
import { renderAgentOverview } from "./agents-panels-overview.ts";

function renderOverview(params: {
  configForm: Record<string, unknown>;
  agentId?: string;
  defaultId?: string;
}) {
  const container = document.createElement("div");
  render(
    renderAgentOverview({
      agent: { id: params.agentId ?? "main", name: "Main" } as never,
      basePath: "",
      defaultId: params.defaultId ?? "main",
      configForm: params.configForm,
      agentFilesList: null,
      agentIdentity: null,
      agentIdentityLoading: false,
      agentIdentityError: null,
      configLoading: false,
      configSaving: false,
      configDirty: false,
      modelCatalog: [],
      onConfigReload: () => undefined,
      onConfigSave: () => undefined,
      onModelChange: () => undefined,
      onModelFallbacksChange: () => undefined,
      onSelectPanel: () => undefined,
    }),
    container,
  );
  return container;
}

describe("renderAgentOverview", () => {
  it("hydrates the default-model selector from object-shaped defaults.model", async () => {
    const container = renderOverview({
      configForm: {
        agents: {
          defaults: {
            model: {
              primary: "openai-codex/gpt-5.4",
            },
            models: {
              "google/gemini-2.5-pro": { alias: "gemini" },
              "openai-codex/gpt-5.4": {},
            },
          },
          list: [{ id: "main" }],
        },
      },
    });
    await Promise.resolve();
    await Promise.resolve();

    const modelSelect = container.querySelector<HTMLSelectElement>(".agent-model-fields select");

    expect(modelSelect?.value).toBe("openai-codex/gpt-5.4");
  });

  it("shows inherited default-model fallbacks for the default agent editor", async () => {
    const container = renderOverview({
      configForm: {
        agents: {
          defaults: {
            model: {
              primary: "openai-codex/gpt-5.4",
              fallbacks: ["google/gemini-2.5-pro"],
            },
            models: {
              "google/gemini-2.5-pro": { alias: "gemini" },
              "openai-codex/gpt-5.4": {},
            },
          },
          list: [{ id: "main" }],
        },
      },
    });
    await Promise.resolve();
    await Promise.resolve();

    const chips = Array.from(container.querySelectorAll(".chip")).map((node) =>
      node.textContent?.replace("×", "").trim(),
    );

    expect(chips).toContain("google/gemini-2.5-pro");
  });

  it("keeps the inherit option selected for non-default agents without an explicit model", async () => {
    const container = renderOverview({
      agentId: "other",
      defaultId: "main",
      configForm: {
        agents: {
          defaults: {
            model: {
              primary: "openai-codex/gpt-5.4",
            },
            models: {
              "google/gemini-2.5-pro": { alias: "gemini" },
              "openai-codex/gpt-5.4": {},
            },
          },
          list: [{ id: "other" }],
        },
      },
    });
    await Promise.resolve();
    await Promise.resolve();

    const modelSelect = container.querySelector<HTMLSelectElement>(".agent-model-fields select");

    expect(modelSelect?.value).toBe("");
  });

  it("re-syncs the live select value when switching from an explicit model to inherit-default", async () => {
    const container = document.createElement("div");

    render(
      renderAgentOverview({
        agent: { id: "main", name: "Main" } as never,
        basePath: "",
        defaultId: "main",
        configForm: {
          agents: {
            defaults: {
              model: {
                primary: "openai-codex/gpt-5.4",
              },
              models: {
                "google/gemini-2.5-pro": { alias: "gemini" },
                "openai-codex/gpt-5.4": {},
              },
            },
            list: [{ id: "main" }],
          },
        },
        agentFilesList: null,
        agentIdentity: null,
        agentIdentityLoading: false,
        agentIdentityError: null,
        configLoading: false,
        configSaving: false,
        configDirty: false,
        modelCatalog: [],
        onConfigReload: () => undefined,
        onConfigSave: () => undefined,
        onModelChange: () => undefined,
        onModelFallbacksChange: () => undefined,
        onSelectPanel: () => undefined,
      }),
      container,
    );
    await Promise.resolve();
    await Promise.resolve();

    render(
      renderAgentOverview({
        agent: { id: "other", name: "Other" } as never,
        basePath: "",
        defaultId: "main",
        configForm: {
          agents: {
            defaults: {
              model: {
                primary: "openai-codex/gpt-5.4",
              },
              models: {
                "google/gemini-2.5-pro": { alias: "gemini" },
                "openai-codex/gpt-5.4": {},
              },
            },
            list: [{ id: "other" }],
          },
        },
        agentFilesList: null,
        agentIdentity: null,
        agentIdentityLoading: false,
        agentIdentityError: null,
        configLoading: false,
        configSaving: false,
        configDirty: false,
        modelCatalog: [],
        onConfigReload: () => undefined,
        onConfigSave: () => undefined,
        onModelChange: () => undefined,
        onModelFallbacksChange: () => undefined,
        onSelectPanel: () => undefined,
      }),
      container,
    );
    await Promise.resolve();
    await Promise.resolve();

    const modelSelect = container.querySelector<HTMLSelectElement>(".agent-model-fields select");

    expect(modelSelect?.value).toBe("");
  });

  it("shows the inherited primary in the summary when an entry only overrides fallbacks", async () => {
    const container = renderOverview({
      agentId: "other",
      defaultId: "main",
      configForm: {
        agents: {
          defaults: {
            model: {
              primary: "openai-codex/gpt-5.4",
            },
            models: {
              "google/gemini-2.5-pro": { alias: "gemini" },
              "openai-codex/gpt-5.4": {},
            },
          },
          list: [
            {
              id: "other",
              model: {
                fallbacks: ["google/gemini-2.5-pro"],
              },
            },
          ],
        },
      },
    });
    await Promise.resolve();
    await Promise.resolve();

    const modelValue = Array.from(container.querySelectorAll(".agent-kv")).find((node) =>
      node.textContent?.includes("Primary Model"),
    )?.lastElementChild?.textContent;

    expect(modelValue?.trim()).toBe("openai-codex/gpt-5.4 (+1 fallback)");
  });
});
