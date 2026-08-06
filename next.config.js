/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Don't bundle @vercel/blob into the server build — it's loaded lazily
    // inside /api/upload only when BLOB_READ_WRITE_TOKEN is set. Keeping it
    // external means the app still compiles and runs even before
    // `npm install` has pulled the package (a clear runtime message is
    // shown instead of a cryptic "Module not found" build error).
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
