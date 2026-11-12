"use client";

import type { CSSProperties } from "react";
import type { TarjetaNoticia } from "@/lib/tipos";
import { BotonCompartir } from "./BotonCompartir";
import estilos from "./Tarjeta.module.css";
import { useDeslizar } from "./useDeslizar";

export function Tarjeta({
  tarjeta,
  profundidad,
  alMarcar,
  alTerminar,
  contextoCompartir,
}: {
  tarjeta: TarjetaNoticia;
  profundidad: number;
  alMarcar: (direccion: number) => void;
  alTerminar: (direccion: number) => void;
  contextoCompartir: () => { identificador: string; categoria: TarjetaNoticia["categoria"]; fuente: string; edicion?: string; recorrido_id: string; posicion: number; cantidad_tarjetas: number; superficie: "tarjeta" };
}) {
  const { nodo, selloAbrir, selloDescartar, manejadores } = useDeslizar({ alMarcar, alTerminar });
  const arriba = profundidad === 0;

  return (
    <article
      ref={nodo}
      className={estilos.tarjeta}
      data-k={profundidad}
      data-talla={tarjeta.talla}
      data-categoria={tarjeta.categoria}
      data-prueba={arriba ? "tarjeta-arriba" : undefined}
      style={{ "--k": profundidad, "--tono": tarjeta.tono } as CSSProperties}
      {...(arriba ? manejadores : {})}
    >
      <div className={estilos.origen}>
        <span className={estilos.monograma}>{tarjeta.letras}</span>
        <span className={estilos.fuente}>{tarjeta.fuente}</span>
        <span className={estilos.categoria}>{tarjeta.categoria}</span>
      </div>
      <div className={estilos.lectura} tabIndex={arriba ? 0 : -1} role="region" aria-label="Texto de la noticia">
        <h2 className={estilos.titulo}>{tarjeta.titulo}</h2>
        {tarjeta.descripcion && <p className={estilos.descripcion}>{tarjeta.descripcion}</p>}
      </div>
      <div className={estilos.pie}>
        {arriba && (
          // Solo la de arriba: las de atrás no tienen botón enfocable. Frenar pointerdown evita que
          // el contenedor inicie un gesto (y su setPointerCapture le robe el click al botón).
          <div className={estilos.compartir} onPointerDown={(e) => e.stopPropagation()}>
            <BotonCompartir variante="chico" identificador={tarjeta.identificador} titulo={tarjeta.titulo} contexto={contextoCompartir} />
          </div>
        )}
        <div className={estilos.fecha}>{tarjeta.fecha}</div>
      </div>
      <div ref={selloAbrir} className={`${estilos.sello} ${estilos.selloAbrir}`}>ABRIR</div>
      <div ref={selloDescartar} className={`${estilos.sello} ${estilos.selloDescartar}`}>DESCARTAR</div>
    </article>
  );
}
