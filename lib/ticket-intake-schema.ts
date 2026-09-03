import { preprocessPhone } from "@/lib/phone";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const CreateTicketSchema = z.object({
  customerName: z.string().optional().default(""),
  // Every repair-status SMS goes here. A number stored as ۰۹… is not a
  // number Kavenegar can deliver to. See lib/phone.ts.
  customerPhone: z.preprocess(preprocessPhone, z.string().optional().default("")),
  deviceModel: z.string().trim().min(1, "مدل یا مشخصات دستگاه را وارد کنید"),
  deviceCategory: z.enum(["MOBILE", "COMPUTER"]).default("MOBILE"),
  // Mobile intake posts an empty deviceType. Treat empty optional fields as
  // absent; otherwise Zod rejects every mobile ticket after computer intake
  // fields were added.
  deviceType: z.preprocess(emptyToUndefined, z.enum(["LAPTOP", "DESKTOP", "ALL_IN_ONE", "MINI_PC", "OTHER"]).optional()),
  deviceBrand: z.string().max(80).optional(),
  operatingSystem: z.string().max(80).optional(),
  accessories: z.string().max(300).optional(),
  imei: z.string().optional(),
  issueInitial: z.string().trim().min(1, "شرح ایراد دستگاه را وارد کنید"),
  lane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]),
  estimatedCost: z.number().int().optional(),
  devicePasscode: z.string().optional(),
  devicePasscodeType: z.enum(["PIN", "PASSWORD", "PATTERN"]).optional(),
  customerDamageNotes: z.string().optional(),
  receiptAck: z.enum(["SHOP_PRINTED_SIGNED", "SITE_PRINTED_SIGNED", "NO_SIGNATURE"]).optional(),
  intakeSource: z.enum(["CUSTOMER", "PARTNER"]).default("CUSTOMER"),
  partnerName: z.string().max(120).optional(),
  partnerPhone: z.preprocess(preprocessPhone, z.string().optional()),
});
