import { createHash } from "crypto";
import { resolveSku } from "../skus";
import { getMyketServerConfig, type MyketServerConfig } from "../myket-config";
import type { PaymentProvider, VerificationResult } from "../types";

export interface MyketVerifyInput {
  shopId: string;
  sku: string;
  token: string;
  expectedPayload: string;
  amountToman?: number;
  orderId?: string;
}

type FetchLike = typeof fetch;

export interface MyketProviderDeps {
  loadConfig?: () => Promise<MyketServerConfig>;
  fetchImpl?: FetchLike;
}

function purchaseRef(packageName: string, sku: string, token: string): string {
  const digest = createHash("sha256").update(`${packageName}:${sku}:${token}`).digest("hex");
  return `myket:${digest}`;
}

/** Server-to-server Myket verifier. No access token is ever accepted from the client. */
export class MyketPaymentProvider implements PaymentProvider<MyketVerifyInput> {
  readonly key = "myket";
  private readonly loadConfig: () => Promise<MyketServerConfig>;
  private readonly fetchImpl: FetchLike;

  constructor(deps: MyketProviderDeps = {}) {
    this.loadConfig = deps.loadConfig ?? getMyketServerConfig;
    this.fetchImpl = deps.fetchImpl ?? fetch;
  }

  async verify(input: MyketVerifyInput): Promise<VerificationResult> {
    const skuInfo = resolveSku(input.sku);
    if (!skuInfo) return { ok: false, reason: "unknown_sku" };
    if (!input.token || !input.expectedPayload) return { ok: false, reason: "missing_purchase_data" };

    const config = await this.loadConfig();
    if (!config.accessToken || !config.packageName) return { ok: false, reason: "myket_not_configured" };

    const url = `https://developer.myket.ir/api/partners/applications/${encodeURIComponent(config.packageName)}/purchases/products/${encodeURIComponent(input.sku)}/verify`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Token": config.accessToken,
        },
        body: JSON.stringify({ tokenId: input.token }),
        cache: "no-store",
      });
    } catch {
      return { ok: false, reason: "myket_unreachable" };
    }

    const body: any = await response.json().catch(() => null);
    if (!response.ok || !body) return { ok: false, reason: "myket_unverified" };
    if (Number(body.purchaseState) !== 0) return { ok: false, reason: "purchase_not_completed" };
    if (String(body.developerPayload ?? "") !== input.expectedPayload) {
      return { ok: false, reason: "developer_payload_mismatch" };
    }

    const purchasedAtMs = Number(body.purchaseTime);
    return {
      ok: true,
      purchase: {
        shopId: input.shopId,
        source: this.key,
        externalRef: purchaseRef(config.packageName, input.sku, input.token),
        plan: skuInfo.plan,
        months: skuInfo.months,
        amountToman: input.amountToman,
        autoRenewing: false,
        purchasedAt: Number.isFinite(purchasedAtMs) && purchasedAtMs > 0 ? new Date(purchasedAtMs) : new Date(),
        providerRef: input.orderId,
        raw: {
          sku: input.sku,
          orderId: input.orderId ?? null,
          purchaseState: Number(body.purchaseState),
          consumptionState: body.consumptionState ?? null,
          developerPayload: body.developerPayload,
        },
      },
    };
  }
}
