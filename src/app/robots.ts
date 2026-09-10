import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The homepage's category/status/student/search filters are all
      // query params (?category=..., combinable) -- a canonical crawl trap:
      // seven categories alone combine into hundreds of distinct, 200-OK,
      // uncacheable URLs with essentially the same content. The bare `/`
      // already carries `alternates.canonical: "/"` (src/app/page.tsx) for
      // the indexing side; this stops crawlers from requesting the
      // combinations at all, which is the actual crawl-budget/Function-
      // invocation cost. Matches any URL containing a query string, so it
      // also covers UTM-tagged detail-page links (e.g. from the
      // newsletter) -- same duplicate-content logic, and those pages are
      // always reachable canonically without params anyway.
      disallow: "/?*",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
