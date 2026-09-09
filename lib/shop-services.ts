import { INDUSTRY_WORKSPACES } from "./industry-workspaces";

export const SHOP_SERVICES = ["MOBILE", "COMPUTER", "APPLIANCE", "FACILITIES", "VEHICLE", "INDUSTRIAL"] as const;
export function parseShopServices(value?: string | null): string[] {
  const values = (value || "MOBILE").split(",").map(v => v.trim());
  return SHOP_SERVICES.filter(v => values.includes(v));
}
export function serializeShopServices(values: readonly string[]) {
  return SHOP_SERVICES.filter(v => values.includes(v)).join(",");
}
export function shopHome(value?: string | null) {
  const services = parseShopServices(value);
  if (services.some(v => v === "MOBILE" || v === "COMPUTER")) return "/tickets";
  const entries = Object.entries(INDUSTRY_WORKSPACES).filter(([,v]) => services.includes(v.category));
  return entries.length === 1 ? `/industry-workspaces/${entries[0][0]}` : "/industry-workspaces";
}
