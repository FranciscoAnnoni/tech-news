import type { MetadataRoute } from "next";
import { urlBase } from "@/lib/urlPublica";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${urlBase()}/sitemap.xml` };
}
