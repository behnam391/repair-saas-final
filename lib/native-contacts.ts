"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { normalizePhone } from "@/lib/phone";

type ContactResult = { name: string; phone: string };
type NativeContactsApi = { pick(): Promise<ContactResult> };

const NativeContacts = registerPlugin<NativeContactsApi>("NativeContacts");

export function canPickNativeContact(): boolean {
  return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("NativeContacts");
}

export async function pickNativeContact(): Promise<ContactResult> {
  const result = await NativeContacts.pick();
  return {
    name: (result.name || "").trim(),
    phone: normalizePhone(result.phone || ""),
  };
}
