"use client";

import { useRef, type CSSProperties } from "react";
import { MONTO_SUGERIDO, URL_MERCADO_PAGO } from "@/lib/donacion";
import estilosTarjeta from "./Tarjeta.module.css";
import estilos from "./TarjetaDonacion.module.css";
import { useDeslizar } from "./useDeslizar";

/**
 * Pide un aporte por Mercado Pago con un mate que se balancea. Va en el Mazo como una tarjeta más, pero no es una noticia: no cuenta en el contador.
 * Derecha o "Apoyanos": apoyar. Izquierda o "Hoy no": seguir leyendo. Un toque en la tarjeta no hace nada,
 * así nadie llega a Mercado Pago sin querer.
 */
export function TarjetaDonacion({
  profundidad,
  alApoyar,
  alDescartar,
  alTerminar,
}: {
  profundidad: number;
  alApoyar: (origen: "gesto" | "boton") => void;
  alDescartar: () => void;
  /** Al terminar la animación de salida; `apoyo` si fue a la derecha o con el botón. */
  alTerminar: (apoyo: boolean) => void;
}) {
  const porBoton = useRef(false);
  const { nodo, selloAbrir, selloDescartar, resolver, manejadores } = useDeslizar({
    alMarcar: (direccion) => (direccion > 0 ? alApoyar(porBoton.current ? "boton" : "gesto") : alDescartar()),
    alTerminar: (direccion) => alTerminar(direccion > 0),
    alTocar: () => {},
  });
  const arriba = profundidad === 0;

  return (
    <article
      ref={nodo}
      className={`${estilosTarjeta.tarjeta} ${estilos.donacion}`}
      data-k={profundidad}
      data-prueba={arriba ? "donacion-arriba" : undefined}
      style={{ "--k": profundidad } as CSSProperties}
      aria-label="Apoyá a Infomate"
      {...(arriba ? manejadores : {})}
    >
      <div className={estilos.cuerpo}>
        <span className={estilos.mate} aria-hidden="true">🧉</span>
        <h2 className={estilos.titulo}>¿Nos invitás un mate?</h2>
        <p className={estilos.texto}>{MONTO_SUGERIDO} por Mercado Pago. Con eso pagamos los servidores.</p>
      </div>
      {/* Frenar pointerdown: si no, el gesto de la tarjeta captura el puntero y le roba el click a los botones. */}
      <div className={estilos.acciones} onPointerDown={(e) => e.stopPropagation()}>
        <a
          className={estilos.apoyar}
          href={URL_MERCADO_PAGO}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={arriba ? 0 : -1}
          onClick={() => {
            porBoton.current = true;
            resolver(1);
          }}
        >
          Apoyanos
        </a>
        <button className={estilos.ahoraNo} type="button" tabIndex={arriba ? 0 : -1} onClick={() => resolver(-1)}>
          Hoy no
        </button>
      </div>
      <div ref={selloAbrir} className={`${estilosTarjeta.sello} ${estilosTarjeta.selloAbrir}`}>APOYAR</div>
      <div ref={selloDescartar} className={`${estilosTarjeta.sello} ${estilosTarjeta.selloDescartar}`}>AHORA NO</div>
    </article>
  );
}
