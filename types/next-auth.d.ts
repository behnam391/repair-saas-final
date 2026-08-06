import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      phone?: string;
      role?: "OWNER" | "FRONTDESK" | "HARDWARE" | "SOFTWARE" | "BOARD";
      shopId?: string;
      shopName?: string;
      specialty?: string | null;
      isSuperAdmin?: boolean;
      isCustomer?: boolean;
      isImpersonated?: boolean;
      disabled?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    phone?: string;
    role?: string;
    shopId?: string;
    shopName?: string;
    specialty?: string | null;
    isSuperAdmin?: boolean;
    isCustomer?: boolean;
    isImpersonated?: boolean;
    disabled?: boolean;
  }
}
