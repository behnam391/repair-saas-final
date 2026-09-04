import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/en", "/ar", "/download", "/about", "/terms", "/privacy", "/refund"],
      disallow: ["/api/", "/admin/", "/superadmin/", "/customer/", "/tickets", "/invoices", "/reports"],
    },
    sitemap: "https://peyvo.ir/sitemap.xml",
    host: "https://peyvo.ir",
  };
}
