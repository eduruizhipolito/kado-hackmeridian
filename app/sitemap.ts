import type { MetadataRoute } from "next";

const SITE = "https://kado-hackmeridian.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/panel`, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE}/llms.txt`, changeFrequency: "weekly", priority: 0.3 },
  ];
}
