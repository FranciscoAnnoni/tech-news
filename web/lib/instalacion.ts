export interface AvisoInstalacion extends Event {
  prompt(): Promise<{ outcome: string } | void>;
  userChoice: Promise<{ outcome: string }>;
}

declare global {
  interface Window {
    __avisoInstalacion?: AvisoInstalacion | null;
    __appInstalada?: boolean;
    TelegramWebview?: unknown;
    TelegramWebviewProxy?: unknown;
  }
}

/**
 * Corre en <head>, antes de hidratar: beforeinstallprompt puede dispararse antes
 * de que React monte y no se repite.
 */
export const CAPTURA_INSTALACION = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__avisoInstalacion=e;dispatchEvent(new Event("cambio-instalacion"))});addEventListener("appinstalled",function(){window.__appInstalada=true;window.__avisoInstalacion=null;dispatchEvent(new Event("cambio-instalacion"))});`;

export function suscribirInstalacion(avisar: () => void): () => void {
  const modo = matchMedia("(display-mode: standalone)");
  window.addEventListener("cambio-instalacion", avisar);
  modo.addEventListener("change", avisar);
  return () => {
    window.removeEventListener("cambio-instalacion", avisar);
    modo.removeEventListener("change", avisar);
  };
}

export const estaInstalada = (): boolean =>
  window.__appInstalada === true ||
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const hayAviso = (): boolean => !!window.__avisoInstalacion;

/** El evento sirve para un solo prompt(). Devuelve true si la persona aceptó. */
export async function pedirInstalacion(): Promise<boolean> {
  const aviso = window.__avisoInstalacion;
  if (!aviso) return false;
  window.__avisoInstalacion = null;
  window.dispatchEvent(new Event("cambio-instalacion"));
  const resultado = (await aviso.prompt()) || (await aviso.userChoice);
  return resultado.outcome === "accepted";
}
