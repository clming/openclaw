import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRuntimeAuthProfileStoreSnapshots } from "../../agents/auth-profiles/store.js";
import type { AuthProfileStore } from "../../agents/auth-profiles/types.js";
import { createNonExitingRuntime } from "../../runtime.js";
import { createCapturedPluginRegistration } from "../../test-utils/plugin-registration.js";
import type {
  WizardMultiSelectParams,
  WizardPrompter,
  WizardProgress,
  WizardSelectParams,
} from "../../wizard/prompts.js";
import type { OpenClawPluginApi, ProviderPlugin } from "../types.js";

type LoginOpenAICodexOAuth =
  (typeof import("openclaw/plugin-sdk/provider-auth-login"))["loginOpenAICodexOAuth"];
type GithubCopilotLoginCommand =
  (typeof import("openclaw/plugin-sdk/provider-auth-login"))["githubCopilotLoginCommand"];
type CreateVpsAwareHandlers =
  (typeof import("../provider-oauth-flow.js"))["createVpsAwareOAuthHandlers"];
type EnsureAuthProfileStore =
  typeof import("openclaw/plugin-sdk/agent-runtime").ensureAuthProfileStore;
type ListProfilesForProvider =
  typeof import("openclaw/plugin-sdk/agent-runtime").listProfilesForProvider;

const loginOpenAICodexOAuthMock = vi.hoisted(() => vi.fn<LoginOpenAICodexOAuth>());
const githubCopilotLoginCommandMock = vi.hoisted(() => vi.fn<GithubCopilotLoginCommand>());
const ensureAuthProfileStoreMock = vi.hoisted(() => vi.fn<EnsureAuthProfileStore>());
const listProfilesForProviderMock = vi.hoisted(() => vi.fn<ListProfilesForProvider>());

vi.mock("openclaw/plugin-sdk/provider-auth-login", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openclaw/plugin-sdk/provider-auth-login")>();
  return {
    ...actual,
    loginOpenAICodexOAuth: loginOpenAICodexOAuthMock,
    githubCopilotLoginCommand: githubCopilotLoginCommandMock,
  };
});

vi.mock("openclaw/plugin-sdk/agent-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openclaw/plugin-sdk/agent-runtime")>();
  return {
    ...actual,
    ensureAuthProfileStore: ensureAuthProfileStoreMock,
    listProfilesForProvider: listProfilesForProviderMock,
  };
});

import githubCopilotPlugin from "../../../extensions/github-copilot/index.js";
import openAIPlugin from "../../../extensions/openai/index.js";

function registerProviders(...plugins: Array<{ register(api: OpenClawPluginApi): void }>) {
  const captured = createCapturedPluginRegistration();
  for (const plugin of plugins) {
    plugin.register(captured.api);
  }
  return captured.providers;
}

function requireProvider(providers: ProviderPlugin[], providerId: string) {
  const provider = providers.find((entry) => entry.id === providerId);
  if (!provider) {
    throw new Error(`provider ${providerId} missing`);
  }
  return provider;
}

function buildPrompter(): WizardPrompter {
  const progress: WizardProgress = {
    update() {},
    stop() {},
  };
  return {
    intro: async () => {},
    outro: async () => {},
    note: async () => {},
    select: async <T>(params: WizardSelectParams<T>) => {
      const option = params.options[0];
      if (!option) {
        throw new Error("missing select option");
      }
      return option.value;
    },
    multiselect: async <T>(params: WizardMultiSelectParams<T>) => params.initialValues ?? [],
    text: async () => "",
    confirm: async () => false,
    progress: () => progress,
  };
}

function buildAuthContext() {
  return {
    config: {},
    prompter: buildPrompter(),
    runtime: createNonExitingRuntime(),
    isRemote: false,
    openUrl: async () => {},
    oauth: {
      createVpsAwareHandlers: vi.fn<CreateVpsAwareHandlers>(),
    },
  };
}

describe("provider auth contract", () => {
  let authStore: AuthProfileStore;

  beforeEach(() => {
    authStore = { version: 1, profiles: {} };
    ensureAuthProfileStoreMock.mockReset();
    ensureAuthProfileStoreMock.mockImplementation(() => authStore);
    listProfilesForProviderMock.mockReset();
    listProfilesForProviderMock.mockImplementation((store, providerId) =>
      Object.entries(store.profiles)
        .filter(([, credential]) => credential?.provider === providerId)
        .map(([profileId]) => profileId),
    );
  });

  afterEach(() => {
    loginOpenAICodexOAuthMock.mockReset();
    githubCopilotLoginCommandMock.mockReset();
    ensureAuthProfileStoreMock.mockReset();
    listProfilesForProviderMock.mockReset();
    clearRuntimeAuthProfileStoreSnapshots();
  });

  it("keeps OpenAI Codex OAuth auth results provider-owned", async () => {
    const provider = requireProvider(registerProviders(openAIPlugin), "openai-codex");
    loginOpenAICodexOAuthMock.mockResolvedValueOnce({
      email: "user@example.com",
      refresh: "refresh-token",
      access: "access-token",
      expires: 1_700_000_000_000,
    });

    const result = await provider.auth[0]?.run(buildAuthContext() as never);

    expect(result).toEqual({
      profiles: [
        {
          profileId: "openai-codex:user@example.com",
          credential: {
            type: "oauth",
            provider: "openai-codex",
            access: "access-token",
            refresh: "refresh-token",
            expires: 1_700_000_000_000,
            email: "user@example.com",
          },
        },
      ],
      configPatch: {
        agents: {
          defaults: {
            models: {
              "openai-codex/gpt-5.4": {},
            },
          },
        },
      },
      defaultModel: "openai-codex/gpt-5.4",
      notes: undefined,
    });
  });

  it("keeps OpenAI Codex OAuth failures non-fatal at the provider layer", async () => {
    const provider = requireProvider(registerProviders(openAIPlugin), "openai-codex");
    loginOpenAICodexOAuthMock.mockRejectedValueOnce(new Error("oauth failed"));

    await expect(provider.auth[0]?.run(buildAuthContext() as never)).resolves.toEqual({
      profiles: [],
    });
  });

  it("keeps GitHub Copilot device auth results provider-owned", async () => {
    const provider = requireProvider(registerProviders(githubCopilotPlugin), "github-copilot");
    authStore.profiles["github-copilot:github"] = {
      type: "token" as const,
      provider: "github-copilot",
      token: "github-device-token",
    };

    const stdin = process.stdin as NodeJS.ReadStream & { isTTY?: boolean };
    const hadOwnIsTTY = Object.prototype.hasOwnProperty.call(stdin, "isTTY");
    const previousIsTTYDescriptor = Object.getOwnPropertyDescriptor(stdin, "isTTY");
    Object.defineProperty(stdin, "isTTY", {
      configurable: true,
      enumerable: true,
      get: () => true,
    });

    try {
      const result = await provider.auth[0]?.run(buildAuthContext() as never);
      expect(githubCopilotLoginCommandMock).toHaveBeenCalledWith(
        { yes: true, profileId: "github-copilot:github" },
        expect.any(Object),
      );
      expect(result).toEqual({
        profiles: [
          {
            profileId: "github-copilot:github",
            credential: {
              type: "token",
              provider: "github-copilot",
              token: "github-device-token",
            },
          },
        ],
        defaultModel: "github-copilot/gpt-4o",
      });
    } finally {
      if (previousIsTTYDescriptor) {
        Object.defineProperty(stdin, "isTTY", previousIsTTYDescriptor);
      } else if (!hadOwnIsTTY) {
        delete (stdin as { isTTY?: boolean }).isTTY;
      }
    }
  });

  it("keeps GitHub Copilot auth gated on interactive TTYs", async () => {
    const provider = requireProvider(registerProviders(githubCopilotPlugin), "github-copilot");
    const stdin = process.stdin as NodeJS.ReadStream & { isTTY?: boolean };
    const hadOwnIsTTY = Object.prototype.hasOwnProperty.call(stdin, "isTTY");
    const previousIsTTYDescriptor = Object.getOwnPropertyDescriptor(stdin, "isTTY");
    Object.defineProperty(stdin, "isTTY", {
      configurable: true,
      enumerable: true,
      get: () => false,
    });

    try {
      await expect(provider.auth[0]?.run(buildAuthContext() as never)).resolves.toEqual({
        profiles: [],
      });
      expect(githubCopilotLoginCommandMock).not.toHaveBeenCalled();
    } finally {
      if (previousIsTTYDescriptor) {
        Object.defineProperty(stdin, "isTTY", previousIsTTYDescriptor);
      } else if (!hadOwnIsTTY) {
        delete (stdin as { isTTY?: boolean }).isTTY;
      }
    }
  });
});
