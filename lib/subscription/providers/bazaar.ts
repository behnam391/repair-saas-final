import { createHash, createVerify } from "crypto";
import { resolveSku } from "../skus";
import { getBazaarServerConfig, type BazaarServerConfig } from "../bazaar-config";
import type { PaymentProvider, VerificationResult } from "../types";

export interface BazaarVerifyInput {
  shopId: string;
  sku: string;
  token: string;
  expectedPayload: string;
  originalJson: string;
  signature: string;
  amountToman?: number;
  orderId?: string;
}

export interface BazaarProviderDeps {
  loadConfig?: () => Promise<BazaarServerConfig>;
}

function asPem(keyBody: string) {
  const lines = keyBody.match(/.{1,64}/g)?.join("\n") ?? keyBody;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

export class BazaarPaymentProvider implements PaymentProvider<BazaarVerifyInput> {
  readonly key = "bazaar";
  private readonly loadConfig: () => Promise<BazaarServerConfig>;

  constructor(deps: BazaarProviderDeps = {}) {
    this.loadConfig = deps.loadConfig ?? getBazaarServerConfig;
  }

  async verify(input: BazaarVerifyInput): Promise<VerificationResult> {
    const skuInfo = resolveSku(input.sku);
    if (!skuInfo) return { ok: false, reason: "unknown_sku" };
    if (!input.token || !input.expectedPayload || !input.originalJson || !input.signature) {
      return { ok: false, reason: "missing_purchase_data" };
    }
    const config = await this.loadConfig();
    if (!config.publicKey || !config.packageName) return { ok: false, reason: "bazaar_not_configured" };

    let receipt: any;
    try {
      const verifier = createVerify("RSA-SHA1");
      verifier.update(input.originalJson, "utf8");
      verifier.end();
      if (!verifier.verify(asPem(config.publicKey), input.signature, "base64")) {
        return { ok: false, reason: "invalid_signature" };
      }
      receipt = JSON.parse(input.originalJson);
    } catch {
      return { ok: false, reason: "invalid_receipt" };
    }

    const receiptSku = String(receipt.productId ?? receipt.sku ?? "");
    const receiptToken = String(receipt.purchaseToken ?? receipt.token ?? "");
    if (receiptSku !== input.sku || receiptToken !== input.token) return { ok: false, reason: "receipt_mismatch" };
    if (String(receipt.packageName ?? "") !== config.packageName) return { ok: false, reason: "package_mismatch" };
    if (String(receipt.developerPayload ?? "") !== input.expectedPayload) return { ok: false, reason: "developer_payload_mismatch" };
    if (Number(receipt.purchaseState ?? 0) !== 0) return { ok: false, reason: "purchase_not_completed" };

    const digest = createHash("sha256").update(`${config.packageName}:${input.sku}:${input.token}`).digest("hex");
    return {
      ok: true,
      purchase: {
        shopId: input.shopId,
        source: this.key,
        externalRef: `bazaar:${digest}`,
        plan: skuInfo.plan,
        months: skuInfo.months,
        amountToman: input.amountToman,
        autoRenewing: false,
        purchasedAt: Number(receipt.purchaseTime) > 0 ? new Date(Number(receipt.purchaseTime)) : new Date(),
        providerRef: input.orderId,
        raw: { sku: input.sku, orderId: input.orderId ?? null, purchaseState: Number(receipt.purchaseState ?? 0) },
      },
    };
  }
}
