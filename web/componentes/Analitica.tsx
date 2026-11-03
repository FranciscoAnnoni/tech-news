"use client";

import { useEffect } from "react";
import { iniciarAnalitica, marcarPantalla, type Pantalla } from "@/lib/analitica";

export function Analitica({ habilitada }: { habilitada: boolean }) {
  useEffect(() => iniciarAnalitica(habilitada), [habilitada]);
  return null;
}

export function PantallaAnalitica({ pantalla }: { pantalla: Pantalla }) {
  useEffect(() => marcarPantalla(pantalla), [pantalla]);
  return null;
}
