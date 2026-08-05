"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="app-icon-button hover:!text-danger"
      aria-label="خروج از حساب"
    >
      <LogOut size={17} />
    </button>
  );
}
