export const URL_PUBLICA_POR_DEFECTO = "https://infomate.ar";

/**
 * Link público de una Noticia: `{base}/noticia/{identificador}`.
 * La base sale de NEXT_PUBLIC_URL_PUBLICA (pública porque se lee en el cliente) o, si falta, de infomate.ar.
 * El acceso literal a `process.env.NEXT_PUBLIC_*` es lo que Next reemplaza en el bundle del cliente.
 */
export function urlPublica(identificador: string, base: string | undefined = process.env.NEXT_PUBLIC_URL_PUBLICA): string {
  const limpia = (base ?? "").trim().replace(/\/+$/, "");
  return `${limpia || URL_PUBLICA_POR_DEFECTO}/noticia/${identificador}`;
}
