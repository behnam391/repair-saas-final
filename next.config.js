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
};

module.exports = nextConfig;
