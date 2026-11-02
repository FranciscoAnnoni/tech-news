"use client";

import { useEffect, useRef, useState } from "react";
import { compartir } from "@/lib/compartir";
import { copiarAlPortapapeles } from "@/lib/portapapeles";
import { urlPublica } from "@/lib/urlPublica";
import estilos from "./BotonCompartir.module.css";

const DURACION_AVISO_MS = 2500;

/** Ícono de compartir del Detalle y de la Tarjeta de arriba. Solo cliente: usa Web Share API y portapapeles. */
export function BotonCompartir({
  identificador,
  titulo,
  variante,
}: {
  identificador: string;
  titulo: string;
  /** "chico": ícono de 20px con área táctil de 44px, para la Tarjeta. El aviso se ancla al contenedor posicionado más cercano. */
  variante?: "chico";
}) {
  const [aviso, setAviso] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function avisar(texto: string) {
    clearTimeout(temporizador.current);
    setAviso(texto);
    temporizador.current = setTimeout(() => setAviso(""), DURACION_AVISO_MS);
  }

  async function alTocar() {
    const resultado = await compartir(
      { title: titulo, url: urlPublica(identificador) },
      { share: typeof navigator.share === "function" ? (d) => navigator.share(d) : undefined, copiar: copiarAlPortapapeles },
    );
    if (resultado === "copiado") avisar("Link copiado");
    else if (resultado === "error") avisar("No se pudo copiar el link");
  }

  return (
    <>
      <button className={`${estilos.boton} ${variante === "chico" ? estilos.chico : ""}`} type="button" aria-label="Compartir" onClick={alTocar}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
          <path d="M12 15V3M7 8l5-5 5 5M5 12v8h14v-8" />
        </svg>
      </button>
      <p className={`${estilos.aviso} ${variante === "chico" ? estilos.avisoChico : ""}`} role="status">{aviso}</p>
    </>
  );
}
