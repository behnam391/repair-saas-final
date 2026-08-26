"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function SessionRevocationWatcher() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const leaving = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.disabled || leaving.current) return;
    leaving.current = true;
    const callbackUrl = pathname.startsWith("/superadmin")
      ? "/superadmin/login"
      : pathname.startsWith("/customer") ? "/customer/login" : "/login";
    void signOut({ callbackUrl });
  }, [pathname, session, status]);

  return null;
}
