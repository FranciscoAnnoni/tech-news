export interface AvisoInstalacion extends Event {
  prompt(): Promise<{ outcome: string } | void>;
  userChoice: Promise<{ outcome: string }>;
}

declare global {
  interface Window {
    __avisoInstalacion?: AvisoInstalacion | null;
    __appInstalada?: boolean;
    __confirmacionesInstalacion?: number;
    TelegramWebview?: unknown;
    TelegramWebviewProxy?: unknown;
  }
}

/**
 * Corre en <head>, antes de hidratar: beforeinstallprompt puede dispararse antes
 * de que React monte y no se repite.
 */
export const CAPTURA_INSTALACION = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__avisoInstalacion=e;dispatchEvent(new Event("cambio-instalacion"))});addEventListener("appinstalled",function(){window.__appInstalada=true;window.__avisoInstalacion=null;window.__confirmacionesInstalacion=(window.__confirmacionesInstalacion||0)+1;dispatchEvent(new Event("confirmacion-instalacion"));dispatchEvent(new Event("cambio-instalacion"))});`;

/** Consume solo eventos observados, incluso si ocurrieron antes de hidratar. */
export function suscribirConfirmacionesInstalacion(registrar: () => void): () => void {
  const consumir = () => {
    const cantidad = window.__confirmacionesInstalacion || 0;
    window.__confirmacionesInstalacion = 0;
    for (let i = 0; i < cantidad; i++) registrar();
  };
  window.addEventListener("confirmacion-instalacion", consumir);
  consumir();
  return () => window.removeEventListener("confirmacion-instalacion", consumir);
}

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

/** El evento sirve para un solo prompt(); null significa que no había aviso. */
export async function pedirInstalacion(): Promise<"aceptada" | "cancelada" | "error" | null> {
  const aviso = window.__avisoInstalacion;
  if (!aviso) return null;
  window.__avisoInstalacion = null;
  window.dispatchEvent(new Event("cambio-instalacion"));
  try {
    const resultado = (await aviso.prompt()) || (await aviso.userChoice);
    return resultado.outcome === "accepted" ? "aceptada" : "cancelada";
  } catch {
    return "error";
  }
}
