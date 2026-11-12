import type { MetadataRoute } from "next";
import { urlBase } from "@/lib/urlPublica";

// Solo la portada: las Noticias vencen y van con noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${urlBase()}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}
