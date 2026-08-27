"use client";
import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ToastProvider";
import SessionRevocationWatcher from "@/components/SessionRevocationWatcher";
import { NativeAppProvider } from "@/components/NativeAppContext";

export function Providers({ children, isNativeApp }: { children: React.ReactNode; isNativeApp: boolean }) {
  return (
    <NativeAppProvider isNativeApp={isNativeApp}>
      <SessionProvider refetchInterval={60} refetchOnWindowFocus>
        <SessionRevocationWatcher />
        {/* reducedMotion="user" makes framer-motion skip transform/layout
            animations for anyone whose device asks for less motion, and it does
            it at animation time rather than render time — so the markup the
            server sends and the markup the browser hydrates stay identical.
            (Branching the JSX on useReducedMotion() instead would break
            hydration, because the server can't know the user's setting.) */}
        <MotionConfig reducedMotion="user"><ToastProvider>{children}</ToastProvider></MotionConfig>
      </SessionProvider>
    </NativeAppProvider>
  );
}
