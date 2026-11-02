/** Solo se transmiten categorías de ruta conocidas, nunca segmentos del visitante. */
function rutaDepurada(valor: string): string {
  try {
    const ruta = new URL(valor, "https://infomate.invalid").pathname;
    if (ruta === "/") return "/";
    if (ruta === "/noticia" || ruta.startsWith("/noticia/")) return "/noticia/[identificador]";
  } catch {
    // Una URL malformada tampoco debe salir como texto crudo.
  }
  return "/otra";
}

/** Conserva las métricas técnicas y depura ambos campos de ubicación del SDK. */
export function depurarMedicion<T extends { url: string; route?: string }>(medicion: T): T {
  return {
    ...medicion,
    url: rutaDepurada(medicion.url),
    ...(medicion.route === undefined ? {} : { route: rutaDepurada(medicion.route) }),
  };
}
