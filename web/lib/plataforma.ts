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

export function detectarPlataforma({ ua, plataformaNavegador, toquesMaximos = 0, telegram }: Entorno): Plataforma {
  if (telegram || RE_INAPP.test(ua)) return "inapp";
  // iPadOS se presenta como Mac; se distingue por la pantalla táctil.
  const ios = /iPhone|iPad|iPod/.test(ua) || (plataformaNavegador === "MacIntel" && toquesMaximos > 1);
  // Sin `Safari` en el UA de un iPhone es una WebView.
  if (ios) return /Safari/.test(ua) ? "ios" : "inapp";
  return /Android/.test(ua) ? "android" : "escritorio";
}
