// Maps a configured provider key to a concrete AiProvider instance. This is the
// only place that knows the set of providers; adding a new provider is a new
// entry here plus a new file under providers/ — no caller changes.

import type { AiProvider, ProviderKey } from "./types";
import { DisabledProvider } from "./providers/disabled";
import { MockProvider } from "./providers/mock";
import { OpenAiCompatProvider } from "./providers/openai-compat";

const REGISTRY: Record<ProviderKey, AiProvider> = {
  disabled: new DisabledProvider(),
  mock: new MockProvider(),
  "openai-compat": new OpenAiCompatProvider(),
};

export function getProvider(key: ProviderKey): AiProvider {
  return REGISTRY[key] ?? REGISTRY.disabled;
}
