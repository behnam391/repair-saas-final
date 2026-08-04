"use client";
import { signOut } from "next-auth/react";

export default function CustomerLogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/customer/login" })} className="text-xs text-muted hover:text-danger transition-colors">
      خروج
    </button>
  );
}
