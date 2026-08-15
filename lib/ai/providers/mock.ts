// Deterministic, offline provider for development and tests. It performs no
// network I/O and produces a stable, clearly-marked response derived only from
// the request's shape (model + input length) — it never echoes the raw input,
// so test output and logs stay free of sensitive text. Deterministic (no
// Date/Math.random), so tests are reproducible.

import { AiProvider, ProviderConfig, ProviderRequest, ProviderResult } from "../types";

export class MockProvider implements AiProvider {
  readonly key = "mock";

  async generate(req: ProviderRequest, _cfg: ProviderConfig): Promise<ProviderResult> {
    const inputChars = req.input.length;
    const text = `[mock:${req.model}] ok (input_chars=${inputChars})`;
    const promptTokens = Math.ceil((req.system.length + inputChars) / 4);
    const completionTokens = Math.ceil(text.length / 4);
    return {
      text,
      finishReason: "stop",
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
    };
  }
}
