import { describe, expect, it } from "vitest";
import {
  buildChatModelOption,
  buildQualifiedChatModelValue,
  createChatModelOverride,
  formatChatModelDisplay,
  normalizeChatModelOverrideValue,
  resolveServerChatModelValue,
} from "./chat-model-ref.ts";
import type { ModelCatalogEntry } from "./types.ts";

const catalog: ModelCatalogEntry[] = [
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic" },
];

describe("chat-model-ref helpers", () => {
  it("builds provider-qualified option values and labels", () => {
    expect(buildChatModelOption(catalog[0])).toEqual({
      value: "openai/gpt-5-mini",
      label: "gpt-5-mini · openai",
    });
  });

  it("normalizes raw overrides when the catalog match is unique", () => {
    expect(normalizeChatModelOverrideValue(createChatModelOverride("gpt-5-mini"), catalog)).toBe(
      "openai/gpt-5-mini",
    );
  });

  it("keeps ambiguous raw overrides unchanged", () => {
    const ambiguousCatalog: ModelCatalogEntry[] = [
      { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
      { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openrouter" },
    ];

    expect(
      normalizeChatModelOverrideValue(createChatModelOverride("gpt-5-mini"), ambiguousCatalog),
    ).toBe("gpt-5-mini");
  });

  it("formats qualified model refs consistently for default labels", () => {
    expect(formatChatModelDisplay("openai/gpt-5-mini")).toBe("gpt-5-mini · openai");
    expect(formatChatModelDisplay("alias-only")).toBe("alias-only");
  });

  it("resolves server session data to qualified option values", () => {
    expect(resolveServerChatModelValue("gpt-5-mini", "openai")).toBe("openai/gpt-5-mini");
    expect(resolveServerChatModelValue("alias-only", null)).toBe("alias-only");
  });

  describe("buildChatModelOption — non-Anthropic provider prefix", () => {
    it("preserves provider prefix for non-Anthropic models with provider field", () => {
      const entry: ModelCatalogEntry = {
        id: "grok-4-1-fast",
        name: "Grok 4.1 Fast",
        provider: "xai",
      };
      expect(buildChatModelOption(entry)).toEqual({
        value: "xai/grok-4-1-fast",
        label: "grok-4-1-fast · xai",
      });
    });

    it("preserves provider prefix for ollama models with provider field", () => {
      const entry: ModelCatalogEntry = {
        id: "gemma3:1b",
        name: "gemma3:1b",
        provider: "ollama",
      };
      expect(buildChatModelOption(entry)).toEqual({
        value: "ollama/gemma3:1b",
        label: "gemma3:1b · ollama",
      });
    });

    it("extracts provider from slash-qualified id when provider field is empty", () => {
      // Defensive: catalog entry arrived with provider stripped but id
      // still contains the provider prefix.
      const entry = {
        id: "xai/grok-4-1-fast",
        name: "grok-4-1-fast",
        provider: "",
      } as ModelCatalogEntry;
      const option = buildChatModelOption(entry);
      expect(option.value).toBe("xai/grok-4-1-fast");
      expect(option.label).toBe("grok-4-1-fast · xai");
    });

    it("handles missing provider with non-qualified id gracefully", () => {
      const entry = {
        id: "grok-4-1-fast",
        name: "grok-4-1-fast",
        provider: "",
      } as ModelCatalogEntry;
      const option = buildChatModelOption(entry);
      // Without provider info the bare id is the best we can produce.
      expect(option.value).toBe("grok-4-1-fast");
      expect(option.label).toBe("grok-4-1-fast");
    });
  });

  describe("buildQualifiedChatModelValue edge cases", () => {
    it("returns provider/model when provider is truthy", () => {
      expect(buildQualifiedChatModelValue("grok-4-1-fast", "xai")).toBe("xai/grok-4-1-fast");
    });

    it("returns bare model when provider is empty", () => {
      expect(buildQualifiedChatModelValue("grok-4-1-fast", "")).toBe("grok-4-1-fast");
    });

    it("returns bare model when provider is null", () => {
      expect(buildQualifiedChatModelValue("grok-4-1-fast", null)).toBe("grok-4-1-fast");
    });

    it("returns bare model when provider is undefined", () => {
      expect(buildQualifiedChatModelValue("grok-4-1-fast", undefined)).toBe("grok-4-1-fast");
    });

    it("keeps already-qualified model when provider is given", () => {
      // OpenRouter-style: id contains vendor prefix, provider is "openrouter"
      expect(buildQualifiedChatModelValue("anthropic/claude-sonnet-4-5", "openrouter")).toBe(
        "openrouter/anthropic/claude-sonnet-4-5",
      );
    });
  });
});
