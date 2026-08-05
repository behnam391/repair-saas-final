"use client";
import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* reducedMotion="user" makes framer-motion skip transform/layout
          animations for anyone whose device asks for less motion, and it does
          it at animation time rather than render time — so the markup the
          server sends and the markup the browser hydrates stay identical.
          (Branching the JSX on useReducedMotion() instead would break
          hydration, because the server can't know the user's setting.) */}
      <MotionConfig reducedMotion="user"><ToastProvider>{children}</ToastProvider></MotionConfig>
    </SessionProvider>
  );
}
