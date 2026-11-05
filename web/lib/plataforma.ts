export type Plataforma = "ios" | "android" | "escritorio" | "inapp";

export interface Entorno {
  ua: string;
  plataformaNavegador?: string;
  toquesMaximos?: number;
  /** Telegram no siempre se identifica en el UA: expone objetos propios en window. */
  telegram?: boolean;
}

const RE_INAPP =
  /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|Telegram|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|Twitter|MicroMessenger|; wv\)/i;

/** iPadOS se presenta como Mac; se distingue por la pantalla táctil. */
function esIOS({ ua, plataformaNavegador, toquesMaximos = 0 }: Entorno): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (plataformaNavegador === "MacIntel" && toquesMaximos > 1);
}

/**
 * Safari de iOS y la app instalada en iOS tienen su propio gesto de volver desde el borde izquierdo: como abrir el
 * Detalle suma una entrada al historial, ese gesto ya lo cierra. Un gesto propio encima se ve doble.
 * La app instalada no dice `Safari` en el UA, por eso va aparte. Las WebViews de otras apps no tienen el gesto.
 */
export function tieneGestoDeVolverDelSistema(entorno: Entorno & { instalada?: boolean }): boolean {
  if (!esIOS(entorno) || entorno.telegram || RE_INAPP.test(entorno.ua)) return false;
  return /Safari/.test(entorno.ua) || entorno.instalada === true;
}

export function detectarPlataforma({ ua, plataformaNavegador, toquesMaximos = 0, telegram }: Entorno): Plataforma {
  if (telegram || RE_INAPP.test(ua)) return "inapp";
  // Sin `Safari` en el UA de un iPhone es una WebView.
  if (esIOS({ ua, plataformaNavegador, toquesMaximos })) return /Safari/.test(ua) ? "ios" : "inapp";
  return /Android/.test(ua) ? "android" : "escritorio";
}
