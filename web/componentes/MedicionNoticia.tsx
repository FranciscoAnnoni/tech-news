"use client";

import { useEffect, useRef } from "react";
import { registrarEvento } from "@/lib/analitica";
import type { contextoNoticia } from "@/lib/medicionMazo";

type Propiedades = { noticia: ReturnType<typeof contextoNoticia> } | { noticia?: never };

/** La lectura y validación quedan en servidor; solo se mide la pantalla visible. */
export function MedicionNoticia({ noticia }: Propiedades) {
  const registrada = useRef(false);
  useEffect(() => {
    const registrar = () => {
      if (registrada.current || document.visibilityState !== "visible") return;
      registrada.current = true;
      if (noticia) registrarEvento("noticia_abierta", { ...noticia, superficie: "pagina" });
      else registrarEvento("noticia_no_disponible_vista", {});
    };
    registrar();
    document.addEventListener("visibilitychange", registrar);
    return () => document.removeEventListener("visibilitychange", registrar);
  }, [noticia]);
  return null;
}
