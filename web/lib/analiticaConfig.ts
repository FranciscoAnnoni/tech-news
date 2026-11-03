/** La configuración del ambiente se resuelve en servidor. */
export function analiticaHabilitada(ambiente: string | undefined, prueba: string | undefined): boolean {
  return ambiente === "production" || prueba === "true";
}
