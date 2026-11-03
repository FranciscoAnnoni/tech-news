/** Únicas rutas que pueden salir hacia Speed Insights. */
const RUTAS_CONOCIDAS = new Set(["/", "/noticia/[identificador]"]);

/** Solo se transmiten categorías de ruta conocidas, nunca segmentos del visitante. */
function rutaDepurada(valor: string): string | null {
  try {
    const ruta = new URL(valor, "https://infomate.invalid").pathname;
    if (ruta === "/") return "/";
    if (ruta === "/noticia" || ruta.startsWith("/noticia/")) return "/noticia/[identificador]";
  } catch {
    // Una URL malformada tampoco debe salir como texto crudo.
  }
  return null;
}

/**
 * Conserva las métricas técnicas y depura la ubicación. El script de Speed
 * Insights solo aplica la `url` devuelta y envía el `route` original (derivado
 * del pathname en rutas sin parámetros), así que toda medición cuya URL o route
 * no sea una ruta conocida se descarta para que ninguno de los dos campos salga crudo.
 */
export function depurarMedicion<T extends { url: string; route?: string }>(medicion: T): T | null {
  const url = rutaDepurada(medicion.url);
  if (url === null) return null;
  if (medicion.route !== undefined && !RUTAS_CONOCIDAS.has(medicion.route)) return null;
  return { ...medicion, url };
}
