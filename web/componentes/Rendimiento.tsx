"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { depurarMedicion } from "@/lib/rendimiento";

/** La habilitación se decide en servidor y es independiente de Mixpanel. */
export function Rendimiento({ habilitado }: { habilitado: boolean }) {
  return habilitado ? <SpeedInsights beforeSend={depurarMedicion} /> : null;
}
