"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

export interface MyketPurchase {
  sku: string;
  token: string;
  orderId?: string;
  packageName?: string;
  purchaseTime: number;
  purchaseState: number;
  developerPayload: string;
  originalJson: string;
  signature: string;
  itemType: string;
}

export interface MyketProduct {
  sku: string;
  price: string;
  title: string;
  description: string;
  type: string;
}

interface MyketBillingNative {
  isAvailable(): Promise<{ available: boolean; packageName: string; store?: "bazaar" | "myket" }>;
  purchase(options: { publicKey: string; sku: string; payload: string }): Promise<MyketPurchase>;
  restore(options: { publicKey: string; skus: string[] }): Promise<{ purchases: MyketPurchase[]; products: MyketProduct[] }>;
  consume(options: { publicKey: string; originalJson: string; signature: string; itemType: string }): Promise<{ consumed: boolean; sku: string }>;
}

export const MyketBilling = registerPlugin<MyketBillingNative>("MyketBilling");

/** This APK is the Myket build; never expose web-gateway UI inside Android. */
export function isMyketAndroidApp(): boolean {
  return Capacitor.getPlatform() === "android";
}

export function hasMyketBillingPlugin(): boolean {
  return Capacitor.isPluginAvailable("MyketBilling");
}

export async function getNativeStore(): Promise<"bazaar" | "myket" | "web"> {
  if (Capacitor.getPlatform() !== "android" || !Capacitor.isPluginAvailable("AppVersion")) return "web";
  try {
    const { getNativeAppVersion } = await import("@/lib/native-app-version");
    const info = await getNativeAppVersion();
    if (info.store === "bazaar" || info.store === "myket") return info.store;
    if (info.installer === "com.farsitel.bazaar") return "bazaar";
    if (info.installer === "ir.mservices.market") return "myket";
  } catch {}
  return "web";
}
