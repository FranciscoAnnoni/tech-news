/** Copia texto al portapapeles. Rechaza si el navegador no lo permite o no lo ofrece. */
export function copiarAlPortapapeles(texto: string): Promise<void> {
  return navigator.clipboard.writeText(texto);
}
