"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeStore = "bazaar" | "myket" | "web";
type AppVersionInfo = { versionCode: number; versionName: string; installer: string; store?: NativeStore };
type AppVersionApi = { getInfo(): Promise<AppVersionInfo> };

const AppVersion = registerPlugin<AppVersionApi>("AppVersion");

export function canCheckNativeVersion() {
  return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("AppVersion");
}

export function getNativeAppVersion() {
  return AppVersion.getInfo();
}
