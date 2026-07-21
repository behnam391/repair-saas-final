import type { CapacitorConfig } from "@capacitor/cli";

// Peyvo is a full Next.js server app (Prisma/PostgreSQL, NextAuth sessions,
// live API routes) — it cannot be statically exported into the APK the way
// a plain client-side SPA can. So the Android app is a native WebView shell
// that loads the real, deployed Peyvo site (server.url below); all business
// logic keeps running on your actual server exactly as it does in a browser.
// `webDir` still has to point at *some* local folder (Capacitor's build
// requirement) — it holds only a small offline-fallback page, never the
// real app UI.
//
// Before building: replace `PEYVO_DEPLOYED_URL` with your real HTTPS
// domain (e.g. https://peyvo.example.com) once the app is deployed. Until
// then this points at a placeholder and the app will show the offline page.
const PEYVO_DEPLOYED_URL = process.env.PEYVO_APP_URL || "https://YOUR-PEYVO-DOMAIN.example.com";

const config: CapacitorConfig = {
  appId: "com.peyvo.app",
  appName: "Peyvo",
  webDir: "android-shell",
  server: {
    url: PEYVO_DEPLOYED_URL,
    cleartext: false,
  },
  android: {
    backgroundColor: "#10121A",
  },
};

export default config;
