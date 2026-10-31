export type ResultadoCompartir = "compartido" | "cancelado" | "copiado" | "error";

export interface DatosCompartir {
  title: string;
  url: string;
}

/**
 * Decide cómo compartir. Las dependencias se inyectan: sin `share` (o si falla por
 * algo que no sea cancelar) se copia la URL; cancelar el menú nativo no es un error.
 */
export async function compartir(
  datos: DatosCompartir,
  { share, copiar }: { share?: (datos: DatosCompartir) => Promise<void>; copiar: (texto: string) => Promise<void> },
): Promise<ResultadoCompartir> {
  if (share) {
    try {
      await share(datos);
      return "compartido";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "cancelado";
    }
  }
  try {
    await copiar(datos.url);
    return "copiado";
  } catch {
    return "error";
  }
}
