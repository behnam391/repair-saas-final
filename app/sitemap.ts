import type { MetadataRoute } from "next";

const BASE_URL = "https://peyvo.ir";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const publicPages = ["", "/download", "/about", "/terms", "/privacy", "/refund"];
  const locales = ["", "/en", "/ar"];

  return locales.flatMap((locale) => publicPages.map((page) => ({
    url: `${BASE_URL}${locale}${page}`,
    lastModified: now,
    changeFrequency: page === "" ? "weekly" as const : "monthly" as const,
    priority: page === "" ? 1 : page === "/download" ? 0.8 : 0.5,
  })));
}
