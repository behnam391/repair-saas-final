import type { MetadataRoute } from "next";
import { SEO_SOLUTIONS } from "@/lib/seo-solutions";

const BASE_URL = "https://peyvo.ir";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const publicPages = ["", "/download", "/about", "/terms", "/privacy", "/refund"];
  const locales = ["", "/en", "/ar"];

  const basePages = locales.flatMap((locale) => publicPages.map((page) => ({
    url: `${BASE_URL}${locale}${page}`,
    lastModified: now,
    changeFrequency: page === "" ? "weekly" as const : "monthly" as const,
    priority: page === "" ? 1 : page === "/download" ? 0.8 : 0.5,
  })));
  const solutionPages = Object.keys(SEO_SOLUTIONS).map((slug) => ({
    url: `${BASE_URL}/solutions/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));
  return [...basePages, ...solutionPages];
}
