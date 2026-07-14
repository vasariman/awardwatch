import type { MetadataRoute } from "next";
import { getAllCompetitions } from "@/lib/competitions";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/impressum`, lastModified: now, changeFrequency: "yearly", priority: 0.1 },
  ];

  const competitionRoutes: MetadataRoute.Sitemap = getAllCompetitions().map((c) => ({
    url: `${SITE_URL}/competitions/${c.slug}`,
    lastModified: now,
    changeFrequency: c.status === "expired" ? "never" : "weekly",
    priority: c.status === "expired" ? 0.3 : 0.8,
  }));

  return [...staticRoutes, ...competitionRoutes];
}
