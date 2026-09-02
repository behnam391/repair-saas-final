/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep the Blob SDK server-only. /api/upload loads it only when a store
    // is connected through either the current Vercel OIDC credentials or a
    // legacy BLOB_READ_WRITE_TOKEN.
    serverComponentsExternalPackages: ["@vercel/blob"],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      ],
    }];
  },
};

module.exports = nextConfig;
