import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

// Consent is not evidence that a phone is registered with Bale.
export async function getBaleContacts(audience = "all") {
  const [users, customers, preferences] = await Promise.all([
    audience === "customers" ? [] : db.user.findMany({ where: { active: true }, select: { name: true, phone: true } }),
    audience === "shops" ? [] : db.platformCustomer.findMany({ where: { active: true }, select: { name: true, phone: true } }),
    db.balePreference.findMany({ where: { enabled: true }, select: { phone: true } }),
  ]);
  const consent = new Set(preferences.map(p => normalizePhone(p.phone)));
  const contacts = new Map<string, { phone: string; name: string; kind: string; consent: boolean }>();
  for (const [list, kind] of [[users, "تعمیرگاه"], [customers, "مشتری"]] as const) {
    for (const person of list) {
      const phone = normalizePhone(person.phone);
      if (!/^09\d{9}$/.test(phone)) continue;
      const previous = contacts.get(phone);
      contacts.set(phone, { phone, name: previous?.name || person.name || phone, kind: previous && previous.kind !== kind ? "تعمیرگاه و مشتری" : kind, consent: consent.has(phone) });
    }
  }
  return [...contacts.values()].sort((a, b) => a.name.localeCompare(b.name, "fa"));
}
