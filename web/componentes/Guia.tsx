"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hayAviso, pedirInstalacion, suscribirInstalacion } from "@/lib/instalacion";
import { detectarPlataforma, type Plataforma } from "@/lib/plataforma";
import { copiarAlPortapapeles } from "@/lib/portapapeles";
import { CONTENIDO_GUIA } from "./contenidoGuia";
import { DibujoGuia } from "./DibujosGuia";
import estilos from "./Guia.module.css";

function plataformaActual(): Plataforma {
  return detectarPlataforma({
    ua: navigator.userAgent,
    plataformaNavegador: navigator.platform,
    toquesMaximos: navigator.maxTouchPoints,
    telegram: !!(window.TelegramWebview || window.TelegramWebviewProxy),
  });
}

export function Guia({ alCerrar }: { alCerrar: () => void }) {
  const [plataforma] = useState(plataformaActual);
  const [paso, setPaso] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);
  const aviso = useSyncExternalStore(suscribirInstalacion, hayAviso, () => false);

  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    addEventListener("keydown", alTeclear);
    return () => removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  const contenido = CONTENIDO_GUIA[plataforma];
  const actual = contenido.pasos[paso];
  const ultimo = paso === contenido.pasos.length - 1;
  const puedeInstalar = aviso && (plataforma === "android" || plataforma === "escritorio");

  async function instalar() {
    const acepto = await pedirInstalacion();
    setMensaje(acepto ? "" : "Lo cancelaste. Podés instalarla a mano con estos pasos.");
  }

  async function copiar() {
    try {
      await copiarAlPortapapeles(location.origin + location.pathname);
      setMensaje("Enlace copiado.");
    } catch {
      setMensaje("No se pudo copiar: usá el menú de la app para copiar el enlace.");
    }
  }

  return (
    <section className={estilos.guia} role="dialog" aria-modal="true" aria-labelledby="titulo-guia" data-prueba="guia" data-plataforma={plataforma}>
      <div className={estilos.cabecera}>
        <h2 id="titulo-guia" ref={titulo} tabIndex={-1}>{contenido.titulo}</h2>
        <button className={estilos.cerrar} type="button" aria-label="Cerrar" onClick={alCerrar}>✕</button>
      </div>

      {paso === 0 && (
        <>
          <p className={estilos.intro}>{contenido.intro}</p>
          {puedeInstalar ? (
            <button className={estilos.accion} type="button" onClick={instalar}>Instalar ahora</button>
          ) : (
            contenido.copiar && <button className={estilos.accion} type="button" onClick={copiar}>Copiar el enlace</button>
          )}
          {mensaje && <p className={estilos.mensaje} role="status">{mensaje}</p>}
        </>
      )}

      <p className={estilos.numero}>PASO {paso + 1} DE {contenido.pasos.length}</p>
      <div className={estilos.escena}>
        <DibujoGuia nombre={actual.dibujo} />
        <p className={estilos.texto}>{actual.texto}</p>
        <p className={estilos.orientativo}>
          Dibujo orientativo: puede cambiar según la versión.{ultimo && contenido.nota ? ` ${contenido.nota}` : ""}
        </p>
      </div>

      <div className={estilos.navegacion}>
        <button type="button" disabled={paso === 0} onClick={() => setPaso(paso - 1)}>Anterior</button>
        <button className={estilos.sigue} type="button" onClick={ultimo ? alCerrar : () => setPaso(paso + 1)}>
          {ultimo ? "Listo" : "Siguiente"}
        </button>
      </div>
    </section>
  );
}
