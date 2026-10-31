export const URL_PUBLICA_POR_DEFECTO = "https://infomate.ar";

/**
 * Base pública de la app, sin barra final: NEXT_PUBLIC_URL_PUBLICA (pública porque se lee en el cliente) o, si falta, infomate.ar.
 * El acceso literal a `process.env.NEXT_PUBLIC_*` es lo que Next reemplaza en el bundle del cliente.
 */
export function urlBase(base: string | undefined = process.env.NEXT_PUBLIC_URL_PUBLICA): string {
  return (base ?? "").trim().replace(/\/+$/, "") || URL_PUBLICA_POR_DEFECTO;
}

/** Link público de una Noticia: `{base}/noticia/{identificador}`. */
export function urlPublica(identificador: string, base?: string): string {
  return `${urlBase(base)}/noticia/${identificador}`;
}
