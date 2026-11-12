/** La configuración del ambiente se resuelve en servidor. */
export function analiticaHabilitada(ambiente: string | undefined, prueba: string | undefined): boolean {
  return ambiente === "production" || prueba === "true";
}

/** ID de medición de Google Analytics 4 (G-XXXXXXX). Sin ID o con formato inválido, no se carga. */
export function idGoogleAnalytics(valor: string | undefined): string | null {
  const id = valor?.trim().toUpperCase() ?? "";
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}
