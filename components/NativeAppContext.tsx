"use client";

import { createContext, ReactNode, useContext } from "react";

const NativeAppContext = createContext(false);

export function NativeAppProvider({
  children,
  isNativeApp,
}: {
  children: ReactNode;
  isNativeApp: boolean;
}) {
  return <NativeAppContext.Provider value={isNativeApp}>{children}</NativeAppContext.Provider>;
}

export function useIsNativeApp() {
  return useContext(NativeAppContext);
}
