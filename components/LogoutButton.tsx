"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs text-muted hover:text-danger transition-colors"
    >
      خروج
    </button>
  );
}
