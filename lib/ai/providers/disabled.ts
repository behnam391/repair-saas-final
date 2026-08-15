// The no-op provider. Selected by default (config defaults to "disabled") and
// used as the safe fallback for an unknown provider key. It never performs I/O
// and always signals that AI is off.

import { AiProvider, AiProviderError, ProviderConfig, ProviderRequest, ProviderResult } from "../types";

export class DisabledProvider implements AiProvider {
  readonly key = "disabled";

  async generate(_req: ProviderRequest, _cfg: ProviderConfig): Promise<ProviderResult> {
    throw new AiProviderError("disabled", "AI provider is disabled", false);
  }
}
