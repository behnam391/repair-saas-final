"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useIsNativeApp } from "@/components/NativeAppContext";

export default function WebHomeLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const isNativeApp = useIsNativeApp();

  if (isNativeApp) return null;

  return <Link href="/" className={className}>{children}</Link>;
}
